-- CLAN CARTAN · Parte 3/7 (PREPARACIÓN EN STAGING)
-- No migra, descuenta ni acredita saldos heredados; traslado solo tras conciliación.
create table if not exists public.cc_clan_real_wallets (
  user_id uuid primary key references auth.users(id) on delete restrict,
  balance_pen numeric(14,2) not null default 0 check (balance_pen >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.cc_clan_activation_bonus_wallets (
  user_id uuid not null references auth.users(id) on delete restrict,
  service text not null check (service in ('COBRA_YA','MI_COCHERA','MI_ALQUILER')),
  balance_pen numeric(14,2) not null default 0 check (balance_pen >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, service)
);
create table if not exists public.cc_clan_wallet_migration_audit (
  user_id uuid primary key references auth.users(id) on delete restrict,
  source_balance_pen numeric(14,2) not null check (source_balance_pen >= 0),
  target_balance_pen numeric(14,2) not null check (target_balance_pen >= 0),
  reconciled_at timestamptz not null default now(),
  operator_note text not null,
  constraint reconciled_amounts_match check (source_balance_pen = target_balance_pen)
);
create table if not exists public.cc_clan_wallet_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  wallet_kind text not null check(wallet_kind in ('REAL','ACTIVATION_BONUS')),
  service text not null check (service in ('STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER')),
  amount_pen numeric(14,2) not null check(amount_pen <> 0),
  operation_key text not null unique,
  created_at timestamptz not null default now(),
  constraint bonus_not_for_stream_bulls check (wallet_kind <> 'ACTIVATION_BONUS' or service <> 'STREAM_BULLS')
);
alter table public.cc_clan_real_wallets enable row level security;
alter table public.cc_clan_activation_bonus_wallets enable row level security;
alter table public.cc_clan_wallet_migration_audit enable row level security;
alter table public.cc_clan_wallet_operations enable row level security;
revoke all on public.cc_clan_real_wallets from anon, authenticated;
revoke all on public.cc_clan_activation_bonus_wallets from anon, authenticated;
revoke all on public.cc_clan_wallet_migration_audit from anon, authenticated;
revoke all on public.cc_clan_wallet_operations from anon, authenticated;
grant select on public.cc_clan_real_wallets, public.cc_clan_activation_bonus_wallets, public.cc_clan_wallet_operations to authenticated;
create policy "owner_reads_clan_real" on public.cc_clan_real_wallets for select to authenticated using (user_id = (select auth.uid()));
create policy "owner_reads_clan_bonus" on public.cc_clan_activation_bonus_wallets for select to authenticated using (user_id = (select auth.uid()));
create policy "owner_reads_clan_operations" on public.cc_clan_wallet_operations for select to authenticated using (user_id = (select auth.uid()));
-- Ningún INSERT/UPDATE/DELETE concedido a usuarios. Las operaciones reales exigirán
-- una función transaccional del servidor, idempotencia y validación de pago auténtico.
-- La regla de S/5 recurrentes de referidos pertenece a Parte 4, NO a esta migración.
