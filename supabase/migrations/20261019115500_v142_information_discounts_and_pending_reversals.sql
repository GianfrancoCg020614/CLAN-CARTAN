-- V142 (3/3): eventos informativos de descuento / reversión pendiente.
-- Los ahorros NO inventan saldo: amount_pen=0, saldos iguales y affects_balance=false.
alter table public.cc_wallet_financial_audit
 add column affects_balance boolean not null default true,
 add column notional_amount_pen numeric(14,2);
alter table public.cc_wallet_financial_audit
 drop constraint cc_wallet_financial_audit_amount_pen_check,
 add constraint cc_wallet_audit_effect_check check (
  (affects_balance and amount_pen<>0)
  or (not affects_balance and amount_pen=0 and balance_before=balance_after)
 ),
 add constraint cc_wallet_audit_notional_check check (
  notional_amount_pen is null or notional_amount_pen>=0
 );
create or replace function public.cc_record_real_discount(
 p_spend_reference text,p_discount_reference text,p_discount_pen numeric,p_reason text
) returns boolean language plpgsql security definer set search_path to ''
as $function$
declare v_spend public.cc_real_wallet_spends%rowtype;
 v_balance numeric(14,2);
begin
 if p_discount_reference is null or length(trim(p_discount_reference)) not between 8 and 120
 or p_discount_pen is null or p_discount_pen<=0 or p_discount_pen>10000
 or p_discount_pen<>round(p_discount_pen,2)
 or length(trim(coalesce(p_reason,''))) not between 3 and 160 then
  raise exception 'Datos de descuento inválidos';
 end if;
 select * into v_spend from public.cc_real_wallet_spends
 where reference=trim(p_spend_reference) for share;
 if not found then raise exception 'Pago real relacionado inexistente';end if;
 if exists(select 1 from public.cc_wallet_financial_audit
   where reference=trim(p_discount_reference)) then return false;end if;
 select balance_pen into v_balance from public.cc_real_service_wallets
 where user_id=v_spend.user_id and service=v_spend.service;
 if v_balance is null then raise exception 'Billetera inexistente';end if;
 insert into public.cc_wallet_financial_audit
 (user_id,service,event_type,concept,amount_pen,balance_before,balance_after,
  status,reference,original_reference,reason,affects_balance,notional_amount_pen)
 values(v_spend.user_id,v_spend.service,'DISCOUNT',
  case when v_spend.kind='SUBSCRIPTION' then 'Descuento por suscripción o renovación'
   else 'Descuento por compra' end,0,v_balance,v_balance,
   'CONFIRMED',trim(p_discount_reference),v_spend.reference,trim(p_reason),false,p_discount_pen);
 return true;
end
$function$;
revoke all on function public.cc_record_real_discount(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.cc_record_real_discount(text,text,numeric,text) to service_role;
create or replace function cc_internal.cobra_bonus_pending_notice()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare v_balance numeric(14,2);
begin
 if new.status='REVERSAL_PENDING' and old.status<>'REVERSAL_PENDING' then
  select balance_pen into v_balance from public.cc_real_service_wallets
  where user_id=new.beneficiary_user_id and service='COBRA_YA';
  insert into public.cc_wallet_financial_audit
   (user_id,service,event_type,concept,amount_pen,balance_before,balance_after,
    status,reference,related_payment_ref,referred_user_id,original_reference,reason,
    affects_balance,notional_amount_pen)
  values(new.beneficiary_user_id,'COBRA_YA','BONUS_REVERSAL_PENDING',
   'Reversión de bono pendiente por saldo insuficiente',0,v_balance,v_balance,
   'PENDING',new.reversal_reference||'-PENDING',
   (select s.reference from public.cc_real_wallet_spends s
     join public.cc_cobra_real_access_periods p on p.spend_id=s.id where p.id=new.access_id),
   new.referred_user_id,'BONUS-'||new.access_id::text,new.reversal_reason,false,5.00);
 end if;
 return new;
end
$function$;
create trigger cc_cobra_bonus_pending_notice_trigger
 after update of status on public.cc_cobra_referral_bonuses
 for each row execute function cc_internal.cobra_bonus_pending_notice();
