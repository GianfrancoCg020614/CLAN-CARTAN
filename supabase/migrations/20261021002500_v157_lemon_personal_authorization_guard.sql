-- CLAN CARTAN V157.1: cerrar la vía antigua de acreditación Lemon personal.
-- La confirmación ADMIN por sí sola NO equivale a autorización comercial Lemon/DALE.
-- No modifica balances existentes ni activa ningún cobro.
create or replace function cc_internal.cc_require_authorized_lemon_personal_credit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $body$
declare v_enabled boolean;
begin
 if new.provider='LEMON_DALE_PERSONAL' then
  select (s.collection_enabled and s.merchant_permission_verified)
    into v_enabled from public.cc_manual_recharge_settings s where s.id=1;
  if coalesce(v_enabled,false) is not true then
   raise exception 'Lemon/DALE personal: acreditación comercial deshabilitada; falta autorización comercial verificada';
  end if;
  if new.received_currency<>'PEN' or new.rate_pen_per_unit<>1
     or new.credited_pen<>round(new.received_amount,2) then
    raise exception 'Lemon: el importe acreditado debe coincidir exactamente con el importe PEN confirmado';
  end if;
 end if;
 return new;
end $body$;

revoke all on function cc_internal.cc_require_authorized_lemon_personal_credit() from public,anon,authenticated;
drop trigger if exists cc_personal_lemon_authorization_guard
 on public.cc_admin_verified_personal_topups;
create trigger cc_personal_lemon_authorization_guard
before insert on public.cc_admin_verified_personal_topups
for each row execute function cc_internal.cc_require_authorized_lemon_personal_credit();
