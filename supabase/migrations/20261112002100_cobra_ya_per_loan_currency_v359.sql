-- V359: COBRA YA selecciona moneda por préstamo; no convierte importes ni altera históricos.
CREATE OR REPLACE FUNCTION public.cy_loans_apply_business_currency()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.currency := upper(trim(coalesce(nullif(NEW.currency,''),'PEN')));
 ELSE
  NEW.currency := OLD.currency;
 END IF;
 RETURN NEW;
END;
$function$;
COMMENT ON FUNCTION public.cy_loans_apply_business_currency() IS 'Moneda individual seleccionada al crear el préstamo; bloqueada para preservar históricos al actualizar. Sin conversiones.';
