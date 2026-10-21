-- V150 · Consulta DNI automática sin consentimiento ficticio por cada cliente.
-- Requiere el permiso aprobado previamente por ADMIN con evidencia/documentación.
create or replace function public.cc_my_dni_auto_permission()
returns boolean language sql stable security invoker set search_path to ''
as $$
 select case when auth.uid() is null then false
 else coalesce(public.cc_dni_auto_permission(auth.uid()),false) end;
$$;
revoke all on function public.cc_my_dni_auto_permission() from public,anon;
grant execute on function public.cc_my_dni_auto_permission() to authenticated;
-- La Edge Function cc-consulta-dni V3 verifica cc_dni_auto_permission
-- en servidor y no permite consultas sin habilitación documentada.
