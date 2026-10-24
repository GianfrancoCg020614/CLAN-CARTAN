-- STAGING only. Self-service checkout for COBRA YA with atomic entitlement.
-- Only the server may call this function after authenticating the JWT.
create or replace function public.cc_clan_cobra_checkout_staging(
 p_user_id uuid, p_funding text, p_request_id uuid
) returns timestamptz language plpgsql security invoker set search_path = '' as $fn$
declare
 v_key text;
 v_reference text;
 v_existing public.cc_clan_cobra_access_periods%rowtype;
 v_expires timestamptz;
begin
 if current_user <> 'service_role' then
   raise exception 'Only the authenticated checkout server may initiate payment';
 end if;
 if p_user_id is null or p_request_id is null
    or p_funding not in ('REAL','ACTIVATION_BONUS') then
   raise exception 'Invalid checkout request';
 end if;
 v_key := 'COBRA-STAGING-' || p_request_id::text;
 v_reference := 'COBRA-ENTITLEMENT-' || p_request_id::text;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('clan-cobra-access:' || p_user_id::text,0));
 select * into v_existing
 from public.cc_clan_cobra_access_periods
 where activation_key=v_key;
 if found then
   if v_existing.user_id<>p_user_id or v_existing.funding<>p_funding
   then raise exception 'Idempotency request belongs to another purchase';
   end if;
   return v_existing.ends_at;
 end if;
 if exists (
   select 1 from public.cc_clan_cobra_access_periods
   where user_id=p_user_id and starts_at<=now() and ends_at>now()
 ) then
   raise exception 'COBRA YA subscription already active';
 end if;
 -- COBRA entitlement is a first-party digital access period created *in the
 -- same database transaction* as the debit. This proof is never supplied by
 -- the browser and is rolled back automatically if the debit/access fails.
 insert into public.cc_clan_service_fulfillment_receipts
  (activation_key,user_id,service,amount_pen,fulfillment_reference,fulfilled_at)
 values(v_key,p_user_id,'COBRA_YA',15.00,v_reference,now());
 v_expires:=public.cc_clan_cobra_activate_verified(
   p_user_id,p_funding,v_key,v_reference
 );
 if not exists (
  select 1 from public.cc_clan_cobra_access_periods
  where activation_key=v_key and user_id=p_user_id
    and ends_at=v_expires
 ) then
  raise exception 'Entitlement not committed; payment reversed';
 end if;
 return v_expires;
end $fn$;
revoke all on function public.cc_clan_cobra_checkout_staging(uuid,text,uuid)
 from public,anon,authenticated;
grant execute on function public.cc_clan_cobra_checkout_staging(uuid,text,uuid)
 to service_role;
grant select on public.cc_clan_cobra_access_periods to authenticated;
drop policy if exists cc_clan_cobra_access_owner_read on public.cc_clan_cobra_access_periods;
create policy cc_clan_cobra_access_owner_read
 on public.cc_clan_cobra_access_periods for select to authenticated
 using (user_id=(select auth.uid()));