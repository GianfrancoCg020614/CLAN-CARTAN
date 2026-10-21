-- MI ALQUILER V163 · aislado por RESELLER; sin cobros ni WhatsApp externos habilitados.
create sequence if not exists public.ma_invitation_seq start 1;
create table if not exists public.ma_accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 invite_code text not null unique default ('ALQUILER'||nextval('public.ma_invitation_seq')::text),
 subscription_until timestamptz, suspended boolean not null default false,
 bonus_pen numeric(12,2) not null default 0 check(bonus_pen>=0),
 created_at timestamptz not null default now()
);
create table if not exists public.ma_bonus_events(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id),actor_id uuid not null references auth.users(id),
 kind text not null check(kind in ('ADMIN_GRANT','SUBSCRIPTION')),
 amount_pen numeric(12,2) not null check(amount_pen<>0),
 created_at timestamptz not null default now()
);
create table if not exists public.ma_subscription_events(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id),method text not null check(method='BONUS'),
 amount_pen numeric(12,2) not null check(amount_pen=15),
 active_until timestamptz not null,created_at timestamptz not null default now()
);
create table if not exists public.ma_units(
 id bigint generated always as identity primary key,
 reseller_id uuid not null references auth.users(id),
 kind text not null check(kind in ('HABITACION','LOCAL')),
 building text not null check(length(trim(building)) between 2 and 120),
 address text not null default '',floor text not null default '',
 alias text not null check(length(trim(alias)) between 1 and 120),
 daily_rate numeric(12,2) not null default 0 check(daily_rate>=0),
 monthly_rate numeric(12,2) not null default 0 check(monthly_rate>=0),
 state text not null default 'READY' check(state in ('READY','CLEANING','DISABLED')),
 created_at timestamptz not null default now(),
 unique(id,reseller_id),
 check(daily_rate>0 or monthly_rate>0)
);
create table if not exists public.ma_tenants(
 id uuid primary key default gen_random_uuid(),reseller_id uuid not null references auth.users(id),
 document_type text not null check(document_type in ('DNI','CE','PASSPORT','CEDULA','OTHER')),
 document_number text not null check(length(trim(document_number)) between 4 and 40),
 full_name text not null check(length(trim(full_name)) between 2 and 160),
 whatsapp text not null default '',consent_whatsapp boolean not null default false,
 created_at timestamptz not null default now(),
 unique(reseller_id,document_type,document_number),unique(id,reseller_id)
);
create table if not exists public.ma_leases(
 id uuid primary key default gen_random_uuid(),
 reseller_id uuid not null references auth.users(id),
 unit_id bigint not null,tenant_id uuid not null,
 billing_mode text not null check(billing_mode in ('DAY','MONTH')),
 rate numeric(12,2) not null check(rate>0 and rate<=100000),
 start_on date not null,next_due_on date not null,
 end_on date,state text not null default 'ACTIVE' check(state in ('ACTIVE','ENDED')),
 guarantee_required numeric(12,2) not null default 0 check(guarantee_required>=0),
 created_at timestamptz not null default now(),
 foreign key(unit_id,reseller_id) references public.ma_units(id,reseller_id),
 foreign key(tenant_id,reseller_id) references public.ma_tenants(id,reseller_id),
 check(end_on is null or end_on>=start_on),
 unique(id,reseller_id)
);
create unique index if not exists ma_one_active_lease_per_unit on public.ma_leases(unit_id) where state='ACTIVE';
create index if not exists ma_lease_by_owner_due on public.ma_leases(reseller_id,next_due_on);
create table if not exists public.ma_ledger(
 id uuid primary key default gen_random_uuid(),request_id uuid unique,
 reseller_id uuid not null references auth.users(id),lease_id uuid not null,
 kind text not null check(kind in ('RENT','METER','FIXED','PAYMENT')),
 label text not null,period_on date,amount numeric(12,2) not null check(amount<>0),
 method text,occurred_on date not null default (timezone('America/Lima',now()))::date,
 created_at timestamptz not null default now(),
 foreign key(lease_id,reseller_id) references public.ma_leases(id,reseller_id),
 check((kind='PAYMENT' and amount<0) or (kind<>'PAYMENT' and amount>0))
);
create unique index if not exists ma_rent_period_once on public.ma_ledger(lease_id,period_on) where kind='RENT';
create unique index if not exists ma_fixed_period_once on public.ma_ledger(lease_id,label,period_on) where kind='FIXED';
create index if not exists ma_ledger_owner_date on public.ma_ledger(reseller_id,occurred_on);
create table if not exists public.ma_meter_readings(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id),lease_id uuid not null,
 service text not null check(service in ('LUZ','AGUA','GAS')),
 reading numeric(14,3) not null check(reading>=0),
 previous_reading numeric(14,3),usage numeric(14,3),
 unit_price numeric(12,4) not null check(unit_price>=0),
 reading_on date not null default (timezone('America/Lima',now()))::date,
 created_at timestamptz not null default now(),
 foreign key(lease_id,reseller_id) references public.ma_leases(id,reseller_id)
);
create index if not exists ma_reading_latest on public.ma_meter_readings(lease_id,service,created_at desc);
create table if not exists public.ma_guarantees(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id),lease_id uuid not null,
 action text not null check(action in ('RECEIVED','REFUNDED','APPLIED','RETAINED')),
 amount numeric(12,2) not null check(amount>0),
 reason text not null default '',created_at timestamptz not null default now(),
 foreign key(lease_id,reseller_id) references public.ma_leases(id,reseller_id)
);
create table if not exists public.ma_expenses(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id),unit_id bigint,
 category text not null,description text not null,
 amount numeric(12,2) not null check(amount>0),
 occurred_on date not null default (timezone('America/Lima',now()))::date,
 method text not null default 'EFECTIVO',
 created_at timestamptz not null default now(),
 foreign key(unit_id,reseller_id) references public.ma_units(id,reseller_id)
);
create table if not exists public.ma_alerts(
 id uuid primary key default gen_random_uuid(),reseller_id uuid not null references auth.users(id),
 lease_id uuid not null,due_on date not null,alert_on date not null,
 state text not null default 'PENDING' check(state in ('PENDING','OPENED','API_SENT')),
 created_at timestamptz not null default now(),opened_at timestamptz,
 foreign key(lease_id,reseller_id) references public.ma_leases(id,reseller_id),
 unique(lease_id,due_on,alert_on)
);
do $do$ declare t text;begin
 foreach t in array array['ma_accounts','ma_bonus_events','ma_subscription_events','ma_units','ma_tenants','ma_leases','ma_ledger','ma_meter_readings','ma_guarantees','ma_expenses','ma_alerts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $do$;
create policy ma_accounts_sel on public.ma_accounts for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.cc_admins x where x.user_id=(select auth.uid())));
create policy ma_bonus_sel on public.ma_bonus_events for select to authenticated using(reseller_id=(select auth.uid()) or exists(select 1 from public.cc_admins x where x.user_id=(select auth.uid())));
create policy ma_subs_sel on public.ma_subscription_events for select to authenticated using(reseller_id=(select auth.uid()) or exists(select 1 from public.cc_admins x where x.user_id=(select auth.uid())));
do $do$ declare t text;begin
 foreach t in array array['ma_units','ma_tenants','ma_leases','ma_ledger','ma_meter_readings','ma_guarantees','ma_expenses','ma_alerts'] loop
  execute format('create policy %I on public.%I for select to authenticated using (exists(select 1 from public.cc_admins x where x.user_id=(select auth.uid())) or (reseller_id=(select auth.uid()) and exists(select 1 from public.ma_accounts a where a.user_id=reseller_id and not a.suspended and a.subscription_until>now())))',t||'_sel',t);
 end loop;
end $do$;
create or replace function public.ma_guard() returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or not exists(select 1 from public.ma_accounts a where a.user_id=u and not a.suspended and a.subscription_until>now()) then raise exception 'MI ALQUILER requiere suscripcion vigente';end if;
 return u;
end $$;
create or replace function public.ma_ensure_account() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.ma_accounts%rowtype;
begin
 if u is null then raise exception 'Inicia sesion';end if;
 insert into public.ma_accounts(user_id) values(u) on conflict(user_id) do nothing;
 select * into a from public.ma_accounts where user_id=u;
 return jsonb_build_object('invite_code',a.invite_code,'subscription_until',a.subscription_until,'bonus_pen',a.bonus_pen,'suspended',a.suspended);
end $$;
create or replace function public.ma_admin_grant_bonus(p_reseller uuid,p_amount numeric,p_request uuid)
returns numeric language plpgsql security definer set search_path='' as $$
declare a public.ma_accounts%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.cc_admins x where x.user_id=auth.uid()) then raise exception 'Solo ADMIN';end if;
 if p_request is null or p_reseller is null or p_amount is null or p_amount<=0 or p_amount>10000 or p_amount<>round(p_amount,2) then raise exception 'Importe invalido';end if;
 insert into public.ma_accounts(user_id) values(p_reseller) on conflict(user_id) do nothing;
 select * into a from public.ma_accounts where user_id=p_reseller for update;
 if a.user_id is null then raise exception 'RESELLER no existe';end if;
 if exists(select 1 from public.ma_bonus_events where request_id=p_request) then
  if not exists(select 1 from public.ma_bonus_events where request_id=p_request and reseller_id=p_reseller and kind='ADMIN_GRANT' and amount_pen=p_amount) then raise exception 'Referencia reutilizada';end if;
  return a.bonus_pen;
 end if;
 update public.ma_accounts set bonus_pen=bonus_pen+p_amount where user_id=p_reseller;
 insert into public.ma_bonus_events(request_id,reseller_id,actor_id,kind,amount_pen)values(p_request,p_reseller,auth.uid(),'ADMIN_GRANT',p_amount);
 return a.bonus_pen+p_amount;
end $$;
create or replace function public.ma_activate_bonus(p_request uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.ma_accounts%rowtype;until_date timestamptz;
begin
 if u is null or p_request is null then raise exception 'Referencia requerida';end if;
 perform public.ma_ensure_account();
 select * into a from public.ma_accounts where user_id=u for update;
 if exists(select 1 from public.ma_subscription_events where request_id=p_request) then
  if not exists(select 1 from public.ma_subscription_events where request_id=p_request and reseller_id=u) then raise exception 'Referencia reutilizada';end if;
  return a.subscription_until;
 end if;
 if a.suspended or a.bonus_pen<15 then raise exception 'Bono insuficiente o cuenta suspendida';end if;
 until_date:=greatest(now(),coalesce(a.subscription_until,now()))+interval '30 days';
 update public.ma_accounts set bonus_pen=bonus_pen-15,subscription_until=until_date where user_id=u;
 insert into public.ma_bonus_events(request_id,reseller_id,actor_id,kind,amount_pen)values(p_request,u,u,'SUBSCRIPTION',-15);
 insert into public.ma_subscription_events(request_id,reseller_id,method,amount_pen,active_until)values(p_request,u,'BONUS',15,until_date);
 return until_date;
end $$;
create or replace function public.ma_create_unit(p_kind text,p_building text,p_address text,p_alias text,p_floor text,p_daily numeric,p_monthly numeric)
returns bigint language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();v bigint;
begin
 if p_kind not in ('HABITACION','LOCAL') or length(trim(coalesce(p_building,'')))<2 or length(trim(coalesce(p_alias,'')))<1
 or p_daily is null or p_monthly is null or p_daily<0 or p_monthly<0 or (p_daily=0 and p_monthly=0)
 or p_daily<>round(p_daily,2) or p_monthly<>round(p_monthly,2) or greatest(p_daily,p_monthly)>100000 then raise exception 'Datos de inmueble invalidos';end if;
 insert into public.ma_units(reseller_id,kind,building,address,alias,floor,daily_rate,monthly_rate)
 values(u,p_kind,left(trim(p_building),120),left(coalesce(trim(p_address),''),220),left(trim(p_alias),120),left(coalesce(trim(p_floor),''),40),p_daily,p_monthly)
 returning id into v;
 return v;
end $$;
create or replace function public.ma_create_lease(p_unit bigint,p_doc_kind text,p_doc text,p_name text,p_whatsapp text,p_consent boolean,p_mode text,p_start date,p_rate numeric,p_guarantee numeric)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();un public.ma_units%rowtype;tid uuid;lid uuid;today date:=(timezone('America/Lima',now()))::date;
begin
 select * into un from public.ma_units where id=p_unit and reseller_id=u for update;
 if un.id is null or un.state<>'READY' then raise exception 'Inmueble no disponible';end if;
 if exists(select 1 from public.ma_leases where unit_id=p_unit and state='ACTIVE') then raise exception 'Inmueble ocupado';end if;
 if p_doc_kind not in ('DNI','CE','PASSPORT','CEDULA','OTHER') or length(trim(coalesce(p_doc,'')))<4 or length(trim(coalesce(p_name,'')))<2 or
 p_mode not in ('DAY','MONTH') or p_start is null or p_start>today or p_start<today-interval '365 days' or
 p_rate is null or p_rate<=0 or p_rate>100000 or p_rate<>round(p_rate,2) or
 p_guarantee is null or p_guarantee<0 or p_guarantee>100000 or p_guarantee<>round(p_guarantee,2) then raise exception 'Contrato invalido';end if;
 insert into public.ma_tenants(reseller_id,document_type,document_number,full_name,whatsapp,consent_whatsapp)
 values(u,p_doc_kind,left(trim(p_doc),40),left(trim(p_name),160),left(coalesce(trim(p_whatsapp),''),25),coalesce(p_consent,false))
 on conflict(reseller_id,document_type,document_number) do update set
 whatsapp=excluded.whatsapp,consent_whatsapp=excluded.consent_whatsapp returning id into tid;
 insert into public.ma_leases(reseller_id,unit_id,tenant_id,billing_mode,rate,start_on,next_due_on,guarantee_required)
 values(u,p_unit,tid,p_mode,p_rate,p_start,p_start,p_guarantee) returning id into lid;
 perform public.ma_sync_rents();
 return lid;
end $$;
create or replace function public.ma_sync_rents()
returns integer language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;today date:=(timezone('America/Lima',now()))::date;n integer:=0;period date;k integer;
begin
 for l in select * from public.ma_leases where reseller_id=u and state='ACTIVE' and next_due_on<=today for update loop
  period:=l.next_due_on;k:=0;
  while period<=today and k<370 loop
   insert into public.ma_ledger(reseller_id,lease_id,kind,label,period_on,amount,occurred_on)
   values(u,l.id,'RENT',case when l.billing_mode='MONTH' then 'Alquiler mensual' else 'Alquiler diario' end,period,l.rate,period)
   on conflict do nothing;
   if found then n:=n+1;end if;
   if l.billing_mode='MONTH' then period:=(period+interval '1 month')::date;else period:=period+1;end if;
   k:=k+1;
  end loop;
  if period<=today then raise exception 'Periodo excesivo: actualizar contrato antes de sincronizar';end if;
  update public.ma_leases set next_due_on=period where id=l.id;
 end loop;
 return n;
end $$;
create or replace function public.ma_payment(p_lease uuid,p_amount numeric,p_method text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();mid uuid;
begin
 if p_request is null or p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Abono invalido';end if;
 if not exists(select 1 from public.ma_leases where id=p_lease and reseller_id=u) then raise exception 'Contrato inexistente';end if;
 insert into public.ma_ledger(reseller_id,lease_id,request_id,kind,label,amount,method)
 values(u,p_lease,p_request,'PAYMENT','Abono recibido',-p_amount,left(coalesce(p_method,'EFECTIVO'),50))
 on conflict(request_id) do nothing returning id into mid;
 if mid is null then
  select id into mid from public.ma_ledger where request_id=p_request and reseller_id=u and lease_id=p_lease and kind='PAYMENT' and amount=-p_amount;
  if mid is null then raise exception 'Referencia reutilizada';end if;
 end if;
 return mid;
end $$;
create or replace function public.ma_fixed_charge(p_lease uuid,p_service text,p_amount numeric,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();mid uuid;period date:=date_trunc('month',timezone('America/Lima',now()))::date;
begin
 if p_request is null or trim(coalesce(p_service,''))='' or p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Tarifa invalida';end if;
 if not exists(select 1 from public.ma_leases where id=p_lease and reseller_id=u and state='ACTIVE') then raise exception 'Contrato no activo';end if;
 insert into public.ma_ledger(reseller_id,lease_id,request_id,kind,label,period_on,amount)
 values(u,p_lease,p_request,'FIXED',upper(left(trim(p_service),80)),period,p_amount)
 on conflict do nothing returning id into mid;
 if mid is null then raise exception 'Tarifa ya registrada este mes o referencia duplicada';end if;
 return mid;
end $$;
create or replace function public.ma_meter(p_lease uuid,p_service text,p_reading numeric,p_price numeric,p_request uuid)
returns numeric language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;lastv numeric;usagev numeric;charge numeric;rid uuid;
begin
 if p_request is null or p_service not in ('LUZ','AGUA','GAS') or p_reading is null or p_reading<0 or p_price is null or p_price<0 or p_price>100000 then raise exception 'Lectura invalida';end if;
 if p_reading<>round(p_reading,3) or p_price<>round(p_price,4) then raise exception 'Precision de lectura invalida';end if;
 select * into l from public.ma_leases where id=p_lease and reseller_id=u and state='ACTIVE' for update;
 if l.id is null then raise exception 'Contrato no activo';end if;
 select reading into lastv from public.ma_meter_readings where lease_id=p_lease and service=p_service order by created_at desc,id desc limit 1;
 if lastv is not null and p_reading<=lastv then raise exception 'Lectura debe aumentar';end if;
 usagev:=case when lastv is null then null else p_reading-lastv end;
 charge:=case when usagev is null then 0 else round(usagev*p_price,2) end;
 if exists(select 1 from public.ma_meter_readings where request_id=p_request) then raise exception 'Referencia duplicada';end if;
 insert into public.ma_meter_readings(request_id,reseller_id,lease_id,service,reading,previous_reading,usage,unit_price)
 values(p_request,u,p_lease,p_service,p_reading,lastv,usagev,p_price) returning id into rid;
 if charge>0 then
  insert into public.ma_ledger(reseller_id,lease_id,kind,label,amount)
  values(u,p_lease,'METER','Consumo '||p_service||' ('||usagev||' unidades)',charge);
 end if;
 return charge;
end $$;
create or replace function public.ma_guarantee(p_lease uuid,p_action text,p_amount numeric,p_reason text,p_request uuid)
returns numeric language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;held numeric;outstanding numeric;
begin
 if p_request is null or p_action not in ('RECEIVED','REFUNDED','APPLIED','RETAINED') or p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Movimiento invalido';end if;
 select * into l from public.ma_leases where id=p_lease and reseller_id=u for update;
 if l.id is null then raise exception 'Contrato inexistente';end if;
 select coalesce(sum(case when action='RECEIVED' then amount else -amount end),0) into held from public.ma_guarantees where lease_id=p_lease;
 if exists(select 1 from public.ma_guarantees where request_id=p_request) then raise exception 'Referencia duplicada';end if;
 if p_action<>'RECEIVED' and held<p_amount then raise exception 'Garantia insuficiente';end if;
 if p_action='APPLIED' then
  select coalesce(sum(amount),0) into outstanding from public.ma_ledger where lease_id=p_lease;
  if outstanding<p_amount then raise exception 'No se puede aplicar mas que deuda existente';end if;
  insert into public.ma_ledger(reseller_id,lease_id,kind,label,amount,method)
  values(u,p_lease,'PAYMENT','Aplicacion de garantia',-p_amount,'GARANTIA');
 end if;
 insert into public.ma_guarantees(reseller_id,lease_id,request_id,action,amount,reason)
 values(u,p_lease,p_request,p_action,p_amount,left(coalesce(p_reason,''),300));
 return held+case when p_action='RECEIVED' then p_amount else -p_amount end;
end $$;
create or replace function public.ma_expense(p_unit bigint,p_category text,p_description text,p_amount numeric,p_method text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();eid uuid;
begin
 if p_request is null or trim(coalesce(p_category,''))='' or trim(coalesce(p_description,''))='' or p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Gasto invalido';end if;
 if p_unit is not null and not exists(select 1 from public.ma_units where id=p_unit and reseller_id=u) then raise exception 'Inmueble inexistente';end if;
 insert into public.ma_expenses(reseller_id,unit_id,request_id,category,description,amount,method)
 values(u,p_unit,p_request,left(trim(p_category),80),left(trim(p_description),250),p_amount,left(coalesce(p_method,'EFECTIVO'),50))
 on conflict(request_id) do nothing returning id into eid;
 if eid is null then
  select id into eid from public.ma_expenses where request_id=p_request and reseller_id=u and amount=p_amount and description=left(trim(p_description),250);
  if eid is null then raise exception 'Referencia reutilizada';end if;
 end if;
 return eid;
end $$;
create or replace function public.ma_end_lease(p_lease uuid)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;
begin
 select * into l from public.ma_leases where id=p_lease and reseller_id=u for update;
 if l.id is null then raise exception 'Contrato inexistente';end if;
 if l.state='ENDED' then return;end if;
 perform public.ma_sync_rents();
 update public.ma_leases set state='ENDED',end_on=(timezone('America/Lima',now()))::date where id=p_lease;
 update public.ma_units set state='CLEANING' where id=l.unit_id and reseller_id=u;
end $$;
create or replace function public.ma_set_unit_state(p_unit bigint,p_state text)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();
begin
 if p_state not in ('READY','CLEANING','DISABLED') then raise exception 'Estado invalido';end if;
 if p_state<>'READY' and exists(select 1 from public.ma_leases where unit_id=p_unit and state='ACTIVE') then raise exception 'No puede bloquear inmueble ocupado';end if;
 update public.ma_units set state=p_state where id=p_unit and reseller_id=u;
 if not found then raise exception 'Inmueble no encontrado';end if;
end $$;
create or replace function public.ma_schedule_alerts() returns integer
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();n integer;today date:=(timezone('America/Lima',now()))::date;
begin
 insert into public.ma_alerts(reseller_id,lease_id,due_on,alert_on)
 select u,l.id,l.next_due_on,today from public.ma_leases l join public.ma_tenants t on t.id=l.tenant_id
 where l.reseller_id=u and l.state='ACTIVE' and l.billing_mode='MONTH' and t.consent_whatsapp and t.whatsapp<>''
 and (l.next_due_on-today) in (5,3,1,0)
 on conflict do nothing;
 get diagnostics n=row_count;
 return n;
end $$;
create or replace function public.ma_mark_alert_opened(p_alert uuid) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();
begin
 update public.ma_alerts set state='OPENED',opened_at=now()
 where id=p_alert and reseller_id=u and state='PENDING';
end $$;
do $do$ declare fn text;begin
 foreach fn in array array[
 'ma_guard()','ma_ensure_account()','ma_admin_grant_bonus(uuid,numeric,uuid)','ma_activate_bonus(uuid)',
 'ma_create_unit(text,text,text,text,text,numeric,numeric)',
 'ma_create_lease(bigint,text,text,text,text,boolean,text,date,numeric,numeric)',
 'ma_sync_rents()','ma_payment(uuid,numeric,text,uuid)','ma_fixed_charge(uuid,text,numeric,uuid)',
 'ma_meter(uuid,text,numeric,numeric,uuid)','ma_guarantee(uuid,text,numeric,text,uuid)',
 'ma_expense(bigint,text,text,numeric,text,uuid)','ma_end_lease(uuid)',
 'ma_set_unit_state(bigint,text)','ma_schedule_alerts()','ma_mark_alert_opened(uuid)'
 ] loop
  execute 'revoke all on function public.'||fn||' from public,anon,authenticated';
  execute 'grant execute on function public.'||fn||' to authenticated';
 end loop;
end $do$;