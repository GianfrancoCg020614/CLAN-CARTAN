-- V142 (2/2): S/15 verificados desde saldo real, S/5 por cada pago elegible.
-- Autorización de producción inicialmente FALSE; jamás convertir TEST en REAL.
create or replace function public.cc_pay_cobra_subscription_real()
returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
 v_user uuid:=auth.uid();
 v_enabled boolean;
 v_business uuid;
 v_member public.cc_memberships%rowtype;
 v_spend_id uuid;
 v_access_id uuid;
 v_payment_ref text;
 v_kind text;
 v_code_id uuid;
 v_inviter uuid;
 v_pending record;
 v_inviter_balance numeric(14,2);
 v_amount numeric(14,2):=15.00;
begin
 if v_user is null or auth.role()<>'authenticated' then
  raise exception 'Inicia sesión';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(v_user::text||':CY_MONTHLY_V113',0));
 select enabled into v_enabled from public.cc_cobra_real_payment_settings where id=true;
 if coalesce(v_enabled,false)=false then
  raise exception 'Suscripciones comerciales no habilitadas: falta validar cobros reales';
 end if;
 select id into strict v_business from public.cc_businesses where code='COBRA_YA';
 select * into v_member from public.cc_memberships
  where user_id=v_user and business_id=v_business for update;
 if found and (v_member.status='SUSPENDED' or v_member.role<>'RESELLER') then
  raise exception 'Cuenta no elegible como RESELLER';
 end if;
 if exists(select 1 from public.cy_access_periods
   where user_id=v_user and starts_at<=now() and ends_at>now())
 or exists(select 1 from public.cc_cobra_real_access_periods
   where user_id=v_user and status='ACTIVE' and period_start<=now() and period_end>now()) then
  raise exception 'Suscripción vigente; no se descontó nuevamente';
 end if;
 -- Debe existir saldo REAL ya acreditado por el proveedor, nunca balance_test.
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
  values(v_user,'COBRA_YA',0) on conflict(user_id,service) do nothing;
 v_kind:=case when exists(select 1 from public.cc_cobra_real_access_periods
                         where user_id=v_user)
  then 'RENEWAL' else 'INITIAL' end;
 v_payment_ref:='CY-REAL-'||replace(gen_random_uuid()::text,'-','');
 perform pg_catalog.set_config('cc_audit.kind',
   case when v_kind='INITIAL' then 'SUBSCRIPTION' else 'RENEWAL' end,true);
 perform pg_catalog.set_config('cc_audit.concept',
   case when v_kind='INITIAL' then 'Pago por suscripción' else 'Pago por renovación' end,true);
 perform pg_catalog.set_config('cc_audit.reference',v_payment_ref,true);
 perform pg_catalog.set_config('cc_audit.payment',v_payment_ref,true);
 update public.cc_real_service_wallets
  set balance_pen=balance_pen-v_amount,updated_at=now()
  where user_id=v_user and service='COBRA_YA' and balance_pen>=v_amount;
 if not found then raise exception 'Saldo REAL insuficiente (S/15)'; end if;
 insert into public.cc_real_wallet_spends(user_id,service,kind,amount_pen,reference,description)
 values(v_user,'COBRA_YA','SUBSCRIPTION',v_amount,v_payment_ref,
  case when v_kind='INITIAL' then 'Pago real de suscripción COBRA YA'
       else 'Pago real de renovación COBRA YA' end)
 returning id into v_spend_id;
 insert into public.cc_cobra_real_access_periods(user_id,spend_id,kind,period_start,period_end,amount_pen)
 values(v_user,v_spend_id,v_kind,now(),now()+interval '30 days',v_amount)
 returning id into v_access_id;
 if v_member.id is null then
  insert into public.cc_memberships(user_id,business_id,role,status)
  values(v_user,v_business,'RESELLER','PENDING');
 end if;
 update public.cc_memberships set status='ACTIVE',activated_at=coalesce(activated_at,now())
 where user_id=v_user and business_id=v_business and status in ('PENDING','EXPIRED');
 if not exists(select 1 from public.cc_memberships
   where user_id=v_user and business_id=v_business and status='ACTIVE' and role='RESELLER') then
  raise exception 'No se pudo activar COBRA YA; operación revertida';
 end if;
 -- Atribución única capturada AL REGISTRARSE; solo COBRA, invitador RESELLER.
 select a.code_id,a.inviter_user_id into v_code_id,v_inviter
 from public.cc_invitation_attributions a
 join public.cc_invitation_codes code on code.id=a.code_id
 join public.cc_memberships m on m.user_id=a.inviter_user_id
   and m.business_id=v_business and m.role='RESELLER' and m.status<>'SUSPENDED'
 where a.registered_user_id=v_user and a.business_id=v_business
   and a.inviter_user_id<>v_user and code.owner_user_id=a.inviter_user_id
   and code.business_id=v_business and code.code=a.code_snapshot
   and code.code like 'COBRA%' limit 1;
 if v_inviter is not null then
  insert into public.cc_real_service_wallets(user_id,service,balance_pen)
  values(v_inviter,'COBRA_YA',0) on conflict(user_id,service) do nothing;
  perform pg_catalog.set_config('cc_audit.kind','BONUS',true);
  perform pg_catalog.set_config('cc_audit.concept',
   case when v_kind='INITIAL' then 'Bono por suscripción inicial del referido'
        else 'Bono por renovación del referido' end,true);
  perform pg_catalog.set_config('cc_audit.reference','BONUS-'||v_access_id::text,true);
  perform pg_catalog.set_config('cc_audit.payment',v_payment_ref,true);
  perform pg_catalog.set_config('cc_audit.referred',v_user::text,true);
  update public.cc_real_service_wallets set balance_pen=balance_pen+5.00,updated_at=now()
   where user_id=v_inviter and service='COBRA_YA';
  insert into public.cc_cobra_referral_bonuses
    (access_id,beneficiary_user_id,referred_user_id,code_id,amount_pen)
  values(v_access_id,v_inviter,v_user,v_code_id,5.00);
  -- Compensa reversiones pendientes SIN permitir billeteras negativas.
  for v_pending in
   select * from public.cc_cobra_referral_bonuses
   where beneficiary_user_id=v_inviter and status='REVERSAL_PENDING'
   order by credited_at,id for update
  loop
   select balance_pen into v_inviter_balance
   from public.cc_real_service_wallets where user_id=v_inviter
       and service='COBRA_YA' for update;
   if v_inviter_balance<5 then exit;end if;
   perform pg_catalog.set_config('cc_audit.kind','BONUS_REVERSAL',true);
   perform pg_catalog.set_config('cc_audit.concept',
      'Reembolso de bono por suscripción o renovación',true);
   perform pg_catalog.set_config('cc_audit.reference',v_pending.reversal_reference,true);
   perform pg_catalog.set_config('cc_audit.original','BONUS-'||v_pending.access_id::text,true);
   perform pg_catalog.set_config('cc_audit.reason',v_pending.reversal_reason,true);
   perform pg_catalog.set_config('cc_audit.payment','',true);
   perform pg_catalog.set_config('cc_audit.referred',v_pending.referred_user_id::text,true);
   update public.cc_real_service_wallets set balance_pen=balance_pen-5.00,updated_at=now()
   where user_id=v_inviter and service='COBRA_YA';
   update public.cc_cobra_referral_bonuses set status='REVERSED',reversed_at=now()
   where id=v_pending.id;
  end loop;
 end if;
 perform pg_catalog.set_config('cc_audit.kind','',true);
 perform pg_catalog.set_config('cc_audit.concept','',true);
 perform pg_catalog.set_config('cc_audit.reference','',true);
 perform pg_catalog.set_config('cc_audit.payment','',true);
 perform pg_catalog.set_config('cc_audit.referred','',true);
 perform pg_catalog.set_config('cc_audit.original','',true);
 perform pg_catalog.set_config('cc_audit.reason','',true);
 return v_access_id;
end
$function$;
revoke all on function public.cc_pay_cobra_subscription_real() from public,anon;
grant execute on function public.cc_pay_cobra_subscription_real() to authenticated,service_role;

-- Todos los reembolsos de esta suscripción deben compensar su bono.
create or replace function public.cc_refund_cobra_real_subscription(
 p_access_id uuid,p_refund_reference text,p_reason text
) returns boolean language plpgsql security definer set search_path to ''
as $function$
declare
 v_access public.cc_cobra_real_access_periods%rowtype;
 v_spend public.cc_real_wallet_spends%rowtype;
 v_bonus public.cc_cobra_referral_bonuses%rowtype;
 v_wallet numeric(14,2);
begin
 if p_refund_reference is null or length(trim(p_refund_reference)) not between 8 and 100
  or length(trim(coalesce(p_reason,''))) not between 3 and 160 then
  raise exception 'Datos de devolución inválidos';
 end if;
 select * into v_access from public.cc_cobra_real_access_periods
  where id=p_access_id for update;
 if not found then raise exception 'Suscripción real inexistente'; end if;
 if v_access.status='REFUNDED' then return false;end if;
 select * into strict v_spend from public.cc_real_wallet_spends
  where id=v_access.spend_id for update;
 if exists(select 1 from public.cc_real_wallet_refunds where spend_id=v_spend.id) then
  raise exception 'Suscripción ya tiene devolución; requiere conciliación';
 end if;
 if exists(select 1 from public.cc_real_wallet_refunds where reference=trim(p_refund_reference)) then
  raise exception 'Referencia de devolución ya utilizada';
 end if;
 perform pg_catalog.set_config('cc_audit.kind','REFUND',true);
 perform pg_catalog.set_config('cc_audit.concept',
  case when v_access.kind='INITIAL' then 'Reembolso de suscripción'
       else 'Reembolso de renovación' end,true);
 perform pg_catalog.set_config('cc_audit.reference',trim(p_refund_reference),true);
 perform pg_catalog.set_config('cc_audit.original',v_spend.reference,true);
 perform pg_catalog.set_config('cc_audit.reason',trim(p_reason),true);
 update public.cc_real_service_wallets set balance_pen=balance_pen+15,updated_at=now()
 where user_id=v_access.user_id and service='COBRA_YA';
 if not found then raise exception 'Billetera original inexistente';end if;
 insert into public.cc_real_wallet_refunds(spend_id,user_id,service,amount_pen,reference,reason)
 values(v_spend.id,v_access.user_id,'COBRA_YA',15,trim(p_refund_reference),trim(p_reason));
 update public.cc_cobra_real_access_periods set status='REFUNDED' where id=p_access_id;
 select * into v_bonus from public.cc_cobra_referral_bonuses
  where access_id=p_access_id for update;
 if found and v_bonus.status='CREDITED' then
  select balance_pen into v_wallet from public.cc_real_service_wallets
  where user_id=v_bonus.beneficiary_user_id and service='COBRA_YA' for update;
  update public.cc_cobra_referral_bonuses
   set reversal_reference=trim(p_refund_reference)||'-BONUS',
       reversal_reason=left(trim(p_reason),160),
       status=case when v_wallet>=5 then 'REVERSED' else 'REVERSAL_PENDING' end,
       reversed_at=case when v_wallet>=5 then now() else null end
   where id=v_bonus.id;
  if v_wallet>=5 then
   perform pg_catalog.set_config('cc_audit.kind','BONUS_REVERSAL',true);
   perform pg_catalog.set_config('cc_audit.concept',
    case when v_access.kind='INITIAL' then 'Reembolso de bono por suscripción'
         else 'Reembolso de bono por renovación' end,true);
   perform pg_catalog.set_config('cc_audit.reference',trim(p_refund_reference)||'-BONUS',true);
   perform pg_catalog.set_config('cc_audit.original','BONUS-'||p_access_id::text,true);
   perform pg_catalog.set_config('cc_audit.referred',v_bonus.referred_user_id::text,true);
   update public.cc_real_service_wallets set balance_pen=balance_pen-5,updated_at=now()
   where user_id=v_bonus.beneficiary_user_id and service='COBRA_YA';
  end if;
 end if;
 -- El acceso reembolsado queda revocado salvo un periodo vigente independiente.
 if not exists(select 1 from public.cy_access_periods
     where user_id=v_access.user_id and starts_at<=now() and ends_at>now())
 and not exists(select 1 from public.cc_cobra_real_access_periods
     where user_id=v_access.user_id and status='ACTIVE'
        and period_start<=now() and period_end>now()) then
  update public.cc_memberships set status='EXPIRED'
  where user_id=v_access.user_id and business_id=(select id from public.cc_businesses where code='COBRA_YA')
  and status='ACTIVE';
 end if;
 perform pg_catalog.set_config('cc_audit.kind','',true);
 perform pg_catalog.set_config('cc_audit.concept','',true);
 perform pg_catalog.set_config('cc_audit.reference','',true);
 perform pg_catalog.set_config('cc_audit.payment','',true);
 perform pg_catalog.set_config('cc_audit.referred','',true);
 perform pg_catalog.set_config('cc_audit.original','',true);
 perform pg_catalog.set_config('cc_audit.reason','',true);
 return true;
end
$function$;
revoke all on function public.cc_refund_cobra_real_subscription(uuid,text,text) from public,anon,authenticated;
grant execute on function public.cc_refund_cobra_real_subscription(uuid,text,text) to service_role;

-- El reembolso general V135 permanece, salvo para suscripciones con bono ligado.
create or replace function public.cc_refund_verified_real_purchase(
 p_spend_reference text,p_refund_reference text,p_amount numeric,p_reason text
) returns boolean language plpgsql security definer set search_path to ''
as $function$
declare v_spend public.cc_real_wallet_spends%rowtype;
 v_existing public.cc_real_wallet_refunds%rowtype;
 v_total numeric;v_ref text:=trim(coalesce(p_refund_reference,''));
 v_purchase text:=trim(coalesce(p_spend_reference,''));
 v_reason text:=trim(coalesce(p_reason,''));
begin
 if length(v_purchase) not between 8 and 120 or length(v_ref) not between 8 and 120
 or length(v_reason) not between 3 and 160
 or p_amount is null or p_amount<=0 or p_amount>10000 or p_amount<>round(p_amount,2)
 then raise exception 'Datos de reembolso inválidos';end if;
 select * into v_spend from public.cc_real_wallet_spends
 where reference=v_purchase for update;
 if not found then raise exception 'Compra real no encontrada';end if;
 if exists(select 1 from public.cc_cobra_real_access_periods
    where spend_id=v_spend.id) then
  raise exception 'Suscripción COBRA YA: utilizar reembolso específico que revierte bono';
 end if;
 select * into v_existing from public.cc_real_wallet_refunds where reference=v_ref;
 if found then
  if v_existing.spend_id=v_spend.id and v_existing.user_id=v_spend.user_id
    and v_existing.service=v_spend.service and v_existing.amount_pen=p_amount
    and v_existing.reason=v_reason then return false;end if;
  raise exception 'Referencia de reembolso ya utilizada';
 end if;
 select coalesce(sum(amount_pen),0) into v_total
 from public.cc_real_wallet_refunds where spend_id=v_spend.id;
 if v_total+p_amount>v_spend.amount_pen then
  raise exception 'El total reembolsado supera la compra';
 end if;
 perform pg_catalog.set_config('cc_audit.kind','REFUND',true);
 perform pg_catalog.set_config('cc_audit.concept','Reembolso de compra',true);
 perform pg_catalog.set_config('cc_audit.reference',v_ref,true);
 perform pg_catalog.set_config('cc_audit.original',v_purchase,true);
 perform pg_catalog.set_config('cc_audit.reason',v_reason,true);
 update public.cc_real_service_wallets
 set balance_pen=balance_pen+p_amount,updated_at=now()
 where user_id=v_spend.user_id and service=v_spend.service;
 if not found then raise exception 'La billetera original no existe';end if;
 insert into public.cc_real_wallet_refunds
 (spend_id,user_id,service,amount_pen,reference,reason)
 values(v_spend.id,v_spend.user_id,v_spend.service,p_amount,v_ref,v_reason);
 perform pg_catalog.set_config('cc_audit.kind','',true);
 perform pg_catalog.set_config('cc_audit.concept','',true);
 perform pg_catalog.set_config('cc_audit.reference','',true);
 perform pg_catalog.set_config('cc_audit.original','',true);
 perform pg_catalog.set_config('cc_audit.reason','',true);
 return true;
end
$function$;
revoke all on function public.cc_refund_verified_real_purchase(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.cc_refund_verified_real_purchase(text,text,numeric,text) to service_role;
