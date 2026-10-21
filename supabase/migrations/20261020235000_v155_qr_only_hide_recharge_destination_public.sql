-- V155.1: el estado público de Lemon/DALE no expone cuentas ni CCI,
-- aunque ADMIN configure etiquetas internas de conciliación.
create or replace function public.cc_manual_recharge_public_status()
returns table(enabled boolean, qr_url text, destination text, message text)
language sql
stable security definer
set search_path to ''
as $function$
select
  (s.collection_enabled and s.merchant_permission_verified) as enabled,
  case when s.collection_enabled and s.merchant_permission_verified then s.qr_asset_url else null end,
  case when s.collection_enabled and s.merchant_permission_verified then
    'QR de Lemon / DALE: comprueba el destinatario dentro de tu aplicación.'
  else null end as destination,
  case when s.collection_enabled and s.merchant_permission_verified then
    'Cuenta recaudadora comercial autorizada: utiliza el QR y espera revisión de ADMIN.'
  else
    'Solicitudes disponibles sin acreditación automática. NO envíes dinero: falta autorizar la cuenta comercial.'
  end as message
from public.cc_manual_recharge_settings s where s.id=1;
$function$;