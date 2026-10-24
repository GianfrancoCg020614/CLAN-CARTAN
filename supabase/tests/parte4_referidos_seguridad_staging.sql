-- CLAN CARTAN / Parte 4: pruebas de no acreditación y de mínimos privilegios.
-- Ejecutar SOLO contra Supabase STAGING. Sin usuarios, recibos ni dinero nuevos.
begin;
do $test$
declare
 v_count_before bigint;
 v_count_after bigint;
 v_result text;
begin
 select count(*) into v_count_before from public.cc_clan_wallet_operations;
 execute 'set local role service_role';
 select public.cc_clan_credit_verified_referral('NONEXISTENT_TEST_ACTIVATION_0001') into v_result;
 if v_result <> 'NO_VERIFIED_REAL_ACTIVATION' then
   raise exception 'Recompensa permitida sin activación REAL: %',v_result;
 end if;
 execute 'reset role';
 select count(*) into v_count_after from public.cc_clan_wallet_operations;
 if v_count_after <> v_count_before then
   raise exception 'Se modificaron movimientos de billetera en prueba negativa';
 end if;
end $test$;
set local role authenticated;
do $test$
begin
 if has_function_privilege(current_user,'public.cc_clan_credit_verified_referral(text)','EXECUTE')
  or has_table_privilege(current_user,'public.cc_clan_verified_real_activations','INSERT')
  or has_table_privilege(current_user,'public.cc_clan_referral_monthly_rewards','UPDATE')
 then raise exception 'Un usuario autenticado puede manipular recompensas'; end if;
end $test$;
rollback;
-- Requiere pendiente: prueba E2E con pagos/activaciones REAL de prueba y concurrencia.
