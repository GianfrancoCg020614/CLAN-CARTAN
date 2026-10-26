-- V180 · ADMIN cambia la situación comercial en la ficha del usuario.
-- Sólo downgrades de la designación Súper reseller -> Reseller cuando no hay membresía vigente.
-- Nunca concede descuentos, saldo o acceso mediante un cambio de etiqueta.
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
 elsif not p_enabled then
  -- Permite retirar una designación antigua de Súper reseller aún pendiente o vencida.
  -- No se activa la membresía ni se manipulan sus días o cobros.
  update public.cc_memberships m
  set role='RESELLER'
  from public.cc_businesses b
  where m.user_id=target and m.business_id=b.id and b.code='STREAM_BULLS'
    and m.role='SUPER_RESELLER';
 end if;
 return jsonb_build_object('updated',true,'enabled',p_enabled);
end;
$fn$;
revoke all on function public.cc_portal_admin_set_super_reseller(text,boolean,numeric) from public,anon;
grant execute on function public.cc_portal_admin_set_super_reseller(text,boolean,numeric) to authenticated;