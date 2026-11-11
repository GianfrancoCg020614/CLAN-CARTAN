
CREATE OR REPLACE FUNCTION public.cc_set_business_currency(p_country text, p_currency text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  uid uuid := auth.uid();
  country_code text := upper(trim(coalesce(p_country,'')));
  currency_code text := upper(trim(coalesce(p_currency,'')));
  pair_is_valid boolean := false;
  has_incompatible_records boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
  pair_is_valid := CASE
    WHEN country_code='PE' THEN currency_code='PEN'
    WHEN country_code='US' THEN currency_code='USD'
    WHEN country_code IN ('AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK') THEN currency_code='EUR'
    WHEN country_code='CO' THEN currency_code='COP'
    WHEN country_code='MX' THEN currency_code='MXN'
    WHEN country_code='AR' THEN currency_code='ARS'
    WHEN country_code='CL' THEN currency_code='CLP'
    WHEN country_code='BO' THEN currency_code='BOB'
    WHEN country_code='BR' THEN currency_code='BRL'
    WHEN country_code='UY' THEN currency_code='UYU'
    WHEN country_code='PY' THEN currency_code='PYG'
    WHEN country_code='CR' THEN currency_code='CRC'
    WHEN country_code='DO' THEN currency_code='DOP'
    WHEN country_code='CA' THEN currency_code='CAD'
    WHEN country_code='GB' THEN currency_code='GBP'
    WHEN country_code='GT' THEN currency_code='GTQ'
    WHEN country_code='VE' THEN currency_code='VES'
    ELSE false END;
  IF NOT pair_is_valid THEN RAISE EXCEPTION 'La moneda no corresponde al país seleccionado.'; END IF;
  PERFORM 1 FROM public.cc_profiles WHERE user_id=uid FOR UPDATE;
  has_incompatible_records :=
       EXISTS (SELECT 1 FROM public.mc_carts WHERE reseller_id=uid AND currency IS DISTINCT FROM currency_code)
    OR EXISTS (SELECT 1 FROM public.mc_movements WHERE reseller_id=uid AND currency IS DISTINCT FROM currency_code)
    OR EXISTS (SELECT 1 FROM public.ma_units WHERE reseller_id=uid AND currency IS DISTINCT FROM currency_code)
    OR EXISTS (SELECT 1 FROM public.ma_leases WHERE reseller_id=uid AND currency IS DISTINCT FROM currency_code)
    OR EXISTS (SELECT 1 FROM public.ma_ledger WHERE reseller_id=uid AND currency IS DISTINCT FROM currency_code)
    OR EXISTS (SELECT 1 FROM public.ma_meter_readings WHERE reseller_id=uid AND currency IS DISTINCT FROM currency_code)
    OR EXISTS (SELECT 1 FROM public.ma_guarantee_events WHERE reseller_id=uid AND currency IS DISTINCT FROM currency_code)
    OR EXISTS (SELECT 1 FROM public.ma_expenses WHERE reseller_id=uid AND currency IS DISTINCT FROM currency_code)
    OR EXISTS (SELECT 1 FROM public.cy_loans WHERE owner_id=uid AND currency IS DISTINCT FROM currency_code);
  IF has_incompatible_records THEN
    RAISE EXCEPTION 'No puedes cambiar la moneda porque ya existen registros en otra moneda. Los importes históricos se conservan y no se convierten. Contacta con ADMIN si necesitas revisar tu configuración.';
  END IF;
  INSERT INTO public.cc_profiles(user_id,business_country,business_currency)
  VALUES(uid,country_code,currency_code)
  ON CONFLICT(user_id) DO UPDATE SET business_country=excluded.business_country,business_currency=excluded.business_currency;
  UPDATE public.mc_accounts SET country=country_code,currency=currency_code WHERE user_id=uid;
  UPDATE public.cc_user_details SET preferred_currency=currency_code,updated_at=now() WHERE user_id=uid;
  RETURN currency_code;
END;
$function$;
COMMENT ON FUNCTION public.cc_set_business_currency(text,text) IS
'Preferencia compartida de moneda de operación para MI COCHERA, MI ALQUILER y COBRA YA. No convierte importes y bloquea cambios incompatibles con registros históricos. STREAM BULLS queda excluido.';
