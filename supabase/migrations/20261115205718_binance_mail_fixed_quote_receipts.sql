-- V393: additive metadata and a new, isolated Binance email protocol.
-- Existing Lemon reconciliation, historical movements and manual APIs are unchanged.
create table cc_internal.binance393_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 connection_id uuid references cc_internal.recharge_mail_connections(id),
 cost_pct numeric(6,3) not null default 0.25 check(cost_pct between 0.25 and 10),
 margin_pct numeric(6,3) not null default 2 check(margin_pct between 2 and 20),
 approved_context text, updated_at timestamptz not null default now()
);
insert into cc_internal.binance393_settings(id) values(true);
create table cc_internal.binance393_market (
 id boolean primary key default true check(id), fx numeric(18,6) not null check(fx between 2 and 6),
 spot numeric(18,8) not null check(spot between 0.995 and 1.005),
 fx_at timestamptz not null, fx_next timestamptz not null, spot_at timestamptz not null,
 checked_at timestamptz not null default now()
);
create table cc_internal.binance393_payers (
 user_id uuid not null references auth.users(id), recipient text not null, payer_name text not null,
 payer_key text not null, verified_by uuid not null references auth.users(id), verified_at timestamptz not null default now(),
 primary key(user_id,recipient), unique(recipient,payer_key)
);
create table cc_internal.binance393_quotes (
 id uuid primary key, user_id uuid not null references auth.users(id),
 connection_id uuid not null references cc_internal.recharge_mail_connections(id), recipient text not null,
 payer_name text not null, payer_key text not null, usdt numeric(18,8) not null check(usdt>0),
 pen numeric(14,2) not null check(pen between 5 and 1000), gross_rate numeric(18,6) not null,
 net_rate numeric(18,6) not null check(net_rate>0), cost_pct numeric(6,3) not null,
 margin_pct numeric(6,3) not null, source text not null, fx_at timestamptz not null, spot_at timestamptz not null,
 created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 rec_id uuid unique references cc_internal.recharge_registry(id),
 state text not null default 'DRAFT' check(state in ('DRAFT','OPEN','CREDITED')),
 paid_at timestamptz, receipt_key text unique,
 check(expires_at>created_at)
);
create index binance393_quote_owner on cc_internal.binance393_quotes(user_id,created_at desc);
create index binance393_quote_match on cc_internal.binance393_quotes(recipient,payer_key,usdt,created_at,expires_at) where state in('OPEN','CREDITED');
create table cc_internal.binance393_receipts (
 receipt_key text primary key, event_id uuid not null references cc_internal.recharge_mail_events(id),
 recipient text not null,payer_name text not null,payer_key text not null,usdt numeric(18,8) not null,
 paid_at timestamptz not null, created_at timestamptz not null default clock_timestamp(),
 state text not null default 'REVIEW' check(state in('REVIEW','CREDITED')),
 reason text not null default 'PENDING_REVIEW',quote_id uuid unique references cc_internal.binance393_quotes(id),
 ledger_id uuid unique references public.cc_real_wallet_ledger(id),credited_at timestamptz,approved_by uuid references auth.users(id)
);
create index binance393_receipt_event on cc_internal.binance393_receipts(event_id);
do $$declare t text;begin
 foreach t in array array['binance393_settings','binance393_market','binance393_payers','binance393_quotes','binance393_receipts'] loop
  execute format('alter table cc_internal.%I enable row level security',t);
  execute format('revoke all on cc_internal.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on cc_internal.%I to service_role',t);
  execute format('create policy service_only on cc_internal.%I to service_role using(true) with check(true)',t);
 end loop;
end $$;

create function cc_internal.binance393_name(p_name text) returns text language sql immutable set search_path='' as $$
 select btrim(regexp_replace(translate(lower(coalesce(p_name,'')),'áéíóúüñ','aeiouun'),'[^a-z0-9]+',' ','g'))
$$;

create function public.cc393_market(p_data jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m cc_internal.binance393_market%rowtype;s cc_internal.binance393_settings%rowtype;fx numeric;spot numeric;fa timestamptz;sn timestamptz;sa timestamptz;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Solo servicio' using errcode='42501';end if;
 select * into s from cc_internal.binance393_settings where id;
 if p_data is not null then
  fx:=(p_data->>'fx')::numeric;spot:=(p_data->>'spot')::numeric;fa:=(p_data->>'fx_at')::timestamptz;sn:=(p_data->>'fx_next')::timestamptz;sa:=(p_data->>'spot_at')::timestamptz;
  if fx is null or fx not between 2 and 6 or spot is null or spot not between 0.995 and 1.005 or fa is null or sn is null or sa is null
    or fa<now()-interval '36 hours' or fa>now()+interval '5 minutes' or sn<=fa or sn>fa+interval '48 hours'
    or sa<now()-interval '3 minutes' or sa>now()+interval '30 seconds' then raise exception 'MARKET_INVALID';end if;
  select * into m from cc_internal.binance393_market where id for update;
  if found and m.checked_at>now()-interval '6 hours' and abs(fx/m.fx-1)>0.05 then raise exception 'MARKET_JUMP';end if;
  insert into cc_internal.binance393_market(id,fx,spot,fx_at,fx_next,spot_at) values(true,fx,spot,fa,sn,sa)
  on conflict(id) do update set fx=excluded.fx,spot=excluded.spot,fx_at=excluded.fx_at,fx_next=excluded.fx_next,spot_at=excluded.spot_at,checked_at=clock_timestamp();
 end if;
 select * into m from cc_internal.binance393_market where id and fx_at>=now()-interval '36 hours' and spot_at>=now()-interval '60 seconds' and fx_next+interval '5 minutes'>now();
 return jsonb_build_object('enabled',s.enabled,'configured',s.connection_id is not null,'market',case when m.id then to_jsonb(m) else null end);
end $$;

create function public.cc393_service_quote(p_user uuid,p_request uuid,p_usdt numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare s cc_internal.binance393_settings%rowtype;m cc_internal.binance393_market%rowtype;q cc_internal.binance393_quotes%rowtype;c cc_internal.recharge_mail_connections%rowtype;pn text;pk text;gross numeric;net numeric;amount numeric;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Solo servicio' using errcode='42501';end if;
 if p_user is null or p_request is null or p_usdt is null or p_usdt<=0 or p_usdt>1000 or p_usdt<>round(p_usdt,8) then raise exception 'Importe USDT inválido';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('BINANCE393:QUOTE:'||p_request::text,0));
 select * into q from cc_internal.binance393_quotes where id=p_request;
 if found then
  if q.rec_id is null and q.expires_at<=clock_timestamp() then raise exception 'QUOTE_EXPIRED' using errcode='P0393';end if;
  if q.user_id<>p_user or q.usdt<>p_usdt then raise exception 'Solicitud utilizada con otros datos' using errcode='42501';end if;
  return q.id;
 end if;
 select * into s from cc_internal.binance393_settings where id;
 select * into c from cc_internal.recharge_mail_connections where id=s.connection_id and status='CONNECTED';
 if not s.enabled or c.id is null then raise exception 'BINANCE_UNAVAILABLE';end if;
 select * into m from cc_internal.binance393_market where id and fx_at>=now()-interval '36 hours' and fx_next+interval '5 minutes'>now() and spot_at>=now()-interval '3 minutes';
 if m.id is null then raise exception 'MARKET_UNAVAILABLE';end if;
 select payer_name into pn from cc_internal.binance393_payers where user_id=p_user and recipient=lower(c.email_address);
 if pn is null then select full_name into pn from public.cc_user_details where user_id=p_user;end if;
 pk:=cc_internal.binance393_name(pn);
 if length(pk)<5 or position(' ' in pk)=0 then raise exception 'Completa tu nombre y apellido en Mi perfil';end if;
 if (select count(*) from cc_internal.binance393_quotes where user_id=p_user and created_at>now()-interval '24 hours')>=5 then raise exception 'Máximo cinco cotizaciones Binance al día';end if;
 gross:=round(m.fx*m.spot,6);net:=round(gross*(100-s.cost_pct-s.margin_pct)/100,6);amount:=round(p_usdt*net,2);
 if amount not between 5 and 1000 then raise exception 'El saldo cotizado debe estar entre S/5 y S/1000';end if;
 insert into cc_internal.binance393_quotes(id,user_id,connection_id,recipient,payer_name,payer_key,usdt,pen,gross_rate,net_rate,cost_pct,margin_pct,source,fx_at,spot_at,expires_at)
 values(p_request,p_user,c.id,lower(c.email_address),pn,pk,p_usdt,amount,gross,net,s.cost_pct,s.margin_pct,
 'Referencia USD/PEN ExchangeRate-API y USDT/USD Coinbase; tasa neta de plataforma',m.fx_at,m.spot_at,clock_timestamp()+interval '15 minutes');
 return p_request;
end $$;

create function public.cc393_accept_quote(p_quote uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();q cc_internal.binance393_quotes%rowtype;r cc_internal.recharge_registry%rowtype;created jsonb;verified boolean;begin
 if u is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 select * into q from cc_internal.binance393_quotes where id=p_quote and user_id=u for update;
 if q.id is null then raise exception 'Cotización no disponible' using errcode='42501';end if;
 if q.rec_id is null then
  if q.expires_at<=clock_timestamp() then raise exception 'QUOTE_EXPIRED';end if;
  if not coalesce((select enabled from cc_internal.binance393_settings where id),false) then raise exception 'BINANCE_UNAVAILABLE';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('BINANCE393:PAYER:'||q.recipient||':'||q.payer_key||':'||q.usdt::text,0));
  if exists(select 1 from cc_internal.binance393_quotes x join cc_internal.recharge_registry z on z.id=x.rec_id where x.id<>q.id and x.recipient=q.recipient and x.payer_key=q.payer_key and x.usdt=q.usdt and x.state='OPEN' and z.status in('PENDING','VERIFYING','CLARIFICATION') and x.expires_at>clock_timestamp()) then raise exception 'Ya existe una recarga pendiente con ese pagador e importe; ADMIN debe revisarla';end if;
  created:=public.cc_recharge_create(q.id,q.pen,'MANUAL_BANK');
  select * into r from cc_internal.recharge_registry where id=(created->>'id')::uuid and user_id=u for update;
  if r.id is null or r.requested_pen<>q.pen or r.origin<>'TOPUP' then raise exception 'Solicitud no confirmada';end if;
  update cc_internal.recharge_registry set receiver='BINANCE_PERSONAL',mode='AUTOMATIC',payment_currency='USDT',payment_amount=q.usdt,fx_rate=q.net_rate,expires_at=q.expires_at where id=r.id;
  update public.cc_real_topup_orders set expires_at=q.expires_at where id=r.origin_id and user_id=u and status='PENDING';
  update cc_internal.binance393_quotes set rec_id=r.id,state='OPEN' where id=q.id returning * into q;
 else select * into r from cc_internal.recharge_registry where id=q.rec_id and user_id=u;end if;
 select exists(select 1 from cc_internal.binance393_payers where user_id=u and recipient=q.recipient and payer_key=q.payer_key) into verified;
 return jsonb_build_object('rec_code',r.rec_code,'id',r.id,'status',r.status,'receiver','BINANCE_PERSONAL','amount_pen',q.pen,'requested_pen',q.pen,'payment_currency','USDT','payment_amount',q.usdt,'fx_rate',q.net_rate,'payer_name',q.payer_name,'payer_verified',verified,'source',q.source,'source_at',q.fx_at,'cost_pct',q.cost_pct,'margin_pct',q.margin_pct,'expires_at',q.expires_at);
end $$;

-- A new quoted request may only be credited through its consumed authenticated receipt.
create function cc_internal.binance393_ledger_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare q cc_internal.binance393_quotes%rowtype;c cc_internal.binance393_receipts%rowtype;begin
 select x.* into q from cc_internal.binance393_quotes x join cc_internal.recharge_registry r on r.id=x.rec_id where r.origin_id=new.order_id;
 if q.id is null then return new;end if;
 select * into c from cc_internal.binance393_receipts where receipt_key=q.receipt_key and quote_id=q.id and state='CREDITED';
 if c.receipt_key is null or new.user_id<>q.user_id or new.amount_pen<>q.pen or new.provider<>'BINANCE' or new.provider_transaction_id<>'BMAIL-'||c.receipt_key then raise exception 'Esta recarga Binance requiere un aviso autenticado y registrado';end if;
 return new;
end $$;
create trigger binance393_quoted_ledger_guard before insert on public.cc_real_wallet_ledger for each row execute function cc_internal.binance393_ledger_guard();

create function cc_internal.binance393_credit(p_quote uuid,p_key text,p_admin uuid default null,p_bind boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q cc_internal.binance393_quotes%rowtype;c cc_internal.binance393_receipts%rowtype;r cc_internal.recharge_registry%rowtype;o public.cc_real_topup_orders%rowtype;lid uuid;begin
 if (p_admin is null and coalesce(auth.jwt()->>'role','')<>'service_role') or (p_admin is not null and (p_admin is distinct from auth.uid() or not cc_internal.finance_admin())) then raise exception 'No autorizado' using errcode='42501';end if;
 select * into c from cc_internal.binance393_receipts where receipt_key=p_key for update;
 select * into q from cc_internal.binance393_quotes where id=p_quote for update;
 if c.receipt_key is null or q.id is null then raise exception 'Datos de conciliación incompletos';end if;
 if c.state='CREDITED' then return jsonb_build_object('status','ALREADY_CREDITED');end if;
 select * into r from cc_internal.recharge_registry where id=q.rec_id for update;
 select * into o from public.cc_real_topup_orders where id=r.origin_id and user_id=q.user_id for update;
 if r.id is null or o.id is null or r.origin<>'TOPUP' or o.currency<>'PEN' or o.service<>'STREAM_BULLS' or q.state<>'OPEN' or (p_admin is null and (r.status<>'PENDING' or o.status<>'PENDING')) or r.status not in('PENDING','VERIFYING','CLARIFICATION') or o.status not in('PENDING','EXPIRED') or r.user_id<>q.user_id or r.requested_pen<>q.pen or o.amount_pen<>q.pen or c.recipient<>q.recipient or c.usdt<>q.usdt or c.paid_at<date_trunc('second',q.created_at) or c.paid_at>q.expires_at then raise exception 'La operación no coincide con la cotización pendiente';end if;
 if p_admin is null and (c.payer_key<>q.payer_key or not exists(select 1 from cc_internal.binance393_payers where user_id=q.user_id and recipient=q.recipient and payer_key=c.payer_key)) then raise exception 'Pagador sin vinculación verificada';end if;
 if exists(select 1 from public.cc_real_wallet_ledger l where l.user_id=q.user_id and l.order_id<>o.id and l.created_at between q.created_at and clock_timestamp() and l.amount_pen=q.pen and (l.provider='BINANCE' or upper(coalesce(l.source_bank,'')) like '%BINANCE%') and not exists(select 1 from cc_internal.binance393_receipts b where b.ledger_id=l.id)) then raise exception 'Hay un crédito Binance previo que requiere revisión';end if;
 if p_bind then
  if p_admin is null then raise exception 'Solo ADMIN vincula pagadores';end if;
  insert into cc_internal.binance393_payers(user_id,recipient,payer_name,payer_key,verified_by) values(q.user_id,c.recipient,c.payer_name,c.payer_key,p_admin)
  on conflict(user_id,recipient) do update set payer_name=excluded.payer_name,payer_key=excluded.payer_key,verified_by=excluded.verified_by,verified_at=clock_timestamp();
 end if;
 update cc_internal.binance393_receipts set state='CREDITED',quote_id=q.id,approved_by=p_admin,reason=case when p_admin is null then 'AUTOMATIC_EXACT_MATCH' else 'ADMIN_VERIFIED' end where receipt_key=c.receipt_key;
 update cc_internal.binance393_quotes set state='CREDITED',paid_at=c.paid_at,receipt_key=c.receipt_key where id=q.id;
 -- Available quantity here is the actual USDT in the authenticated receipt, not invented P2P liquidity.
 update public.cc_real_topup_orders set provider='BINANCE',payment_currency='USDT',payment_amount=q.usdt,quote_rate_pen_per_usdt=q.net_rate,quote_source=q.source,quote_valid_until=q.expires_at,quote_market_rate_pen_per_usdt=q.gross_rate,quote_conversion_cost_pct=q.cost_pct,quote_protection_margin_pct=q.margin_pct,quote_available_usdt=c.usdt where id=o.id;
 insert into public.cc_real_wallet_ledger(user_id,service,order_id,provider,provider_transaction_id,amount_pen,source_bank) values(q.user_id,o.service,o.id,'BINANCE','BMAIL-'||c.receipt_key,q.pen,'BINANCE_AUTHENTICATED_MAIL') returning id into lid;
 perform set_config('cc_audit.kind','AUTOMATIC_VERIFIED_RECHARGE',true);
 perform set_config('cc_audit.concept','Recarga Binance por aviso autenticado y cotización fija',true);
 perform set_config('cc_audit.reference',r.rec_code,true);
 perform set_config('cc_audit.payment','BMAIL-'||c.receipt_key,true);
 perform set_config('cc_audit.reason','Referencia interna: fecha/hora UTC original, pagador e importe; no es ID de Binance',true);
 insert into public.cc_real_service_wallets(user_id,service,balance_pen) values(q.user_id,o.service,q.pen) on conflict(user_id,service) do update set balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen,updated_at=clock_timestamp();
 update public.cc_real_topup_orders set status='CREDITED',provider_transaction_id='BMAIL-'||c.receipt_key,verified_at=clock_timestamp(),credited_at=clock_timestamp() where id=o.id;
 update public.cc_manual_recharge_requests set status='APPROVED',bank_transaction_id='BMAIL-'||c.receipt_key,source_bank='BINANCE_AUTHENTICATED_MAIL',reviewed_by=p_admin,reviewed_at=clock_timestamp() where order_id=o.id and user_id=q.user_id;
 update cc_internal.recharge_registry set status='CREDITED',provider_reference='BMAIL-'||c.receipt_key,confirmed_at=clock_timestamp(),credited_at=clock_timestamp(),reviewed_by=p_admin where id=r.id;
 update cc_internal.binance393_receipts set ledger_id=lid,credited_at=clock_timestamp() where receipt_key=c.receipt_key;
 update cc_internal.recharge_mail_events set status='LINKED',linked_rec_id=r.id,note='Aviso Binance consumido; referencia interna BMAIL-'||c.receipt_key where id=c.event_id;
 insert into cc_internal.recharge_audit(rec_id,actor_id,action,details) values(r.id,p_admin,'BINANCE_MAIL_CREDIT',jsonb_build_object('receipt_key',c.receipt_key,'event_id',c.event_id,'provider_paid_at',c.paid_at,'usdt',q.usdt,'fixed_pen',q.pen,'internal_reference',true));
 insert into cc_internal.recharge_notifications(rec_id,user_id,event,message) values(r.id,q.user_id,'CREDITED',r.rec_code||': recarga Binance acreditada por el importe cotizado') on conflict(rec_id,event) do nothing;
 return jsonb_build_object('status','CREDITED','rec_code',r.rec_code,'amount_pen',q.pen);
end $$;

create function cc_internal.binance393_register(p_event uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e cc_internal.recharge_mail_events%rowtype;s cc_internal.binance393_settings%rowtype;m cc_internal.binance393_market%rowtype;c cc_internal.recharge_mail_connections%rowtype;k text;pk text;paid timestamptz;rid text;candidate uuid;n integer;result jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Solo servicio' using errcode='42501';end if;
 select * into e from cc_internal.recharge_mail_events where id=p_event for update;
 select * into s from cc_internal.binance393_settings where id;
 select * into c from cc_internal.recharge_mail_connections where id=e.connection_id;
 if e.id is null or e.provider_hint is distinct from 'BINANCE' or e.sender is distinct from 'do-not-reply@ses.binance.com' or e.sender_authenticated is distinct from true or e.currency_hint is distinct from 'USDT' or e.amount_hint is null or e.amount_hint<=0 or e.amount_hint<>round(e.amount_hint,8) or p_data->>'binance_receipt' is distinct from 'true' or p_data->>'recipient_signed' is distinct from 'true' or lower(p_data->>'notice_recipient') is distinct from lower(c.email_address) or s.connection_id is distinct from c.id then return jsonb_build_object('status','REVIEW_SOURCE');end if;
 pk:=cc_internal.binance393_name(e.payer_name_hint);
 if length(pk)<5 or position(' ' in pk)=0 or nullif(p_data->>'provider_paid_at','') is null then return jsonb_build_object('status','REVIEW_IDENTITY');end if;
 begin paid:=(p_data->>'provider_paid_at')::timestamptz;exception when others then return jsonb_build_object('status','REVIEW_DATE');end;
 if paid>clock_timestamp()+interval '30 seconds' or e.received_at is null or paid>e.received_at+interval '30 seconds' or paid<e.received_at-interval '48 hours' then return jsonb_build_object('status','REVIEW_DATE');end if;
 if e.status<>'UNIDENTIFIED' or e.linked_rec_id is not null then return jsonb_build_object('status','ALREADY_HANDLED');end if;
 k:=encode(sha256(convert_to(lower(c.email_address)||'|'||pk||'|'||trim_scale(e.amount_hint)::text||'|'||to_char(paid at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'UTF8')),'hex');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('BINANCE393:RECEIPT:'||k,0));
 if exists(select 1 from cc_internal.binance393_receipts where receipt_key=k) then return jsonb_build_object('status','DUPLICATE_RECEIPT','receipt_key',k);end if;
 insert into cc_internal.binance393_receipts(receipt_key,event_id,recipient,payer_name,payer_key,usdt,paid_at) values(k,e.id,lower(c.email_address),e.payer_name_hint,pk,e.amount_hint,paid);
 select count(*),min(x.id::text)::uuid into n,candidate from cc_internal.binance393_quotes x join cc_internal.recharge_registry r on r.id=x.rec_id
 where x.recipient=lower(c.email_address) and x.payer_key=pk and x.usdt=e.amount_hint and date_trunc('second',x.created_at)<=paid and paid<=least(x.expires_at,coalesce(x.paid_at,x.expires_at)) and (x.state='CREDITED' or (x.state='OPEN' and r.status='PENDING'));
 if not s.enabled then rid:='PAUSED';
 elsif n<>1 then rid:=case when n=0 then 'NO_EXACT_PENDING_MATCH' else 'AMBIGUOUS' end;
 elsif not exists(select 1 from cc_internal.binance393_quotes x join cc_internal.recharge_registry r on r.id=x.rec_id where x.id=candidate and x.state='OPEN' and r.status='PENDING') then rid:='ALREADY_HANDLED';
 elsif not exists(select 1 from cc_internal.binance393_quotes x join cc_internal.binance393_payers b on b.user_id=x.user_id and b.recipient=x.recipient and b.payer_key=pk where x.id=candidate) then rid:='PAYER_REQUIRES_ADMIN';
 else
  select * into m from cc_internal.binance393_market where id and spot_at>clock_timestamp()-interval '3 minutes' and fx_at>clock_timestamp()-interval '36 hours';
  if m.id is null or (select floor(e.amount_hint*m.fx*m.spot*(100-s.cost_pct)/100*100)/100 < x.pen from cc_internal.binance393_quotes x where x.id=candidate) then rid:='MARKET_REQUIRES_REVIEW';
  else
   begin return cc_internal.binance393_credit(candidate,k);
   exception when others then rid:='CREDIT_REQUIRES_REVIEW:'||sqlstate;end;
  end if;
 end if;
 update cc_internal.binance393_receipts set reason=rid where receipt_key=k;
 update cc_internal.recharge_mail_events set note='Binance: '||rid||'; referencia interna BMAIL-'||k where id=e.id;
 return jsonb_build_object('status','REVIEW_REQUIRED','reason',rid,'receipt_key',k);
end $$;

create function public.cc393_recharge_mail_service(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r jsonb;e uuid;decision jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Solo servicio' using errcode='42501';end if;
 r:=public.cc_recharge_mail_service(p_action,p_data);
 if p_action='mail_notice' and (r->>'recorded')::boolean then
  select id into e from cc_internal.recharge_mail_events where connection_id=(p_data->>'connection_id')::uuid and message_id=p_data->>'message_id';
  if e is not null and p_data->>'provider_hint'='BINANCE' then decision:=cc_internal.binance393_register(e,p_data);r:=r||jsonb_build_object('binance',decision);
  elsif e is not null and exists(select 1 from cc_internal.recharge_mail_events where id=e and status='LINKED' and linked_rec_id is not null) then r:=r||jsonb_build_object('reconciliation',jsonb_build_object('status','CREDITED'));end if;
 end if;
 return r;
end $$;

create function public.cc393_manual_binance_credit(p_rec_code text,p_event uuid,p_confirmed boolean,p_reason text,p_bind boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q uuid;k text;result jsonb;begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_confirmed is distinct from true or length(btrim(coalesce(p_reason,'')))<8 then raise exception 'Confirma el pagador y el ingreso e indica la evidencia';end if;
 select x.id into q from cc_internal.binance393_quotes x join cc_internal.recharge_registry r on r.id=x.rec_id where r.rec_code=upper(btrim(p_rec_code));
 if q is null then raise exception 'Esta solicitud no tiene una cotización Binance automática';end if;
 select receipt_key into k from cc_internal.binance393_receipts where event_id=p_event;
 if k is null then raise exception 'El aviso debe estar autenticado y registrar fecha/hora original';end if;
 result:=cc_internal.binance393_credit(q,k,auth.uid(),p_bind);
 insert into cc_internal.recharge_audit(actor_id,action,details) values(auth.uid(),'BINANCE_ADMIN_RECEIPT_VERIFIED',jsonb_build_object('rec_code',p_rec_code,'event_id',p_event,'reason',p_reason,'bind_name',p_bind));
 return result;
end $$;

create function public.cc393_quote_details(p_rec_code text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare q cc_internal.binance393_quotes%rowtype;r cc_internal.recharge_registry%rowtype;u uuid:=auth.uid();begin
 if u is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 select * into r from cc_internal.recharge_registry where rec_code=upper(btrim(p_rec_code)) and (user_id=u or cc_internal.finance_admin());
 if r.id is null then raise exception 'Solicitud no disponible' using errcode='42501';end if;
 select * into q from cc_internal.binance393_quotes where rec_id=r.id;
 if q.id is null then return null;end if;
 return jsonb_build_object('payer_name',q.payer_name,'usdt',q.usdt,'pen',q.pen,'net_rate',q.net_rate,'cost_pct',q.cost_pct,'margin_pct',q.margin_pct,'source',q.source,'source_at',q.fx_at,'expires_at',q.expires_at,'provider_paid_at',q.paid_at,'internal_receipt',case when q.receipt_key is not null then 'BMAIL-'||q.receipt_key end,'payer_verified',exists(select 1 from cc_internal.binance393_payers where user_id=q.user_id and recipient=q.recipient and payer_key=q.payer_key),
 'review_receipts',case when cc_internal.finance_admin() then (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select b.event_id,b.payer_name,b.usdt,b.paid_at,b.reason from cc_internal.binance393_receipts b where b.state='REVIEW' and b.recipient=q.recipient and b.usdt=q.usdt and b.paid_at>=date_trunc('second',q.created_at) and b.paid_at<=q.expires_at order by b.paid_at desc limit 50) t) else null end);
end $$;

-- No client may execute a service endpoint or any private financial helper.
do $$declare f record;begin
 for f in select p.oid::regprocedure signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname like 'cc393_%') or (n.nspname='cc_internal' and p.proname like 'binance393_%') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.nspname='public' and f.proname in ('cc393_accept_quote','cc393_manual_binance_credit','cc393_quote_details') then execute format('grant execute on function %s to authenticated',f.signature);
  elsif f.nspname='public' then execute format('grant execute on function %s to service_role',f.signature);end if;
 end loop;
end $$;
notify pgrst,'reload schema';
