CREATE OR REPLACE FUNCTION cc_internal.capture_real_wallet_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_before numeric(14,2):=0;
 v_kind text;
 v_concept text;
 v_ref text;
 v_related text;
 v_referred uuid;
begin
 if tg_op='UPDATE' then v_before:=old.balance_pen;end if;
 if new.balance_pen=v_before then return new;end if;
 v_kind:=nullif(current_setting('cc_audit.kind',true),'');
 if v_kind is null then v_kind:='BALANCE_CHANGE';end if;
 v_concept:=nullif(current_setting('cc_audit.concept',true),'');
 if v_concept is null then v_concept:='Movimiento de saldo real — origen por conciliar';end if;
 v_ref:=nullif(current_setting('cc_audit.reference',true),'');
 if v_ref is null then v_ref:='BAL-'||gen_random_uuid()::text;end if;
 v_related:=nullif(current_setting('cc_audit.payment',true),'');
 v_referred:=nullif(current_setting('cc_audit.referred',true),'')::uuid;
 insert into public.cc_wallet_financial_audit
 (user_id,service,event_type,concept,amount_pen,balance_before,balance_after,
  reference,related_payment_ref,referred_user_id,original_reference,reason)
 values(new.user_id,new.service,v_kind,left(v_concept,200),
        new.balance_pen-v_before,v_before,new.balance_pen,v_ref,v_related,v_referred,
        nullif(current_setting('cc_audit.original',true),''),
        nullif(current_setting('cc_audit.reason',true),''));
 return new;
end $function$

