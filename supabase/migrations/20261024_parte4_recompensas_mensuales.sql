-- Parte 4: registro único S/5 por referido y mes (zona America/Lima).
-- STAGING primero. No acredita fondos hasta verificar activación REAL y conectar asiento.
create table if not exists public.cc_clan_referral_monthly_rewards (
 inviter_user_id uuid not null references auth.users(id),
 referred_user_id uuid not null references auth.users(id),
 reward_month date not null,
 source_activation_key text not null unique,
 amount_pen numeric(12,2) not null default 5.00 check (amount_pen = 5.00),
 state text not null default 'PENDING' check (state in ('PENDING','PAID','REVERSED')),
 paid_wallet_operation_key text unique,
 created_at timestamptz not null default now(),
 paid_at timestamptz,
 primary key (inviter_user_id,referred_user_id,reward_month),
 constraint distinct_referral_members check (inviter_user_id <> referred_user_id),
 constraint month_first_day check (extract(day from reward_month)=1),
 constraint paid_has_operation check (state<>'PAID' or (paid_at is not null and paid_wallet_operation_key is not null))
);
create index if not exists cc_clan_rewards_state_idx on public.cc_clan_referral_monthly_rewards(state,created_at);
alter table public.cc_clan_referral_monthly_rewards enable row level security;
revoke all on public.cc_clan_referral_monthly_rewards from public,anon,authenticated;
grant all on public.cc_clan_referral_monthly_rewards to service_role;
comment on table public.cc_clan_referral_monthly_rewards is 'Registro administrativo de recompensas. No acredita saldo desde el navegador.';
