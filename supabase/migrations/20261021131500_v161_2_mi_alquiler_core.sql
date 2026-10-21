-- MI ALQUILER V161.2: foundation, no commercial settlement, no messaging or external DNI calls.
-- Additive and isolated from MC/COBRA/STREAM tables and wallets.
create sequence if not exists public.ma_invite_seq start 1;
create table if not exists public.ma_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 invite_code text not null unique default ('ALQUILER'||nextval('public.ma_invite_seq')::text),
 subscription_until timestamptz,
 suspended boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.ma_properties (
 id bigint generated always as identity primary key,
 reseller_id uuid not null references auth.users(id),
 name text not null check(length(trim(name)) between 2 and 120),
 address text not null default '',
 created_at timestamptz not null default now(),
 unique(id,reseller_id)
);
create table if not exists public.ma_units (
 id bigint generated always as identity primary key,
 reseller_id uuid not null references auth.users(id),
 property_id bigint not null,
 kind text not null check(kind in ('HABITACION','LOCAL')),
 serial integer not null check(serial between 1 and 999999),
 code text generated always as ((case when kind='HABITACION' then 'H-' else 'L-' end)||lpad(serial::text,3,'0')) stored,
 alias text not null check(length(trim(alias)) between 1 and 120),
 floor text not null default '',
 daily_rate numeric(12,2) not null default 0 check(daily_rate>=0),
 monthly_rate numeric(12,2) not null default 0 check(monthly_rate>=0),
 state text not null default 'READY' check(state in ('READY','CLEANING','DISABLED')),
 created_at timestamptz not null default now(),
 foreign key(property_id,reseller_id) references public.ma_properties(id,reseller_id),
 unique(id,reseller_id), unique(reseller_id,kind,serial),
 check(daily_rate>0 or monthly_rate>0)
);
create table if not exists public.ma_tenants (
 id uuid primary key default gen_random_uuid(),
 reseller_id uuid not null references auth.users(id),
 document_type text not null check(document_type in ('DNI','CE','PASSPORT','CEDULA','OTHER')),
 document_number text not null check(length(trim(document_number)) between 4 and 40),
 full_name text not null check(length(trim(full_name)) between 2 and 160),
 whatsapp text not null default '',
 consent_whatsapp boolean not null default false,
 created_at timestamptz not null default now(),
 unique(id,reseller_id), unique(reseller_id,document_type,document_number),
 check(whatsapp='' or whatsapp ~ '^\+?[0-9]{8,15}$')
);
create table if not exists public.ma_leases (
 id uuid primary key default gen_random_uuid(),
 reseller_id uuid not null references auth.users(id),
 unit_id bigint not null, tenant_id uuid not null,
 mode text not null check(mode in ('DAY','MONTH')),
 rate numeric(12,2) not null check(rate>0),
 start_on date not null,
 periods integer not null default 1 check(periods between 1 and 3650),
 next_due_on date not null,
 end_on date,
 state text not null default 'ACTIVE' check(state in ('ACTIVE','ENDED')),
 created_at timestamptz not null default now(),
 foreign key(unit_id,reseller_id) references public.ma_units(id,reseller_id),
 foreign key(tenant_id,reseller_id) references public.ma_tenants(id,reseller_id),
 check(next_due_on>start_on),check(end_on is null or end_on>=start_on),
 unique(id,reseller_id)
);
create table if not exists public.ma_lease_events (
 id uuid primary key default gen_random_uuid(),
 reseller_id uuid not null references auth.users(id),
 lease_id uuid not null,
 kind text not null check(kind in ('START','EXTEND','END')),
 periods_delta integer not null default 0,
 due_before date,
 due_after date,
 created_at timestamptz not null default now(),
 foreign key(lease_id,reseller_id) references public.ma_leases(id,reseller_id)
);
create index if not exists ma_events_by_lease on public.ma_lease_events(lease_id,created_at);
create unique index if not exists ma_one_live_lease_per_unit on public.ma_leases(unit_id) where state='ACTIVE';
create index if not exists ma_leases_reseller_due on public.ma_leases(reseller_id,next_due_on);
create index if not exists ma_tenants_reseller_name on public.ma_tenants(reseller_id,full_name);

-- Default-deny direct modifications: all writes via owner-checking RPC.
do $m$ declare t text;begin
 foreach t in array array['ma_accounts','ma_properties','ma_units','ma_tenants','ma_leases','ma_lease_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $m$;
create policy ma_accounts_select on public.ma_accounts for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.cc_admins a where a.user_id=(select auth.uid())));
-- Guard uses SECURITY DEFINER but *never* returns tenant data and grants no cross-owner access.
create or replace function public.ma_can_use() returns boolean
language sql security definer set search_path='' stable as $$
 select auth.uid() is not null and (
  exists(select 1 from public.cc_admins x where x.user_id=auth.uid())
  or exists(select 1 from public.ma_accounts a where a.user_id=auth.uid() and not a.suspended and a.subscription_until>now())
 );
$$;
create or replace function public.ma_guard() returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or not public.ma_can_use() then raise exception 'MI ALQUILER requiere una membresia vigente';end if;
 return u;
end $$;
do $m$ declare t text;begin
 foreach t in array array['ma_properties','ma_units','ma_tenants','ma_leases','ma_lease_events'] loop
  execute format('create policy %I on public.%I for select to authenticated using (reseller_id=(select auth.uid()) and (select public.ma_can_use()))',t||'_select',t);
 end loop;
end $m$;
create or replace function public.ma_ensure_account() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a public.ma_accounts%rowtype; admin_role boolean;
begin
 if u is null then raise exception 'Inicia sesion';end if;
 insert into public.ma_accounts(user_id) values(u) on conflict(user_id) do nothing;
 select * into a from public.ma_accounts where user_id=u;
 select exists(select 1 from public.cc_admins x where x.user_id=u) into admin_role;
 return jsonb_build_object('invite_code',a.invite_code,'suspended',a.suspended,'subscription_until',a.subscription_until,
  'role',case when admin_role then 'ADMIN' else 'RESELLER' end,
  'active',admin_role or (not a.suspended and a.subscription_until>now()));
end $$;
create or replace function public.ma_add_property(p_name text,p_address text) returns bigint
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard(); v bigint;
begin
 if length(trim(coalesce(p_name,''))) not between 2 and 120 or length(coalesce(p_address,''))>250 then raise exception 'Inmueble invalido';end if;
 insert into public.ma_properties(reseller_id,name,address) values(u,trim(p_name),trim(coalesce(p_address,''))) returning id into v;
 return v;
end $$;
create or replace function public.ma_add_unit(p_property bigint,p_kind text,p_alias text,p_floor text,p_daily numeric,p_monthly numeric) returns bigint
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();s integer;v bigint;
begin
 if p_kind not in ('HABITACION','LOCAL') or length(trim(coalesce(p_alias,''))) not between 1 and 120 or
  length(coalesce(p_floor,''))>40 or p_daily is null or p_monthly is null or p_daily<0 or p_monthly<0 or
  (p_daily=0 and p_monthly=0) or greatest(p_daily,p_monthly)>100000 or
  p_daily<>round(p_daily,2) or p_monthly<>round(p_monthly,2) then raise exception 'Datos de cuarto o local invalidos';end if;
 if not exists(select 1 from public.ma_properties where id=p_property and reseller_id=u) then raise exception 'Inmueble no autorizado';end if;
 -- Serialize code allocation for this RESELLER, one H-/L- sequence each.
 perform 1 from public.ma_accounts where user_id=u for update;
 select coalesce(max(serial),0)+1 into s from public.ma_units where reseller_id=u and kind=p_kind;
 insert into public.ma_units(reseller_id,property_id,kind,serial,alias,floor,daily_rate,monthly_rate)
 values(u,p_property,p_kind,s,trim(p_alias),trim(coalesce(p_floor,'')),p_daily,p_monthly) returning id into v;
 return v;
end $$;
create or replace function public.ma_save_tenant(p_id uuid,p_kind text,p_number text,p_name text,p_whatsapp text,p_consent boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();t public.ma_tenants%rowtype;v uuid;phone text:=trim(coalesce(p_whatsapp,''));
begin
 if p_kind not in ('DNI','CE','PASSPORT','CEDULA','OTHER') or length(trim(coalesce(p_number,''))) not between 4 and 40
 or length(trim(coalesce(p_name,''))) not between 2 and 160 or (phone<>'' and phone !~ '^\+?[0-9]{8,15}$') then raise exception 'Documento o WhatsApp invalido';end if;
 if p_kind='DNI' and trim(p_number) !~ '^[0-9]{8}$' then raise exception 'DNI peruano debe tener 8 digitos';end if;
 if p_id is not null then
  select * into t from public.ma_tenants where id=p_id and reseller_id=u for update;
  if t.id is null then raise exception 'Inquilino no encontrado';end if;
  if t.document_type<>p_kind or t.document_number<>trim(p_number) then raise exception 'Documento inmutable; registra correccion supervisada';end if;
  update public.ma_tenants set full_name=trim(p_name),whatsapp=phone,consent_whatsapp=coalesce(p_consent,false)
   where id=p_id and reseller_id=u returning id into v;
 else
  insert into public.ma_tenants(reseller_id,document_type,document_number,full_name,whatsapp,consent_whatsapp)
  values(u,p_kind,trim(p_number),trim(p_name),phone,coalesce(p_consent,false))
  on conflict(reseller_id,document_type,document_number) do update set
   full_name=excluded.full_name,whatsapp=excluded.whatsapp,consent_whatsapp=excluded.consent_whatsapp
  returning id into v;
 end if;
 return v;
end $$;
create or replace function public.ma_start_lease(p_unit bigint,p_tenant uuid,p_mode text,p_start date) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();un public.ma_units%rowtype;ratev numeric;duev date;v uuid;today date:=(timezone('America/Lima',now()))::date;
begin
 if p_mode not in ('DAY','MONTH') or p_start is null or p_start>today or p_start<today-365 then raise exception 'Fecha o modalidad invalida';end if;
 select * into un from public.ma_units where id=p_unit and reseller_id=u for update;
 if un.id is null or un.state<>'READY' then raise exception 'Habitacion o local no disponible';end if;
 if not exists(select 1 from public.ma_tenants where id=p_tenant and reseller_id=u) then raise exception 'Inquilino no autorizado';end if;
 if exists(select 1 from public.ma_leases where unit_id=p_unit and reseller_id=u and state='ACTIVE') then raise exception 'Unidad ya ocupada';end if;
 ratev:=case when p_mode='DAY' then un.daily_rate else un.monthly_rate end;
 if ratev<=0 then raise exception 'Modalidad no habilitada para esta unidad';end if;
 duev:=case when p_mode='DAY' then p_start+1 else (p_start+interval '1 month')::date end;
 insert into public.ma_leases(reseller_id,unit_id,tenant_id,mode,rate,start_on,next_due_on)
 values(u,p_unit,p_tenant,p_mode,ratev,p_start,duev) returning id into v;
 insert into public.ma_lease_events(reseller_id,lease_id,kind,periods_delta,due_after) values(u,v,'START',1,duev);
 return v;
end $$;
create or replace function public.ma_extend_lease(p_lease uuid,p_more integer) returns date
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;total integer;duev date;
begin
 if p_more is null or p_more<1 or p_more>365 then raise exception 'Ampliacion invalida';end if;
 select * into l from public.ma_leases where id=p_lease and reseller_id=u for update;
 if l.id is null or l.state<>'ACTIVE' then raise exception 'Contrato no activo';end if;
 total:=l.periods+p_more;
 if total>case when l.mode='DAY' then 3650 else 120 end then raise exception 'Limite de periodos excedido';end if;
 duev:=case when l.mode='DAY' then l.start_on+total else (l.start_on+make_interval(months=>total))::date end;
 update public.ma_leases set periods=total,next_due_on=duev where id=l.id;
 insert into public.ma_lease_events(reseller_id,lease_id,kind,periods_delta,due_before,due_after) values(u,l.id,'EXTEND',p_more,l.next_due_on,duev);
 return duev;
end $$;
create or replace function public.ma_end_lease(p_lease uuid) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;
begin
 select * into l from public.ma_leases where id=p_lease and reseller_id=u for update;
 if l.id is null then raise exception 'Contrato no autorizado';end if;
 if l.state='ENDED' then return;end if;
 update public.ma_leases set state='ENDED',end_on=(timezone('America/Lima',now()))::date where id=p_lease and reseller_id=u;
 insert into public.ma_lease_events(reseller_id,lease_id,kind,periods_delta,due_before,due_after) values(u,l.id,'END',0,l.next_due_on,l.next_due_on);
 update public.ma_units set state='CLEANING' where id=l.unit_id and reseller_id=u;
end $$;
create or replace function public.ma_set_unit_state(p_unit bigint,p_state text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();
begin
 if p_state not in ('READY','CLEANING','DISABLED') then raise exception 'Estado invalido';end if;
 if exists(select 1 from public.ma_leases where unit_id=p_unit and reseller_id=u and state='ACTIVE') then raise exception 'No modificar estado mientras este ocupado';end if;
 update public.ma_units set state=p_state where id=p_unit and reseller_id=u;
 if not found then raise exception 'Unidad inexistente';end if;
end $$;
-- By default new SECURITY DEFINER functions are executable by PUBLIC; revoke before enabling role-specific calls.
do $m$ declare f text;begin
 foreach f in array array[
 'ma_can_use()','ma_guard()','ma_ensure_account()','ma_add_property(text,text)',
 'ma_add_unit(bigint,text,text,text,numeric,numeric)','ma_save_tenant(uuid,text,text,text,text,boolean)',
 'ma_start_lease(bigint,uuid,text,date)','ma_extend_lease(uuid,integer)',
 'ma_end_lease(uuid)','ma_set_unit_state(bigint,text)'
 ] loop
  execute 'revoke all on function public.'||f||' from public,anon,authenticated';
  execute 'grant execute on function public.'||f||' to authenticated';
 end loop;
end $m$;