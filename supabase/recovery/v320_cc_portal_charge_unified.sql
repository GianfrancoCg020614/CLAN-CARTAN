CREATE OR REPLACE FUNCTION cc_internal.cc_portal_charge_unified(p_user uuid, p_amount numeric, p_kind text, p_key text, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w record; available numeric:=0;remaining numeric;part numeric;parts jsonb:='[]'::jsonb;
begin
 if auth.uid() is distinct from p_user or p_user is null
  or p_amount is null or p_amount<=0 or p_amount>10000 or p_amount<>round(p_amount,2)
  or p_kind not in ('PURCHASE','SUBSCRIPTION')
  or length(coalesce(p_key,'')) not between 10 and 80
  or length(coalesce(p_description,'')) not between 3 and 160
 then raise exception 'Cargo no autorizado' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC-UNIFIED:'||p_user::text,0));
 for w in select service,balance_pen from public.cc_real_service_wallets
          where user_id=p_user order by service for update
 loop available:=available+w.balance_pen;end loop;
 if available<p_amount then raise exception 'Saldo real insuficiente';end if;
 remaining:=p_amount;
 for w in select service,balance_pen from public.cc_real_service_wallets
          where user_id=p_user and balance_pen>0 order by service
 loop
  exit when remaining<=0;
  part:=least(remaining,w.balance_pen);
  if part<=0 then continue;end if;
  update public.cc_real_service_wallets
  set balance_pen=balance_pen-part,updated_at=now()
  where user_id=p_user and service=w.service and balance_pen>=part;
  if not found then raise exception 'El saldo cambió, actualiza el panel';end if;
  insert into public.cc_real_wallet_spends(user_id,service,kind,amount_pen,reference,description)
  values(p_user,w.service,p_kind,part,'PORTAL-'||p_key||'-'||w.service,p_description);
  parts:=parts||jsonb_build_array(jsonb_build_object('service',w.service,'amount_pen',part));
  remaining:=remaining-part;
 end loop;
 if remaining<>0 then raise exception 'Cargo incompleto';end if;
 return parts;
end $function$

