-- V394: operational ADMIN reads and one shared promotional grant. No real-money rule changes.
create function public.cc394_admin_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 return jsonb_build_object('users',(select count(*) from auth.users),'pending_recharges',(select count(*) from cc_internal.recharge_registry where status in('PENDING','VERIFYING','CLARIFICATION')),'pending_orders',(select count(*) from public.cc_portal_stream_orders where status='PAID_AWAITING_DELIVERY'),'user_funds_pen',(select coalesce(sum(balance_pen),0) from public.cc_real_service_wallets));
end $$;

create function public.cc394_admin_directory(p_search text default '',p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;term text:=translate(lower(btrim(coalesce(p_search,''))),'áéíóúüñ','aeiouun');begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_page is null or p_page<0 or p_page>50000 or length(term)>120 then raise exception 'Filtro inválido';end if;
 select coalesce(jsonb_agg(row),'[]') into result from (
 select u.id user_id,u.email,coalesce(d.full_name,p.display_name,split_part(u.email,'@',1)) display_name,
 coalesce(d.full_name,r.display_alias,p.display_name,split_part(u.email,'@',1)) registry_alias,c.code registry_code,r.registry_no,
 u.created_at registered_at,d.phone_e164 phone,d.document_type,d.document_number,d.region,d.province,d.district,d.country_code,
 exists(select 1 from public.cc_admins a where a.user_id=u.id) is_admin,
 coalesce(m.role,'AFFILIATE') role_assigned,coalesce(m.status,'PENDING') membership_status,
 coalesce(sr.enabled,false) super_enabled,s.paid_until,s.paid_until access_until,
 cc_internal.cc_business_access_v316(u.id) business_access
 from auth.users u
 left join public.cc_user_details d on d.user_id=u.id left join public.cc_profiles p on p.user_id=u.id
 left join public.cc_clan_codes c on c.user_id=u.id left join public.cc_portal_user_registry r on r.user_id=u.id
 left join public.cc_businesses b on b.code='STREAM_BULLS' left join public.cc_memberships m on m.user_id=u.id and m.business_id=b.id
 left join public.cc_portal_super_resellers sr on sr.user_id=u.id
 left join lateral(select max(sub.end_at) paid_until from public.cc_subscriptions sub join public.cc_plans plan on plan.id=sub.plan_id where sub.membership_id=m.id and m.status='ACTIVE' and sub.status='ACTIVE' and sub.start_at<=now() and sub.end_at>now() and plan.code in('STREAM_365','STREAM_MONTHLY') and plan.price_pen>0)s on true
 where term='' or position(term in translate(lower(concat_ws(' ',c.code,d.full_name,r.display_alias,p.display_name,u.email,d.phone_e164,d.document_number)),'áéíóúüñ','aeiouun'))>0
 order by c.code_number nulls last,u.created_at,u.id limit 21 offset p_page*20
 )row;
 return jsonb_build_object('rows',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements(result) with ordinality x(value,ord) where ord<=20),'has_more',jsonb_array_length(result)>20,'page',p_page,'registered_users',(select count(*) from auth.users));
end $$;

create function public.cc394_admin_grant_shared_bonus(p_recipient uuid,p_amount numeric,p_request uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();prior public.cc_admin_promo_grants%rowtype;balance numeric;begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_recipient is null or p_recipient=actor or exists(select 1 from public.cc_admins where user_id=p_recipient) or not exists(select 1 from auth.users where id=p_recipient and email_confirmed_at is not null) then raise exception 'Selecciona una cuenta verificada que no sea ADMIN';end if;
 if p_request is null or p_amount is null or p_amount<=0 or p_amount>1000 or p_amount<>round(p_amount,2) or length(btrim(coalesce(p_reason,''))) not between 5 and 180 then raise exception 'Importe, motivo o referencia inválidos';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC-FINANCE-V320',0));
 select * into prior from public.cc_admin_promo_grants where request_id=p_request;
 if found then
  if prior.recipient_id<>p_recipient or prior.amount_pen<>p_amount or prior.admin_id<>actor or prior.reason<>btrim(p_reason) then raise exception 'Referencia utilizada con otros datos' using errcode='42501';end if;
 else
  insert into public.cc_admin_promo_grants(request_id,admin_id,recipient_id,service,amount_pen,reason) values(p_request,actor,p_recipient,'COBRA_YA',p_amount,btrim(p_reason));
  -- This is an existing source of the shared bonus pool; never creates a second wallet.
  insert into public.cc_cobra_welcome_bonus_wallets(user_id,balance_pen) values(p_recipient,p_amount) on conflict(user_id) do update set balance_pen=public.cc_cobra_welcome_bonus_wallets.balance_pen+excluded.balance_pen,updated_at=clock_timestamp();
 end if;
 select coalesce((select balance_pen from public.cc_cobra_welcome_bonus_wallets where user_id=p_recipient),0)+coalesce((select bonus_pen from public.mc_accounts where user_id=p_recipient),0)+coalesce((select bonus_pen from public.ma_accounts where user_id=p_recipient),0) into balance;
 return jsonb_build_object('confirmed',true,'already_processed',prior.id is not null,'amount_pen',p_amount,'shared_bonus_pen',balance,'request_id',p_request,'activation_changed',false);
end $$;

create function public.cc394_admin_records(p_user uuid,p_section text,p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare source text;result jsonb;begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_user is null or not exists(select 1 from auth.users where id=p_user) or p_page is null or p_page<0 or p_page>50000 then raise exception 'Usuario o página inválidos';end if;
 case p_section
 when 'wallet' then source:=$q$select service,balance_pen,'PEN'::text currency,updated_at from public.cc_real_service_wallets where user_id=$1 order by service$q$;
 when 'bonuses' then source:=$q$select amount_pen,reason,created_at,request_id from (select amount_pen,reason,created_at,request_id from public.cc_admin_promo_grants where recipient_id=$1 union all select amount_pen,note reason,created_at,request_id from public.mc_bonus_events where reseller_id=$1 and kind='ADMIN_GRANT' union all select amount_pen,note reason,created_at,request_id from public.ma_bonus_events where reseller_id=$1 and kind='ADMIN_GRANT') grants order by created_at desc,request_id desc$q$;
 when 'recharges' then source:=$q$select rec_code,receiver,status,requested_pen,payment_currency,payment_amount,provider_reference,created_at,credited_at from cc_internal.recharge_registry where user_id=$1 order by created_at desc,id desc$q$;
 when 'movements' then source:=$q$select service,event_type,concept,amount_pen,balance_before,balance_after,status,reference,reason,recorded_at from public.cc_wallet_financial_audit where user_id=$1 order by recorded_at desc,id desc$q$;
 when 'purchases' then source:=$q$select order_code,title,price_pen,status,created_at,fulfilled_at,case when buyer_id=$1 then 'Compra' else 'Venta' end relation from public.cc_portal_stream_orders where buyer_id=$1 or seller_id=$1 order by created_at desc,id desc$q$;
 when 'cobra_clients' then source:=$q$select client_code,full_name,alias,document_number,phone,email,address,district,notes,created_at from public.cy_clients where owner_id=$1 order by created_at desc,id desc$q$;
 when 'loans' then source:=$q$select l.loan_code,c.full_name,l.currency,l.principal,l.interest_rate,l.total_due,l.status,l.issued_on,l.calculation_method,l.term_installments,l.notes from public.cy_loans l left join public.cy_clients c on c.id=l.client_id and c.owner_id=l.owner_id where l.owner_id=$1 order by l.created_at desc,l.id desc$q$;
 when 'loan_payments' then source:=$q$select l.loan_code,c.full_name,l.currency,p.amount,p.paid_on,p.payment_method,p.memo from public.cy_payments p join public.cy_loans l on l.id=p.loan_id and l.owner_id=p.owner_id left join public.cy_clients c on c.id=l.client_id and c.owner_id=l.owner_id where p.owner_id=$1 order by p.created_at desc,p.id desc$q$;
 when 'schedules' then source:=$q$select l.loan_code,i.installment_number,i.due_on,i.amount,i.paid_total,l.currency,i.status from public.cy_installments i join public.cy_loans l on l.id=i.loan_id and l.owner_id=i.owner_id where i.owner_id=$1 order by i.due_on desc,i.id desc$q$;
 when 'guarantees' then source:=$q$select l.loan_code,g.description,g.created_at from public.cy_loan_collateral g join public.cy_loans l on l.id=g.loan_id and l.owner_id=g.owner_id where g.owner_id=$1 order by g.created_at desc,g.loan_id desc$q$;
 when 'parking_people' then source:=$q$select full_name,document_type,document_number,phone,country,verification_source,created_at from public.mc_people where reseller_id=$1 order by created_at desc,id desc$q$;
 when 'parking' then source:=$q$select alias,business_type,daily_rate,currency,state,actual_joined_on,actual_left_on,created_at from public.mc_carts where reseller_id=$1 order by created_at desc,id desc$q$;
 when 'parking_movements' then source:=$q$select c.alias,m.kind,m.label,m.quantity,m.unit_price,m.amount_local,m.currency,m.occurred_on,m.payment_method from public.mc_movements m left join public.mc_carts c on c.id=m.cart_id and c.reseller_id=m.reseller_id where m.reseller_id=$1 order by m.created_at desc,m.id desc$q$;
 when 'rental_people' then source:=$q$select full_name,document_type,document_number,whatsapp,consent_whatsapp,created_at from public.ma_tenants where reseller_id=$1 order by created_at desc,id desc$q$;
 when 'rental_units' then source:=$q$select code,alias,kind,daily_rate,monthly_rate,currency,state,floor,created_at from public.ma_units where reseller_id=$1 order by created_at desc,id desc$q$;
 when 'leases' then source:=$q$select t.full_name,u.code,u.alias,l.mode,l.rate,l.currency,l.start_on,l.next_due_on,l.end_on,l.state,l.periods from public.ma_leases l left join public.ma_tenants t on t.id=l.tenant_id and t.reseller_id=l.reseller_id left join public.ma_units u on u.id=l.unit_id and u.reseller_id=l.reseller_id where l.reseller_id=$1 order by l.created_at desc,l.id desc$q$;
 when 'rental_movements' then source:=$q$select kind,label,service,period_no,period_month,amount_pen,currency,due_on,method,created_at from public.ma_ledger where reseller_id=$1 order by created_at desc,id desc$q$;
 when 'stream_clients' then source:=$q$select alias,phone_e164,email from public.sb_oper_clients where owner_id=$1 order by alias,id$q$;
 when 'stream_accounts' then source:=$q$select service,code,alias,state,start_at,end_at,capacity,provider_allows_reassignment,account_email from public.sb_oper_accounts where owner_id=$1 order by start_at desc,id desc$q$;
 when 'stream_contracts' then source:=$q$select c.alias,s.service,s.start_at,s.end_at,s.price_pen,s.paid_pen,s.status,s.device_notes from public.sb_oper_contracts s left join public.sb_oper_clients c on c.id=s.client_id and c.owner_id=s.owner_id where s.owner_id=$1 order by s.start_at desc,s.id desc$q$;
 when 'stream_payments' then source:=$q$select amount_pen,method,reference,recorded_at from public.sb_oper_payments where owner_id=$1 order by recorded_at desc,id desc$q$;
 else raise exception 'Sección no permitida';end case;
 execute 'select coalesce(jsonb_agg(row),''[]''::jsonb) from ('||source||' limit $2 offset $3) row' into result using p_user,21,p_page*20;
 return jsonb_build_object('section',p_section,'page',p_page,'has_more',jsonb_array_length(result)>20,'rows',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements(result) with ordinality x(value,ord) where ord<=20),'shared_bonus_pen',case when p_section='wallet' then coalesce((select balance_pen from public.cc_cobra_welcome_bonus_wallets where user_id=p_user),0)+coalesce((select bonus_pen from public.mc_accounts where user_id=p_user),0)+coalesce((select bonus_pen from public.ma_accounts where user_id=p_user),0) else null end);
end $$;

create function public.cc394_referral_status(p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;begin
 if u is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 if p_page is null or p_page<0 or p_page>50000 then raise exception 'Página inválida';end if;
 select coalesce(jsonb_agg(row),'[]') into result from (
 select coalesce(c.code,'CLAN pendiente') referred,a.recorded_at,
 (select count(*) from cc_internal.finance_membership_payments p where p.user_id=a.referred_user_id and p.status='PAID') real_payments,
 (select coalesce(sum(amount_pen-recovered_pen),0) from cc_internal.finance_referral_bonuses b where b.referred_id=a.referred_user_id and b.beneficiary_id=u) credited_pen,
 exists(select 1 from public.cc_bonus_membership_payments p where p.user_id=a.referred_user_id) or exists(select 1 from public.mc_subscription_events e where e.reseller_id=a.referred_user_id and e.paid_with='BONUS') or exists(select 1 from public.ma_subscription_events e where e.reseller_id=a.referred_user_id and e.funding='BONUS') bonus_activation
 from public.cc_clan_attributions a left join public.cc_clan_codes c on c.user_id=a.referred_user_id where a.inviter_user_id=u order by a.recorded_at desc,a.referred_user_id limit 21 offset p_page*20
 )row;
 return jsonb_build_object('rows',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements(result) with ordinality x(value,ord) where ord<=20),'has_more',jsonb_array_length(result)>20,'page',p_page);
end $$;

do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cc394_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
end loop;end $$;
notify pgrst,'reload schema';
