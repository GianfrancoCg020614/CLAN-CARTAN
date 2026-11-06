-- Protección aditiva: conserva el cobro/renovación y el registro financiero existentes.
create or replace function public.cc_finance_activate_membership(
 p_service text,p_request uuid,p_expected_amount_pen numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_access jsonb;
begin
 if actor is null or p_request is null then
  raise exception 'Inicia sesión y confirma la activación' using errcode='42501';
 end if;
 if p_service is null or p_service not in ('COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS')
    or p_expected_amount_pen is null or p_expected_amount_pen<=0 then
  raise exception 'Servicio o tarifa inválidos';
 end if;
 -- Mismo cerrojo que el cobro existente: serializa también otras pestañas y renovaciones.
 perform pg_advisory_xact_lock(hashtextextended('CC-FINANCE-V320',0));
 -- Reintento de un pago ya confirmado: conserva identidad, tarifa, resultado y reversión.
 if exists(select 1 from cc_internal.finance_membership_payments where request_id=p_request)
    or exists(select 1 from public.cc_portal_stream_memberships_paid where checkout_key=p_request) then
  return public.cc_finance_pay_membership(p_service,p_request,p_expected_amount_pen);
 end if;
 select x into current_access from jsonb_array_elements(cc_internal.cc_business_access_v316(actor)) x
 where x->>'service'=p_service;
 if current_access->>'status'='ACTIVE' then
  return jsonb_build_object('service',p_service,'status','ALREADY_ACTIVE',
   'amount_pen',0,'active_until',current_access->>'active_until','charged',false);
 end if;
 if current_access->>'status' in ('SUSPENDED','PENDING') then
  raise exception 'Revisa el estado de tu membresía antes de activar' using errcode='42501';
 end if;
 return public.cc_finance_pay_membership(p_service,p_request,p_expected_amount_pen);
end;$$;
revoke all on function public.cc_finance_activate_membership(text,uuid,numeric) from public,anon,authenticated;
grant execute on function public.cc_finance_activate_membership(text,uuid,numeric) to authenticated;
