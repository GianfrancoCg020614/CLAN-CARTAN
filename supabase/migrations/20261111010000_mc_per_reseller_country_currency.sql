-- MI COCHERA: country/currency are configured per reseller account.
-- No FX conversion is performed. Existing cart amounts remain in their original currency.
create or replace function public.mc_configure_currency(p_currency text, p_country text)
returns text language plpgsql security definer set search_path = '' as $function$
declare
 uid uuid := auth.uid();
 current_currency text;
 country_code text := upper(trim(coalesce(p_country, '')));
 currency_code text := upper(trim(coalesce(p_currency, '')));
 pair_is_valid boolean := false;
begin
 if uid is null then raise exception 'Inicia sesión'; end if;
 pair_is_valid := case
  when country_code = 'PE' then currency_code = 'PEN'
  when country_code = 'US' then currency_code = 'USD'
  when country_code in ('AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK') then currency_code = 'EUR'
  when country_code = 'CO' then currency_code = 'COP'
  when country_code = 'MX' then currency_code = 'MXN'
  when country_code = 'AR' then currency_code = 'ARS'
  when country_code = 'CL' then currency_code = 'CLP'
  when country_code = 'BO' then currency_code = 'BOB'
  when country_code = 'BR' then currency_code = 'BRL'
  when country_code = 'UY' then currency_code = 'UYU'
  when country_code = 'PY' then currency_code = 'PYG'
  when country_code = 'CR' then currency_code = 'CRC'
  when country_code = 'DO' then currency_code = 'DOP'
  when country_code = 'CA' then currency_code = 'CAD'
  when country_code = 'GB' then currency_code = 'GBP'
  else false
 end;
 if not pair_is_valid then raise exception 'La moneda no corresponde al país seleccionado. Selecciona un país y su moneda local.'; end if;
 select a.currency into current_currency from public.mc_accounts a where a.user_id = uid for update;
 if current_currency is null then raise exception 'Abre MI COCHERA primero'; end if;
 if exists (select 1 from public.mc_carts c where c.reseller_id = uid) and currency_code <> current_currency then
  raise exception 'No se puede cambiar la moneda de una cuenta con carritos registrados. Los importes históricos se conservan en su moneda original.';
 end if;
 update public.mc_accounts set currency = currency_code, country = country_code where user_id = uid;
 return currency_code;
end;
$function$;
revoke all on function public.mc_configure_currency(text, text) from public, anon;
grant execute on function public.mc_configure_currency(text, text) to authenticated;
