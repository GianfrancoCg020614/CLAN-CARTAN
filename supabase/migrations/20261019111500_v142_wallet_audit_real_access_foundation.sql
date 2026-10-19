-- V142 (1/2): registro INMUTABLE, saldos antes/después, suscripción real separada de TEST.
-- No recargas, abonos ni bonos creados por esta migración. Lanzamiento deshabilitado.
create table if not exists public.cc_wallet_financial_audit(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id),
 service text not null check(service in ('COBRA_YA','STREAM_BULLS')),
 event_type text not null,
 concept text not null,
 amount_pen numeric(14,2) not null check(amount_pen<>0),
 balance_before numeric(14,2) not null check(balance_before>=0),
 balance_after numeric(14,2) not null check(balance_after>=0),
 status text not null default 'CONFIRMED',
 reference text not null unique,
 related_payment_ref text,
 referred_user_id uuid,
 original_reference text,
 reason text,
 recorded_at timestamptz not null default now(),
 check(round(balance_before+amount_pen,2)=balance_after)
);
create index if not exists cc_wallet_financial_audit_owner_seq on public.cc_wallet_financial_audit(user_id,id desc);
alter table public.cc_wallet_financial_audit enable row level security;
create policy cc_fin_audit_owner_select on public.cc_wallet_financial_audit
 for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.cc_wallet_financial_audit from public,anon,authenticated;
grant select on public.cc_wallet_financial_audit to authenticated,service_role;
grant all on public.cc_wallet_financial_audit to service_role;
-- No UPDATE/DELETE for end users; in-place updates are prohibited even to service_role
-- except migration administrators with explicit migration rewrite.
create or replace function cc_internal.prevent_financial_audit_edits()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
 raise exception 'Asiento financiero inmutable; registre reversión compensatoria';
end $$;
create trigger cc_financial_audit_immutable before update or delete
 on public.cc_wallet_financial_audit
 for each row execute function cc_internal.prevent_financial_audit_edits();

create or replace function cc_internal.capture_real_wallet_change()
returns trigger language plpgsql security definer set search_path to ''
as $$
declare
 v_before numeric(14,2):=0;
 v_kind text;
 v_concept text;
 v_ref text;
 v_related text;
 v_referred uuid;
begin
 if tg_op='UPDATE' then v_before:=old.balance_pen;end if;
 if new.balance_pen=v_before then return new;end if;
 v_kind:=nullif(current_setting('cc_audit.kind',true),'');
 if v_kind is null then v_kind:='BALANCE_CHANGE';end if;
 v_concept:=nullif(current_setting('cc_audit.concept',true),'');
 if v_concept is null then v_concept:='Movimiento de saldo real — origen por conciliar';end if;
 v_ref:=nullif(current_setting('cc_audit.reference',true),'');
 if v_ref is null then v_ref:='BAL-'||gen_random_uuid()::text;end if;
 v_related:=nullif(current_setting('cc_audit.payment',true),'');
 v_referred:=nullif(current_setting('cc_audit.referred',true),'')::uuid;
 insert into public.cc_wallet_financial_audit
 (user_id,service,event_type,concept,amount_pen,balance_before,balance_after,
  reference,related_payment_ref,referred_user_id,original_reference,reason)
 values(new.user_id,new.service,v_kind,left(v_concept,200),
        new.balance_pen-v_before,v_before,new.balance_pen,v_ref,v_related,v_referred,
        nullif(current_setting('cc_audit.original',true),''),
        nullif(current_setting('cc_audit.reason',true),''));
 return new;
end $$;
create trigger cc_real_wallet_financial_capture
 after insert or update of balance_pen on public.cc_real_service_wallets
 for each row execute function cc_internal.capture_real_wallet_change();

create or replace function public.cc_my_real_financial_audit(
 p_before_id bigint default null, p_limit integer default 40
)
returns setof public.cc_wallet_financial_audit
language sql stable security invoker set search_path to ''
as $$
 select a.* from public.cc_wallet_financial_audit a
 where a.user_id=(select auth.uid())
 and (p_before_id is null or a.id<p_before_id)
 order by a.id desc limit least(greatest(coalesce(p_limit,40),1),100);
$$;
revoke all on function public.cc_my_real_financial_audit(bigint,integer) from public,anon;
grant execute on function public.cc_my_real_financial_audit(bigint,integer) to authenticated,service_role;

create table public.cc_cobra_real_payment_settings(
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 subscription_pen numeric(14,2) not null default 15.00 check(subscription_pen=15.00),
 referral_bonus_pen numeric(14,2) not null default 5.00 check(referral_bonus_pen=5.00),
 updated_at timestamptz not null default now()
);
insert into public.cc_cobra_real_payment_settings(id,enabled) values(true,false);
alter table public.cc_cobra_real_payment_settings enable row level security;
revoke all on public.cc_cobra_real_payment_settings from public,anon,authenticated;
grant all on public.cc_cobra_real_payment_settings to service_role;

create table public.cc_cobra_real_access_periods(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 spend_id uuid not null unique references public.cc_real_wallet_spends(id),
 kind text not null check(kind in ('INITIAL','RENEWAL')),
 period_start timestamptz not null,
 period_end timestamptz not null,
 status text not null default 'ACTIVE' check(status in ('ACTIVE','REFUNDED')),
 amount_pen numeric(14,2) not null check(amount_pen=15.00),
 created_at timestamptz not null default now(),
 check(period_end>period_start)
);
create index cc_cobra_real_access_user_period on public.cc_cobra_real_access_periods(user_id,period_end desc);
alter table public.cc_cobra_real_access_periods enable row level security;
create policy cc_cobra_real_access_own on public.cc_cobra_real_access_periods
 for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.cc_cobra_real_access_periods from public,anon,authenticated;
grant select on public.cc_cobra_real_access_periods to authenticated;
grant all on public.cc_cobra_real_access_periods to service_role;

create table public.cc_cobra_referral_bonuses(
 id uuid primary key default gen_random_uuid(),
 access_id uuid not null unique references public.cc_cobra_real_access_periods(id),
 beneficiary_user_id uuid not null references auth.users(id),
 referred_user_id uuid not null references auth.users(id),
 code_id uuid not null references public.cc_invitation_codes(id),
 amount_pen numeric(14,2) not null check(amount_pen=5.00),
 status text not null default 'CREDITED' check(status in ('CREDITED','REVERSED','REVERSAL_PENDING')),
 reversal_reference text unique,
 reversal_reason text,
 credited_at timestamptz not null default now(),
 reversed_at timestamptz,
 check(beneficiary_user_id<>referred_user_id)
);
create index cc_cobra_bonus_beneficiary on public.cc_cobra_referral_bonuses(beneficiary_user_id,credited_at desc);
alter table public.cc_cobra_referral_bonuses enable row level security;
create policy cc_cobra_bonus_own on public.cc_cobra_referral_bonuses
 for select to authenticated using(beneficiary_user_id=(select auth.uid()));
revoke all on public.cc_cobra_referral_bonuses from public,anon,authenticated;
grant select on public.cc_cobra_referral_bonuses to authenticated;
grant all on public.cc_cobra_referral_bonuses to service_role;

-- La atribución del código de registro no se puede reasignar a otro invitador.
create or replace function cc_internal.prevent_invitation_reassignment()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
 if new.registered_user_id is distinct from old.registered_user_id
 or new.code_id is distinct from old.code_id
 or new.inviter_user_id is distinct from old.inviter_user_id
 or new.business_id is distinct from old.business_id
 or new.code_snapshot is distinct from old.code_snapshot then
  raise exception 'Código de invitado permanente; atribución inmutable';
 end if;
 return new;
end $$;
create trigger cc_invitation_attribution_permanent before update
 on public.cc_invitation_attributions
 for each row execute function cc_internal.prevent_invitation_reassignment();

-- El acceso real NO se contabiliza como "price_test" ni usa saldo de prueba.
create or replace function cc_internal.cobra_entitled(p_user uuid)
returns boolean language sql stable security definer set search_path to ''
as $$
select exists(
 select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id
 where m.user_id=p_user and b.code='COBRA_YA' and m.status='ACTIVE'
) and (
 exists(select 1 from public.cy_access_periods p
        where p.user_id=p_user and p.starts_at<=now() and p.ends_at>now())
 or exists(select 1 from public.cc_cobra_real_access_periods r
        where r.user_id=p_user and r.status='ACTIVE'
        and r.period_start<=now() and r.period_end>now())
);
$$;

create or replace function cc_internal.require_cobra_payment_for_approval()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
 if new.status='ACTIVE' and old.status is distinct from 'ACTIVE'
 and exists(select 1 from public.cc_businesses b where b.id=new.business_id and b.code='COBRA_YA')
 and not exists(select 1 from public.cy_access_periods p
   where p.user_id=new.user_id and p.starts_at<=now() and p.ends_at>now())
 and not exists(select 1 from public.cc_cobra_real_access_periods r
   where r.user_id=new.user_id and r.status='ACTIVE'
    and r.period_start<=now() and r.period_end>now())
 then raise exception 'No se puede activar: no existe suscripción vigente';
 end if;
 return new;
end $$;

create or replace function public.cy_subscription_status()
returns table(authorized boolean, active boolean, balance_test numeric, expires_at timestamptz)
language sql stable set search_path to ''
as $$
select exists(select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id
 where m.user_id=auth.uid() and m.status='ACTIVE' and b.code='COBRA_YA'),
 (exists(select 1 from public.cy_access_periods p
  where p.user_id=auth.uid() and p.starts_at<=now() and p.ends_at>now())
  or exists(select 1 from public.cc_cobra_real_access_periods r
  where r.user_id=auth.uid() and r.status='ACTIVE'
   and r.period_start<=now() and r.period_end>now())),
 coalesce((select w.balance_test from public.cc_service_wallets w
 where w.user_id=auth.uid() and w.service='COBRA_YA'),0)::numeric,
 greatest((select max(p.ends_at) from public.cy_access_periods p where p.user_id=auth.uid()),
          (select max(r.period_end) from public.cc_cobra_real_access_periods r where r.user_id=auth.uid() and r.status='ACTIVE'));
$$;
