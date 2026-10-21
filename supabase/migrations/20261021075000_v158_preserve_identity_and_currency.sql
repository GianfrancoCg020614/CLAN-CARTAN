-- V158: No borrar telefonos existentes al reutilizar DNI; pais y moneda extranjeros.
create or replace function public.mc_create_cart(p_alias text,p_type text,p_rate numeric,p_owner_kind text,p_owner_doc text,p_owner_name text,p_owner_phone text,p_worker_kind text default null,p_worker_doc text default null,p_worker_name text default null,p_worker_phone text default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a public.mc_accounts%rowtype; oid uuid; wid uuid;cid bigint;
begin
 select * into a from public.mc_accounts where user_id=u;
 if u is null or a.user_id is null or a.suspended or a.subscription_until<=now() or a.subscription_until is null then raise exception 'MI COCHERA no esta activa';end if;
 if p_rate is null or p_rate<=0 or p_rate>100000 or p_rate<>round(p_rate,2) then raise exception 'Tarifa incorrecta';end if;
 if length(trim(coalesce(p_owner_name,'')))<2 or length(trim(coalesce(p_owner_doc,'')))<4 or length(trim(coalesce(p_type,'')))<2 then raise exception 'Datos obligatorios incompletos';end if;
 if p_owner_kind not in ('DNI','CE','PASSPORT','CEDULA','OTHER') then raise exception 'Documento invalido';end if;
 insert into public.mc_people(reseller_id,document_type,document_number,full_name,phone)
 values(u,p_owner_kind,left(trim(p_owner_doc),40),left(trim(p_owner_name),160),left(trim(coalesce(p_owner_phone,'')),30))
 on conflict(reseller_id,document_type,document_number) do update set
 full_name=case when public.mc_people.verification_source='API_PERU' then public.mc_people.full_name else excluded.full_name end,
 phone=coalesce(nullif(trim(excluded.phone),''),public.mc_people.phone) returning id into oid;
 if nullif(trim(coalesce(p_worker_doc,'')),'') is not null then
  if p_worker_kind not in ('DNI','CE','PASSPORT','CEDULA','OTHER') or length(trim(coalesce(p_worker_name,'')))<2 then raise exception 'Trabajador incompleto';end if;
  insert into public.mc_people(reseller_id,document_type,document_number,full_name,phone)
  values(u,p_worker_kind,left(trim(p_worker_doc),40),left(trim(p_worker_name),160),left(trim(coalesce(p_worker_phone,'')),30))
  on conflict(reseller_id,document_type,document_number) do update set
  full_name=case when public.mc_people.verification_source='API_PERU' then public.mc_people.full_name else excluded.full_name end,
  phone=coalesce(nullif(trim(excluded.phone),''),public.mc_people.phone) returning id into wid;
 end if;
 insert into public.mc_carts(reseller_id,alias,business_type,owner_person_id,worker_person_id,daily_rate,currency)
 values(u,left(trim(coalesce(p_alias,'')),80),left(trim(p_type),100),oid,wid,p_rate,a.currency) returning id into cid;
 insert into public.mc_stays(cart_id,reseller_id) values(cid,u);
 return cid;
end $$;

-- La moneda del negocio solo puede cambiarse antes de crear carritos. No reinterpreta deudas.
create or replace function public.mc_configure_currency(p_currency text,p_country text)
returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Inicia sesion';end if;
 if p_currency not in ('PEN','USD','EUR','COP','MXN','ARS','CLP','BOB','BRL','UYU','PYG','CRC','DOP','CAD','GBP') then raise exception 'Moneda invalida';end if;
 if p_country is null or p_country !~ '^[A-Z]{2}$' then raise exception 'Pais invalido';end if;
 perform 1 from public.mc_accounts where user_id=uid for update;
 if not found then raise exception 'Abre MI COCHERA primero';end if;
 if exists(select 1 from public.mc_carts where reseller_id=uid) then raise exception 'La moneda ya no puede cambiarse porque tienes movimientos historicos';end if;
 update public.mc_accounts set currency=p_currency,country=p_country where user_id=uid;
 return p_currency;
end $$;
revoke all on function public.mc_configure_currency(text,text) from public,anon,authenticated;
grant execute on function public.mc_configure_currency(text,text) to authenticated;
