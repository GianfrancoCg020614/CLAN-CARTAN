-- V187: devuelve únicamente al titular autenticado sus datos reales para el aviso de recarga.
-- Sin compartir el directorio, sin confiar en alias enviados por el cliente y sin acreditar dinero.
create or replace function public.cc_portal_my_recharge_identity_v187()
returns jsonb language plpgsql volatile security definer
set search_path = ''
as $fn$
declare
 v_uid uuid := (select auth.uid());
 v_identity jsonb;
begin
 if v_uid is null then
  raise exception 'Debes iniciar sesión' using errcode = '42501';
 end if;
 -- Un número CLAN estable para la cuenta autenticada, incluso si no visitó ADMIN.
 insert into public.cc_portal_user_registry(user_id,registered_at)
 select u.id,u.created_at from auth.users u where u.id=v_uid
 on conflict(user_id) do nothing;
 select jsonb_build_object(
  'user_id',u.id,
  'registry_code','CLAN'||r.registry_no::text,
  'registered_name',coalesce(nullif(btrim(d.full_name),''),split_part(u.email,'@',1)),
  'registered_email',u.email
 )
 into v_identity
 from auth.users u
 join public.cc_portal_user_registry r on r.user_id=u.id
 left join public.cc_user_details d on d.user_id=u.id
 where u.id=v_uid;
 if v_identity is null then
  raise exception 'La identidad de la cuenta no está disponible' using errcode = '42501';
 end if;
 return v_identity;
end;
$fn$;
revoke all on function public.cc_portal_my_recharge_identity_v187() from public,anon;
grant execute on function public.cc_portal_my_recharge_identity_v187() to authenticated;
