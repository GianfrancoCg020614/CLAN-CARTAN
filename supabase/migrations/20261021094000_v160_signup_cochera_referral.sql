-- V160 · Atribuciones MI COCHERA verificadas dentro del servidor al crear auth.users.
-- Aditiva: no modifica los triggers de invitaciones COBRA YA / STREAM BULL'S.
create table if not exists public.mc_invitation_attributions (
  registered_user_id uuid primary key references auth.users(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id),
  invite_code_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint mc_invitation_not_self check (registered_user_id <> inviter_user_id),
  constraint mc_invitation_code_shape check (invite_code_snapshot ~ '^COCHERA[1-9][0-9]{0,11}$')
);
create index if not exists mc_invitation_attr_inviter_time
 on public.mc_invitation_attributions (inviter_user_id,created_at desc);
alter table public.mc_invitation_attributions enable row level security;
grant select on public.mc_invitation_attributions to authenticated;
revoke insert,update,delete on public.mc_invitation_attributions from public,anon,authenticated;
drop policy if exists mc_invitation_attr_owner on public.mc_invitation_attributions;
create policy mc_invitation_attr_owner on public.mc_invitation_attributions
 for select to authenticated using (
   registered_user_id=(select auth.uid()) or inviter_user_id=(select auth.uid())
   or exists(select 1 from public.cc_admins adm where adm.user_id=(select auth.uid()))
 );
create or replace function public.mc_my_referral_attributions()
returns table(registered_user_id uuid,invite_code_snapshot text,created_at timestamptz)
language sql stable security invoker set search_path=''
as $$
 select a.registered_user_id,a.invite_code_snapshot,a.created_at
 from public.mc_invitation_attributions a
 where a.inviter_user_id=(select auth.uid())
 order by a.created_at desc limit 200
$$;
grant execute on function public.mc_my_referral_attributions() to authenticated;
create schema if not exists mc_internal;
revoke all on schema mc_internal from public,anon,authenticated;
create or replace function mc_internal.capture_signup_cochera_invitation()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_code text;v_inviter uuid;
begin
 v_code:=upper(btrim(coalesce(new.raw_user_meta_data->>'invitation_code','')));
 if v_code !~ '^COCHERA[1-9][0-9]{0,11}$' then return new;end if;
 select a.user_id into v_inviter from public.mc_accounts a
 where a.invite_code=v_code and a.user_id<>new.id;
 if v_inviter is null then return new;end if;
 insert into public.mc_invitation_attributions
  (registered_user_id,inviter_user_id,invite_code_snapshot)
 values (new.id,v_inviter,v_code)
 on conflict(registered_user_id) do nothing;
 return new;
end $$;
revoke all on function mc_internal.capture_signup_cochera_invitation() from public,anon,authenticated;
drop trigger if exists mc_signup_cochera_invitation_capture on auth.users;
create trigger mc_signup_cochera_invitation_capture
 after insert on auth.users for each row
 execute function mc_internal.capture_signup_cochera_invitation();
