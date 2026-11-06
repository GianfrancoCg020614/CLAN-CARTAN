CREATE OR REPLACE FUNCTION public.cc_claim_dni_quota(p_user uuid)
 RETURNS TABLE(allowed boolean, remaining integer, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_month text := to_char(now() at time zone 'America/Lima','YYYY-MM');
        v_used int;
        v_exhausted boolean;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  return query select false,0,'forbidden'::text;return;
 end if;
 if p_user is null or not (
   exists(select 1 from public.cc_admins a where a.user_id=p_user)
   or exists(select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id where m.user_id=p_user and m.role='RESELLER' and m.status='ACTIVE' and b.code='COBRA_YA')
   or exists(select 1 from public.mc_accounts mc where mc.user_id=p_user and mc.suspended=false and mc.subscription_until>now())
 ) then
   return query select false,0,'not_authorized'::text;return;
 end if;
 insert into public.cc_dni_quota(month_key) values(v_month) on conflict do nothing;
 select q.used,q.external_exhausted into v_used,v_exhausted from public.cc_dni_quota q where q.month_key=v_month for update;
 if v_exhausted or v_used>=100 then return query select false,0,'monthly_limit'::text;return;end if;
 if (select count(*) from public.cc_dni_quota_log l where l.user_id=p_user and l.called_at>=now()-interval '24 hours')>=20 then
 return query select false,100-v_used,'daily_limit'::text;return;end if;
 update public.cc_dni_quota q set used=used+1 where q.month_key=v_month;
 insert into public.cc_dni_quota_log(user_id,month_key) values(p_user,v_month);
 return query select true,99-v_used,'ok'::text;
end $function$

