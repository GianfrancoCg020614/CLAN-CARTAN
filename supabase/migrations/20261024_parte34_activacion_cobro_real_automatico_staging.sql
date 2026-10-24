-- STAGING only. Requires backend-verified service activation and real-wallet funding.
-- Atomic debit of REAL balance and automatic referral credit via AFTER INSERT trigger.
create or replace function public.cc_clan_activate_with_real_wallet(
 p_referred_user_id uuid,
 p_service text,
 p_amount_pen numeric,
 p_activation_key text,
 p_receipt_key text
) returns text language plpgsql security invoker set search_path='' as $fn$
declare
 v_old public.cc_clan_verified_real_activations%rowtype;
 v_balance numeric;
 v_debit_key text;
begin
 if current_user <> 'service_role' then raise exception 'Server-only activation'; end if;
 if p_referred_user_id is null or p_service not in ('STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER')
 or p_amount_pen is null or p_amount_pen<=0 or p_amount_pen<>round(p_amount_pen,2)
 or p_activation_key is null or length(p_activation_key) not between 12 and 130
 or p_receipt_key is null or length(p_receipt_key) not between 12 and 130 then
 raise exception 'Invalid activation payment'; end if;
 v_debit_key='activation-real:v1:'||p_activation_key;
 select * into v_old from public.cc_clan_verified_real_activations where activation_key=p_activation_key;
 if found then
  if v_old.referred_user_id<>p_referred_user_id or v_old.service<>p_service
    or v_old.verified_real_amount_pen<>p_amount_pen or v_old.source_receipt_id<>p_receipt_key then
     raise exception 'Activation replay changed original details';
  end if;
  return 'ALREADY_ACTIVATED';
 end if;
 v_balance:=public.cc_clan_post_wallet_operation(p_referred_user_id,'REAL',p_service,-p_amount_pen,v_debit_key);
 insert into public.cc_clan_verified_real_activations
  (activation_key,referred_user_id,service,verified_real_amount_pen,confirmed_at,source_receipt_id)
 values(p_activation_key,p_referred_user_id,p_service,p_amount_pen,now(),p_receipt_key);
 -- Trigger cc_clan_settle_referral_on_real_activation credits inviter in same transaction.
 return 'ACTIVATED_REAL_AND_REFERRAL_SETTLED';
end $fn$;
revoke all on function public.cc_clan_activate_with_real_wallet(uuid,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.cc_clan_activate_with_real_wallet(uuid,text,numeric,text,text) to service_role;
