-- V135: devolución a billetera original de compras reales (NUNCA retiro ni préstamo).
-- El saldo de prueba y los depósitos Lemon/Binance no se modifican.
create table if not exists public.cc_real_wallet_refunds (
 id uuid primary key default gen_random_uuid(),
 spend_id uuid not null references public.cc_real_wallet_spends(id),
 user_id uuid not null references auth.users(id),
 service text not null check(service in ('COBRA_YA','STREAM_BULLS')),
 amount_pen numeric(14,2) not null check(amount_pen>0 and amount_pen<=10000),
 reference text not null unique check(length(reference) between 8 and 120),
 reason text not null check(length(reason) between 3 and 160),
 created_at timestamptz not null default now()
);
create index if not exists cc_refunds_owner_date on public.cc_real_wallet_refunds(user_id,created_at desc);
create index if not exists cc_refunds_spend on public.cc_real_wallet_refunds(spend_id);
alter table public.cc_real_wallet_refunds enable row level security;
revoke all on public.cc_real_wallet_refunds from public,anon,authenticated;
grant select on public.cc_real_wallet_refunds to authenticated;
grant all on public.cc_real_wallet_refunds to service_role;
drop policy if exists cc_refunds_owner_read on public.cc_real_wallet_refunds;
create policy cc_refunds_owner_read on public.cc_real_wallet_refunds for select
 to authenticated using((select auth.uid())=user_id);

create or replace function public.cc_refund_verified_real_purchase(
 p_spend_reference text, p_refund_reference text, p_amount numeric, p_reason text
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_spend public.cc_real_wallet_spends%rowtype;
 v_existing public.cc_real_wallet_refunds%rowtype;
 v_total numeric;
 v_ref text := trim(coalesce(p_refund_reference,''));
 v_purchase text := trim(coalesce(p_spend_reference,''));
 v_reason text := trim(coalesce(p_reason,''));
begin
 if length(v_purchase) not between 8 and 120 or length(v_ref) not between 8 and 120
 or length(v_reason) not between 3 and 160
 or p_amount is null or p_amount<=0 or p_amount>10000 or p_amount<>round(p_amount,2)
 then raise exception 'Datos de reembolso inválidos'; end if;
 -- Serializa reembolsos sobre la MISMA compra aun con referencias distintas.
 select * into v_spend from public.cc_real_wallet_spends
 where reference=v_purchase for update;
 if not found then raise exception 'Compra real no encontrada'; end if;
 select * into v_existing from public.cc_real_wallet_refunds where reference=v_ref;
 if found then
   if v_existing.spend_id=v_spend.id and v_existing.user_id=v_spend.user_id
      and v_existing.service=v_spend.service and v_existing.amount_pen=p_amount
      and v_existing.reason=v_reason then return false; end if;
   raise exception 'Referencia de reembolso ya utilizada';
 end if;
 select coalesce(sum(amount_pen),0) into v_total
 from public.cc_real_wallet_refunds where spend_id=v_spend.id;
 if v_total+p_amount>v_spend.amount_pen
 then raise exception 'El total reembolsado supera la compra'; end if;
 update public.cc_real_service_wallets
 set balance_pen=balance_pen+p_amount,updated_at=now()
 where user_id=v_spend.user_id and service=v_spend.service;
 if not found then raise exception 'La billetera original no existe'; end if;
 insert into public.cc_real_wallet_refunds
 (spend_id,user_id,service,amount_pen,reference,reason)
 values(v_spend.id,v_spend.user_id,v_spend.service,p_amount,v_ref,v_reason);
 return true;
end $$;
revoke all on function public.cc_refund_verified_real_purchase(text,text,numeric,text)
 from public,anon,authenticated;
grant execute on function public.cc_refund_verified_real_purchase(text,text,numeric,text)
 to service_role;

-- Añadir historial de reembolsos sin cambiar el RPC ni el filtro RLS existentes.
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
  union all
  -- Reembolsos al saldo interno, acreditados desde el servidor contra compra real.
  select ('refund:'||r.id::text),r.created_at,r.service,'REFUND',
    r.amount_pen,'COMPLETED'::text,'INTERNAL'::text,r.reference,
    ('Reembolso: '||r.reason||' · Compra: '||s.reference),
    true
   from public.cc_real_wallet_refunds r
   join public.cc_real_wallet_spends s on s.id=r.spend_id
   where r.user_id=(select auth.uid())

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

revoke all on function public.cc_my_real_wallet_movements(text,integer) from public,anon;
grant execute on function public.cc_my_real_wallet_movements(text,integer) to authenticated,service_role;
comment on function public.cc_refund_verified_real_purchase(text,text,numeric,text)
 is 'V135: solo service_role después de comprobar compra y decisión de reembolso. No sirve para retirar efectivo.';
