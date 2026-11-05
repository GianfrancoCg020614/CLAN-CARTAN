CREATE OR REPLACE FUNCTION cc_internal.sb_delivery_is_seller(p_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select p_uid is not null and not exists(select 1 from public.cc_admins where user_id=p_uid)
 and exists(select 1 from public.cc_portal_super_resellers r where r.user_id=p_uid and r.enabled)
 and exists(select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
 join public.cc_subscriptions s on s.membership_id=m.id join public.cc_plans p on p.id=s.plan_id
 where m.user_id=p_uid and m.status='ACTIVE' and m.role='SUPER_RESELLER' and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now() and p.code='STREAM_365' and p.price_pen>0);
$function$

