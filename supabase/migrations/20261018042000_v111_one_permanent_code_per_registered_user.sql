-- CLAN CARTAN V111: un codigo personal y permanente por cada cuenta.
-- Compatible con V110; no cambia membresias, pagos, saldos ni permisos.
ALTER TABLE public.cc_invitation_codes
  ADD CONSTRAINT cc_invitation_codes_owner_once UNIQUE (owner_user_id);

ALTER TABLE public.cc_invitation_codes DROP CONSTRAINT cc_invitation_codes_role_at_issue_check;
ALTER TABLE public.cc_invitation_codes
  ADD CONSTRAINT cc_invitation_codes_role_at_issue_check
  CHECK (role_at_issue IN ('USER','AFFILIATE','RESELLER','SUPER_RESELLER'));

-- Ya no se emiten codigos adicionales por activar o cambiar una membresia.
CREATE OR REPLACE FUNCTION cc_internal.issue_business_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$ BEGIN RETURN NEW; END; $function$;

-- El primer codigo es estable incluso si despues cambia el rol o la suscripcion.
CREATE OR REPLACE FUNCTION cc_internal.issue_user_invitation_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_choice text;
  v_business_id uuid;
  v_code text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.cc_invitation_codes WHERE owner_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  v_choice := upper(btrim(coalesce(NEW.raw_user_meta_data->>'invite_business','')));
  IF v_choice NOT IN ('COBRA_YA','STREAM_BULLS') THEN
    v_choice := CASE WHEN upper(coalesce(NEW.raw_user_meta_data->>'invitation_code','')) LIKE 'BULL%'
                     THEN 'STREAM_BULLS' ELSE 'COBRA_YA' END;
  END IF;
  SELECT b.id INTO STRICT v_business_id FROM public.cc_businesses b WHERE b.code = v_choice;
  v_code := CASE WHEN v_choice='STREAM_BULLS'
            THEN 'BULL'||nextval('public.cc_invitation_bull_seq'::regclass)::text
            ELSE 'COBRA'||nextval('public.cc_invitation_cobra_seq'::regclass)::text END;
  INSERT INTO public.cc_invitation_codes(business_id,owner_user_id,code,role_at_issue)
  VALUES(v_business_id,NEW.id,v_code,'USER')
  ON CONFLICT (owner_user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS cc_signup_issue_personal_code ON auth.users;
CREATE TRIGGER cc_signup_issue_personal_code
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION cc_internal.issue_user_invitation_on_signup();

-- Un codigo registrado corresponde a una persona real, sin exigir que pague.
CREATE OR REPLACE FUNCTION public.cc_validate_invitation_code(p_code text)
RETURNS TABLE(valid boolean, business text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF p_code IS NULL OR upper(btrim(p_code)) !~ '^(COBRA|BULL)[1-9][0-9]{0,11}$' THEN
    RETURN QUERY SELECT false,''::text;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT true,
      CASE b.code WHEN 'COBRA_YA' THEN 'COBRA YA'
                  WHEN 'STREAM_BULLS' THEN 'STREAM BULL''S' ELSE '' END::text
    FROM public.cc_invitation_codes c
    JOIN public.cc_businesses b ON b.id=c.business_id
    JOIN auth.users u ON u.id=c.owner_user_id
    WHERE c.code = upper(btrim(p_code))
    LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT false,''::text; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION cc_internal.record_signup_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_code text; v_inv record;
BEGIN
  v_code := upper(btrim(coalesce(NEW.raw_user_meta_data->>'invitation_code','')));
  IF v_code !~ '^(COBRA|BULL)[1-9][0-9]{0,11}$' THEN RETURN NEW; END IF;
  SELECT c.id,c.owner_user_id,c.business_id,c.code INTO v_inv
  FROM public.cc_invitation_codes c
  JOIN auth.users inviter ON inviter.id=c.owner_user_id
  WHERE c.code=v_code AND c.owner_user_id<>NEW.id LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.cc_invitation_attributions
      (registered_user_id,code_id,inviter_user_id,business_id,code_snapshot)
    VALUES(NEW.id,v_inv.id,v_inv.owner_user_id,v_inv.business_id,v_inv.code)
    ON CONFLICT (registered_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cc_my_invitation_codes()
RETURNS TABLE(code text, business text, affiliate_role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT c.code::text,
    CASE b.code WHEN 'COBRA_YA' THEN 'COBRA YA'
                WHEN 'STREAM_BULLS' THEN 'STREAM BULL''S' ELSE '' END::text,
    coalesce(m.role,'USUARIO')::text
  FROM public.cc_invitation_codes c
  JOIN public.cc_businesses b ON b.id=c.business_id
  LEFT JOIN LATERAL (
    SELECT m.role FROM public.cc_memberships m
    WHERE m.user_id=c.owner_user_id AND m.business_id=c.business_id
      AND m.status='ACTIVE'
    ORDER BY m.created_at DESC LIMIT 1
  ) m ON true
  WHERE c.owner_user_id=auth.uid()
  ORDER BY c.created_at;
$function$;

REVOKE ALL ON FUNCTION cc_internal.issue_user_invitation_on_signup() FROM PUBLIC, anon, authenticated;

-- Asignacion historica sin reescribir el codigo COBRA1 ni modificar credenciales.
DO $block$
DECLARE v_user record; v_choice text; v_business_id uuid; v_code text;
BEGIN
  FOR v_user IN
    SELECT u.id, u.raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.cc_invitation_codes c WHERE c.owner_user_id=u.id)
    ORDER BY u.created_at,u.id
  LOOP
    v_choice := upper(btrim(coalesce(v_user.raw_user_meta_data->>'invite_business','')));
    IF v_choice NOT IN ('COBRA_YA','STREAM_BULLS') THEN
      IF EXISTS (
        SELECT 1 FROM public.cc_memberships m
        JOIN public.cc_businesses b ON b.id=m.business_id
        WHERE m.user_id=v_user.id AND b.code='STREAM_BULLS'
      ) THEN v_choice:='STREAM_BULLS';
      ELSE v_choice:='COBRA_YA'; END IF;
    END IF;
    SELECT id INTO STRICT v_business_id FROM public.cc_businesses WHERE code=v_choice;
    v_code := CASE WHEN v_choice='STREAM_BULLS'
              THEN 'BULL'||nextval('public.cc_invitation_bull_seq'::regclass)::text
              ELSE 'COBRA'||nextval('public.cc_invitation_cobra_seq'::regclass)::text END;
    INSERT INTO public.cc_invitation_codes(business_id,owner_user_id,code,role_at_issue)
    VALUES (v_business_id,v_user.id,v_code,'USER')
    ON CONFLICT (owner_user_id) DO NOTHING;
  END LOOP;
END;
$block$;
