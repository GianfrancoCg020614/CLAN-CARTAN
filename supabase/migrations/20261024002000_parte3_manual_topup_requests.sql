-- Parte 3: solicitudes declarativas, NUNCA autoacreditan saldo.
create table if not exists public.cc_clan_manual_topup_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 provider text not null check (provider in ('LEMON_DALE','BINANCE_PERSONAL')),
 amount_pen numeric(14,2) not null check (amount_pen > 0),
 declared_reference text check (char_length(declared_reference) <= 180),
 status text not null default 'PENDING_REVIEW' check (status in ('PENDING_REVIEW','REJECTED','CANCELLED','CREDITED')),
 verified_reference text unique,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewer_user_id uuid,
 check ((status = 'CREDITED' and verified_reference is not null and reviewer_user_id is not null and reviewed_at is not null) or status <> 'CREDITED')
);
alter table public.cc_clan_manual_topup_requests enable row level security;
revoke all on public.cc_clan_manual_topup_requests from anon, authenticated;
grant select,insert on public.cc_clan_manual_topup_requests to authenticated;
create policy clan_manual_topup_owner_reads on public.cc_clan_manual_topup_requests for select to authenticated using (user_id=(select auth.uid()));
create policy clan_manual_topup_owner_requests on public.cc_clan_manual_topup_requests for insert to authenticated
with check (user_id=(select auth.uid()) and status='PENDING_REVIEW' and verified_reference is null and reviewer_user_id is null and reviewed_at is null);
-- No UPDATE/DELETE for client. CREDITED status is reserved for an audited backend flow.
