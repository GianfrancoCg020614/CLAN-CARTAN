-- CLAN CARTAN V136 · Solicitudes MANUALES de recarga monetaria real.
-- Separa formulario/orden de la acreditación en servidor, conserva RLS y el historial.
-- No habilita cobros con QR Lemon personal ni crédito no comprobado.
create table if not exists public.cc_manual_recharge_settings (
 id smallint primary key default 1 check(id=1),
 collection_enabled boolean not null default false,
 merchant_permission_verified boolean not null default false,
 qr_asset_url text,
 destination_label text,
 updated_at timestamptz not null default now(),
 constraint manual_ready_requires_qr check (
  not collection_enabled or
  (merchant_permission_verified and qr_asset_url like 'https://%' and length(qr_asset_url) <= 500
   and length(coalesce(destination_label,'')) between 3 and 120)
 )
);
insert into public.cc_manual_recharge_settings(id) values (1) on conflict(id) do nothing;
revoke all on public.cc_manual_recharge_settings from public,anon,authenticated;
grant all on public.cc_manual_recharge_settings to service_role;
alter table public.cc_manual_recharge_settings enable row level security;

create table if not exists public.cc_manual_recharge_requests (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.cc_real_topup_orders(id),
 user_id uuid not null references auth.users(id),
 service text not null check(service in ('COBRA_YA','STREAM_BULLS')),
 amount_pen numeric(14,2) not null check(amount_pen between 1 and 1000),
 payer_name text not null check(length(payer_name) between 5 and 120),
 payer_reference text check(length(payer_reference) between 4 and 120),
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
 bank_transaction_id text unique,
 source_bank text check(length(source_bank)<=64),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 constraint cc_manual_approval_complete check (
  status<>'APPROVED' or (bank_transaction_id is not null and reviewed_by is not null and reviewed_at is not null))
);
create index if not exists cc_manual_recharge_user_date on public.cc_manual_recharge_requests(user_id,created_at desc);
create index if not exists cc_manual_recharge_admin_queue on public.cc_manual_recharge_requests(status,created_at desc);
alter table public.cc_manual_recharge_requests enable row level security;
revoke all on public.cc_manual_recharge_requests from public,anon,authenticated;
grant select on public.cc_manual_recharge_requests to authenticated;
grant all on public.cc_manual_recharge_requests to service_role;
drop policy if exists cc_manual_recharge_user_select on public.cc_manual_recharge_requests;
create policy cc_manual_recharge_user_select on public.cc_manual_recharge_requests
 for select to authenticated using(user_id=(select auth.uid()));

-- Estado público para usuarios autenticados. QR nunca se expone hasta habilitación de comercio.
create or replace function public.cc_manual_recharge_public_status()
returns table(enabled boolean, qr_url text, destination text, message text)
language sql stable security definer set search_path=''
as $$
 select (s.collection_enabled and s.merchant_permission_verified),
  case when s.collection_enabled and s.merchant_permission_verified then s.qr_asset_url else null end,
  case when s.collection_enabled and s.merchant_permission_verified then s.destination_label else null end,
  case when s.collection_enabled and s.merchant_permission_verified
    then 'Cuenta recaudadora autorizada: paga el importe exacto y espera revisión del ADMIN.'
    else 'Solicitudes manuales disponibles. NO envíes dinero: falta autorizar la cuenta Lemon comercial.' end
 from public.cc_manual_recharge_settings s where id=1
$$;
revoke all on function public.cc_manual_recharge_public_status() from public,anon;
grant execute on function public.cc_manual_recharge_public_status() to authenticated,service_role;

-- Solicitud real pendiente, sin impacto en saldo. Sin autodeclaraciones de pagos confirmados.
create or replace function public.cc_submit_manual_recharge(
 p_service text,p_amount numeric,p_payer_name text,p_payer_reference text default null
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_id uuid;v_order uuid;v_name text:=trim(regexp_replace(coalesce(p_payer_name,''),'[[:space:]]+',' ','g'));
 v_ref text:=nullif(trim(coalesce(p_payer_reference,'')),'');
begin
 if v_user is null then raise exception 'Inicia sesión'; end if;
 if p_service not in ('COBRA_YA','STREAM_BULLS') or p_amount is null
    or p_amount<1 or p_amount>1000 or p_amount<>round(p_amount,2)
    or length(v_name) not between 5 and 120 or v_name !~ ' '
    or (v_ref is not null and length(v_ref) not between 4 and 120)
 then raise exception 'Datos de recarga inválidos'; end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('CC:MANUAL:USER:'||v_user::text||':'||p_service,0));
 if (select count(*) from public.cc_manual_recharge_requests
   where user_id=v_user and created_at>now()-interval '24 hours')>=3
 then raise exception 'Máximo tres solicitudes manuales cada 24 horas'; end if;
 if exists(select 1 from public.cc_manual_recharge_requests
   where user_id=v_user and service=p_service and status='PENDING')
 then raise exception 'Ya tienes una solicitud manual pendiente para esta billetera'; end if;
 insert into public.cc_real_topup_orders(
  user_id,service,amount_pen,currency,provider,status,payment_currency,payment_amount,expires_at
 ) values (
  v_user,p_service,p_amount,'PEN','LEMON_DALE','PENDING','PEN',p_amount,now()+interval '72 hours'
 ) returning id into v_order;
 insert into public.cc_manual_recharge_requests(
  order_id,user_id,service,amount_pen,payer_name,payer_reference
 ) values(v_order,v_user,p_service,p_amount,v_name,v_ref) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.cc_submit_manual_recharge(text,numeric,text,text) from public,anon;
grant execute on function public.cc_submit_manual_recharge(text,numeric,text,text) to authenticated,service_role;

-- Cola visible solo a un ADMIN registrado en cc_admins.
create or replace function public.cc_admin_manual_recharge_queue()
returns table(request_id uuid, order_id uuid, user_id uuid, service text, amount_pen numeric,
 payer_name text,payer_reference text,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null or not exists(
  select 1 from public.cc_admins where user_id=auth.uid())
 then raise exception 'Solo ADMIN'; end if;
 return query
 select r.id,r.order_id,r.user_id,r.service,r.amount_pen,r.payer_name,r.payer_reference,r.created_at
 from public.cc_manual_recharge_requests r where r.status='PENDING'
 order by r.created_at asc limit 100;
end $$;
revoke all on function public.cc_admin_manual_recharge_queue() from public,anon;
grant execute on function public.cc_admin_manual_recharge_queue() to authenticated,service_role;

-- Aprobación ADMIN: requiere depósito REAL comprobado y autorización comercial.
-- La referencia UNIQUE bloquea acreditar el mismo depósito a dos usuarios u órdenes.
create or replace function public.cc_admin_decide_manual_recharge(
 p_request uuid,p_approve boolean,p_bank_tx text default null,p_bank text default null,
 p_confirmed_received boolean default false
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_admin uuid:=auth.uid();v_req public.cc_manual_recharge_requests%rowtype;
 v_order public.cc_real_topup_orders%rowtype;v_tx text:=trim(coalesce(p_bank_tx,''));
 v_bank text:=nullif(trim(coalesce(p_bank,'')),'');
 v_ready boolean;
begin
 if v_admin is null or not exists(select 1 from public.cc_admins where user_id=v_admin)
 then raise exception 'Solo ADMIN'; end if;
 if p_request is null or p_approve is null then raise exception 'Solicitud inválida'; end if;
 select * into v_req from public.cc_manual_recharge_requests
 where id=p_request for update;
 if not found then raise exception 'Solicitud no encontrada'; end if;
 if v_req.status<>'PENDING' then return false; end if;
 if v_req.user_id=v_admin and p_approve then raise exception 'No puedes aprobar tu propia recarga'; end if;
 select * into v_order from public.cc_real_topup_orders where id=v_req.order_id for update;
 if not found or v_order.status<>'PENDING' or v_order.amount_pen<>v_req.amount_pen
 or v_order.user_id<>v_req.user_id or v_order.service<>v_req.service
 then raise exception 'La orden original no está pendiente o no coincide'; end if;

 if not p_approve then
  update public.cc_manual_recharge_requests set status='REJECTED',
   reviewed_by=v_admin,reviewed_at=now() where id=v_req.id;
  update public.cc_real_topup_orders set status='REJECTED' where id=v_order.id;
  return true;
 end if;

 select (collection_enabled and merchant_permission_verified) into v_ready
 from public.cc_manual_recharge_settings where id=1;
 if coalesce(v_ready,false) is not true
 then raise exception 'No existe autorización comercial Lemon para recibir fondos'; end if;
 if p_confirmed_received is not true then raise exception 'Debes verificar el depósito en la cuenta real'; end if;
 if length(v_tx) not between 8 and 120 or length(coalesce(v_bank,''))>64
 then raise exception 'Referencia bancaria y banco inválidos'; end if;
 if v_order.expires_at<now() then raise exception 'Solicitud vencida. Investiga el pago antes de proceder'; end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('CC:RECEIPT:LEMON:'||v_tx,0));
 if exists(select 1 from public.cc_real_wallet_ledger
           where provider='LEMON_DALE' and provider_transaction_id=v_tx)
 then raise exception 'Depósito ya usado para otra recarga'; end if;

 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
 values(v_req.user_id,v_req.service,v_req.amount_pen)
 on conflict(user_id,service) do update set
 balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen,updated_at=now();
 insert into public.cc_real_wallet_ledger(
  user_id,service,order_id,provider,provider_transaction_id,amount_pen,source_bank)
 values(v_req.user_id,v_req.service,v_req.order_id,'LEMON_DALE',v_tx,v_req.amount_pen,v_bank);
 update public.cc_real_topup_orders set status='CREDITED',
 provider_transaction_id=v_tx,verified_at=now(),credited_at=now()
 where id=v_order.id;
 update public.cc_manual_recharge_requests set status='APPROVED',
 bank_transaction_id=v_tx,source_bank=v_bank,reviewed_by=v_admin,reviewed_at=now()
 where id=v_req.id;
 return true;
end $$;
revoke all on function public.cc_admin_decide_manual_recharge(uuid,boolean,text,text,boolean)
 from public,anon;
grant execute on function public.cc_admin_decide_manual_recharge(uuid,boolean,text,text,boolean)
 to authenticated,service_role;
