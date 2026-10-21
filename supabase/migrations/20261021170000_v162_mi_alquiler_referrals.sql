-- MI ALQUILER V162: codigo de invitacion exclusivo y captura segura del referido, sin premios ni permisos.
create table if not exists public.ma_invitation_attributions(
 registered_user_id uuid primary key references auth.users(id) on delete cascade,
 inviter_user_id uuid not null references auth.users(id),
 invitation_code text not null,
 created_at timestamptz not null default now(),
 check(registered_user_id<>inviter_user_id),
 check(invitation_code ~ '^ALQUILER[1-9][0-9]{0,11}$')
);
alter table public.ma_invitation_attributions enable row level security;
revoke all on public.ma_invitation_attributions from public,anon,authenticated;
grant select on public.ma_invitation_attributions to authenticated;
drop policy if exists ma_referral_own on public.ma_invitation_attributions;
create policy ma_referral_own on public.ma_invitation_attributions for select to authenticated
 using(registered_user_id=(select auth.uid()) or inviter_user_id=(select auth.uid()));
create or replace function public.ma_validate_invitation_code(p_code text)
returns table(valid boolean,business text)
language sql stable security definer set search_path='' as $$
 select (
   p_code is not null and upper(btrim(p_code)) ~ '^ALQUILER[1-9][0-9]{0,11}$'
   and exists (
     select 1 from public.ma_accounts a
     where a.invite_code=upper(btrim(p_code))
       and (exists(select 1 from public.cc_admins ad where ad.user_id=a.user_id)
            or (not a.suspended and a.subscription_until>now()))
   )
 ) as valid, 'MI ALQUILER'::text as business;
$$;
revoke all on function public.ma_validate_invitation_code(text) from public,anon,authenticated;
grant execute on function public.ma_validate_invitation_code(text) to anon,authenticated;
create or replace function cc_internal.ma_capture_signup_invite()
returns trigger language plpgsql security definer set search_path='' as $$
declare code text; source_business text;
begin
 code:=upper(trim(coalesce(new.raw_user_meta_data->>'invitation_code','')));
 source_business:=coalesce(new.raw_user_meta_data->>'invite_business','');
 if source_business<>'MI_ALQUILER' or code !~ '^ALQUILER[1-9][0-9]{0,11}$' then return new;end if;
 insert into public.ma_invitation_attributions(registered_user_id,inviter_user_id,invitation_code)
 select new.id,a.user_id,a.invite_code from public.ma_accounts a
 where a.invite_code=code and a.user_id<>new.id
   and (exists(select 1 from public.cc_admins ad where ad.user_id=a.user_id)
        or (not a.suspended and a.subscription_until>now()))
 on conflict(registered_user_id) do nothing;
 return new;
end $$;
revoke all on function cc_internal.ma_capture_signup_invite() from public,anon,authenticated;
drop trigger if exists ma_signup_invite_capture on auth.users;
create trigger ma_signup_invite_capture after insert on auth.users
 for each row execute function cc_internal.ma_capture_signup_invite();
comment on table public.ma_invitation_attributions is 'Solo atribuye el registro a un codigo existente y activo. NO abona bonos ni activa membresias.';
