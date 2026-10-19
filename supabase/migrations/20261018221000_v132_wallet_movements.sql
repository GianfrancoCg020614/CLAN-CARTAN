-- CLAN CARTAN V132: Movimientos verdaderos de billeteras, lectura del usuario por RLS.
-- Datos de prueba, cuotas de préstamos y cartera de RESELLER NO son movimientos del saldo real.
-- Orígenes: recargas conciliadas, órdenes pendientes, transferencias propias y compras reales futuras.

-- Banco emisor: rellenar EXCLUSIVAMENTE tras comprobación independiente del proveedor.
alter table public.cc_real_wallet_ledger
  add column if not exists source_bank text
  check (length(source_bank)<=64 and source_bank !~ '[<>]');

-- Compras/suscripciones de saldo real: solo el servidor puede descontar y registrar.
create table if not exists public.cc_real_wallet_spends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  service text not null check (service in ('COBRA_YA','STREAM_BULLS')),
  kind text not null check (kind in ('PURCHASE','SUBSCRIPTION')),
  amount_pen numeric(14,2) not null check (amount_pen>0 and amount_pen<=10000),
  reference text not null unique check (length(reference) between 8 and 120),
  description text not null check (length(description) between 3 and 160),
  created_at timestamptz not null default now()
);
create index if not exists cc_real_wallet_spends_user_date
  on public.cc_real_wallet_spends (user_id,created_at desc);
alter table public.cc_real_wallet_spends enable row level security;
revoke all on public.cc_real_wallet_spends from public,anon,authenticated;
grant select on public.cc_real_wallet_spends to authenticated;
drop policy if exists cc_real_spends_own_read on public.cc_real_wallet_spends;
create policy cc_real_spends_own_read on public.cc_real_wallet_spends
 for select to authenticated using ((select auth.uid())=user_id);

-- Función opcional para futura integración de compras; NO se conecta a flujos de prueba.
-- Actúa de forma atómica e idempotente, y SOLO service_role puede llamarla.
create or replace function public.cc_charge_verified_real_wallet(
 p_user_id uuid,p_service text,p_kind text,p_amount numeric,p_reference text,p_description text
) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_existing public.cc_real_wallet_spends%rowtype;
begin
 if p_user_id is null
    or p_service not in ('COBRA_YA','STREAM_BULLS')
    or p_kind not in ('PURCHASE','SUBSCRIPTION')
    or p_amount is null or p_amount<=0 or p_amount>10000 or p_amount<>round(p_amount,2)
    or length(trim(coalesce(p_reference,''))) not between 8 and 120
    or length(trim(coalesce(p_description,''))) not between 3 and 160
 then raise exception 'Movimiento real inválido'; end if;

 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('CLANCARTAN:REAL_PURCHASE:'||p_reference,0));
 select * into v_existing from public.cc_real_wallet_spends
 where reference=p_reference;
 if found then
  if v_existing.user_id=p_user_id and v_existing.service=p_service
     and v_existing.kind=p_kind and v_existing.amount_pen=p_amount
  then return false; end if;
  raise exception 'Referencia ya usada con otros datos';
 end if;

 update public.cc_real_service_wallets set balance_pen=balance_pen-p_amount,
  updated_at=now()
 where user_id=p_user_id and service=p_service and balance_pen>=p_amount;
 if not found then raise exception 'Saldo real insuficiente'; end if;

 insert into public.cc_real_wallet_spends(user_id,service,kind,amount_pen,reference,description)
 values (p_user_id,p_service,p_kind,p_amount,trim(p_reference),trim(p_description));
 return true;
end $$;
revoke all on function public.cc_charge_verified_real_wallet(uuid,text,text,numeric,text,text)
 from public,anon,authenticated;
grant execute on function public.cc_charge_verified_real_wallet(uuid,text,text,numeric,text,text)
 to service_role;

-- RPC uniforme de solo lectura. La identidad se toma de auth.uid(): nadie elige user_id.
-- LIMIT acotado: bajo consumo Edge/PostgREST, evita traer historiales completos innecesarios.
create or replace function public.cc_my_real_wallet_movements(
 p_service text default null,
 p_limit integer default 250
)
returns table(
 movement_id text,
 occurred_at timestamptz,
 service text,
 movement_type text,
 amount_pen numeric,
 status text,
 provider text,
 reference text,
 description text,
 affects_balance boolean
)
language sql stable security invoker set search_path='' as $$
 with events as (
  -- Depósitos: solo asiento confirmado acredita saldo.
  select ('credit:'||l.id::text)::text movement_id,
    l.created_at occurred_at,l.service,'RECHARGE'::text movement_type,
    l.amount_pen,'CREDITED'::text status,l.provider,l.provider_transaction_id reference,
    ('Recarga verificada '||
      case when l.provider='LEMON_DALE' then 'Lemon/DALE'
           when l.provider='BINANCE' then 'Binance' else l.provider end||
      case when l.source_bank is not null then ' — '||l.source_bank else '' end||
      ' · Op: '||l.provider_transaction_id)::text description,
    true affects_balance
   from public.cc_real_wallet_ledger l
   where l.user_id=(select auth.uid())

  union all
  -- Legacy pendientes y fallidas; nunca registrar como ingreso ya acreditado.
  select ('request:'||o.id::text),o.created_at,o.service,'RECHARGE',
   o.amount_pen,
   case when o.status='PENDING' and o.expires_at<now() then 'EXPIRED' else o.status end,
   o.provider,coalesce(o.provider_transaction_id,o.id::text),
   ('Solicitud '||case when o.provider='LEMON_DALE' then 'Lemon/DALE' else 'Binance' end||
      ' · Op: '||o.id::text),
   false
   from public.cc_real_topup_orders o
   where o.user_id=(select auth.uid()) and o.status<>'CREDITED'

  union all
  -- Órdenes Merchant: se muestran si Binance autenticó realmente su pago.
  select ('merchant:'||m.id::text),coalesce(m.credited_at,m.created_at),
   m.service,'RECHARGE',m.amount_pen,
   case when m.status='READY' and m.expires_at<now() then 'EXPIRED'
        when m.status in ('READY','CREATING') then 'PENDING'
        else m.status end,
   'BINANCE'::text,coalesce(m.provider_transaction_id,m.merchant_trade_no),
   ('Binance Pay Merchant · Op: '||m.merchant_trade_no),
   (m.status='CREDITED')
   from public.cc_binance_merchant_orders m
   where m.user_id=(select auth.uid())

  union all
  -- Transferencia entre las DOS billeteras del MISMO usuario, como salida.
  select ('transfer-out:'||t.id::text),t.created_at,t.from_service,'TRANSFER',
    -t.amount_pen,'COMPLETED'::text,'INTERNAL'::text,t.id::text,
    ('Transferencia a '||
       case when t.to_service='COBRA_YA' then 'COBRA YA' else 'STREAM BULL’S' end),
    true
   from public.cc_real_wallet_transfers t
   where t.user_id=(select auth.uid())

  union all
  -- La misma transferencia como entrada, SOLO en la billetera destino.
  select ('transfer-in:'||t.id::text),t.created_at,t.to_service,'TRANSFER',
    t.amount_pen,'COMPLETED'::text,'INTERNAL'::text,t.id::text,
    ('Transferencia de '||
       case when t.from_service='COBRA_YA' then 'COBRA YA' else 'STREAM BULL’S' end),
    true
   from public.cc_real_wallet_transfers t
   where t.user_id=(select auth.uid())

  union all
  -- Gastos efectivos, nunca préstamos que el RESELLER gestiona para terceros.
  select ('spend:'||s.id::text),s.created_at,s.service,s.kind,
    -s.amount_pen,'COMPLETED'::text,'INTERNAL'::text,s.reference,
    s.description,true
   from public.cc_real_wallet_spends s
   where s.user_id=(select auth.uid())
 )
 select e.movement_id,e.occurred_at,e.service,e.movement_type,e.amount_pen,e.status,
        e.provider,e.reference,e.description,e.affects_balance
 from events e
 where ((select auth.uid()) is not null)
  and (p_service is null or (p_service in ('COBRA_YA','STREAM_BULLS')
       and e.service=p_service))
 order by e.occurred_at desc,e.movement_id desc
 limit least(greatest(coalesce(p_limit,250),1),500);
$$;

revoke all on function public.cc_my_real_wallet_movements(text,integer)
 from public,anon;
grant execute on function public.cc_my_real_wallet_movements(text,integer)
 to authenticated,service_role;

comment on function public.cc_my_real_wallet_movements(text,integer)
 is 'V132 lectura RLS de movimientos reales del usuario, sin datos de saldos de prueba';
