-- V195 / CLAN CARTAN: derechos según membresía vigente del STREAM BULL'S o ADMIN.
create or replace function public.sb_oper_has_access_v195()
returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and (
 exists(select 1 from public.cc_admins a where a.user_id=auth.uid())
 or exists(select 1 from public.cc_memberships m
 join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
 join public.cc_subscriptions s on s.membership_id=m.id
 where m.user_id=auth.uid() and m.status='ACTIVE' and s.status='ACTIVE'
 and s.start_at<=now() and s.end_at>now())
);
$$;
revoke all on function public.sb_oper_has_access_v195() from public,anon;
grant execute on function public.sb_oper_has_access_v195() to authenticated;
create table if not exists public.sb_oper_accounts(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 service text not null,code text not null,alias text not null default '',
 start_at timestamptz not null,end_at timestamptz not null,
 state text not null default 'ACTIVE' check(state in('ACTIVE','SUSPENDED','ENDED')),
 capacity integer not null default 5 check(capacity between 1 and 12),
 provider_allows_reassignment boolean not null default false,
 unique(owner_id,code),check(end_at>start_at)
);
create table if not exists public.sb_oper_slots(
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.sb_oper_accounts(id),
 position int not null check(position between 1 and 12),unique(account_id,position)
);
create table if not exists public.sb_oper_clients(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),alias text not null,
 phone_e164 text check(phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);
create table if not exists public.sb_oper_contracts(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 client_id uuid not null references public.sb_oper_clients(id),
 service text not null,
 start_at timestamptz not null,end_at timestamptz not null,
 connected_at timestamptz,price_pen numeric(12,2) not null default 0 check(price_pen>=0),
 paid_pen numeric(12,2) not null default 0 check(paid_pen>=0 and paid_pen<=price_pen),
 status text not null default 'ACTIVE' check(status in('ACTIVE','SUSPENDED','ENDED')),
 device_notes text not null default '',check(end_at>start_at)
);
create table if not exists public.sb_oper_assignments(
 id uuid primary key default gen_random_uuid(),
 contract_id uuid not null references public.sb_oper_contracts(id),
 slot_id uuid not null references public.sb_oper_slots(id),
 state text not null default 'ACTIVE' check(state in('ACTIVE','PENDING_RELEASE','CLOSED')),
 assigned_at timestamptz not null default now(),
 removed_at timestamptz,removal_confirmed_at timestamptz
);
create unique index if not exists sb_oper_one_live_slot on public.sb_oper_assignments(slot_id) where state in('ACTIVE','PENDING_RELEASE');
create unique index if not exists sb_oper_one_live_contract on public.sb_oper_assignments(contract_id) where state in('ACTIVE','PENDING_RELEASE');
create table if not exists public.sb_oper_transfers(
 id uuid primary key default gen_random_uuid(),contract_id uuid not null references public.sb_oper_contracts(id),
 origin_assignment_id uuid not null references public.sb_oper_assignments(id),
 dest_slot_id uuid not null references public.sb_oper_slots(id),
 status text not null default 'PENDING' check(status in('PENDING','DONE','CANCELLED')),
 requested_at timestamptz not null default now(),completed_at timestamptz,
 operator_id uuid not null references auth.users(id)
);
create unique index if not exists sb_oper_one_reservation on public.sb_oper_transfers(dest_slot_id) where status='PENDING';
create unique index if not exists sb_oper_one_transfer on public.sb_oper_transfers(contract_id) where status='PENDING';
create table if not exists public.sb_oper_events(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),
 contract_id uuid references public.sb_oper_contracts(id),action text not null,
 payload jsonb not null default '{}'::jsonb,actor uuid not null references auth.users(id),
 occurred_at timestamptz not null default now()
);
create index if not exists sb_oper_events_contract on public.sb_oper_events(contract_id,occurred_at desc);
alter table public.sb_oper_accounts enable row level security;
alter table public.sb_oper_slots enable row level security;
alter table public.sb_oper_clients enable row level security;
alter table public.sb_oper_contracts enable row level security;
alter table public.sb_oper_assignments enable row level security;
alter table public.sb_oper_transfers enable row level security;
alter table public.sb_oper_events enable row level security;
revoke all on public.sb_oper_accounts,public.sb_oper_slots,public.sb_oper_clients,
 public.sb_oper_contracts,public.sb_oper_assignments,public.sb_oper_transfers,
 public.sb_oper_events from public,anon,authenticated;
grant select on public.sb_oper_accounts,public.sb_oper_slots,public.sb_oper_clients,
 public.sb_oper_contracts,public.sb_oper_assignments,public.sb_oper_transfers,
 public.sb_oper_events to authenticated;
drop policy if exists sb_read_accounts on public.sb_oper_accounts;
create policy sb_read_accounts on public.sb_oper_accounts for select to authenticated using(owner_id=(select auth.uid()));
drop policy if exists sb_read_clients on public.sb_oper_clients;
create policy sb_read_clients on public.sb_oper_clients for select to authenticated using(owner_id=(select auth.uid()));
drop policy if exists sb_read_contracts on public.sb_oper_contracts;
create policy sb_read_contracts on public.sb_oper_contracts for select to authenticated using(owner_id=(select auth.uid()));
drop policy if exists sb_read_slots on public.sb_oper_slots;
create policy sb_read_slots on public.sb_oper_slots for select to authenticated using(exists(select 1 from public.sb_oper_accounts a where a.id=account_id and a.owner_id=(select auth.uid())));
drop policy if exists sb_read_assignments on public.sb_oper_assignments;
create policy sb_read_assignments on public.sb_oper_assignments for select to authenticated using(exists(select 1 from public.sb_oper_contracts c where c.id=contract_id and c.owner_id=(select auth.uid())));
drop policy if exists sb_read_transfers on public.sb_oper_transfers;
create policy sb_read_transfers on public.sb_oper_transfers for select to authenticated using(exists(select 1 from public.sb_oper_contracts c where c.id=contract_id and c.owner_id=(select auth.uid())));
drop policy if exists sb_read_events on public.sb_oper_events;
create policy sb_read_events on public.sb_oper_events for select to authenticated using(owner_id=(select auth.uid()));


-- No se almacenan contraseñas ni PIN en campos de cuenta.
alter table public.sb_oper_accounts add column if not exists account_email text;
alter table public.sb_oper_clients add column if not exists email text;
create index if not exists sb195_accounts_service on public.sb_oper_accounts(owner_id,service,end_at);
create index if not exists sb195_contracts_end on public.sb_oper_contracts(owner_id,end_at);
do $restrict$ declare tbl text;
begin
 foreach tbl in array array['sb_oper_accounts','sb_oper_slots','sb_oper_clients','sb_oper_contracts','sb_oper_assignments','sb_oper_transfers','sb_oper_events'] loop
 execute format('drop policy if exists sb195_entitled on public.%I',tbl);
 execute format('create policy sb195_entitled on public.%I as restrictive for select to authenticated using (public.sb_oper_has_access_v195())',tbl);
 end loop;
end $restrict$;
