-- V316: consultas de vigencia; no modifica cuentas, pagos, roles ni registros.
create or replace function cc_internal.cc_business_access_v316(p_user uuid)
returns jsonb language sql stable security invoker set search_path=''
as $body$
 with stream as (
  select max(s.end_at) filter(where m.status='ACTIVE' and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()) as current_end,
   max(s.end_at) filter(where s.status='ACTIVE' and s.start_at<=now()) as last_end
  from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
  join public.cc_subscriptions s on s.membership_id=m.id join public.cc_plans p on p.id=s.plan_id
  where m.user_id=p_user and p.code='STREAM_365' and p.price_pen>0
 ), cobra as (
  select max(period_end) filter(where status='ACTIVE' and period_start<=now()) as until_date
  from public.cc_cobra_real_access_periods where user_id=p_user
 ), sources as (
  select 1 as ord,'STREAM_BULLS'::text as service,coalesce(current_end,last_end) as until_date,
   current_end is not null as enabled,false as suspended,'VERIFIED_REAL'::text as funding from stream
  union all
  select 2,'COBRA_YA',until_date,until_date>now(),false,'VERIFIED_REAL' from cobra
  union all
  select 3,'MI_COCHERA',a.subscription_until,a.subscription_until>now(),coalesce(a.suspended,false),
   (select e.paid_with from public.mc_subscription_events e where e.reseller_id=p_user and e.active_until=a.subscription_until order by e.created_at desc,e.id desc limit 1)
  from (select p_user as user_id) x left join public.mc_accounts a on a.user_id=x.user_id
  union all
  select 4,'MI_ALQUILER',a.subscription_until,a.subscription_until>now(),coalesce(a.suspended,false),
   (select e.funding from public.ma_subscription_events e where e.reseller_id=p_user and e.active_until=a.subscription_until order by e.created_at desc,e.id desc limit 1)
  from (select p_user as user_id) x left join public.ma_accounts a on a.user_id=x.user_id
 )
 select jsonb_agg(jsonb_build_object('service',service,'status',case when suspended then 'SUSPENDED' when enabled then 'ACTIVE' when until_date<=now() then 'EXPIRED' when until_date>now() then 'PENDING' else 'INACTIVE' end,
  'active_until',until_date,'funding',case when until_date is null then null else funding end) order by ord) from sources;
$body$;
revoke all on function cc_internal.cc_business_access_v316(uuid) from public,anon,authenticated;

create or replace function public.cc_portal_my_business_access_v316()
returns jsonb language plpgsql stable security definer set search_path=''
as $body$
declare actor uuid:=(select auth.uid());
begin
 if actor is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 return jsonb_build_object('business_access',cc_internal.cc_business_access_v316(actor));
end;
$body$;
revoke all on function public.cc_portal_my_business_access_v316() from public,anon;
grant execute on function public.cc_portal_my_business_access_v316() to authenticated;

-- Enriquecer la RPC ADMIN existente sin cambiar su firma, guardas ni campos anteriores.
do $patch$
declare original text;needle text:=$needle$'country_code',d.country_code,'paid_until',s.paid_until)$needle$;
begin
 original:=pg_get_functiondef('public.cc_portal_admin_accounts_v2()'::regprocedure);
 if position('cc_internal.cc_business_access_v316(u.id)' in original)>0 then return;end if;
 if position(needle in original)=0 then raise exception 'La RPC ADMIN cambió; revisar antes de aplicar V316';end if;
 execute replace(original,needle,$replacement$'country_code',d.country_code,'paid_until',s.paid_until,'business_access',cc_internal.cc_business_access_v316(u.id))$replacement$);
end;
$patch$;
