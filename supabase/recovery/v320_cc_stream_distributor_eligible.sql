CREATE OR REPLACE FUNCTION cc_internal.cc_stream_distributor_eligible(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select p_user is not null and p_user=(select auth.uid()) and (
  exists(select 1 from public.cc_admins a where a.user_id=p_user)
  or exists(
   select 1 from public.cc_memberships m
   join public.cc_businesses b on b.id=m.business_id
     and b.code='STREAM_BULLS'
   join public.cc_subscriptions s on s.membership_id=m.id
      and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
   join public.cc_plans plan on plan.id=s.plan_id
      and plan.code<>'STREAM_TEST_7' and plan.price_pen>0
   where m.user_id=p_user and m.status='ACTIVE'
     and m.role in ('RESELLER','SUPER_RESELLER')
  )
 );
$function$

