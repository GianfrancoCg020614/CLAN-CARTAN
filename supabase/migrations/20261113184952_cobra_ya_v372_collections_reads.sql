-- V372: additive collection queries and account timezone preference. SECURITY INVOKER retains existing RLS.
-- No changes to historical records, financial formulas, activation or write RPCs.
-- Account preference only; no financial records are added or changed.
create table public.cy372_settings (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 timezone text not null check(length(timezone) between 1 and 80),
 updated_at timestamptz not null default now()
);
alter table public.cy372_settings enable row level security;
revoke all on public.cy372_settings from public,anon,authenticated;
grant select,insert,update on public.cy372_settings to authenticated;
create policy cy372_settings_read on public.cy372_settings for select to authenticated
 using(owner_id=auth.uid() and coalesce((public.cy371_access()->>'allowed')::boolean,false));
create policy cy372_settings_insert on public.cy372_settings for insert to authenticated
 with check(owner_id=auth.uid() and coalesce((public.cy371_access()->>'allowed')::boolean,false));
create policy cy372_settings_update on public.cy372_settings for update to authenticated
 using(owner_id=auth.uid() and coalesce((public.cy371_access()->>'allowed')::boolean,false))
 with check(owner_id=auth.uid() and coalesce((public.cy371_access()->>'allowed')::boolean,false));

create function public.cy372_context(p_timezone text default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare configured text;
begin
 if auth.uid() is null or not coalesce((public.cy371_access()->>'allowed')::boolean,false) then
  raise exception using errcode='42501',message='Activa o renueva COBRA YA para continuar.';
 end if;
 select s.timezone into configured from public.cy372_settings s where s.owner_id=auth.uid() and exists(select 1 from pg_catalog.pg_timezone_names z where z.name=s.timezone);
 p_timezone:=coalesce(p_timezone,configured,'America/Lima');
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then
  raise exception 'Zona horaria inválida';
 end if;
 return jsonb_build_object('local_date',(current_timestamp at time zone p_timezone)::date,'timezone',p_timezone,'configured',configured is not null,'verified_at',current_timestamp);
end $$;

create function public.cy372_set_timezone(p_timezone text,p_only_if_missing boolean default false) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare ctx jsonb:=public.cy372_context(p_timezone);u uuid:=auth.uid();
begin
 if p_only_if_missing then
  insert into public.cy372_settings(owner_id,timezone) values(u,ctx->>'timezone') on conflict(owner_id) do nothing;
 else
  insert into public.cy372_settings(owner_id,timezone) values(u,ctx->>'timezone') on conflict(owner_id) do update set timezone=excluded.timezone,updated_at=now();
 end if;
 return public.cy372_context();
end $$;

create function public.cy372_dashboard(p_timezone text default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare ctx jsonb:=public.cy372_context(p_timezone);u uuid:=auth.uid();d date:=(ctx->>'local_date')::date;counts jsonb;
begin
 p_timezone:=ctx->>'timezone';
 select jsonb_build_object('today',count(distinct i.loan_id) filter(where i.due_on=d),
 'tomorrow',count(distinct i.loan_id) filter(where i.due_on=d+1),
 'soon',count(distinct i.loan_id) filter(where i.due_on>d and i.due_on<=d+7),
 'late',count(distinct i.loan_id) filter(where i.due_on<d),
 'attention',count(distinct i.loan_id) filter(where i.due_on<=d)) into counts
 from public.cy_installments i join public.cy_loans l on l.id=i.loan_id and l.owner_id=u and l.status='ACTIVE'
 where i.owner_id=u and i.paid_total<i.amount;
 return public.cy371_dashboard(d)||ctx||counts||jsonb_build_object(
 'currencies',(select coalesce(jsonb_agg(currency order by currency),'[]'::jsonb) from (select distinct currency from public.cy_loans where owner_id=u) x),
 'paid',(select count(*) from public.cy_loans l where l.owner_id=u and l.status<>'CANCELLED' and exists(select 1 from public.cy_installments i where i.loan_id=l.id and i.owner_id=u) and not exists(select 1 from public.cy_installments i where i.loan_id=l.id and i.owner_id=u and i.paid_total<>i.amount)));
end $$;

create function public.cy372_agenda(p_bucket text default 'today',p_timezone text default null,
 p_currency text default null,p_limit integer default 15,p_offset integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare ctx jsonb:=public.cy372_context(p_timezone);u uuid:=auth.uid();d date:=(ctx->>'local_date')::date;r jsonb;
begin
 p_timezone:=ctx->>'timezone';
 if p_bucket is null or p_bucket not in ('today','tomorrow','soon','late','paid') then raise exception 'Filtro de agenda inválido';end if;
 with due as materialized(
  select i.loan_id,min(i.due_on) due_on,sum(i.amount-i.paid_total) amount,count(*) installments
  from public.cy_installments i where i.owner_id=u and i.paid_total<i.amount and case p_bucket
   when 'today' then i.due_on=d when 'tomorrow' then i.due_on=d+1
   when 'soon' then i.due_on>d and i.due_on<=d+7 when 'late' then i.due_on<d else false end
  group by i.loan_id
 ), filtered as materialized(
  select l.id,l.client_id,l.loan_code,c.full_name,c.alias,c.client_code,l.currency,
  coalesce(due.due_on,bal.final_due,l.first_due_on) due_on,
  case when p_bucket='paid' then 0 else due.amount end::text amount,
  greatest(0,bal.total-bal.paid)::text balance,coalesce(due.installments,0) installments,
  case when p_bucket='paid' then 'PAID' when p_bucket='late' then 'OVERDUE' when p_bucket='today' then 'TODAY' else 'UPCOMING' end state
  from public.cy_loans l join public.cy_clients c on c.id=l.client_id and c.owner_id=u
  left join due on due.loan_id=l.id
  join lateral(select sum(i.amount) total,sum(i.paid_total) paid,max(i.due_on) final_due
   from public.cy_installments i where i.loan_id=l.id and i.owner_id=u) bal on true
  where l.owner_id=u and (p_currency is null or l.currency=p_currency)
   and case when p_bucket='paid' then l.status<>'CANCELLED' and bal.total is not null and bal.total=bal.paid
    else l.status='ACTIVE' and bal.total>bal.paid and due.loan_id is not null end
 ), page as(select * from filtered order by due_on,id limit least(greatest(coalesce(p_limit,15),1),50) offset least(greatest(coalesce(p_offset,0),0),100000))
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page) order by due_on,id) from page),'[]'::jsonb),
 'total',(select count(*) from filtered),'bucket',p_bucket) into r;
 return r||ctx;
end $$;

create function public.cy372_financials(p_start date,p_end date,p_timezone text default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare ctx jsonb:=public.cy372_context(p_timezone);u uuid:=auth.uid();d date:=(ctx->>'local_date')::date;r jsonb;
begin
 p_timezone:=ctx->>'timezone';
 if p_start is null or p_end is null or p_start>p_end or p_end-p_start>3660 then raise exception 'Selecciona un periodo válido de hasta 10 años';end if;
 with loans as materialized(
  select l.id,l.currency,coalesce(c.principal,l.principal) principal,coalesce(b.total,l.total_due) total,
  coalesce(b.paid,0) paid,greatest(0,coalesce(b.total,l.total_due)-coalesce(b.paid,0)) balance
  from public.cy_loans l
  left join lateral(select x.principal from public.cy_loan_corrections x where x.loan_id=l.id and x.owner_id=u order by x.created_at desc,x.id desc limit 1) c on true
  left join lateral(select sum(i.amount) total,sum(i.paid_total) paid from public.cy_installments i where i.loan_id=l.id and i.owner_id=u) b on true
  where l.owner_id=u and l.status<>'CANCELLED'
 ), totals as(
  select currency,sum(principal) principal,sum(greatest(0,total-principal)) interest_agreed,
   sum(paid) payments_total,sum(balance) balance from loans group by currency
 ), period as(
  select l.currency,sum(p.amount) collected,count(*) payments
  from public.cy_payments p join loans l on l.id=p.loan_id
  where p.owner_id=u and coalesce(p.paid_on,(p.created_at at time zone p_timezone)::date) between p_start and p_end group by l.currency
 ), overdue as(
  select l.currency,count(*) installments,sum(i.amount-i.paid_total) amount
  from public.cy_installments i join loans l on l.id=i.loan_id
  join public.cy_loans raw on raw.id=l.id and raw.owner_id=u and raw.status='ACTIVE'
  where i.owner_id=u and i.due_on<d and i.paid_total<i.amount group by l.currency
 )
 select coalesce(jsonb_agg(jsonb_build_object('currency',t.currency,'principal',t.principal::text,
  'interest_agreed',t.interest_agreed::text,'payments_total',t.payments_total::text,'balance',t.balance::text,
  'principal_recovered',null,'principal_pending',null,'interest_collected',null,
  'collected',coalesce(p.collected,0)::text,'payment_count',coalesce(p.payments,0),
  'overdue_count',coalesce(o.installments,0),'overdue_amount',coalesce(o.amount,0)::text) order by t.currency),'[]'::jsonb)
 into r from totals t left join period p on p.currency=t.currency left join overdue o on o.currency=t.currency;
 return ctx||jsonb_build_object('rows',r,'start',p_start,'end',p_end,'allocation_available',false);
end $$;

create function public.cy372_receipt(p_payment uuid,p_timezone text default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare ctx jsonb:=public.cy372_context(p_timezone);u uuid:=auth.uid();r jsonb;
begin
 p_timezone:=ctx->>'timezone';
 select jsonb_build_object('id',p.id,'loan_id',l.id,'loan_code',l.loan_code,'full_name',c.full_name,'phone',c.phone,
 'amount',p.amount::text,'currency',l.currency,'paid_on',coalesce(p.paid_on,(p.created_at at time zone p_timezone)::date),
 'registered_at',p.created_at,'payment_method',p.payment_method,'status','Registrado',
 'current_balance',public.cy371_loan(l.id)->>'balance','balance_as_of',current_timestamp,
 'internal_receipt',true) into r
 from public.cy_payments p join public.cy_loans l on l.id=p.loan_id and l.owner_id=u
 join public.cy_clients c on c.id=l.client_id and c.owner_id=u
 where p.id=p_payment and p.owner_id=u;
 if r is null then raise exception 'Abono no disponible';end if;
 return r||ctx;
end $$;

revoke all on function public.cy372_context(text),public.cy372_set_timezone(text,boolean), public.cy372_dashboard(text),
 public.cy372_agenda(text,text,text,integer,integer),public.cy372_financials(date,date,text),public.cy372_receipt(uuid,text) from public,anon;
grant execute on function public.cy372_context(text),public.cy372_set_timezone(text,boolean),public.cy372_dashboard(text),
 public.cy372_agenda(text,text,text,integer,integer),public.cy372_financials(date,date,text),public.cy372_receipt(uuid,text) to authenticated;
notify pgrst,'reload schema';
