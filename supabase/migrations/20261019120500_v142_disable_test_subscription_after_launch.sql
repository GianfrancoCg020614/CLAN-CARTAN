-- V142 hardening: ninguna suscripción TEST nueva al habilitar producción real.
-- Mientras enabled=false no se cambia el funcionamiento de prueba vigente.
create or replace function cc_internal.block_test_cobra_subscription_when_live()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
 if exists(select 1 from public.cc_cobra_real_payment_settings where id=true and enabled=true) then
  raise exception 'Modo comercial activo: no se permiten nuevas activaciones con saldo TEST';
 end if;
 return new;
end
$function$;
create trigger cc_no_test_subscription_in_real_mode
 before insert on public.cy_access_periods
 for each row execute function cc_internal.block_test_cobra_subscription_when_live();
