-- CLAN CARTAN COBRA YA, STAGING only. Extiende control de acceso
-- de la suscripción unificada al directorio y vistas de préstamos/cuotas.
-- NO COPIAR datos de clientes de producción.
create or replace function public.cc_clan_cobra_has_access(p_user_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$
 select p_user_id is not null
    and p_user_id = (select auth.uid())
    and exists(
      select 1 from public.cc_clan_cobra_access_periods period
      where period.user_id = p_user_id
        and period.starts_at <= now() and period.ends_at > now()
    );
$$;
revoke all on function public.cc_clan_cobra_has_access(uuid) from public,anon;
grant execute on function public.cc_clan_cobra_has_access(uuid) to authenticated,service_role;

create sequence if not exists public.cy_client_code_seq;
create table if not exists public.cy_clients(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 full_name text not null check(length(trim(full_name)) between 2 and 160),
 document_number text,
 phone text,
 notes text,
 created_at timestamptz not null default now(),
 email text,
 address text,
 district text,
 address_reference text,
 alias text check(alias is null or length(alias)<=80),
 client_code text default 'CY-'||lpad(nextval('public.cy_client_code_seq'::regclass)::text,6,'0'),
 unique(id,owner_id)
);
create index if not exists cy_clients_owner_created_idx on public.cy_clients(owner_id,created_at desc);

create table if not exists public.cy_loans (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 client_id uuid not null,
 principal numeric not null check(principal>0),
 interest_rate numeric not null default 0 check(interest_rate between 0 and 12000),
 term_installments integer not null check(term_installments between 1 and 360),
 currency text not null default 'PEN',
 issued_on date not null default current_date,
 first_due_on date not null,
 interval_months integer not null default 1 check(interval_months between 1 and 12),
 calculation_method text not null default 'FLAT_SIMPLE' check(calculation_method='FLAT_SIMPLE'),
 total_due numeric,
 status text not null default 'ACTIVE' check(status in ('ACTIVE','CLOSED','CANCELLED')),
 created_at timestamptz not null default now(),
 duration_months integer default 1,
 monthly_interest_rate numeric,
 constraint cy_stg_loan_owner_fk foreign key (client_id,owner_id) references public.cy_clients(id,owner_id),
 unique(id,owner_id)
);
create index if not exists cy_loans_owner_created_idx on public.cy_loans(owner_id,created_at desc);

create table if not exists public.cy_installments(
 id uuid primary key default gen_random_uuid(),
 loan_id uuid not null,
 owner_id uuid not null references auth.users(id),
 installment_number integer not null check(installment_number>0),
 due_on date not null,
 amount numeric not null check(amount>=0),
 paid_total numeric not null default 0 check(paid_total between 0 and amount),
 status text not null default 'PENDING' check(status in ('PENDING','PARTIAL','PAID')),
 created_at timestamptz not null default now(),
 foreign key(loan_id,owner_id) references public.cy_loans(id,owner_id),
 unique(loan_id,installment_number)
);
create index if not exists cy_installments_owner_due_idx on public.cy_installments(owner_id,due_on);

alter table public.cy_clients enable row level security;
alter table public.cy_loans enable row level security;
alter table public.cy_installments enable row level security;
revoke all on public.cy_clients,public.cy_loans,public.cy_installments from public,anon,authenticated;
grant select,insert,update on public.cy_clients to authenticated;
grant select on public.cy_loans,public.cy_installments to authenticated;
grant all on public.cy_clients,public.cy_loans,public.cy_installments to service_role;
grant usage on sequence public.cy_client_code_seq to authenticated,service_role;

drop policy if exists cy_clients_owner_active_read on public.cy_clients;
create policy cy_clients_owner_active_read on public.cy_clients for select to authenticated
using(owner_id=(select auth.uid()) and (select public.cc_clan_cobra_has_access(owner_id)));
drop policy if exists cy_clients_owner_active_insert on public.cy_clients;
create policy cy_clients_owner_active_insert on public.cy_clients for insert to authenticated
with check(owner_id=(select auth.uid()) and (select public.cc_clan_cobra_has_access(owner_id)));
drop policy if exists cy_clients_owner_active_update on public.cy_clients;
create policy cy_clients_owner_active_update on public.cy_clients for update to authenticated
using(owner_id=(select auth.uid()) and (select public.cc_clan_cobra_has_access(owner_id)))
with check(owner_id=(select auth.uid()) and (select public.cc_clan_cobra_has_access(owner_id)));
drop policy if exists cy_loans_owner_active_read on public.cy_loans;
create policy cy_loans_owner_active_read on public.cy_loans for select to authenticated
using(owner_id=(select auth.uid()) and (select public.cc_clan_cobra_has_access(owner_id)));
drop policy if exists cy_installments_owner_active_read on public.cy_installments;
create policy cy_installments_owner_active_read on public.cy_installments for select to authenticated
using(owner_id=(select auth.uid()) and (select public.cc_clan_cobra_has_access(owner_id)));
