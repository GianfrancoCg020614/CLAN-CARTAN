-- V158.1 · Validación de códigos públicos COCHERA# sin acceso a datos de RESELLERS
create or replace function public.mc_validate_invitation_code(p_code text)
returns table(valid boolean,business text)
language sql stable security definer set search_path=''
as $$
 select (p_code ~ '^COCHERA[1-9][0-9]{0,11}$' and exists(
  select 1 from public.mc_accounts a where a.invite_code=p_code
 )) as valid, 'MI COCHERA'::text as business
$$;
revoke all on function public.mc_validate_invitation_code(text) from public,authenticated,anon;
grant execute on function public.mc_validate_invitation_code(text) to anon,authenticated;
