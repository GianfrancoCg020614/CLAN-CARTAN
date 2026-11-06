-- Protección aditiva: conserva el cobro/renovación y el registro financiero existentes.
create or replace function public.cc_finance_activate_membership(
 p_service text,p_request uuid,p_expected_amount_pen numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_access jsonb; checked_at timestamptz; until_date timestamptz;
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
 -- now() conserva la hora de inicio de la transacción: una conexión que esperó
 -- puede haber empezado ANTES que quien obtuvo el cerrojo. Validar con reloj
 -- posterior al bloqueo y una consulta nueva, sin reutilizar la vigencia precargada.
 checked_at:=clock_timestamp();
 if p_service='STREAM_BULLS' then
  select max(s.end_at) into until_date from public.cc_memberships m
  join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
  join public.cc_subscriptions s on s.membership_id=m.id
  join public.cc_plans p on p.id=s.plan_id and p.code in ('STREAM_365','STREAM_MONTHLY') and p.price_pen>0
  where m.user_id=actor and m.status='ACTIVE' and s.status='ACTIVE' and s.start_at<=checked_at;
 elsif p_service='COBRA_YA' then
  select max(period_end) into until_date from public.cc_cobra_real_access_periods
  where user_id=actor and status='ACTIVE' and period_start<=checked_at;
 elsif p_service='MI_COCHERA' then
  select subscription_until into until_date from public.mc_accounts where user_id=actor and not suspended;
 else
  select subscription_until into until_date from public.ma_accounts where user_id=actor and not suspended;
 end if;
 current_access:=jsonb_build_object('status',case when until_date>checked_at then 'ACTIVE' else 'INACTIVE' end,'active_until',until_date);
 if current_access->>'status'='ACTIVE' then
  return jsonb_build_object('service',p_service,'status','ALREADY_ACTIVE',
   'amount_pen',0,'active_until',current_access->>'active_until','charged',false);
 end if;
 return public.cc_finance_pay_membership(p_service,p_request,p_expected_amount_pen);
end;$$;
revoke all on function public.cc_finance_activate_membership(text,uuid,numeric) from public,anon,authenticated;
grant execute on function public.cc_finance_activate_membership(text,uuid,numeric) to authenticated;
