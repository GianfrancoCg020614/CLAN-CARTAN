-- V371: additive COBRA YA API. Existing financial functions/formulas remain unchanged.
-- Rollback: restore the prior frontend; retain columns/journal/codes and all movements.
set lock_timeout = '5s';
create extension if not exists pg_trgm with schema extensions;

alter table public.cy_clients add column alternate_phones text[] not null default '{}';
alter table public.cy_clients add column search_references text[] not null default '{}';
alter table public.cy_clients add column search_text text not null default '';
alter table public.cy_clients add constraint cy371_contact_limits check
 (cardinality(alternate_phones)<=5 and cardinality(search_references)<=10);
alter table public.cy_loans add column loan_code text;
alter table public.cy_loans add column notes text check(length(notes)<=1000);
alter table public.cy_payments add column paid_on date;
alter table public.cy_payments add column payment_method text;
create unique index cy371_owner_loan_code on public.cy_loans(owner_id,loan_code) where loan_code is not null;
create index cy371_loans_owner_created on public.cy_loans(owner_id,created_at desc,id);
create index cy371_clients_owner_created on public.cy_clients(owner_id,created_at desc,id);
create index cy371_installments_owner_due on public.cy_installments(owner_id,due_on,loan_id);

create table cc_internal.cy371_counters (
 owner_id uuid primary key references auth.users(id), last_number bigint not null check(last_number>0)
);
create table cc_internal.cy371_requests (
 owner_id uuid not null references auth.users(id), request_id uuid not null,
 kind text not null, payload jsonb not null, result_id uuid not null,
 created_at timestamptz not null default now(), primary key(owner_id,request_id)
);
alter table cc_internal.cy371_counters enable row level security;
alter table cc_internal.cy371_requests enable row level security;
revoke all on cc_internal.cy371_counters,cc_internal.cy371_requests from public,anon,authenticated;
create index cy371_requests_history on cc_internal.cy371_requests(owner_id,result_id,created_at desc);

create function public.cy371_normalize(p_text text) returns text language sql immutable parallel safe
 set search_path='' as $$
 select trim(regexp_replace(translate(lower(coalesce(p_text,'')),
 'áàäâãåéèëêíìïîóòöôõúùüûñç','aaaaaaeeeeiiiiooooouuuunc'),'[^a-z0-9]+',' ','g'))
$$;
revoke all on function public.cy371_normalize(text) from public,anon;
grant execute on function public.cy371_normalize(text) to authenticated;

create function cc_internal.cy371_client_search() returns trigger language plpgsql set search_path='' as $$
begin
 new.search_text:=public.cy371_normalize(concat_ws(' ',new.full_name,new.alias,new.client_code,
 new.document_number,regexp_replace(coalesce(new.phone,''),'[^0-9]','','g'),
 array_to_string(new.alternate_phones,' '),array_to_string(new.search_references,' ')));
 return new;
end $$;
revoke all on function cc_internal.cy371_client_search() from public,anon,authenticated;
create trigger cy371_client_search before insert or update on public.cy_clients
 for each row execute function cc_internal.cy371_client_search();
update public.cy_clients set search_text=public.cy371_normalize(concat_ws(' ',full_name,alias,client_code,document_number,regexp_replace(coalesce(phone,''),'[^0-9]','','g')));
create index cy371_client_search_trgm on public.cy_clients using gin(search_text extensions.gin_trgm_ops);

create function cc_internal.cy371_loan_code() returns trigger language plpgsql security definer set search_path='' as $$
declare n bigint;
begin
 if tg_op='UPDATE' then
   if new.loan_code is distinct from old.loan_code then raise exception 'El código del préstamo es inmutable'; end if;
   return new;
 end if;
 if new.loan_code is not null then raise exception 'El código se genera automáticamente'; end if;
 insert into cc_internal.cy371_counters(owner_id,last_number) values(new.owner_id,1)
 on conflict(owner_id) do update set last_number=cc_internal.cy371_counters.last_number+1 returning last_number into n;
 new.loan_code:='PR-'||case when n<10000 then lpad(n::text,4,'0') else n::text end;
 return new;
end $$;
revoke all on function cc_internal.cy371_loan_code() from public,anon,authenticated;
create trigger cy371_loan_code before insert or update of loan_code on public.cy_loans
 for each row execute function cc_internal.cy371_loan_code();

create function cc_internal.cy371_owner() returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or not cc_internal.can_manage_cy(u) then
  raise exception using errcode='42501',message='Activa o renueva COBRA YA para continuar.';
 end if;
 return u;
end $$;
revoke all on function cc_internal.cy371_owner() from public,anon,authenticated;

-- Payments are immutable. Attach optional metadata at INSERT; never UPDATE the ledger.
create function cc_internal.cy371_payment_metadata() returns trigger language plpgsql set search_path='' as $$
declare meta jsonb:=nullif(current_setting('cobra.v371.payment_meta',true),'')::jsonb;
begin
 if meta is not null and new.owner_id=auth.uid() and new.loan_id=(meta->>'loan_id')::uuid then
  new.paid_on:=(meta->>'paid_on')::date;new.payment_method:=meta->>'payment_method';
 end if;
 return new;
end $$;
revoke all on function cc_internal.cy371_payment_metadata() from public,anon,authenticated;
create trigger cy371_payment_metadata before insert on public.cy_payments
 for each row execute function cc_internal.cy371_payment_metadata();

-- No owner parameter: every endpoint derives ownership from the existing authenticated session.
create function public.cy371_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); s record;
begin
 if u is null then raise exception using errcode='42501',message='Inicia sesión en CLAN CARTAN.'; end if;
 select * into s from public.cy_subscription_status();
 return jsonb_build_object('allowed',cc_internal.can_manage_cy(u),'expires_at',s.expires_at,
 'authorized',s.authorized,'active',s.active,'admin',cc_internal.is_admin());
end $$;

-- Private projection of existing loans: decimal balances come from the live installment ledger.
create function cc_internal.cy371_loans(p_owner uuid) returns table
 (id uuid,client_id uuid,loan_code text,full_name text,alias text,client_code text,currency text,
 principal numeric,total_due numeric,paid numeric,balance numeric,next_due date,final_due date,
 status text,issued_on date,months integer,monthly_rate numeric,created_at timestamptz,notes text,collateral text)
 language sql stable security definer set search_path='' as $$
 select l.id,l.client_id,l.loan_code,c.full_name,c.alias,c.client_code,l.currency,
 coalesce(cor.principal,l.principal),coalesce(i.total,l.total_due),coalesce(i.paid,0),
 greatest(0,coalesce(i.total,l.total_due)-coalesce(i.paid,0)),i.next_due,coalesce(i.final_due,l.first_due_on),
 l.status,l.issued_on,l.duration_months,coalesce(l.monthly_interest_rate,l.interest_rate),l.created_at,l.notes,
 (select description from public.cy_loan_collateral where loan_id=l.id and owner_id=p_owner)
 from public.cy_loans l join public.cy_clients c on c.id=l.client_id and c.owner_id=p_owner
 left join lateral (select sum(x.amount) total,sum(x.paid_total) paid,
 min(x.due_on) filter(where x.paid_total<x.amount) next_due,max(x.due_on) final_due
 from public.cy_installments x where x.loan_id=l.id and x.owner_id=p_owner) i on true
 left join lateral (select x.principal from public.cy_loan_corrections x where x.loan_id=l.id and x.owner_id=p_owner order by x.created_at desc,x.id desc limit 1) cor on true
 where l.owner_id=p_owner
$$;
revoke all on function cc_internal.cy371_loans(uuid) from public,anon,authenticated;

create function public.cy371_dashboard(p_today date default current_date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=cc_internal.cy371_owner(); result jsonb;
begin
 if p_today is null or abs(p_today-current_date)>1 then raise exception 'Fecha de consulta inválida';end if;
 with loans as materialized(select * from cc_internal.cy371_loans(u)),
 live as(select * from loans where status='ACTIVE' and balance>0),
 wallets as(select currency,sum(balance) amount from live group by currency)
 select jsonb_build_object('clients',(select count(*) from public.cy_clients where owner_id=u),
 'active',(select count(*) from live),'today',(select count(*) from live where next_due=p_today),
 'late',(select count(*) from live where next_due<p_today),'soon',(select count(*) from live where next_due>p_today and next_due<=p_today+7),
 'portfolios',coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'amount',amount::text) order by currency) from wallets),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.cy371_search(p_query text,p_limit integer default 8,p_offset integer default 0)
 returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=cc_internal.cy371_owner(); q text:=public.cy371_normalize(left(p_query,120)); tokens text[]; result jsonb;
begin
 if length(q)<2 then return '[]'::jsonb;end if;
 tokens:=regexp_split_to_array(q,' ');
 with matches as (
 select c.id,'client'::text kind,c.full_name,c.alias,c.client_code,null::text loan_code,
 case when public.cy371_normalize(c.document_number)=q or regexp_replace(coalesce(c.phone,''),'[^0-9]','','g')=replace(q,' ','') or public.cy371_normalize(c.client_code)=q or exists(select 1 from unnest(c.alternate_phones) a where regexp_replace(a,'[^0-9]','','g')=replace(q,' ','')) then 100
 when public.cy371_normalize(c.alias)=q then 90 when public.cy371_normalize(c.full_name)=q then 85
 when not exists(select 1 from unnest(tokens) t where position(t in c.search_text)=0) then 70 else 20 end as score
 from public.cy_clients c where c.owner_id=u and
 ((c.search_text like '%'||tokens[1]||'%' and not exists(select 1 from unnest(tokens) t where c.search_text not like '%'||t||'%'))
 or (q ~ '^[a-z ]{5,}$' and q operator(extensions.<%) c.search_text and extensions.word_similarity(q,c.search_text)>=0.65))
 union all
 select l.id,'loan',c.full_name,c.alias,c.client_code,l.loan_code,110
 from public.cy_loans l join public.cy_clients c on c.id=l.client_id and c.owner_id=u
 where l.owner_id=u and l.loan_code ilike upper(replace(q,' ','-'))||'%'
 ), page as(select * from matches order by score desc,full_name,id limit least(greatest(p_limit,1),25) offset least(greatest(p_offset,0),100000))
 select coalesce(jsonb_agg(to_jsonb(page)),'[]'::jsonb) into result from page;
 return result;
end $$;

create function public.cy371_list(p_kind text default 'loans',p_filter text default 'active',p_currency text default null,
 p_query text default '',p_limit integer default 20,p_offset integer default 0,p_today date default current_date,p_sort text default 'recent',p_client uuid default null)
 returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=cc_internal.cy371_owner(); result jsonb; q text:=public.cy371_normalize(left(p_query,120));
begin
 if p_today is null or abs(p_today-current_date)>1 then raise exception 'Fecha inválida';end if;
 if p_kind='clients' then
  with filtered as materialized(select c.id,c.full_name,c.alias,c.client_code,c.created_at from public.cy_clients c where c.owner_id=u
   and not exists(select 1 from unnest(regexp_split_to_array(q,' ')) t where position(t in c.search_text)=0)),
  page as(select * from filtered order by case when p_sort='name' then full_name end,created_at desc,id limit least(greatest(p_limit,1),50) offset least(greatest(p_offset,0),100000))
  select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into result;
 elsif p_kind='payments' then
  with filtered as materialized(select p.id,p.loan_id,p.amount::text amount,p.memo,p.created_at,p.paid_on,p.payment_method,l.currency,l.loan_code,c.full_name,c.client_code
   from public.cy_payments p join public.cy_loans l on l.id=p.loan_id and l.owner_id=u join public.cy_clients c on c.id=l.client_id and c.owner_id=u
   where p.owner_id=u and (p_currency is null or l.currency=p_currency) and (p_client is null or l.client_id=p_client)),
  page as(select * from filtered order by created_at desc,id limit least(greatest(p_limit,1),50) offset least(greatest(p_offset,0),100000))
  select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into result;
 else
  with filtered as materialized(select l.* from cc_internal.cy371_loans(u) l join public.cy_clients c on c.id=l.client_id and c.owner_id=u
   where (p_currency is null or l.currency=p_currency) and (p_client is null or l.client_id=p_client)
   and (q='' or not exists(select 1 from unnest(regexp_split_to_array(q,' ')) t where position(t in c.search_text||' '||public.cy371_normalize(l.loan_code))=0))
   and case p_filter when 'active' then l.status='ACTIVE' and l.balance>0 when 'today' then l.status='ACTIVE' and l.balance>0 and l.next_due=p_today
    when 'late' then l.status='ACTIVE' and l.balance>0 and l.next_due<p_today
    when 'soon' then l.status='ACTIVE' and l.balance>0 and l.next_due>p_today and l.next_due<=p_today+7
    when 'paid' then l.status<>'CANCELLED' and l.balance=0 else true end),
  page as(select * from filtered order by case when p_sort='name' then full_name end,
   case when p_sort='due' then next_due end nulls last,created_at desc,id limit least(greatest(p_limit,1),50) offset least(greatest(p_offset,0),100000))
  select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(page)||jsonb_build_object('principal',principal::text,'total_due',total_due::text,'paid',paid::text,'balance',balance::text)) from page),'[]'::jsonb)) into result;
 end if;
 return result;
end $$;

create function public.cy371_client(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=cc_internal.cy371_owner(); result jsonb;
begin
 select to_jsonb(c)-'search_text' into result from public.cy_clients c where c.id=p_id and c.owner_id=u;
 if result is null then raise exception 'Cliente no disponible';end if;
 return result;
end $$;

create function public.cy371_loan(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=cc_internal.cy371_owner(); result jsonb;
begin
 select to_jsonb(l)||jsonb_build_object('principal',l.principal::text,'balance',l.balance::text,'paid',l.paid::text,'total_due',l.total_due::text,
 'installments',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('amount',i.amount::text,'paid_total',i.paid_total::text) order by i.installment_number) from public.cy_installments i where i.loan_id=l.id and i.owner_id=u),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('amount',p.amount::text) order by p.created_at desc) from public.cy_payments p where p.loan_id=l.id and p.owner_id=u),'[]'::jsonb),
 'collateral',(select description from public.cy_loan_collateral where loan_id=l.id and owner_id=u),
 'corrections',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.cy_loan_corrections x where x.loan_id=l.id and x.owner_id=u),'[]'::jsonb),
 'extensions',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.cy_loan_extensions x where x.loan_id=l.id and x.owner_id=u),'[]'::jsonb))
 into result from cc_internal.cy371_loans(u) l where l.id=p_id;
 if result is null then raise exception 'Préstamo no disponible';end if;
 return result;
end $$;

create function public.cy371_history(p_client uuid,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=cc_internal.cy371_owner(); result jsonb;
begin
 if not exists(select 1 from public.cy_clients where id=p_client and owner_id=u) then raise exception 'Cliente no disponible';end if;
 select coalesce(jsonb_agg(to_jsonb(z)),'[]'::jsonb) into result from
 (select r.kind,r.result_id,r.created_at from cc_internal.cy371_requests r where r.owner_id=u and
 (r.result_id=p_client or r.payload->>'client_id'=p_client::text or r.payload->>'loan_id' in(select id::text from public.cy_loans where owner_id=u and client_id=p_client) or r.result_id in(select id from public.cy_loans where owner_id=u and client_id=p_client)
 or r.result_id in(select p.id from public.cy_payments p join public.cy_loans l on l.id=p.loan_id where p.owner_id=u and l.owner_id=u and l.client_id=p_client))
 order by r.created_at desc limit 30 offset least(greatest(p_offset,0),100000)) z;
 return result;
end $$;

-- Resolve a lost response without guessing. A cancellation tombstone prevents a late retry.
create function public.cy371_request(p_request uuid,p_cancel boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=cc_internal.cy371_owner(); r cc_internal.cy371_requests%rowtype;
begin
 if p_request is null then raise exception 'Solicitud inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||p_request::text,0));
 select * into r from cc_internal.cy371_requests where owner_id=u and request_id=p_request;
 if found then return jsonb_build_object('state',case when r.kind='cancelled' then 'cancelled' else 'confirmed' end,'kind',r.kind,'result_id',r.result_id);end if;
 if p_cancel then
  insert into cc_internal.cy371_requests values(u,p_request,'cancelled','{}',p_request,now());
  return jsonb_build_object('state','cancelled');
 end if;
 return jsonb_build_object('state','pending');
end $$;

create function public.cy371_mutate(p_kind text,p_request uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=cc_internal.cy371_owner(); prior cc_internal.cy371_requests%rowtype; result uuid; c public.cy_clients%rowtype; n integer; cur text;
begin
 if p_request is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Solicitud inválida';end if;
 if octet_length(p_data::text)>12000 then raise exception 'Solicitud demasiado grande';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||p_request::text,0));
 select * into prior from cc_internal.cy371_requests where owner_id=u and request_id=p_request;
 if found then
  if prior.kind<>p_kind or prior.payload<>p_data then raise exception 'Esta solicitud ya se utilizó con otros datos';end if;
  return prior.result_id;
 end if;
 if p_kind in ('client','edit_client') then
  if length(trim(coalesce(p_data->>'full_name','')))<2 or length(p_data->>'full_name')>160
   or length(coalesce(p_data->>'alias',''))>80 or length(coalesce(p_data->>'document_number',''))>20
   or length(coalesce(p_data->>'notes',''))>500 or length(coalesce(p_data->>'email',''))>254
   or length(coalesce(p_data->>'address',''))>300 or length(coalesce(p_data->>'district',''))>120
   or length(coalesce(p_data->>'address_reference',''))>300 then raise exception 'Revisa los datos del cliente';end if;
  if coalesce(p_data->>'phone','')<>'' and regexp_replace(p_data->>'phone','[^0-9]','','g') !~ '^[0-9]{8,15}$' then raise exception 'Teléfono inválido';end if;
  if jsonb_typeof(coalesce(p_data->'alternate_phones','[]'::jsonb))<>'array' or jsonb_typeof(coalesce(p_data->'search_references','[]'::jsonb))<>'array' then raise exception 'Contactos inválidos';end if;
  if jsonb_array_length(coalesce(p_data->'alternate_phones','[]'))>5 or jsonb_array_length(coalesce(p_data->'search_references','[]'))>10
   or exists(select 1 from jsonb_array_elements_text(coalesce(p_data->'alternate_phones','[]')) a where a !~ '^\+?[0-9]{8,15}$')
   or exists(select 1 from jsonb_array_elements_text(coalesce(p_data->'search_references','[]')) a where length(a)>160) then raise exception 'Contactos o referencias inválidos';end if;
  if p_kind='edit_client' then
   select * into c from public.cy_clients where id=(p_data->>'id')::uuid and owner_id=u for update;
   if not found then raise exception 'Cliente no disponible';end if;
   result:=c.id;
  else
   -- Serialize creation by normalized document; reuse an existing client without overwriting it.
   if nullif(trim(p_data->>'document_number'),'') is not null then
    perform pg_advisory_xact_lock(hashtextextended(u::text||upper(trim(p_data->>'document_number')),1));
    select id into result from public.cy_clients where owner_id=u and upper(trim(document_number))=upper(trim(p_data->>'document_number')) order by created_at limit 1;
   end if;
   if result is null then
    insert into public.cy_clients(owner_id,full_name) values(u,trim(p_data->>'full_name')) returning id into result;
   else
    insert into cc_internal.cy371_requests values(u,p_request,p_kind,p_data,result,now());return result;
   end if;
  end if;
  update public.cy_clients set full_name=trim(p_data->>'full_name'),alias=nullif(trim(p_data->>'alias'),''),
   document_number=nullif(upper(trim(p_data->>'document_number')),''),phone=nullif(trim(p_data->>'phone'),''),
   email=nullif(lower(trim(p_data->>'email')),''),address=nullif(trim(p_data->>'address'),''),district=nullif(trim(p_data->>'district'),''),
   address_reference=nullif(trim(p_data->>'address_reference'),''),notes=nullif(trim(p_data->>'notes'),''),
   alternate_phones=array(select jsonb_array_elements_text(coalesce(p_data->'alternate_phones','[]'))),
   search_references=array(select jsonb_array_elements_text(coalesce(p_data->'search_references','[]')))
  where id=result and owner_id=u;
 elsif p_kind='loan' then
  if length(coalesce(p_data->>'notes',''))>1000 then raise exception 'Observaciones demasiado largas';end if;
  result:=public.cy_create_loan_with_collateral((p_data->>'client_id')::uuid,(p_data->>'principal')::numeric,
   (p_data->>'monthly_rate')::numeric,(p_data->>'months')::integer,(p_data->>'installments')::integer,
   (p_data->>'final_due')::date,p_data->>'currency',p_data->>'collateral');
  update public.cy_loans set notes=nullif(trim(p_data->>'notes'),'') where id=result and owner_id=u;
 elsif p_kind='payment' then
  select currency into cur from public.cy_loans where id=(p_data->>'loan_id')::uuid and owner_id=u;
  if cur is null or cur is distinct from p_data->>'currency' then raise exception 'La moneda debe coincidir con el préstamo';end if;
  if (p_data->>'paid_on')::date is null or (p_data->>'paid_on')::date>current_date then raise exception 'Fecha de abono inválida';end if;
  if coalesce(p_data->>'payment_method','') not in ('Efectivo','Transferencia','Yape','Plin','Otro') then raise exception 'Selecciona el medio de pago';end if;
  perform set_config('cobra.v371.payment_meta',jsonb_build_object('loan_id',p_data->>'loan_id','paid_on',p_data->>'paid_on','payment_method',p_data->>'payment_method')::text,true);
  result:=public.cy_record_payment((p_data->>'loan_id')::uuid,(p_data->>'amount')::numeric,p_data->>'memo');
  perform set_config('cobra.v371.payment_meta','',true);
 elsif p_kind='extend' then
  perform public.cy_extend_loan_months((p_data->>'loan_id')::uuid,(p_data->>'months')::integer,p_data->>'reason');result:=(p_data->>'loan_id')::uuid;
 elsif p_kind='correct' then
  result:=public.cy_correct_loan((p_data->>'loan_id')::uuid,(p_data->>'principal')::numeric,(p_data->>'monthly_rate')::numeric,
   (p_data->>'months')::integer,(p_data->>'final_due')::date,p_data->>'reason');
 elsif p_kind='close' then
  perform public.cy_close_paid_loan((p_data->>'loan_id')::uuid);result:=(p_data->>'loan_id')::uuid;
 else raise exception 'Operación no disponible';end if;
 if result is null then raise exception 'Operación sin confirmación';end if;
 insert into cc_internal.cy371_requests values(u,p_request,p_kind,p_data,result,now());
 return result;
end $$;

-- Limit execution to signed-in users. All bodies recheck authorization and owner.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cy371_%' loop
  execute format('revoke all on function %s from public,anon',f.signature);
  execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
notify pgrst,'reload schema';
