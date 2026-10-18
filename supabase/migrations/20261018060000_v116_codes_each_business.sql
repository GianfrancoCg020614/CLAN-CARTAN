-- CLAN CARTAN V116 · Un código único por persona EN CADA plataforma.
-- Preserva COBRA1..COBRA6, asigna BULL1..BULL6 a las seis cuentas actuales.
-- Registro sigue sin requerir código de referido. Sin modificar billeteras, roles o pagos.
ALTER TABLE public.cc_invitation_codes
  DROP CONSTRAINT IF EXISTS cc_invitation_codes_owner_once;

CREATE OR REPLACE FUNCTION cc_internal.issue_user_invitation_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_business record;
  v_code text;
BEGIN
  -- Independiente del negocio elegido o del código opcional de invitación.
  -- La restricción UNIQUE(business_id, owner_user_id) garantiza máximo uno por plataforma.
  FOR v_business IN
    SELECT b.id, b.code FROM public.cc_businesses b
    WHERE b.code IN ('COBRA_YA','STREAM_BULLS')
    ORDER BY CASE b.code WHEN 'COBRA_YA' THEN 1 ELSE 2 END
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.cc_invitation_codes c
      WHERE c.owner_user_id = NEW.id AND c.business_id = v_business.id
    ) THEN
      v_code := CASE v_business.code WHEN 'STREAM_BULLS'
        THEN 'BULL' || nextval('public.cc_invitation_bull_seq'::regclass)::text
        ELSE 'COBRA' || nextval('public.cc_invitation_cobra_seq'::regclass)::text
      END;
      INSERT INTO public.cc_invitation_codes(business_id,owner_user_id,code,role_at_issue)
      VALUES(v_business.id,NEW.id,v_code,'USER')
      ON CONFLICT (business_id,owner_user_id) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

-- Históricos: agrega únicamente los códigos faltantes, en orden de registro.
DO $block$
DECLARE
  v_user record;
  v_business record;
  v_code text;
BEGIN
  FOR v_user IN
    SELECT u.id FROM auth.users u ORDER BY u.created_at, u.id
  LOOP
    FOR v_business IN
      SELECT b.id,b.code FROM public.cc_businesses b
      WHERE b.code IN ('COBRA_YA','STREAM_BULLS')
      ORDER BY CASE b.code WHEN 'COBRA_YA' THEN 1 ELSE 2 END
    LOOP
      IF NOT EXISTS(
        SELECT 1 FROM public.cc_invitation_codes c
        WHERE c.owner_user_id=v_user.id AND c.business_id=v_business.id
      ) THEN
        v_code:=CASE v_business.code WHEN 'STREAM_BULLS'
          THEN 'BULL'||nextval('public.cc_invitation_bull_seq'::regclass)::text
          ELSE 'COBRA'||nextval('public.cc_invitation_cobra_seq'::regclass)::text END;
        INSERT INTO public.cc_invitation_codes(business_id,owner_user_id,code,role_at_issue)
        VALUES(v_business.id,v_user.id,v_code,'USER')
        ON CONFLICT (business_id,owner_user_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$block$;

-- 2 códigos por usuario, uno por cada negocio actual, sin recrear afiliaciones.
