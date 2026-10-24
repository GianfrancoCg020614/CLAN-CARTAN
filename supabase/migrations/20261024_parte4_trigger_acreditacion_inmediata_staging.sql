-- CLAN CARTAN: STAGING only. Do not apply production before payment-proof integration and E2E.
-- Require trusted backend insert of REAL activation; same-transaction referral credit.
create or replace function public.cc_clan_settle_referral_after_verified_activation()
returns trigger language plpgsql security invoker set search_path='' as $fn$
declare v_result text;
begin
 if current_user <> 'service_role' then
   raise exception 'Only service_role can settle verified activations';
 end if;
 v_result := public.cc_clan_credit_verified_referral(new.activation_key);
 if v_result not in ('CREDITED_5_REAL_PEN','ALREADY_PAID_THIS_MONTH',
                     'NO_VALID_REFERRAL','INVITER_NOT_ELIGIBLE') then
   raise exception 'Unexpected referral settlement result: %',v_result;
 end if;
 return new;
end $fn$;
revoke all on function public.cc_clan_settle_referral_after_verified_activation() from public,anon,authenticated;
grant execute on function public.cc_clan_settle_referral_after_verified_activation() to service_role;
drop trigger if exists cc_clan_settle_referral_on_real_activation on public.cc_clan_verified_real_activations;
create trigger cc_clan_settle_referral_on_real_activation
 after insert on public.cc_clan_verified_real_activations
 for each row execute function public.cc_clan_settle_referral_after_verified_activation();
