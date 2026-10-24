-- COBRA YA staging service entitlement, atomically linked to wallet activation.
create table if not exists public.cc_clan_cobra_access_periods (
 activation_key text primary key,
 user_id uuid not null references auth.users(id),
 funding text not null check (funding in ('REAL','ACTIVATION_BONUS')),
 amount_pen numeric(14,2) not null check(amount_pen=15),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 created_at timestamptz not null default now(),
 constraint cc_clan_cobra_period_order check(ends_at>starts_at)
);
create index if not exists cc_clan_cobra_access_by_user on public.cc_clan_cobra_access_periods(user_id,ends_at desc);
alter table public.cc_clan_cobra_access_periods enable row level security;
revoke all on public.cc_clan_cobra_access_periods from public,anon,authenticated;
grant all on public.cc_clan_cobra_access_periods to service_role;
create or replace function public.cc_clan_cobra_activate_verified(
 p_user_id uuid,p_funding text,p_activation_key text,p_receipt_key text
) returns timestamptz language plpgsql security invoker set search_path='' as $fn$
declare v_existing public.cc_clan_cobra_access_periods%rowtype;v_status text; v_start timestamptz;
begin
 if current_user<>'service_role' then raise exception 'Server-only COBRA activation'; end if;
 if p_user_id is null or p_funding not in ('REAL','ACTIVATION_BONUS')
 or length(coalesce(p_activation_key,'')) not between 12 and 130
 or length(coalesce(p_receipt_key,'')) not between 12 and 130
 then raise exception 'Invalid COBRA activation'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('clan-cobra-access:'||p_user_id::text,0));
 select * into v_existing from public.cc_clan_cobra_access_periods where activation_key=p_activation_key;
 if found then
  if v_existing.user_id<>p_user_id or v_existing.funding<>p_funding then raise exception 'COBRA activation key mismatch';end if;
  return v_existing.ends_at;
 end if;
 if exists(select 1 from public.cc_clan_cobra_access_periods
 where user_id=p_user_id and starts_at<=now() and ends_at>now()) then
  raise exception 'COBRA subscription already active';
 end if;
 if p_funding='REAL' then
  v_status:=public.cc_clan_activate_with_real_wallet(p_user_id,'COBRA_YA',15,p_activation_key,p_receipt_key);
  if v_status not in ('ACTIVATED_REAL_AND_REFERRAL_SETTLED','ALREADY_ACTIVATED') then raise exception 'Unexpected REAL activation response';end if;
 else
  v_status:=public.cc_clan_activate_with_bonus(p_user_id,'COBRA_YA',15,p_activation_key,p_receipt_key);
  if v_status not in ('ACTIVATED_WITH_BONUS_NO_REFERRAL','ALREADY_ACTIVATED_WITH_BONUS') then raise exception 'Unexpected BONUS activation response';end if;
 end if;
 v_start:=now();
 insert into public.cc_clan_cobra_access_periods(activation_key,user_id,funding,amount_pen,starts_at,ends_at)
 values(p_activation_key,p_user_id,p_funding,15,v_start,v_start+interval '30 days')
 returning * into v_existing;
 return v_existing.ends_at;
end $fn$;
revoke all on function public.cc_clan_cobra_activate_verified(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.cc_clan_cobra_activate_verified(uuid,text,text,text) to service_role;