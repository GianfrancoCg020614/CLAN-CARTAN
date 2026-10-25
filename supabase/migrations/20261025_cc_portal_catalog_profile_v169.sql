-- CLAN CARTAN V169 · UN catálogo público verificado y UN perfil central.
-- No crea billeteras, órdenes, cuentas de negocio ni movimientos.
-- Las fichas de demostración del HTML no se vuelven ventas reales.
create or replace function public.cc_portal_public_catalog()
returns table (
 id uuid,
 service text,
 title text,
 description text,
 duration_days integer,
 price_pen numeric,
 stock integer
) language sql stable security definer set search_path='' as $$
 select p.id,p.service,p.title,p.description,p.duration_days,p.price_pen,p.stock
 from public.cc_portal_stream_products p
 where p.status='ACTIVE' and p.stock>0
 and (
   exists(select 1 from public.cc_admins a where a.user_id=p.seller_id)
   or exists(
    select 1 from public.cc_portal_super_resellers sr
    join public.cc_memberships m on m.user_id=sr.user_id
       and m.role='SUPER_RESELLER' and m.status='ACTIVE'
    join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
    join public.cc_subscriptions s on s.membership_id=m.id
       and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
    where sr.user_id=p.seller_id and sr.enabled
   )
 )
 order by p.created_at desc,p.id
 limit 100;
$$;
revoke all on function public.cc_portal_public_catalog() from public,anon,authenticated;
grant execute on function public.cc_portal_public_catalog() to anon,authenticated;

create or replace function public.cc_portal_save_my_profile(
 p_full_name text,
 p_phone_e164 text,
 p_region text default '',
 p_province text default '',
 p_district text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();
 full_name_clean text:=pg_catalog.btrim(coalesce(p_full_name,''));
 phone_clean text:=pg_catalog.regexp_replace(coalesce(p_phone_e164,''),'[\s\-()]','','g');
 region_clean text:=pg_catalog.btrim(coalesce(p_region,''));
 province_clean text:=pg_catalog.btrim(coalesce(p_province,''));
 district_clean text:=pg_catalog.btrim(coalesce(p_district,''));
begin
 if actor is null then raise exception 'Sesión requerida' using errcode='42501';end if;
 if pg_catalog.char_length(full_name_clean) not between 2 and 120
    or (phone_clean<>'' and phone_clean !~ '^\+[1-9][0-9]{7,14}$')
    or pg_catalog.char_length(region_clean)>80
    or pg_catalog.char_length(province_clean)>80
    or pg_catalog.char_length(district_clean)>80
 then raise exception 'Revisa nombre, teléfono internacional y ubicación' using errcode='22023';end if;
 -- Datos legales, documento, consentimiento y correo nunca son editados aquí.
 insert into public.cc_user_details(user_id,full_name,phone_e164,region,province,district)
 values(actor,full_name_clean,nullif(phone_clean,''),nullif(region_clean,''),
        nullif(province_clean,''),nullif(district_clean,''))
 on conflict(user_id) do update
    set full_name=excluded.full_name,
        phone_e164=excluded.phone_e164,
        region=excluded.region,
        province=excluded.province,
        district=excluded.district,
        updated_at=now();
 insert into public.cc_profiles(user_id,display_name)
 values(actor,full_name_clean)
 on conflict(user_id) do update set display_name=excluded.display_name;
 return pg_catalog.jsonb_build_object('saved',true);
end $$;
revoke all on function public.cc_portal_save_my_profile(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.cc_portal_save_my_profile(text,text,text,text,text) to authenticated;
