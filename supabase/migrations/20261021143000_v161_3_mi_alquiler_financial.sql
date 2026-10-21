-- MI ALQUILER V161.3 · gestión financiera independiente, registro auditable.
-- NO acredita recargas externas, NO recibe pagos de inquilinos, NO modifica otras billeteras CLAN CARTAN.
alter table public.ma_accounts add column if not exists bonus_pen numeric(12,2) not null default 0 check (bonus_pen >= 0);
create table if not exists public.ma_wallets(
 user_id uuid primary key references public.ma_accounts(user_id) on delete cascade,
 real_verified_pen numeric(12,2) not null default 0 check(real_verified_pen>=0),
 created_at timestamptz not null default now()
);
insert into public.ma_wallets(user_id) select user_id from public.ma_accounts on conflict do nothing;
create table if not exists public.ma_bonus_events(
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 reseller_id uuid not null references public.ma_accounts(user_id), actor_id uuid not null references auth.users(id),
 kind text not null check(kind in ('ADMIN_GRANT','SUBSCRIPTION_SPEND')),
 amount_pen numeric(12,2) not null check(amount_pen<>0), note text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.ma_subscription_events(
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 reseller_id uuid not null references public.ma_accounts(user_id),
 funding text not null check(funding='BONUS'), amount_pen numeric(12,2) not null check(amount_pen=15),
 active_until timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.ma_ledger(
 id uuid primary key default gen_random_uuid(), request_id uuid unique,
 reseller_id uuid not null references auth.users(id),lease_id uuid not null,
 kind text not null check(kind in ('RENT','METER','FIXED','PAYMENT','GUARANTEE_APPLY','REVERSAL')),
 label text not null, service text,period_no integer, period_month date,
 amount_pen numeric(12,2) not null check(amount_pen<>0),
 due_on date not null default ((timezone('America/Lima',now()))::date),method text,
 created_at timestamptz not null default now(),
 foreign key(lease_id,reseller_id) references public.ma_leases(id,reseller_id),
 check ((kind in ('RENT','METER','FIXED') and amount_pen>0) or
  (kind in ('PAYMENT','GUARANTEE_APPLY','REVERSAL') and amount_pen<0)),
 check (kind<>'RENT' or (period_no>=1 and period_no<=3650))
);
create unique index if not exists ma_ledger_rent_period on public.ma_ledger(lease_id,period_no) where kind='RENT';
create unique index if not exists ma_ledger_fixed_month on public.ma_ledger(lease_id,service,period_month) where kind='FIXED';
create unique index if not exists ma_ledger_single_reversal on public.ma_ledger(lease_id,period_no) where kind='REVERSAL';
create index if not exists ma_ledger_owner_lease on public.ma_ledger(reseller_id,lease_id,due_on);
create table if not exists public.ma_meter_readings(
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id),lease_id uuid not null,
 service text not null check(service in ('LUZ','AGUA','GAS')),
 reading numeric(14,3) not null check(reading>=0), previous_reading numeric(14,3),
 consumption numeric(14,3),price_per_unit numeric(12,4) not null check(price_per_unit>=0),
 charged_pen numeric(12,2) not null default 0 check(charged_pen>=0),
 reading_on date not null default ((timezone('America/Lima',now()))::date),created_at timestamptz not null default now(),
 foreign key(lease_id,reseller_id) references public.ma_leases(id,reseller_id),
 check(previous_reading is null or reading>=previous_reading)
);
create index if not exists ma_meters_lease_latest on public.ma_meter_readings(lease_id,service,created_at desc);
create table if not exists public.ma_guarantee_events(
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id), lease_id uuid not null,
 action text not null check(action in ('RECEIVED','REFUNDED','APPLIED','RETAINED')),
 amount_pen numeric(12,2) not null check(amount_pen>0), reason text not null default '',
 created_at timestamptz not null default now(),
 foreign key(lease_id,reseller_id) references public.ma_leases(id,reseller_id)
);
create table if not exists public.ma_expenses(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id),unit_id bigint,
 category text not null check(length(trim(category)) between 2 and 80),
 description text not null check(length(trim(description)) between 2 and 250),
 amount_pen numeric(12,2) not null check(amount_pen>0),
 method text not null default 'EFECTIVO',occurred_on date not null default ((timezone('America/Lima',now()))::date),
 created_at timestamptz not null default now(),
 foreign key(unit_id,reseller_id) references public.ma_units(id,reseller_id)
);
-- Default-deny mutations by REST; SECURITY DEFINER RPC validates ownership and expiry.
do $m$ declare t text;begin
 foreach t in array array['ma_wallets','ma_bonus_events','ma_subscription_events','ma_ledger','ma_meter_readings','ma_guarantee_events','ma_expenses'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $m$;
create policy ma_wallets_read on public.ma_wallets for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.cc_admins x where x.user_id=(select auth.uid())));
create policy ma_bonus_events_read on public.ma_bonus_events for select to authenticated
 using(reseller_id=(select auth.uid()) or exists(select 1 from public.cc_admins x where x.user_id=(select auth.uid())));
create policy ma_subscription_events_read on public.ma_subscription_events for select to authenticated
 using(reseller_id=(select auth.uid()) or exists(select 1 from public.cc_admins x where x.user_id=(select auth.uid())));
do $m$ declare t text;begin
 foreach t in array array['ma_ledger','ma_meter_readings','ma_guarantee_events','ma_expenses'] loop
  execute format('create policy %I on public.%I for select to authenticated using (reseller_id=(select auth.uid()) and (select public.ma_can_use()))',t||'_read',t);
 end loop;
end $m$;

-- Internal trigger auto-bills every contracted day/month ONCE; does not actually transfer money.
create or replace function public.ma_contract_billing_trigger() returns trigger
language plpgsql security definer set search_path='' as $$
declare n integer; du date; today_pe date:=(timezone('America/Lima',now()))::date;
begin
 if tg_op='INSERT' or (tg_op='UPDATE' and new.periods>old.periods) then
  for n in (case when tg_op='INSERT' then 1 else old.periods+1 end)..new.periods loop
   du:=case when new.mode='DAY' then new.start_on+(n-1) else (new.start_on+make_interval(months=>n-1))::date end;
   insert into public.ma_ledger(reseller_id,lease_id,kind,label,period_no,amount_pen,due_on)
   values(new.reseller_id,new.id,'RENT',case when new.mode='DAY' then 'Alquiler diario' else 'Mensualidad' end,n,new.rate,du)
   on conflict do nothing;
  end loop;
 end if;
 if tg_op='UPDATE' and new.state='ENDED' and old.state='ACTIVE' then
  -- Future unearned periods reversed with a separate immutable entry.
  insert into public.ma_ledger(reseller_id,lease_id,kind,label,period_no,amount_pen,due_on)
  select new.reseller_id,new.id,'REVERSAL','Anulación de período futuro',m.period_no,-m.amount_pen,m.due_on
  from public.ma_ledger m where m.lease_id=new.id and m.kind='RENT' and m.due_on>new.end_on
  on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.ma_contract_billing_trigger() from public,anon,authenticated;
drop trigger if exists ma_contract_billing on public.ma_leases;
create trigger ma_contract_billing after insert or update of periods,state on public.ma_leases
for each row execute function public.ma_contract_billing_trigger();
-- One-time billing of any pre-existing leases, with idempotent uniqueness.
insert into public.ma_ledger(reseller_id,lease_id,kind,label,period_no,amount_pen,due_on)
select l.reseller_id,l.id,'RENT',case when l.mode='DAY' then 'Alquiler diario' else 'Mensualidad' end,seq.n,l.rate,
 case when l.mode='DAY' then l.start_on+(seq.n-1) else (l.start_on+make_interval(months=>seq.n-1))::date end
from public.ma_leases l cross join lateral generate_series(1,l.periods) seq(n)
on conflict do nothing;

create or replace function public.ma_record_payment(p_lease uuid,p_amount numeric,p_method text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard(); l public.ma_leases%rowtype; current_balance numeric; existing public.ma_ledger%rowtype; out_id uuid;
begin
 if p_request is null or p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Pago inválido';end if;
 select * into l from public.ma_leases where id=p_lease and reseller_id=u for update;
 if l.id is null then raise exception 'Contrato ajeno o inexistente';end if;
 select * into existing from public.ma_ledger where request_id=p_request;
 if existing.id is not null then
  if existing.lease_id<>p_lease or existing.amount_pen<>-p_amount or existing.kind<>'PAYMENT' then raise exception 'Referencia reutilizada';end if;
  return existing.id;
 end if;
 select coalesce(sum(amount_pen),0) into current_balance from public.ma_ledger where lease_id=p_lease;
 if p_amount>current_balance then raise exception 'El pago supera el saldo del contrato';end if;
 insert into public.ma_ledger(request_id,reseller_id,lease_id,kind,label,amount_pen,method)
 values(p_request,u,p_lease,'PAYMENT','Cobro registrado',-p_amount,left(coalesce(p_method,'EFECTIVO'),40)) returning id into out_id;
 return out_id;
end $$;
create or replace function public.ma_charge_fixed(p_lease uuid,p_service text,p_amount numeric,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;tag date:=date_trunc('month',timezone('America/Lima',now()))::date;out_id uuid;
begin
 if p_request is null or length(trim(coalesce(p_service,''))) not between 2 and 50 or p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Tarifa inválida';end if;
 select * into l from public.ma_leases where id=p_lease and reseller_id=u for update;
 if l.id is null or l.state<>'ACTIVE' then raise exception 'Contrato no activo';end if;
 if exists(select 1 from public.ma_ledger where request_id=p_request) then raise exception 'Referencia duplicada';end if;
 insert into public.ma_ledger(request_id,reseller_id,lease_id,kind,label,service,period_month,amount_pen)
 values(p_request,u,p_lease,'FIXED','Tarifa fija '||left(trim(p_service),50),upper(left(trim(p_service),50)),tag,p_amount)
 returning id into out_id;
 return out_id;
end $$;
create or replace function public.ma_record_meter(p_lease uuid,p_service text,p_reading numeric,p_unit_price numeric,p_request uuid) returns numeric
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;oldv numeric; used numeric; charge numeric; prior public.ma_meter_readings%rowtype;
begin
 if p_request is null or p_service not in ('LUZ','AGUA','GAS') or p_reading is null or p_reading<0 or p_reading<>round(p_reading,3) or p_unit_price is null or p_unit_price<0 or p_unit_price>10000 or p_unit_price<>round(p_unit_price,4) then raise exception 'Lectura inválida';end if;
 select * into l from public.ma_leases where id=p_lease and reseller_id=u for update;
 if l.id is null or l.state<>'ACTIVE' then raise exception 'Contrato no activo';end if;
 select * into prior from public.ma_meter_readings where request_id=p_request;
 if prior.id is not null then
  if prior.lease_id<>p_lease or prior.service<>p_service or prior.reading<>p_reading or prior.price_per_unit<>p_unit_price then raise exception 'Referencia reutilizada';end if;
  return prior.charged_pen;
 end if;
 select reading into oldv from public.ma_meter_readings where lease_id=p_lease and service=p_service order by created_at desc,id desc limit 1;
 if oldv is not null and p_reading<oldv then raise exception 'El medidor no puede retroceder';end if;
 used:=case when oldv is null then null else p_reading-oldv end;
 charge:=case when used is null then 0 else round(used*p_unit_price,2) end;
 insert into public.ma_meter_readings(request_id,reseller_id,lease_id,service,reading,previous_reading,consumption,price_per_unit,charged_pen)
 values(p_request,u,p_lease,p_service,p_reading,oldv,used,p_unit_price,charge);
 if charge>0 then
  insert into public.ma_ledger(request_id,reseller_id,lease_id,kind,label,service,amount_pen)
  values(p_request,u,p_lease,'METER','Consumo '||p_service||': '||used||' unidades',p_service,charge);
 end if;
 return charge;
end $$;
create or replace function public.ma_record_guarantee(p_lease uuid,p_action text,p_amount numeric,p_reason text,p_request uuid) returns numeric
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();l public.ma_leases%rowtype;held numeric;due numeric;existing public.ma_guarantee_events%rowtype;
begin
 if p_request is null or p_action not in ('RECEIVED','REFUNDED','APPLIED','RETAINED') or p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Movimiento de garantía inválido';end if;
 if p_action='RETAINED' and length(trim(coalesce(p_reason,'')))<4 then raise exception 'Debe registrar motivo de retención';end if;
 select * into l from public.ma_leases where id=p_lease and reseller_id=u for update;
 if l.id is null then raise exception 'Contrato no autorizado';end if;
 select * into existing from public.ma_guarantee_events where request_id=p_request;
 select coalesce(sum(case when action='RECEIVED' then amount_pen else -amount_pen end),0) into held from public.ma_guarantee_events where lease_id=p_lease;
 if existing.id is not null then
  if existing.lease_id<>p_lease or existing.action<>p_action or existing.amount_pen<>p_amount then raise exception 'Referencia reutilizada';end if;
  return held;
 end if;
 if p_action<>'RECEIVED' and p_amount>held then raise exception 'Garantía disponible insuficiente';end if;
 if p_action='APPLIED' then
  select coalesce(sum(amount_pen),0) into due from public.ma_ledger where lease_id=p_lease;
  if due<p_amount then raise exception 'No puede aplicar garantía mayor que la deuda';end if;
  insert into public.ma_ledger(request_id,reseller_id,lease_id,kind,label,amount_pen,method)
  values(p_request,u,p_lease,'GUARANTEE_APPLY','Aplicación de garantía',-p_amount,'GARANTIA');
 end if;
 insert into public.ma_guarantee_events(request_id,reseller_id,lease_id,action,amount_pen,reason)
 values(p_request,u,p_lease,p_action,p_amount,left(trim(coalesce(p_reason,'')),300));
 return held + case when p_action='RECEIVED' then p_amount else -p_amount end;
end $$;
create or replace function public.ma_record_expense(p_unit bigint,p_category text,p_description text,p_amount numeric,p_method text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=public.ma_guard();existing public.ma_expenses%rowtype;out_id uuid;
begin
 if p_request is null or length(trim(coalesce(p_category,''))) not between 2 and 80 or length(trim(coalesce(p_description,''))) not between 2 and 250 or p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Gasto inválido';end if;
 if p_unit is not null and not exists(select 1 from public.ma_units where id=p_unit and reseller_id=u) then raise exception 'Unidad no autorizada';end if;
 select * into existing from public.ma_expenses where request_id=p_request;
 if existing.id is not null then
  if existing.reseller_id<>u or existing.amount_pen<>p_amount or existing.description<>trim(p_description) then raise exception 'Referencia reutilizada';end if;
  return existing.id;
 end if;
 insert into public.ma_expenses(request_id,reseller_id,unit_id,category,description,amount_pen,method)
 values(p_request,u,p_unit,trim(p_category),trim(p_description),p_amount,left(coalesce(p_method,'EFECTIVO'),40)) returning id into out_id;
 return out_id;
end $$;
create or replace function public.ma_admin_grant_bonus(p_reseller uuid,p_amount numeric,p_note text,p_request uuid) returns numeric
language plpgsql security definer set search_path='' as $$
declare a public.ma_accounts%rowtype; actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor) then raise exception 'Solo ADMIN';end if;
 if p_reseller is null or p_request is null or p_amount is null or p_amount<=0 or p_amount>10000 or p_amount<>round(p_amount,2) then raise exception 'Bono incorrecto';end if;
 if not exists(select 1 from auth.users where id=p_reseller) then raise exception 'Usuario inexistente';end if;
 insert into public.ma_accounts(user_id) values(p_reseller) on conflict do nothing;
 insert into public.ma_wallets(user_id) values(p_reseller) on conflict do nothing;
 select * into a from public.ma_accounts where user_id=p_reseller for update;
 if exists(select 1 from public.ma_bonus_events where request_id=p_request) then
  if not exists(select 1 from public.ma_bonus_events where request_id=p_request and kind='ADMIN_GRANT' and reseller_id=p_reseller and amount_pen=p_amount) then raise exception 'Referencia reutilizada';end if;
  return a.bonus_pen;
 end if;
 update public.ma_accounts set bonus_pen=bonus_pen+p_amount where user_id=p_reseller;
 insert into public.ma_bonus_events(request_id,reseller_id,actor_id,kind,amount_pen,note)
 values(p_request,p_reseller,actor,'ADMIN_GRANT',p_amount,left(coalesce(p_note,''),250));
 return a.bonus_pen+p_amount;
end $$;
create or replace function public.ma_activate_bonus(p_request uuid) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.ma_accounts%rowtype;untilv timestamptz;
begin
 if u is null or p_request is null then raise exception 'Inicia sesión';end if;
 perform public.ma_ensure_account();
 select * into a from public.ma_accounts where user_id=u for update;
 if exists(select 1 from public.ma_subscription_events where request_id=p_request) then
  if not exists(select 1 from public.ma_subscription_events where request_id=p_request and reseller_id=u and funding='BONUS') then raise exception 'Referencia reutilizada';end if;
  return a.subscription_until;
 end if;
 if a.suspended or a.bonus_pen<15 then raise exception 'Cuenta suspendida o bono insuficiente';end if;
 untilv:=greatest(now(),coalesce(a.subscription_until,now()))+interval '30 days';
 update public.ma_accounts set bonus_pen=bonus_pen-15,subscription_until=untilv where user_id=u;
 insert into public.ma_bonus_events(request_id,reseller_id,actor_id,kind,amount_pen,note)
 values(p_request,u,u,'SUBSCRIPTION_SPEND',-15,'30 días de MI ALQUILER');
 insert into public.ma_subscription_events(request_id,reseller_id,funding,amount_pen,active_until)
 values(p_request,u,'BONUS',15,untilv);
 return untilv;
end $$;
-- Real balance remains exactly zero, immutable to RESELLER and ADMIN until verified provider integration.
-- No checkout, recharge credit, wallet transfer or loan-payment functions are created here.
create or replace function public.ma_ensure_account() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.ma_accounts%rowtype;admin_role boolean;verified_balance numeric;
begin
 if u is null then raise exception 'Inicia sesión';end if;
 insert into public.ma_accounts(user_id) values(u) on conflict(user_id) do nothing;
 insert into public.ma_wallets(user_id) values(u) on conflict(user_id) do nothing;
 select * into a from public.ma_accounts where user_id=u;
 select exists(select 1 from public.cc_admins where user_id=u) into admin_role;
 select real_verified_pen into verified_balance from public.ma_wallets where user_id=u;
 return jsonb_build_object('invite_code',a.invite_code,'suspended',a.suspended,'subscription_until',a.subscription_until,
  'role',case when admin_role then 'ADMIN' else 'RESELLER' end,
  'active',admin_role or (not a.suspended and a.subscription_until>now()),
  'bonus_pen',a.bonus_pen,'real_verified_pen',coalesce(verified_balance,0));
end $$;
-- No default grants to PUBLIC: each function checks both auth.uid and ownership.
do $m$ declare f text;begin
 foreach f in array array[
 'ma_record_payment(uuid,numeric,text,uuid)','ma_charge_fixed(uuid,text,numeric,uuid)',
 'ma_record_meter(uuid,text,numeric,numeric,uuid)','ma_record_guarantee(uuid,text,numeric,text,uuid)',
 'ma_record_expense(bigint,text,text,numeric,text,uuid)','ma_admin_grant_bonus(uuid,numeric,text,uuid)',
 'ma_activate_bonus(uuid)','ma_ensure_account()'
 ] loop
  execute 'revoke all on function public.'||f||' from public,anon,authenticated';
  execute 'grant execute on function public.'||f||' to authenticated';
 end loop;
end $m$;