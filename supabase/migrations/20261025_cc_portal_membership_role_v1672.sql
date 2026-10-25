-- CLAN CARTAN · V167.2 corrección incremental de permisos tras pago.
-- La membresía de un AFILIADO pasa a RESELLER; conserva SUPER_RESELLER existente.
-- Esta migración NO repite ni cobra membresías ni toca saldos o suscripciones.
create or replace function public.cc_portal_buy_stream_membership(
 p_checkout_key uuid,p_expected_amount_pen numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();plan public.cc_plans%rowtype;biz uuid;member uuid;
 oldrecord public.cc_portal_stream_memberships_paid%rowtype;
 current_until timestamptz;begin_date date;starts timestamptz;finishes timestamptz;
 subscription uuid;parts jsonb;legacyrole text;
begin
 if u is null or p_checkout_key is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC-MEMBER:'||p_checkout_key::text,0));
 select * into oldrecord from public.cc_portal_stream_memberships_paid where checkout_key=p_checkout_key;
 if found then
  if oldrecord.user_id<>u then raise exception 'Referencia de otro usuario' using errcode='42501';end if;
  return jsonb_build_object('membership_id',oldrecord.membership_id,'subscription_id',oldrecord.subscription_id,
   'ends_at',oldrecord.ends_at,'amount_pen',oldrecord.amount_pen,'already_processed',true);
 end if;
 select id into biz from public.cc_businesses where code='STREAM_BULLS';
 select * into plan from public.cc_plans where business_id=biz and code='STREAM_365' and is_active for share;
 if not found or plan.price_pen<=0 or plan.price_pen<>p_expected_amount_pen
 then raise exception 'Precio de membresía actualizado o no disponible';end if;
 insert into public.cc_profiles(user_id) values(u) on conflict(user_id) do nothing;
 select m.id,m.role into member,legacyrole from public.cc_memberships m
 where m.user_id=u and m.business_id=biz for update;
 select max(s.end_at) into current_until
 from public.cc_subscriptions s where s.membership_id=member and s.status='ACTIVE' and s.end_at>now();
 begin_date:=case when current_until is not null
  then (current_until at time zone 'America/Lima')::date+1
  else (now() at time zone 'America/Lima')::date end;
 starts:=begin_date::timestamp at time zone 'America/Lima';
 finishes:=((begin_date+365)::timestamp at time zone 'America/Lima')-interval '1 second';
 parts:=cc_internal.cc_portal_charge_unified(u,plan.price_pen,'SUBSCRIPTION',
 'MEM-'||p_checkout_key::text,'Membresía STREAM BULLS · 365 días');
 if member is null then
  insert into public.cc_memberships(user_id,business_id,role,status,activated_at)
  values(u,biz,'RESELLER','ACTIVE',now()) returning id into member;
 else
  update public.cc_memberships set status='ACTIVE',role=case when role='AFFILIATE' then 'RESELLER' else role end,activated_at=coalesce(activated_at,now())
  where id=member;
 end if;
 insert into public.cc_subscriptions(membership_id,plan_id,status,start_at,end_at)
 values(member,plan.id,'ACTIVE',starts,finishes) returning id into subscription;
 insert into public.cc_portal_stream_memberships_paid
 (checkout_key,user_id,membership_id,subscription_id,amount_pen,starts_at,ends_at,wallet_parts)
 values(p_checkout_key,u,member,subscription,plan.price_pen,starts,finishes,parts);
 return jsonb_build_object('membership_id',member,'subscription_id',subscription,
 'ends_at',finishes,'amount_pen',plan.price_pen,'already_processed',false);
end $$;
