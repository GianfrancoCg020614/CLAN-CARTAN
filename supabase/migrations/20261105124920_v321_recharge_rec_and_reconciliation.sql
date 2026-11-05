-- V321: REC identifica una solicitud existente; no crea otra billetera ni otra acreditación.
create table cc_internal.recharge_registry(
 id uuid primary key default gen_random_uuid(),rec_no bigint generated always as identity(start with 100000) unique,
 rec_code text generated always as ('REC-'||rec_no::text) stored unique,
 origin text not null check(origin in('TOPUP','MERCHANT')),origin_id uuid not null,user_id uuid not null references auth.users(id),
 client_request uuid unique,mode text not null check(mode in('MANUAL','AUTOMATIC')),receiver text not null,
 requested_pen numeric(14,2) not null check(requested_pen>0),payment_currency text not null,payment_amount numeric(24,8),fx_rate numeric(24,8),
 status text not null default 'PENDING' check(status in('PENDING','VERIFYING','CLARIFICATION','CREDITED','REJECTED','REVERSAL_PENDING','REVERSED')),
 provider_reference text,credit_id uuid,confirmed_at timestamptz,credited_at timestamptz,reviewed_by uuid references auth.users(id),
 created_at timestamptz not null default now(),unique(origin,origin_id)
);
create index recharge_registry_user on cc_internal.recharge_registry(user_id,created_at desc);
create index recharge_registry_status on cc_internal.recharge_registry(status,created_at desc);
create table cc_internal.recharge_audit(
 id bigint generated always as identity primary key,rec_id uuid references cc_internal.recharge_registry(id),actor_id uuid references auth.users(id),
 action text not null,details jsonb not null default '{}',created_at timestamptz not null default now()
);
create index recharge_audit_rec on cc_internal.recharge_audit(rec_id,id desc);
create trigger recharge_audit_immutable before update or delete on cc_internal.recharge_audit for each row execute function cc_internal.finance_audit_immutable();
create table cc_internal.recharge_notifications(
 id uuid primary key default gen_random_uuid(),rec_id uuid not null references cc_internal.recharge_registry(id),user_id uuid not null references auth.users(id),
 event text not null,message text not null,created_at timestamptz not null default now(),read_at timestamptz,unique(rec_id,event)
);
create table cc_internal.recharge_mail_settings(
 admin_id uuid primary key references auth.users(id),allowed_senders text[] not null default '{}',updated_at timestamptz not null default now()
);
create table cc_internal.recharge_mail_connections(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),provider text not null check(provider in('google','microsoft')),
 provider_subject text not null,email_address text not null,status text not null check(status in('CONNECTED','REAUTH_REQUIRED','DISCONNECTED')),
 token_secret_id uuid references vault.secrets(id),scan_cursor text,scan_after timestamptz,scan_started_at timestamptz,last_scan_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(owner_id,provider,provider_subject)
);
create table cc_internal.recharge_mail_oauth_states(
 state_hash text primary key,owner_id uuid not null references auth.users(id),provider text not null,verifier_secret_id uuid not null references vault.secrets(id),expires_at timestamptz not null,created_at timestamptz not null default now()
);
-- Un aviso de correo jamás es una reserva de dinero o confirmación transaccional.
create table cc_internal.recharge_mail_events(
 id uuid primary key default gen_random_uuid(),connection_id uuid not null references cc_internal.recharge_mail_connections(id),message_id text not null,
 provider_hint text,sender text not null,subject text not null,sender_authenticated boolean not null default false,
 amount_hint numeric(24,8),currency_hint text,transaction_hint text,rec_hint text,received_at timestamptz,
 status text not null default 'UNIDENTIFIED' check(status in('UNIDENTIFIED','IN_REVIEW','LINKED','IGNORED')),
 linked_rec_id uuid references cc_internal.recharge_registry(id),reviewed_by uuid references auth.users(id),note text,created_at timestamptz not null default now(),unique(connection_id,message_id)
);
create index recharge_mail_events_status on cc_internal.recharge_mail_events(status,created_at desc);
create table cc_internal.recharge_reversals(
 rec_id uuid primary key references cc_internal.recharge_registry(id),request_id uuid not null unique,bank_reference text not null unique,
 amount_pen numeric(14,2) not null check(amount_pen>0),recovered_pen numeric(14,2) not null default 0 check(recovered_pen>=0),
 reason text not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),check(recovered_pen<=amount_pen)
);
do $$declare t text;begin foreach t in array array['recharge_registry','recharge_audit','recharge_notifications','recharge_mail_settings','recharge_mail_connections','recharge_mail_oauth_states','recharge_mail_events','recharge_reversals'] loop
 execute format('alter table cc_internal.%I enable row level security',t);execute format('revoke all on cc_internal.%I from public,anon,authenticated',t);
 execute format('create policy service_only on cc_internal.%I to service_role using(true) with check(true)',t);end loop;end;$$;
create or replace function cc_internal.recharge_owner_immutable() returns trigger language plpgsql set search_path='' as $$begin
 if new.user_id<>old.user_id or new.origin<>old.origin or new.origin_id<>old.origin_id or new.requested_pen<>old.requested_pen or new.rec_no<>old.rec_no then raise exception 'El titular y origen de un REC son permanentes';end if;return new;end;$$;
create trigger recharge_owner_immutable before update on cc_internal.recharge_registry for each row execute function cc_internal.recharge_owner_immutable();
create or replace function cc_internal.recharge_register() returns trigger language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare rid uuid;state text;credit uuid;begin
 if tg_table_name='cc_real_topup_orders' then
  insert into cc_internal.recharge_registry(origin,origin_id,user_id,mode,receiver,requested_pen,payment_currency,payment_amount,fx_rate,status,provider_reference,confirmed_at,credited_at,created_at)
  values('TOPUP',new.id,new.user_id,'MANUAL',case when new.provider='BINANCE' then 'BINANCE_PERSONAL' else 'MANUAL_BANK' end,new.amount_pen,new.payment_currency,new.payment_amount,new.quote_rate_pen_per_usdt,case when new.status='CREDITED' then 'CREDITED' when new.status='REJECTED' then 'REJECTED' else 'PENDING' end,new.provider_transaction_id,new.verified_at,new.credited_at,new.created_at)
  on conflict(origin,origin_id) do nothing returning id into rid;
 else
  insert into cc_internal.recharge_registry(origin,origin_id,user_id,mode,receiver,requested_pen,payment_currency,payment_amount,status,provider_reference,credited_at,created_at)
  values('MERCHANT',new.id,new.user_id,'AUTOMATIC','BINANCE_MERCHANT',new.amount_pen,'USDT',new.expected_usdt,case when new.status='CREDITED' then 'CREDITED' when new.status='FAILED' then 'REJECTED' else 'PENDING' end,new.provider_transaction_id,new.credited_at,new.created_at)
  on conflict(origin,origin_id) do nothing returning id into rid;
 end if;
 if rid is not null then insert into cc_internal.recharge_audit(rec_id,actor_id,action,details) values(rid,auth.uid(),'REC_CREATED',jsonb_build_object('origin',tg_table_name));end if;return new;
end;$$;
create trigger recharge_register_topup after insert on public.cc_real_topup_orders for each row execute function cc_internal.recharge_register();
create trigger recharge_register_merchant after insert on public.cc_binance_merchant_orders for each row execute function cc_internal.recharge_register();
-- Identifica el historial sin acreditar dinero ni recrear operaciones.
insert into cc_internal.recharge_registry(origin,origin_id,user_id,mode,receiver,requested_pen,payment_currency,payment_amount,fx_rate,status,provider_reference,confirmed_at,credited_at,created_at)
select 'TOPUP',id,user_id,'MANUAL',case when provider='BINANCE' then 'BINANCE_PERSONAL' else 'MANUAL_BANK' end,amount_pen,payment_currency,payment_amount,quote_rate_pen_per_usdt,case when status='CREDITED' then 'CREDITED' when status='REJECTED' then 'REJECTED' else 'PENDING' end,provider_transaction_id,verified_at,credited_at,created_at from public.cc_real_topup_orders;
insert into cc_internal.recharge_registry(origin,origin_id,user_id,mode,receiver,requested_pen,payment_currency,payment_amount,status,provider_reference,credited_at,created_at)
select 'MERCHANT',id,user_id,'AUTOMATIC','BINANCE_MERCHANT',amount_pen,'USDT',expected_usdt,case when status='CREDITED' then 'CREDITED' when status in('FAILED','REJECTED') then 'REJECTED' else 'PENDING' end,provider_transaction_id,credited_at,created_at from public.cc_binance_merchant_orders;
create or replace function cc_internal.recharge_sync() returns trigger language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare rec cc_internal.recharge_registry%rowtype;state text;cid uuid;begin
 select * into rec from cc_internal.recharge_registry where origin=case when tg_table_name='cc_real_topup_orders' then 'TOPUP' else 'MERCHANT' end and origin_id=new.id for update;
 if not found then raise exception 'Recarga sin REC';end if;
 if tg_table_name='cc_binance_merchant_orders' then if new.expected_usdt is not null then update cc_internal.recharge_registry set payment_amount=new.expected_usdt,fx_rate=case when new.expected_usdt>0 then requested_pen/new.expected_usdt else null end where id=rec.id;end if;end if;
 if new.status='CREDITED' then
  if tg_table_name='cc_real_topup_orders' then
   select id into cid from public.cc_real_wallet_ledger where order_id=new.id and user_id=rec.user_id and amount_pen=rec.requested_pen;
  else select id into cid from public.cc_binance_merchant_credits where order_id=new.id and user_id=rec.user_id and amount_pen=rec.requested_pen;end if;
  if cid is null then raise exception 'No se puede marcar acreditada sin asiento financiero del mismo titular e importe';end if;
  update cc_internal.recharge_registry set status='CREDITED',provider_reference=new.provider_transaction_id,credit_id=cid,credited_at=new.credited_at,confirmed_at=now() where id=rec.id;
  insert into cc_internal.recharge_notifications(rec_id,user_id,event,message) values(rec.id,rec.user_id,'CREDITED',rec.rec_code||' acreditada en tu billetera CLAN CARTAN.') on conflict(rec_id,event) do nothing;
  insert into cc_internal.recharge_audit(rec_id,actor_id,action,details) values(rec.id,auth.uid(),'CREDIT_CONFIRMED',jsonb_build_object('credit_id',cid,'source',tg_table_name));
 elsif new.status in('REJECTED','FAILED') then
  update cc_internal.recharge_registry set status='REJECTED' where id=rec.id and status<>'CREDITED';
  insert into cc_internal.recharge_notifications(rec_id,user_id,event,message) values(rec.id,rec.user_id,'REJECTED',rec.rec_code||' rechazada sin acreditar saldo.') on conflict(rec_id,event) do nothing;
 end if;return new;
end;$$;
create trigger recharge_sync_topup after update of status on public.cc_real_topup_orders for each row when(old.status is distinct from new.status) execute function cc_internal.recharge_sync();
create trigger recharge_sync_merchant after update of status on public.cc_binance_merchant_orders for each row when(old.status is distinct from new.status) execute function cc_internal.recharge_sync();
create or replace function public.cc_recharge_my_requests() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 return jsonb_build_object('requests',coalesce((select jsonb_agg(x order by x.created_at desc) from(select r.id,r.rec_code,r.origin,r.origin_id,r.mode,r.receiver,r.requested_pen,r.payment_currency,r.payment_amount,r.fx_rate,r.status,r.provider_reference,r.confirmed_at,r.credited_at,r.created_at,case when r.origin='MERCHANT' then(select checkout_url from public.cc_binance_merchant_orders m where m.id=r.origin_id and m.user_id=auth.uid() and m.status='READY' and m.expires_at>now()) end checkout_url from cc_internal.recharge_registry r where r.user_id=auth.uid() order by created_at desc limit 200)x),'[]'),
 'notifications',coalesce((select jsonb_agg(x order by x.created_at desc) from(select id,event,message,created_at,read_at from cc_internal.recharge_notifications where user_id=auth.uid() order by created_at desc limit 50)x),'[]'));
end;$$;
create or replace function public.cc_recharge_identity_map() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'order_id',r.origin_id,'rec_code',r.rec_code)) from cc_internal.recharge_registry r left join public.cc_manual_recharge_requests q on r.origin='TOPUP' and q.order_id=r.origin_id where r.user_id=auth.uid() or cc_internal.finance_admin()),'[]');end;$$;
create or replace function public.cc_recharge_create(p_request uuid,p_amount_pen numeric,p_receiver text default 'MANUAL_BANK') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare u uuid:=auth.uid();r cc_internal.recharge_registry%rowtype;req uuid;oid uuid;full_name text;begin
 if u is null or p_request is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 if p_receiver not in('MANUAL_BANK','LEMON_DALE') or p_receiver='LEMON_DALE' and not coalesce((select enabled from public.cc_manual_recharge_public_status() limit 1),false) then raise exception 'Ese medio no tiene habilitación de recepción verificada. Solicita instrucciones a ADMIN';end if;
 perform pg_advisory_xact_lock(hashtextextended('CC-REC:'||u::text,0));
 select * into r from cc_internal.recharge_registry where client_request=p_request;
 if found then if r.user_id<>u or r.requested_pen<>p_amount_pen or r.receiver<>p_receiver then raise exception 'Referencia utilizada con otros datos' using errcode='42501';end if;return jsonb_build_object('id',r.id,'rec_code',r.rec_code,'amount_pen',r.requested_pen,'receiver',r.receiver,'status',r.status);end if;
 if p_amount_pen is null or p_amount_pen<1 or p_amount_pen>1000 or p_amount_pen<>round(p_amount_pen,2) then raise exception 'Importe inválido';end if;
 select d.full_name into full_name from public.cc_user_details d where user_id=u;
 req:=public.cc_submit_manual_recharge('STREAM_BULLS',p_amount_pen,full_name,null);
 select order_id into oid from public.cc_manual_recharge_requests where id=req and user_id=u;
 update cc_internal.recharge_registry set client_request=p_request,receiver=p_receiver where origin='TOPUP' and origin_id=oid and user_id=u returning * into r;
 if r.id is null then raise exception 'No se confirmó la solicitud REC';end if;
 return jsonb_build_object('id',r.id,'rec_code',r.rec_code,'request_id',req,'amount_pen',r.requested_pen,'receiver',r.receiver,'status',r.status);
end;$$;
-- Tarifas confirmadas por propietario en este encargo. No modifica pagos pasados.
insert into cc_internal.finance_rates(service,amount_pen,reason) values('COBRA_YA',15,'Tarifa confirmada por propietario V321'),('MI_COCHERA',15,'Tarifa confirmada por propietario V321'),('MI_ALQUILER',15,'Tarifa confirmada por propietario V321'),('STREAM_BULLS',25,'Membresía anual confirmada por propietario V321');
do $$declare d text;begin
 select pg_get_functiondef('public.cc_finance_pay_membership(text,uuid,numeric)'::regprocedure) into d;
 d:=replace(d,$old$finishes:=((starts at time zone 'America/Lima')+interval '1 month') at time zone 'America/Lima';$old$,$new$finishes:=((starts at time zone 'America/Lima')+case when p_service='STREAM_BULLS' then interval '1 year' else interval '1 month' end) at time zone 'America/Lima';$new$);
 d:=replace(d,$old$code='STREAM_MONTHLY'$old$,$new$code='STREAM_365'$new$);d:=replace(d,$old$'Membresía mensual '||p_service$old$,$new$(case when p_service='STREAM_BULLS' then 'Membresía anual ' else 'Membresía mensual ' end)||p_service$new$);execute d;
end;$$;
-- Referencia canónica adicional: conserva el texto histórico y bloquea variantes de escritura.
alter table cc_internal.cc_verified_payment_receipts add column canonical_reference text generated always as (regexp_replace(lower(transaction_reference),'[^a-z0-9]','','g')) stored;
create unique index recharge_receipt_canonical_unique on cc_internal.cc_verified_payment_receipts(canonical_reference);
create or replace function cc_internal.recharge_collect_reversals(p_user uuid) returns numeric language plpgsql set search_path='' as $$
#variable_conflict use_column
declare r record;w record;remaining numeric;take numeric;total numeric:=0;begin
 for r in select v.* from cc_internal.recharge_reversals v join cc_internal.recharge_registry q on q.id=v.rec_id where q.user_id=p_user and v.recovered_pen<v.amount_pen order by v.created_at,v.rec_id for update of v loop
  remaining:=r.amount_pen-r.recovered_pen;
  for w in select * from public.cc_real_service_wallets where user_id=p_user and balance_pen>0 order by service for update loop
   exit when remaining<=0;take:=least(remaining,w.balance_pen);
   perform cc_internal.finance_set_audit('BALANCE_CHANGE','Reversión de recarga realmente anulada','REC-REV-'||r.request_id::text,r.rec_id::text,null,r.bank_reference,r.reason);
   update public.cc_real_service_wallets set balance_pen=balance_pen-take,updated_at=now() where user_id=p_user and service=w.service;
   insert into cc_internal.recharge_audit(rec_id,actor_id,action,details) values(r.rec_id,auth.uid(),'REVERSAL_RECOVERED',jsonb_build_object('amount_pen',take,'service',w.service));
   remaining:=remaining-take;total:=total+take;
  end loop;
  update cc_internal.recharge_reversals set recovered_pen=amount_pen-remaining where rec_id=r.rec_id;
  update cc_internal.recharge_registry set status=case when remaining=0 then 'REVERSED' else 'REVERSAL_PENDING' end where id=r.rec_id;
 end loop;perform cc_internal.finance_audit_clear();return total;end;$$;
do $$declare d text;begin
 select pg_get_functiondef('cc_internal.finance_collect_debt(uuid)'::regprocedure) into d;
 d:=replace(d,'return total;','return total+cc_internal.recharge_collect_reversals(p_user);');execute d;
 select pg_get_functiondef('public.cc_finance_wallet()'::regprocedure) into d;
 d:=replace(d,$old$return jsonb_build_object('balance_pen',balance$old$,$new$select debt+coalesce(sum(v.amount_pen-v.recovered_pen),0) into debt from cc_internal.recharge_reversals v join cc_internal.recharge_registry r on r.id=v.rec_id where r.user_id=u;
 return jsonb_build_object('balance_pen',balance$new$);execute d;
end;$$;
create or replace function public.cc_recharge_admin(p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid();r cc_internal.recharge_registry%rowtype;q public.cc_manual_recharge_requests%rowtype;event cc_internal.recharge_mail_events%rowtype;
 req uuid;tx text;reason text;amount numeric;ok boolean;fromv timestamptz;tov timestamptz;begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_action='overview' then
  fromv:=coalesce((p_data->>'from')::timestamptz,now()-interval '31 days');tov:=coalesce((p_data->>'to')::timestamptz,now()+interval '1 day');
  if tov<=fromv or tov>fromv+interval '366 days' then raise exception 'Rango inválido';end if;
  return jsonb_build_object('requests',coalesce((select jsonb_agg(x order by x.created_at desc) from(select r.*,c.code as clan,d.full_name,q.payer_reference,q.bank_transaction_id,q.source_bank from cc_internal.recharge_registry r left join public.cc_clan_codes c on c.user_id=r.user_id left join public.cc_user_details d on d.user_id=r.user_id left join public.cc_manual_recharge_requests q on r.origin='TOPUP' and q.order_id=r.origin_id where r.created_at>=fromv and r.created_at<tov and (coalesce(p_data->>'status','')='' or r.status=p_data->>'status') and (coalesce(p_data->>'provider','')='' or r.receiver=p_data->>'provider') and (coalesce(p_data->>'user','')='' or upper(coalesce(c.code,''))=upper(p_data->>'user')) and (nullif(p_data->>'amount_pen','') is null or r.requested_pen=(p_data->>'amount_pen')::numeric) order by r.created_at desc limit 500)x),'[]'),
   'events',coalesce((select jsonb_agg(x order by x.created_at desc) from(select id,provider_hint,sender,subject,sender_authenticated,amount_hint,currency_hint,transaction_hint,rec_hint,received_at,status,linked_rec_id,note,created_at from cc_internal.recharge_mail_events order by created_at desc limit 200)x),'[]'),
   'audit',coalesce((select jsonb_agg(x order by x.id desc) from(select a.*,r.rec_code from cc_internal.recharge_audit a left join cc_internal.recharge_registry r on r.id=a.rec_id order by a.id desc limit 300)x),'[]'),
   'reversals',coalesce((select jsonb_agg(x order by x.created_at desc) from(select v.*,r.rec_code from cc_internal.recharge_reversals v join cc_internal.recharge_registry r on r.id=v.rec_id order by v.created_at desc limit 100)x),'[]'));
 end if;
 if p_action='save_senders' then
  if jsonb_typeof(p_data->'senders')<>'array' or jsonb_array_length(p_data->'senders')>10 then raise exception 'Máximo diez remitentes exactos';end if;
  if exists(select 1 from jsonb_array_elements_text(p_data->'senders') v where v !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') then raise exception 'Remitente inválido';end if;
  insert into cc_internal.recharge_mail_settings(admin_id,allowed_senders) values(actor,array(select lower(v) from jsonb_array_elements_text(p_data->'senders') v)) on conflict(admin_id) do update set allowed_senders=excluded.allowed_senders,updated_at=now();
  update cc_internal.recharge_mail_connections set scan_cursor=null where owner_id=actor;
  insert into cc_internal.recharge_audit(actor_id,action,details) values(actor,'MAIL_SENDERS_UPDATED',jsonb_build_object('count',jsonb_array_length(p_data->'senders')));
  return jsonb_build_object('saved',true);
 end if;
 reason:=trim(coalesce(p_data->>'reason',''));
 if p_action='ignore_notice' then
  if length(reason) not between 3 and 300 then raise exception 'Indica un motivo';end if;
  update cc_internal.recharge_mail_events set status='IGNORED',reviewed_by=actor,note=reason where id=(p_data->>'event_id')::uuid and linked_rec_id is null;
  if not found then raise exception 'Aviso no disponible';end if;insert into cc_internal.recharge_audit(actor_id,action,details) values(actor,'MAIL_NOTICE_IGNORED',jsonb_build_object('event_id',p_data->>'event_id','reason',reason));return jsonb_build_object('saved',true);
 end if;
 select * into r from cc_internal.recharge_registry where rec_code=upper(trim(p_data->>'rec_code')) for update;
 if not found then raise exception 'REC no encontrado';end if;
 if p_action='clarify' then
  if r.status not in('PENDING','VERIFYING','CLARIFICATION') or length(reason) not between 3 and 300 then raise exception 'Estado o aclaración inválidos';end if;
  update cc_internal.recharge_registry set status='CLARIFICATION',reviewed_by=actor where id=r.id;
  insert into cc_internal.recharge_notifications(rec_id,user_id,event,message) values(r.id,r.user_id,'CLARIFICATION',r.rec_code||': '||reason) on conflict(rec_id,event) do update set message=excluded.message,read_at=null;
  insert into cc_internal.recharge_audit(rec_id,actor_id,action,details) values(r.id,actor,'CLARIFICATION_REQUESTED',jsonb_build_object('reason',reason));return jsonb_build_object('saved',true);
 elsif p_action in('approve','reject') then
  if r.status='CREDITED' and p_action='approve' then return jsonb_build_object('already_processed',true);end if;
  if r.origin<>'TOPUP' or r.status not in('PENDING','VERIFYING','CLARIFICATION') then raise exception 'REC no disponible para esta decisión';end if;
  select * into q from public.cc_manual_recharge_requests where order_id=r.origin_id and user_id=r.user_id and amount_pen=r.requested_pen for update;
  if not found then raise exception 'No se encontró la solicitud manual original del titular';end if;
  if p_action='approve' then
   if p_data->>'confirmed_received' is distinct from 'true' or length(reason) not between 3 and 300 then raise exception 'Comprueba el ingreso real e indica la evidencia de conciliación';end if;
   tx:=lower(trim(p_data->>'transaction_reference'));
   if tx is null or tx !~ '^[a-z0-9_-]{8,120}$' then raise exception 'Referencia transaccional inválida';end if;
   if nullif(p_data->>'event_id','') is not null then
    select * into event from cc_internal.recharge_mail_events where id=(p_data->>'event_id')::uuid for update;
    if not found or event.linked_rec_id is not null and event.linked_rec_id<>r.id then raise exception 'Aviso ya vinculado a otro REC';end if;
   end if;
   -- Una conciliación tardía requiere comprobación y motivo; no cambia titular ni importe.
   update public.cc_real_topup_orders set expires_at=greatest(expires_at,now()+interval '1 hour') where id=r.origin_id and status='PENDING';
  elsif length(reason) not between 3 and 300 then raise exception 'Indica el motivo del rechazo';end if;
  ok:=public.cc_admin_decide_manual_recharge_v189(q.id,p_action='approve',tx,nullif(trim(p_data->>'source_bank'),''),p_action='approve');
  if ok is not true then raise exception 'No se confirmó la decisión. Actualiza antes de reintentar';end if;
  update cc_internal.recharge_registry set reviewed_by=actor where id=r.id;
  if event.id is not null then update cc_internal.recharge_mail_events set status='LINKED',linked_rec_id=r.id,reviewed_by=actor,note=reason where id=event.id;end if;
  insert into cc_internal.recharge_audit(rec_id,actor_id,action,details) values(r.id,actor,case when p_action='approve' then 'MANUAL_APPROVAL' else 'MANUAL_REJECTION' end,jsonb_build_object('reason',reason,'transaction_reference',tx,'event_id',event.id));
  return jsonb_build_object('saved',true);
 elsif p_action='reverse' then
  req:=(p_data->>'request_id')::uuid;tx:=lower(trim(p_data->>'bank_reference'));
  if req is null or p_data->>'confirmed_reversed' is distinct from 'true' or length(reason) not between 3 and 300 or coalesce(tx,'') !~ '^[a-z0-9_-]{8,120}$' then raise exception 'Confirma la anulación bancaria e indica referencia y motivo';end if;
  if exists(select 1 from cc_internal.recharge_reversals where rec_id=r.id) then return jsonb_build_object('already_processed',true);end if;
  if r.status<>'CREDITED' or r.credit_id is null then raise exception 'Solo se revierte un REC acreditado y conciliado';end if;
  insert into cc_internal.recharge_reversals(rec_id,request_id,bank_reference,amount_pen,reason,actor_id) values(r.id,req,tx,r.requested_pen,reason,actor);
  update cc_internal.recharge_registry set status='REVERSAL_PENDING' where id=r.id;
  perform cc_internal.recharge_collect_reversals(r.user_id);
  insert into cc_internal.recharge_audit(rec_id,actor_id,action,details) values(r.id,actor,'REVERSAL_REGISTERED',jsonb_build_object('amount_pen',r.requested_pen,'bank_reference',tx,'reason',reason));
  insert into cc_internal.recharge_notifications(rec_id,user_id,event,message) values(r.id,r.user_id,'REVERSAL',r.rec_code||': recarga anulada. Consulta el saldo disponible y contacta con ADMIN.') on conflict(rec_id,event) do nothing;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Acción no disponible';end;$$;
-- Los recibos ya confirmados conservan su asiento original; el REC es solo una referencia.
update cc_internal.recharge_registry r set credit_id=l.id from public.cc_real_wallet_ledger l where r.origin='TOPUP' and r.origin_id=l.order_id and r.user_id=l.user_id and r.requested_pen=l.amount_pen and r.status='CREDITED';
update cc_internal.recharge_registry r set credit_id=l.id from public.cc_binance_merchant_credits l where r.origin='MERCHANT' and r.origin_id=l.order_id and r.user_id=l.user_id and r.requested_pen=l.amount_pen and r.status='CREDITED';
create or replace function public.cc_recharge_mail_capabilities() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 return jsonb_build_object('can_connect',cc_internal.finance_admin(),'allowed_senders',coalesce((select to_jsonb(allowed_senders) from cc_internal.recharge_mail_settings where admin_id=auth.uid()),'[]'),
 'mailboxes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'provider',provider,'email_address',email_address,'status',status,'last_scan_at',last_scan_at)) from cc_internal.recharge_mail_connections where owner_id=auth.uid()),'[]'));end;$$;
create or replace function public.cc_recharge_mail_service(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid;mail cc_internal.recharge_mail_connections%rowtype;st cc_internal.recharge_mail_oauth_states%rowtype;sid uuid;old_sid uuid;tokens jsonb;eventid uuid;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Solo servicio' using errcode='42501';end if;
 actor:=nullif(p_data->>'actor_id','')::uuid;
 if p_action='oauth_claim' then
  delete from cc_internal.recharge_mail_oauth_states where state_hash=p_data->>'state_hash' and provider=p_data->>'provider' returning * into st;
  if not found then raise exception 'Autorización inválida o utilizada';end if;
  select to_jsonb(decrypted_secret) into tokens from vault.decrypted_secrets where id=st.verifier_secret_id;
  delete from vault.secrets where id=st.verifier_secret_id;
  if st.expires_at<=now() or not exists(select 1 from public.cc_admins where user_id=st.owner_id) then return jsonb_build_object('expired',true);end if;
  return jsonb_build_object('actor_id',st.owner_id,'verifier',tokens);
 end if;
 if p_action in('mail_for_disconnect','mail_disconnect') then
  select * into mail from cc_internal.recharge_mail_connections where id=(p_data->>'connection_id')::uuid and owner_id=actor for update;
  if not found then raise exception 'Buzón no autorizado' using errcode='42501';end if;
  if p_action='mail_for_disconnect' then select decrypted_secret::jsonb into tokens from vault.decrypted_secrets where id=mail.token_secret_id;return jsonb_build_object('provider',mail.provider,'tokens',tokens);end if;
  update cc_internal.recharge_mail_connections set status='DISCONNECTED',token_secret_id=null,updated_at=now() where id=mail.id;
  if mail.token_secret_id is not null then delete from vault.secrets where id=mail.token_secret_id;end if;return jsonb_build_object('saved',true);
 end if;
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor) then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_action='oauth_start' then
  if p_data->>'provider' not in('google','microsoft') or length(coalesce(p_data->>'state_hash',''))<>64 then raise exception 'Proveedor o estado inválido';end if;
  if (select count(*) from cc_internal.recharge_mail_oauth_states where owner_id=actor and created_at>now()-interval '10 minutes')>=10 then raise exception 'Demasiados intentos de conexión';end if;
  for sid in delete from cc_internal.recharge_mail_oauth_states where expires_at<now() returning verifier_secret_id loop delete from vault.secrets where id=sid;end loop;
  sid:=vault.create_secret(p_data->>'verifier');
  insert into cc_internal.recharge_mail_oauth_states(state_hash,owner_id,provider,verifier_secret_id,expires_at) values(p_data->>'state_hash',actor,p_data->>'provider',sid,now()+interval '10 minutes');return jsonb_build_object('saved',true);
 elsif p_action='oauth_save' then
  if p_data->>'provider' not in('google','microsoft') or coalesce(p_data->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(coalesce(p_data->>'subject','')) not between 1 and 320 then raise exception 'Perfil de correo inválido';end if;
  sid:=vault.create_secret((p_data->'tokens')::text);
  select token_secret_id into old_sid from cc_internal.recharge_mail_connections where owner_id=actor and provider=p_data->>'provider' and provider_subject=p_data->>'subject' for update;
  insert into cc_internal.recharge_mail_connections(owner_id,provider,provider_subject,email_address,status,token_secret_id) values(actor,p_data->>'provider',p_data->>'subject',p_data->>'email','CONNECTED',sid)
  on conflict(owner_id,provider,provider_subject) do update set email_address=excluded.email_address,status='CONNECTED',token_secret_id=excluded.token_secret_id,updated_at=now();
  if old_sid is not null then delete from vault.secrets where id=old_sid;end if;return jsonb_build_object('saved',true);
 end if;
 select * into mail from cc_internal.recharge_mail_connections where id=(p_data->>'connection_id')::uuid and owner_id=actor for update;
 if not found or mail.status<>'CONNECTED' or mail.token_secret_id is null then return jsonb_build_object('status','MAIL_DISCONNECTED');end if;
 if p_action='mail_scan_context' then
  if mail.scan_cursor is null then update cc_internal.recharge_mail_connections set scan_started_at=now(),scan_after=greatest(coalesce(last_scan_at-interval '5 minutes',now()-interval '1 day'),now()-interval '7 days') where id=mail.id returning * into mail;end if;
  select decrypted_secret::jsonb into tokens from vault.decrypted_secrets where id=mail.token_secret_id;
  return jsonb_build_object('status','READY','connection_id',mail.id,'provider',mail.provider,'tokens',tokens,'cursor',mail.scan_cursor,'after',mail.scan_after,
   'allowed_senders',coalesce((select to_jsonb(allowed_senders) from cc_internal.recharge_mail_settings where admin_id=actor),'[]'));
 elsif p_action='mail_tokens' then
  perform vault.update_secret(mail.token_secret_id,(p_data->'tokens')::text);return jsonb_build_object('saved',true);
 elsif p_action='mail_reauth' then
  update cc_internal.recharge_mail_connections set status='REAUTH_REQUIRED',updated_at=now() where id=mail.id;return jsonb_build_object('saved',true);
 elsif p_action='mail_notice' then
  if length(coalesce(p_data->>'message_id','')) not between 1 and 500 then raise exception 'Mensaje inválido';end if;
  insert into cc_internal.recharge_mail_events(connection_id,message_id,provider_hint,sender,subject,sender_authenticated,amount_hint,currency_hint,transaction_hint,rec_hint,received_at)
  values(mail.id,p_data->>'message_id',left(p_data->>'provider_hint',30),left(p_data->>'sender',320),left(p_data->>'subject',180),coalesce((p_data->>'sender_authenticated')::boolean,false),nullif(p_data->>'amount_hint','')::numeric,left(p_data->>'currency_hint',10),left(p_data->>'transaction_hint',128),left(p_data->>'rec_hint',30),least(now(),(p_data->>'received_at')::timestamptz))
  on conflict(connection_id,message_id) do nothing returning id into eventid;
  return jsonb_build_object('recorded',eventid is not null);
 elsif p_action='mail_scan_done' then
  update cc_internal.recharge_mail_connections set scan_cursor=left(nullif(p_data->>'cursor',''),4096),last_scan_at=case when nullif(p_data->>'cursor','') is null then scan_started_at else last_scan_at end where id=mail.id;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Acción de correo inválida';end;$$;
revoke all on function cc_internal.recharge_owner_immutable(),cc_internal.recharge_register(),cc_internal.recharge_sync(),cc_internal.recharge_collect_reversals(uuid) from public,anon,authenticated;
revoke all on function public.cc_recharge_create(uuid,numeric,text),public.cc_recharge_my_requests(),public.cc_recharge_identity_map(),public.cc_recharge_admin(text,jsonb),public.cc_recharge_mail_capabilities(),public.cc_recharge_mail_service(text,jsonb) from public,anon,authenticated;
grant execute on function public.cc_recharge_create(uuid,numeric,text),public.cc_recharge_my_requests(),public.cc_recharge_identity_map(),public.cc_recharge_admin(text,jsonb),public.cc_recharge_mail_capabilities() to authenticated;
grant execute on function public.cc_recharge_mail_service(text,jsonb) to service_role;

do $$declare d text;begin
 select pg_get_functiondef('public.cc_finance_admin(text,jsonb)'::regprocedure) into d;
 d:=replace(d,$old$code='STREAM_MONTHLY'$old$,$new$code='STREAM_365'$new$);execute d;
end;$$;
create or replace function public.cc_recharge_my_movements() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('movement_id','rec-reversal:'||a.id,'occurred_at',a.created_at,'service','CLAN_CARTAN','movement_type','RECHARGE_REVERSAL','amount_pen',-(a.details->>'amount_pen')::numeric,'status','COMPLETED','provider','INTERNAL','reference',r.rec_code,'description','Reversión de recarga '||r.rec_code,'affects_balance',true) order by a.id desc) from cc_internal.recharge_audit a join cc_internal.recharge_registry r on r.id=a.rec_id where a.action='REVERSAL_RECOVERED' and r.user_id=auth.uid()),'[]');end;$$;
revoke all on function public.cc_recharge_my_movements() from public,anon,authenticated;
grant execute on function public.cc_recharge_my_movements() to authenticated;

-- Desactiva nuevas ofertas mensuales; los periodos históricos permanecen intactos.
update public.cc_plans set is_active=false where code='STREAM_MONTHLY';
update public.cc_plans set is_active=true,price_pen=25 where code='STREAM_365';
