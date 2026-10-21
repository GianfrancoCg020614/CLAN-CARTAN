-- MI ALQUILER V162.1: número de atención configurable solo por ADMIN.
create table if not exists public.ma_payment_support_settings (
 id boolean primary key default true check(id),
 whatsapp text null check(whatsapp is null or whatsapp ~ '^[1-9][0-9]{9,14}$'),
 updated_at timestamptz not null default now(),
 updated_by uuid null references auth.users(id)
);
insert into public.ma_payment_support_settings(id) values(true) on conflict(id) do nothing;
alter table public.ma_payment_support_settings enable row level security;
revoke all on public.ma_payment_support_settings from public,anon,authenticated;
grant select on public.ma_payment_support_settings to authenticated;
drop policy if exists ma_payment_support_read on public.ma_payment_support_settings;
create policy ma_payment_support_read on public.ma_payment_support_settings for select to authenticated using((select auth.uid()) is not null);
create or replace function public.ma_admin_set_support_whatsapp(p_whatsapp text)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare actor uuid:=auth.uid();phone text:=regexp_replace(coalesce(p_whatsapp,''),'[^0-9]','','g');
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor) then raise exception 'Solo ADMIN';end if;
 if phone !~ '^[1-9][0-9]{9,14}$' then raise exception 'Ingresa numero de WhatsApp con codigo de pais';end if;
 update public.ma_payment_support_settings set whatsapp=phone,updated_at=now(),updated_by=actor where id=true;
 return true;
end $fn$;
revoke all on function public.ma_admin_set_support_whatsapp(text) from public,anon,authenticated;
grant execute on function public.ma_admin_set_support_whatsapp(text) to authenticated;