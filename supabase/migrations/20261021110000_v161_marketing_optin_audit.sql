-- V161 · Consentimiento publicitario voluntario y separado del contrato.
-- No hay suscripciones a marketing por omisión. Al registrarse, false salvo aceptación explícita.
create table if not exists public.cc_marketing_consents(
  user_id uuid primary key references auth.users(id) on delete cascade,
  authorized boolean not null default false,
  policy_version text not null default 'V161-20261021',
  updated_at timestamptz not null default now()
);
create table if not exists public.cc_marketing_consent_history(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  authorized boolean not null,
  policy_version text not null,
  source text not null check(source in ('SIGNUP','ACCOUNT')),
  created_at timestamptz not null default now()
);
create index if not exists cc_marketing_consent_history_user_idx on public.cc_marketing_consent_history(user_id,created_at desc);
alter table public.cc_marketing_consents enable row level security;
alter table public.cc_marketing_consent_history enable row level security;
grant select on public.cc_marketing_consents,public.cc_marketing_consent_history to authenticated;
revoke insert,update,delete on public.cc_marketing_consents,public.cc_marketing_consent_history from public,anon,authenticated;
drop policy if exists cc_marketing_consents_read on public.cc_marketing_consents;
create policy cc_marketing_consents_read on public.cc_marketing_consents
 for select to authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.cc_admins a where a.user_id=(select auth.uid())));
drop policy if exists cc_marketing_history_read on public.cc_marketing_consent_history;
create policy cc_marketing_history_read on public.cc_marketing_consent_history
 for select to authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.cc_admins a where a.user_id=(select auth.uid())));
create schema if not exists cc_internal;
create or replace function cc_internal.capture_signup_marketing_consent()
returns trigger language plpgsql security definer set search_path='' as $$
declare is_authorized boolean;
begin
 is_authorized := coalesce(new.raw_user_meta_data->>'marketing_consent','false')='true';
 insert into public.cc_marketing_consents(user_id,authorized,policy_version)
 values(new.id,is_authorized,'V161-20261021') on conflict(user_id) do nothing;
 insert into public.cc_marketing_consent_history(user_id,authorized,policy_version,source)
 values(new.id,is_authorized,'V161-20261021','SIGNUP');
 return new;
end $$;
revoke all on function cc_internal.capture_signup_marketing_consent() from public,anon,authenticated;
drop trigger if exists cc_signup_marketing_consent on auth.users;
create trigger cc_signup_marketing_consent after insert on auth.users
 for each row execute function cc_internal.capture_signup_marketing_consent();
create or replace function public.cc_set_my_marketing_consent(p_authorized boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Inicia sesión'; end if;
 if p_authorized is null then raise exception 'Valor incorrecto';end if;
 insert into public.cc_marketing_consents(user_id,authorized,policy_version,updated_at)
 values(u,p_authorized,'V161-20261021',now())
 on conflict(user_id) do update
 set authorized=excluded.authorized,
     policy_version=excluded.policy_version,
     updated_at=excluded.updated_at;
 insert into public.cc_marketing_consent_history(user_id,authorized,policy_version,source)
 values(u,p_authorized,'V161-20261021','ACCOUNT');
 return p_authorized;
end $$;
revoke all on function public.cc_set_my_marketing_consent(boolean) from public,anon,authenticated;
grant execute on function public.cc_set_my_marketing_consent(boolean) to authenticated;
