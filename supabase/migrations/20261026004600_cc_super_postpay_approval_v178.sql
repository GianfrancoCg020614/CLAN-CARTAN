-- V178 · Súper reseller: el pago anual precede obligatoriamente a aprobación ADMIN.
-- Se conserva el historial comercial, los saldos y todas las membresías.
-- La API antigua asignaba permiso antes del pago; ningún cliente puede invocarla.
revoke execute on function public.cc_portal_admin_assign_stream_role(text,text,numeric)
 from anon,authenticated;
-- Corrige únicamente permisos antiguos preautorizados sin suscripción comercial vigente.
-- No modifica el rol registrado, las fechas de membresía ni las billeteras.
update public.cc_portal_super_resellers sr
set enabled=false
where sr.enabled
 and exists(
  select 1 from public.cc_memberships m
  join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
  where m.user_id=sr.user_id and m.role='SUPER_RESELLER'
 )
 and not exists(
  select 1 from public.cc_memberships m
  join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
  join public.cc_subscriptions s on s.membership_id=m.id
  join public.cc_plans p on p.id=s.plan_id
  where m.user_id=sr.user_id and m.status='ACTIVE'
   and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
   and p.price_pen>0 and p.code<>'STREAM_TEST_7'
 );
