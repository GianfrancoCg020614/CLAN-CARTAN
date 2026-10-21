-- CLAN CARTAN V153: idempotencia entre recargas manuales, personales y Binance Merchant.
-- No activa recaudación ni crea saldos; solo protege las acreditaciones verificadas.
create table if not exists cc_internal.cc_verified_payment_receipts (
  provider_family text not null check (provider_family in ('LEMON_DALE','BINANCE')),
  transaction_reference text not null check (char_length(transaction_reference) between 8 and 128),
  source_table text not null check (source_table in ('cc_real_wallet_ledger','cc_admin_verified_personal_topups','cc_binance_merchant_credits')),
  source_id uuid not null,
  user_id uuid not null,
  service text not null check (service in ('COBRA_YA','STREAM_BULLS')),
  amount_pen numeric(14,2) not null check (amount_pen > 0),
  created_at timestamptz not null default now(),
  constraint cc_verified_payment_receipts_pkey primary key (provider_family,transaction_reference),
  constraint cc_verified_payment_receipts_source_unique unique (source_table,source_id)
);
alter table cc_internal.cc_verified_payment_receipts enable row level security;
revoke all on cc_internal.cc_verified_payment_receipts from public, anon, authenticated;

-- Preservar e indexar acreditaciones anteriores; detener la migración ante duplicados históricos.
insert into cc_internal.cc_verified_payment_receipts
(provider_family,transaction_reference,source_table,source_id,user_id,service,amount_pen)
select case when l.provider='LEMON_DALE' then 'LEMON_DALE' else 'BINANCE' end,
       lower(btrim(l.provider_transaction_id)), 'cc_real_wallet_ledger',l.id,l.user_id,l.service,l.amount_pen
  from public.cc_real_wallet_ledger l
union all
select case when t.provider='LEMON_DALE_PERSONAL' then 'LEMON_DALE' else 'BINANCE' end,
       lower(btrim(t.provider_transaction_id)), 'cc_admin_verified_personal_topups',t.id,t.recipient_id,t.service,t.credited_pen
  from public.cc_admin_verified_personal_topups t
union all
select 'BINANCE',lower(btrim(b.transaction_id)), 'cc_binance_merchant_credits',b.id,b.user_id,b.service,b.amount_pen
  from public.cc_binance_merchant_credits b;

create or replace function cc_internal.reserve_verified_payment_receipt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_family text;
  v_reference text;
  v_user uuid;
  v_service text;
  v_amount numeric(14,2);
begin
  if tg_table_schema<>'public' then
    raise exception 'Origen no autorizado para verificar recibos';
  end if;

  if tg_table_name='cc_real_wallet_ledger' then
    v_family:=case when new.provider='LEMON_DALE' then 'LEMON_DALE'
                   when new.provider='BINANCE' then 'BINANCE' else null end;
    v_reference:=lower(btrim(new.provider_transaction_id));
    v_user:=new.user_id;v_service:=new.service;v_amount:=new.amount_pen;
  elsif tg_table_name='cc_admin_verified_personal_topups' then
    v_family:=case when new.provider='LEMON_DALE_PERSONAL' then 'LEMON_DALE'
                   when new.provider='BINANCE_PERSONAL' then 'BINANCE' else null end;
    v_reference:=lower(btrim(new.provider_transaction_id));
    v_user:=new.recipient_id;v_service:=new.service;v_amount:=new.credited_pen;
  elsif tg_table_name='cc_binance_merchant_credits' then
    v_family:='BINANCE';v_reference:=lower(btrim(new.transaction_id));
    v_user:=new.user_id;v_service:=new.service;v_amount:=new.amount_pen;
  else
    raise exception 'Origen no autorizado para verificar recibos';
  end if;

  if v_family is null or v_reference is null or char_length(v_reference) not between 8 and 128 then
    raise exception 'Referencia verificada inválida';
  end if;

  insert into cc_internal.cc_verified_payment_receipts
    (provider_family,transaction_reference,source_table,source_id,user_id,service,amount_pen)
  values(v_family,v_reference,tg_table_name,new.id,v_user,v_service,v_amount);
  return new;
exception when unique_violation then
  raise exception using errcode='23505',
    message='Referencia de pago ya acreditada por alguna vía de recarga';
end
$function$;
revoke all on function cc_internal.reserve_verified_payment_receipt() from public, anon, authenticated;

drop trigger if exists cc_verified_payment_guard_ledger on public.cc_real_wallet_ledger;
create trigger cc_verified_payment_guard_ledger
before insert on public.cc_real_wallet_ledger
for each row execute function cc_internal.reserve_verified_payment_receipt();

drop trigger if exists cc_verified_payment_guard_personal on public.cc_admin_verified_personal_topups;
create trigger cc_verified_payment_guard_personal
before insert on public.cc_admin_verified_personal_topups
for each row execute function cc_internal.reserve_verified_payment_receipt();

drop trigger if exists cc_verified_payment_guard_binance on public.cc_binance_merchant_credits;
create trigger cc_verified_payment_guard_binance
before insert on public.cc_binance_merchant_credits
for each row execute function cc_internal.reserve_verified_payment_receipt();
