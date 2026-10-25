-- CLAN CARTAN V171 · administración simple + pruebas temporales de STREAM BULL'S.
-- Aditivo e idempotente; no afecta billeteras, pedidos, pagos ni referidos.
-- Una prueba gratuita dura como máximo siete días, una única vez por cuenta.
create table if not exists public.cc_portal_role_trials (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 business_id uuid not null references public.cc_businesses(id),
 membership_id uuid not null references public.cc_memberships(id),
 subscription_id uuid not null references public.cc_subscriptions(id),
 assigned_role text not null check(assigned_role in ('RESELLER','SUPER_RESELLER')),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 granted_by uuid not null references auth.users(id),
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 constraint cc_portal_trial_once unique(user_id,business_id),
 constraint cc_portal_trial_duration check(
  ends_at>starts_at and ends_at<=starts_at+interval '7 days')
);
create index if not exists cc_portal_role_trials_subscription_idx
 on public.cc_portal_role_trials(subscription_id);
alter table public.cc_portal_role_trials enable row level security;
revoke all on public.cc_portal_role_trials from anon,authenticated;
grant select on public.cc_portal_role_trials to authenticated;
drop policy if exists cc_portal_role_trials_view on public.cc_portal_role_trials;
create policy cc_portal_role_trials_view on public.cc_portal_role_trials
 for select to authenticated using(
 user_id=(select auth.uid()) or exists(
  select 1 from public.cc_admins a where a.user_id=(select auth.uid()))
);

-- Plan de prueba distinguible de la membresía pagada S/25 (no adquirible).
insert into public.cc_plans
 (business_id,code,title,billing_type,price_pen,is_active)
select b.id,'STREAM_TEST_7','STREAM BULLS · prueba ADMIN (sin cobro)',
 'ONE_TIME',0,false
from public.cc_businesses b where b.code='STREAM_BULLS'
on conflict (business_id,code) do nothing;

-- Un lector único para el panel: el frontend nunca consulta auth.users.
create or replace function public.cc_portal_admin_accounts()
returns table(
 email text,display_name text,is_admin boolean,
 role_assigned text,membership_status text,
 access_until timestamptz,trial_until timestamptz,
 trial_active boolean,super_enabled boolean
) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(
  select 1 from public.cc_admins a where a.user_id=auth.uid())
 then raise exception 'Acceso exclusivo de ADMIN' using errcode='42501';end if;
 return query
 select u.email::text,
        coalesce(nullif(p.display_name,''),'')::text as display_name,
        (a.user_id is not null),
        case when a.user_id is not null then 'ADMIN'
          when m.role is not null then m.role
          else 'AFFILIATE' end::text,
        case when a.user_id is not null then 'ACTIVE'
          else coalesce(m.status,'PENDING') end::text,
        (select max(s.end_at) from public.cc_subscriptions s
         where s.membership_id=m.id and s.status='ACTIVE'
           and s.start_at<=now() and s.end_at>now()),
        tr.ends_at,
        coalesce(tr.revoked_at is null and tr.ends_at>now() and
          exists(select 1 from public.cc_subscriptions ts where ts.id=tr.subscription_id
             and ts.status='ACTIVE' and ts.start_at<=now() and ts.end_at>now()),false),
        coalesce(sr.enabled,false)
 from auth.users u
 left join public.cc_profiles p on p.user_id=u.id
 left join public.cc_admins a on a.user_id=u.id
 left join public.cc_businesses b on b.code='STREAM_BULLS'
 left join public.cc_memberships m on m.user_id=u.id and m.business_id=b.id
 left join public.cc_portal_role_trials tr on tr.user_id=u.id and tr.business_id=b.id
 left join public.cc_portal_super_resellers sr on sr.user_id=u.id
 order by (a.user_id is not null) desc,u.email asc
 limit 250;
end $$;
revoke all on function public.cc_portal_admin_accounts() from public,anon;
grant execute on function public.cc_portal_admin_accounts() to authenticated;

-- ADMIN puede preasignar un rol sin regalar membresía ni crear pagos.
create or replace function public.cc_portal_admin_assign_stream_role(
 p_email text,p_role text,p_admin_percent numeric default 20
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();target uuid;business uuid;
 old_member public.cc_memberships%rowtype;
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor)
 then raise exception 'Solo ADMIN modifica roles' using errcode='42501';end if;
 if p_role is null or p_role not in ('AFFILIATE','RESELLER','SUPER_RESELLER')
    or p_email is null or length(btrim(p_email))<6
    or p_admin_percent is null or p_admin_percent<0 or p_admin_percent>100
    or p_admin_percent<>round(p_admin_percent,2)
 then raise exception 'Rol, correo o porcentaje incorrecto' using errcode='22023';end if;
 select id into target from auth.users
  where lower(email)=lower(btrim(p_email)) limit 1;
 if target is null then raise exception 'El usuario no está registrado';end if;
 if exists(select 1 from public.cc_admins a where a.user_id=target)
 then raise exception 'La cuenta ADMIN no puede modificarse aquí' using errcode='42501';end if;
 select id into strict business from public.cc_businesses where code='STREAM_BULLS';
 select * into old_member from public.cc_memberships
  where user_id=target and business_id=business for update;
 if found then
  if exists(select 1 from public.cc_subscriptions s
    where s.membership_id=old_member.id and s.status='ACTIVE'
      and s.end_at>now())
  then raise exception 'La cuenta tiene acceso vigente. Finaliza la prueba o revisa su membresía antes de cambiar el rol';end if;
  update public.cc_memberships set role=p_role
   where id=old_member.id;
 else
  insert into public.cc_profiles(user_id) values(target)
   on conflict(user_id) do nothing;
  insert into public.cc_memberships(user_id,business_id,role,status)
   values(target,business,p_role,'PENDING');
 end if;
 if p_role='SUPER_RESELLER' then
  insert into public.cc_portal_super_resellers
   (user_id,enabled,admin_percent,granted_by,granted_at)
   values(target,true,p_admin_percent,actor,now())
   on conflict(user_id) do update set enabled=true,
    admin_percent=excluded.admin_percent,granted_by=actor,granted_at=now();
 else
  update public.cc_portal_super_resellers set enabled=false,
     granted_by=actor,granted_at=now() where user_id=target;
 end if;
 return jsonb_build_object('assigned',true,'role',p_role,'membership_active',false);
end $$;
revoke all on function public.cc_portal_admin_assign_stream_role(text,text,numeric)
 from public,anon;
grant execute on function public.cc_portal_admin_assign_stream_role(text,text,numeric)
 to authenticated;

-- Prueba gratuita autorizada por ADMIN: registro separado y auditable.
-- Ninguna transferencia, acreditación ni gasto en billetera real.
create or replace function public.cc_portal_admin_start_stream_trial(
 p_email text,p_days integer default 7
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();target uuid;business uuid;
 plan_id uuid; member public.cc_memberships%rowtype;
 sub_id uuid;begin_at timestamptz:=now();finish_at timestamptz;
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor)
 then raise exception 'Solo ADMIN puede activar pruebas' using errcode='42501';end if;
 if p_email is null or p_days is null or p_days not between 1 and 7
 then raise exception 'La prueba dura entre 1 y 7 días';end if;
 select id into target from auth.users
  where lower(email)=lower(btrim(p_email)) limit 1;
 if target is null then raise exception 'Usuario no registrado';end if;
 if exists(select 1 from public.cc_admins where user_id=target)
 then raise exception 'ADMIN no necesita prueba';end if;
 select id into strict business from public.cc_businesses where code='STREAM_BULLS';
 select id into strict plan_id from public.cc_plans
  where business_id=business and code='STREAM_TEST_7' and price_pen=0;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('CC-STREAM-TRIAL:'||target::text,0));
 select * into member from public.cc_memberships
  where user_id=target and business_id=business for update;
 if not found or member.role not in ('RESELLER','SUPER_RESELLER')
 then raise exception 'Primero asigna RESELLER o SÚPER RESELLER';end if;
 if member.role='SUPER_RESELLER' and not exists(
  select 1 from public.cc_portal_super_resellers
  where user_id=target and enabled)
 then raise exception 'Primero habilita el permiso SÚPER RESELLER';end if;
 if exists(select 1 from public.cc_portal_role_trials
   where user_id=target and business_id=business)
 then raise exception 'Esta cuenta ya utilizó su prueba gratuita';end if;
 if exists(select 1 from public.cc_subscriptions s
  where s.membership_id=member.id and s.status='ACTIVE'
    and s.end_at>now())
 then raise exception 'La cuenta ya tiene una suscripción vigente';end if;
 finish_at:=begin_at+make_interval(days=>p_days);
 insert into public.cc_subscriptions(membership_id,plan_id,status,start_at,end_at)
 values(member.id,plan_id,'ACTIVE',begin_at,finish_at) returning id into sub_id;
 update public.cc_memberships set status='ACTIVE',
   activated_at=coalesce(activated_at,now()) where id=member.id;
 insert into public.cc_portal_role_trials(
  user_id,business_id,membership_id,subscription_id,
  assigned_role,starts_at,ends_at,granted_by)
 values(target,business,member.id,sub_id,member.role,
        begin_at,finish_at,actor);
 return jsonb_build_object('activated',true,'trial',true,
  'role',member.role,'ends_at',finish_at,'charged_pen',0);
end $$;
revoke all on function public.cc_portal_admin_start_stream_trial(text,integer)
 from public,anon;
grant execute on function public.cc_portal_admin_start_stream_trial(text,integer)
 to authenticated;

create or replace function public.cc_portal_admin_end_stream_trial(p_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();target uuid;business uuid;
 trial public.cc_portal_role_trials%rowtype;
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor)
 then raise exception 'Solo ADMIN finaliza pruebas' using errcode='42501';end if;
 select id into target from auth.users
  where lower(email)=lower(btrim(p_email)) limit 1;
 if target is null then raise exception 'Usuario no registrado';end if;
 select id into strict business from public.cc_businesses where code='STREAM_BULLS';
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('CC-STREAM-TRIAL:'||target::text,0));
 select * into trial from public.cc_portal_role_trials
  where user_id=target and business_id=business for update;
 if not found or trial.revoked_at is not null
 then raise exception 'No hay una prueba sin finalizar';end if;
 if exists(select 1 from public.cc_subscriptions s
   where s.membership_id=trial.membership_id and s.id<>trial.subscription_id
     and s.status='ACTIVE' and s.end_at>now())
 then raise exception 'Hay una suscripción pagada o programada; no finalices la prueba sin revisar ese acceso';end if;
 update public.cc_portal_role_trials set revoked_at=now() where id=trial.id;
 update public.cc_subscriptions set status='CANCELLED',
  end_at=least(now(),end_at) where id=trial.subscription_id;
 update public.cc_memberships set status='PENDING'
  where id=trial.membership_id;
 return jsonb_build_object('ended',true,'charged_pen',0);
end $$;
revoke all on function public.cc_portal_admin_end_stream_trial(text)
 from public,anon;
grant execute on function public.cc_portal_admin_end_stream_trial(text)
 to authenticated;
