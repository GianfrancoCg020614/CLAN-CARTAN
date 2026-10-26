-- V179: la aprobación manual requiere suscripción anual STREAM_365 pagada y vigente.
-- No altera usuarios, saldos ni suscripciones. Se evita validar periodos gratuitos.
create or replace function public.cc_portal_admin_set_super_reseller(
 p_email text,p_enabled boolean,p_admin_percent numeric default 20
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid();target uuid;member uuid;
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor)
 then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_email is null or length(trim(p_email))<6 or p_enabled is null or p_admin_percent is null
  or p_admin_percent<0 or p_admin_percent>100 or p_admin_percent<>round(p_admin_percent,2)
 then raise exception 'Datos incorrectos';end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
 if target is null then raise exception 'Cuenta no registrada';end if;
 if exists(select 1 from public.cc_admins where user_id=target)
 then raise exception 'Los administradores no reciben permisos comerciales';end if;
 select m.id into member from public.cc_memberships m
 join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
 where m.user_id=target and m.status='ACTIVE'
  and exists(
    select 1 from public.cc_subscriptions s
    join public.cc_plans p on p.id=s.plan_id
    where s.membership_id=m.id and s.status='ACTIVE'
      and s.start_at<=now() and s.end_at>now()
      and p.code='STREAM_365' and p.price_pen>0
  )
 for update of m;
 if p_enabled and member is null then
  raise exception 'Primero debe pagar y activar el plan anual STREAM_365';
 end if;
 insert into public.cc_portal_super_resellers(user_id,enabled,admin_percent,granted_by,granted_at)
 values(target,p_enabled,p_admin_percent,actor,now())
 on conflict(user_id) do update set enabled=excluded.enabled,
  admin_percent=excluded.admin_percent,granted_by=excluded.granted_by,granted_at=now();
 if member is not null then
  update public.cc_memberships set role=case when p_enabled then 'SUPER_RESELLER' else 'RESELLER' end
  where id=member;
 end if;
 return jsonb_build_object('updated',true,'enabled',p_enabled);
end;
$fn$;
revoke all on function public.cc_portal_admin_set_super_reseller(text,boolean,numeric) from public,anon;
grant execute on function public.cc_portal_admin_set_super_reseller(text,boolean,numeric) to authenticated;

create or replace function public.cc_portal_admin_accounts_v2()
returns setof jsonb language plpgsql volatile security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or not exists
 (select 1 from public.cc_admins where user_id=(select auth.uid()))
 then raise exception 'Solo ADMIN puede consultar usuarios' using errcode='42501';end if;
 insert into public.cc_portal_user_registry(user_id,registered_at)
 select u.id,u.created_at from auth.users u
 where not exists(select 1 from public.cc_portal_user_registry r where r.user_id=u.id)
 order by u.created_at,u.id on conflict(user_id) do nothing;
 return query
 select to_jsonb(a)||jsonb_build_object(
  'user_id',u.id,
  'registry_no',r.registry_no,
  'registry_code','CLAN'||r.registry_no::text,
  'registry_alias',coalesce(nullif(r.display_alias,''),nullif(a.display_name,''),split_part(a.email,'@',1)),
  'registered_at',r.registered_at,
  'paid_until',s.paid_until)
 from public.cc_portal_admin_accounts() a
 join auth.users u on lower(u.email)=lower(a.email)
 join public.cc_portal_user_registry r on r.user_id=u.id
 left join lateral (
   select max(sub.end_at) as paid_until
   from public.cc_memberships m
   join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
   join public.cc_subscriptions sub on sub.membership_id=m.id
   join public.cc_plans p on p.id=sub.plan_id
   where m.user_id=u.id and m.status='ACTIVE'
     and sub.status='ACTIVE' and sub.start_at<=now() and sub.end_at>now()
     and p.code='STREAM_365' and p.price_pen>0
 ) s on true
 order by r.registry_no limit 250;
end;
$fn$;
revoke all on function public.cc_portal_admin_accounts_v2() from public,anon;
grant execute on function public.cc_portal_admin_accounts_v2() to authenticated;