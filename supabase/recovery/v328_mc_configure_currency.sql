CREATE OR REPLACE FUNCTION public.mc_configure_currency(p_currency text, p_country text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
