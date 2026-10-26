
-- STREAM BULL'S · STAGING ONLY. Promoción a producción REQUIERE autorización expresa.
-- Entidades operativas independientes del catálogo comercial y de las billeteras.
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
create policy sb_read_accounts on public.sb_oper_accounts for select to authenticated using(owner_id=(select auth.uid()));
create policy sb_read_clients on public.sb_oper_clients for select to authenticated using(owner_id=(select auth.uid()));
create policy sb_read_contracts on public.sb_oper_contracts for select to authenticated using(owner_id=(select auth.uid()));
create policy sb_read_slots on public.sb_oper_slots for select to authenticated using(exists(select 1 from public.sb_oper_accounts a where a.id=account_id and a.owner_id=(select auth.uid())));
create policy sb_read_assignments on public.sb_oper_assignments for select to authenticated using(exists(select 1 from public.sb_oper_contracts c where c.id=contract_id and c.owner_id=(select auth.uid())));
create policy sb_read_transfers on public.sb_oper_transfers for select to authenticated using(exists(select 1 from public.sb_oper_contracts c where c.id=contract_id and c.owner_id=(select auth.uid())));
create policy sb_read_events on public.sb_oper_events for select to authenticated using(owner_id=(select auth.uid()));

-- Funciones de administración con auth.uid() y comprobaciones de propiedad
CREATE OR REPLACE FUNCTION public.sb_oper_add_account(p_service text, p_code text, p_alias text, p_start timestamp with time zone, p_end timestamp with time zone, p_capacity integer, p_allow_reuse boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();aid uuid;
begin
 if u is null then raise exception 'Autenticación requerida' using errcode='42501';end if;
 if length(btrim(coalesce(p_service,''))) not between 2 and 60
  or length(btrim(coalesce(p_code,''))) not between 2 and 50
  or p_alias is null or length(p_alias)>100
  or p_start is null or p_end is null or p_end<=p_start
  or p_capacity not between 1 and 12 or p_allow_reuse is null
 then raise exception 'Datos de cuenta inválidos';end if;
 insert into public.sb_oper_accounts(owner_id,service,code,alias,start_at,end_at,capacity,provider_allows_reassignment)
 values(u,btrim(p_service),btrim(p_code),p_alias,p_start,p_end,p_capacity,p_allow_reuse)
 returning id into aid;
 insert into public.sb_oper_slots(account_id,position)
 select aid,i from generate_series(1,p_capacity) i;
 return jsonb_build_object('id',aid,'capacity',p_capacity);
end $function$;
revoke all on function sb_oper_add_account(text,text,text,timestamp with time zone,timestamp with time zone,integer,boolean) from public,anon;
grant execute on function sb_oper_add_account(text,text,text,timestamp with time zone,timestamp with time zone,integer,boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_add_client(p_slot uuid, p_client text, p_phone text, p_start timestamp with time zone, p_end timestamp with time zone, p_price numeric, p_paid numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();account public.sb_oper_accounts%rowtype;
 sl public.sb_oper_slots%rowtype;client uuid;contract uuid;assignment uuid;
begin
 if u is null then raise exception 'Autenticación requerida' using errcode='42501';end if;
 if p_slot is null or length(btrim(coalesce(p_client,''))) not between 1 and 100
  or p_start is null or p_end is null or p_end<=p_start
  or p_price is null or p_paid is null or p_price<0 or p_paid<0 or p_paid>p_price
  or p_price<>round(p_price,2) or p_paid<>round(p_paid,2)
  or (p_phone is not null and p_phone<>'' and p_phone !~ '^\+[1-9][0-9]{7,14}$')
 then raise exception 'Datos de cliente inválidos';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('SLOT:'||p_slot::text,0));
 select * into sl from public.sb_oper_slots where id=p_slot for update;
 select * into account from public.sb_oper_accounts where id=sl.account_id and owner_id=u for update;
 if not found or account.state<>'ACTIVE' or account.end_at<=now() or not account.provider_allows_reassignment
 then raise exception 'Cuenta no disponible para reasignaciones';end if;
 if exists(select 1 from public.sb_oper_assignments where slot_id=p_slot and state in ('ACTIVE','PENDING_RELEASE'))
  or exists(select 1 from public.sb_oper_transfers where dest_slot_id=p_slot and status='PENDING')
 then raise exception 'Posición ocupada';end if;
 insert into public.sb_oper_clients(owner_id,alias,phone_e164)
 values(u,btrim(p_client),nullif(p_phone,'')) returning id into client;
 insert into public.sb_oper_contracts(owner_id,client_id,service,start_at,end_at,price_pen,paid_pen)
 values(u,client,account.service,p_start,p_end,p_price,p_paid) returning id into contract;
 insert into public.sb_oper_assignments(contract_id,slot_id) values(contract,p_slot) returning id into assignment;
 insert into public.sb_oper_events(owner_id,contract_id,actor,action,payload)
 values(u,contract,u,'CLIENT_ASSIGNED',jsonb_build_object('slot',p_slot));
 return jsonb_build_object('contract_id',contract,'assignment_id',assignment,'needs_main_renewal',p_end>account.end_at);
end $function$;
revoke all on function sb_oper_add_client(uuid,text,text,timestamp with time zone,timestamp with time zone,numeric,numeric) from public,anon;
grant execute on function sb_oper_add_client(uuid,text,text,timestamp with time zone,timestamp with time zone,numeric,numeric) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_confirm_transfer(p_transfer uuid, p_origin_removed boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();tr public.sb_oper_transfers%rowtype;
 ac public.sb_oper_accounts%rowtype;c public.sb_oper_contracts%rowtype;new_as uuid;
begin
 if u is null or p_origin_removed is distinct from true then
 raise exception 'Debes verificar retirada efectiva de acceso' using errcode='42501';end if;
 select * into tr from public.sb_oper_transfers
 where id=p_transfer and operator_id=u and status='PENDING' for update;
 if not found then raise exception 'Traslado pendiente no autorizado';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('SLOT:'||tr.dest_slot_id::text,0));
 select * into c from public.sb_oper_contracts where id=tr.contract_id and owner_id=u for update;
 select a.* into ac from public.sb_oper_slots s
 join public.sb_oper_accounts a on a.id=s.account_id
 where s.id=tr.dest_slot_id and a.owner_id=u for update of a;
 if not found or ac.state<>'ACTIVE' or ac.end_at<=now()
 or not ac.provider_allows_reassignment or ac.service<>c.service
 then raise exception 'Destino ya no es apto';end if;
 if exists(select 1 from public.sb_oper_assignments
 where slot_id=tr.dest_slot_id and state in('ACTIVE','PENDING_RELEASE'))
 then raise exception 'Destino ocupado';end if;
 update public.sb_oper_assignments set state='CLOSED',removed_at=now(),removal_confirmed_at=now()
 where id=tr.origin_assignment_id and contract_id=c.id and state in('ACTIVE','PENDING_RELEASE');
 if not found then raise exception 'Asignación origen ya cambió';end if;
 insert into public.sb_oper_assignments(contract_id,slot_id)
 values(c.id,tr.dest_slot_id) returning id into new_as;
 update public.sb_oper_transfers set status='DONE',completed_at=now() where id=tr.id;
 insert into public.sb_oper_events(owner_id,contract_id,actor,action,payload)
 values(u,c.id,u,'TRANSFER_DONE',jsonb_build_object('origin',tr.origin_assignment_id,'destination',tr.dest_slot_id));
 return jsonb_build_object('ok',true,'new_assignment_id',new_as,'contract_unchanged',true);
end $function$;
revoke all on function sb_oper_confirm_transfer(uuid,boolean) from public,anon;
grant execute on function sb_oper_confirm_transfer(uuid,boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_mark_pending(p_assignment uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();c uuid;
begin
 if u is null then raise exception 'Identificación necesaria' using errcode='42501';end if;
 select a.contract_id into c from public.sb_oper_assignments a
 join public.sb_oper_contracts ct on ct.id=a.contract_id and ct.owner_id=u
 where a.id=p_assignment and a.state='ACTIVE' for update of a;
 if c is null then raise exception 'Asignación no encontrada';end if;
 update public.sb_oper_assignments set state='PENDING_RELEASE' where id=p_assignment;
 insert into public.sb_oper_events(owner_id,contract_id,actor,action) values(u,c,u,'PENDING_RELEASE');
 return true;
end $function$;
revoke all on function sb_oper_mark_pending(uuid) from public,anon;
grant execute on function sb_oper_mark_pending(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_release(p_assignment uuid, p_confirm_removed boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();c uuid;
begin
 if u is null or p_confirm_removed is distinct from true
 then raise exception 'Se requiere confirmación de retirada efectiva' using errcode='42501';end if;
 select a.contract_id into c from public.sb_oper_assignments a
 join public.sb_oper_contracts ct on ct.id=a.contract_id and ct.owner_id=u
 where a.id=p_assignment and a.state='PENDING_RELEASE' for update of a;
 if c is null then raise exception 'Marca primero pendiente de liberación';end if;
 if exists(select 1 from public.sb_oper_transfers where origin_assignment_id=p_assignment and status='PENDING')
 then raise exception 'Existe traslado pendiente';end if;
 update public.sb_oper_assignments set state='CLOSED',removed_at=now(),removal_confirmed_at=now()
 where id=p_assignment;
 insert into public.sb_oper_events(owner_id,contract_id,actor,action,payload)
 values(u,c,u,'RELEASED',jsonb_build_object('assignment',p_assignment));
 return true;
end $function$;
revoke all on function sb_oper_release(uuid,boolean) from public,anon;
grant execute on function sb_oper_release(uuid,boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_renew(p_id uuid, p_new_end timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.sb_oper_contracts%rowtype;u uuid:=auth.uid();
begin
 if u is null then raise exception 'Identificación necesaria' using errcode='42501';end if;
 select * into c from public.sb_oper_contracts where id=p_id and owner_id=u for update;
 if not found then raise exception 'Contrato no autorizado';end if;
 if p_new_end is null or p_new_end<=c.end_at or p_new_end>c.end_at+interval '366 days'
 then raise exception 'Renovación fuera de rango';end if;
 update public.sb_oper_contracts set end_at=p_new_end,status='ACTIVE' where id=p_id;
 update public.sb_oper_assignments set state='ACTIVE' where contract_id=p_id and state='PENDING_RELEASE';
 insert into public.sb_oper_events(owner_id,contract_id,actor,action,payload)
 values(u,p_id,u,'RENEW',jsonb_build_object('from',c.end_at,'to',p_new_end));
 return true;
end $function$;
revoke all on function sb_oper_renew(uuid,timestamp with time zone) from public,anon;
grant execute on function sb_oper_renew(uuid,timestamp with time zone) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_request_transfer(p_contract uuid, p_dest_slot uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();c public.sb_oper_contracts%rowtype;
 old_as public.sb_oper_assignments%rowtype;
 target_ac public.sb_oper_accounts%rowtype;
 dest_id uuid; transfer_id uuid;
begin
 if u is null or p_contract is null or p_dest_slot is null
 then raise exception 'Acceso denegado' using errcode='42501';end if;
 select * into c from public.sb_oper_contracts where id=p_contract and owner_id=u and status='ACTIVE' for update;
 if not found then raise exception 'Contrato no disponible';end if;
 select * into old_as from public.sb_oper_assignments
 where contract_id=c.id and state in ('ACTIVE','PENDING_RELEASE') for update;
 if not found then raise exception 'Asignación actual inexistente';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('SLOT:'||p_dest_slot::text,0));
 select ac.* into target_ac from public.sb_oper_slots sl
 join public.sb_oper_accounts ac on ac.id=sl.account_id
 where sl.id=p_dest_slot and ac.owner_id=u for update of ac;
 if not found or target_ac.state<>'ACTIVE' or target_ac.end_at<=now()
  or not target_ac.provider_allows_reassignment or c.service<>target_ac.service
 then raise exception 'La cuenta no permite el traslado o está vencida';end if;
 if old_as.slot_id=p_dest_slot or exists(
 select 1 from public.sb_oper_assignments where slot_id=p_dest_slot and state in ('ACTIVE','PENDING_RELEASE'))
 or exists(select 1 from public.sb_oper_transfers where dest_slot_id=p_dest_slot and status='PENDING')
 then raise exception 'Posición ocupada o reservada';end if;
 insert into public.sb_oper_transfers(contract_id,origin_assignment_id,dest_slot_id,operator_id)
 values(c.id,old_as.id,p_dest_slot,u) returning id into transfer_id;
 insert into public.sb_oper_events(owner_id,contract_id,actor,action,payload)
 values(u,c.id,u,'TRANSFER_REQUESTED',jsonb_build_object('from',old_as.slot_id,'to',p_dest_slot));
 return jsonb_build_object('transfer_id',transfer_id,'needs_extension',target_ac.end_at<c.end_at,
 'provider_change_confirmed',false);
end $function$;
revoke all on function sb_oper_request_transfer(uuid,uuid) from public,anon;
grant execute on function sb_oper_request_transfer(uuid,uuid) to authenticated;
