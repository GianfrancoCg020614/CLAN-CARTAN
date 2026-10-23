-- CLAN CARTAN / PARTE 2 DE 7: REFERIDOS UNIVERSALES, SIN RECOMPENSAS FINANCIERAS
-- Mantiene códigos históricos y atribuciones originales. NO abona dinero ni crea afiliaciones.
-- Ejecutar primero en Supabase STAGING y auditar antes de producción.
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.cc_clan_code_seq AS bigint START WITH 1 INCREMENT BY 1 NO CYCLE;

CREATE TABLE IF NOT EXISTS public.cc_clan_codes (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 code_number bigint NOT NULL UNIQUE CHECK(code_number > 0),
 code text NOT NULL UNIQUE CHECK(code ~ '^CLAN[1-9][0-9]{0,14}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cc_clan_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cc_clan_codes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cc_clan_codes TO authenticated;
DROP POLICY IF EXISTS cc_clan_codes_read_owner ON public.cc_clan_codes;
CREATE POLICY cc_clan_codes_read_owner ON public.cc_clan_codes FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.cc_clan_legacy_aliases (
 code text PRIMARY KEY,
 owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 legacy_source text NOT NULL CHECK(legacy_source IN ('COBRA_BULL','COCHERA','ALQUILER')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT cc_clan_alias_format CHECK(code ~ '^(COBRA|BULL|COCHERA|ALQUILER)[1-9][0-9]{0,11}$')
);
CREATE INDEX IF NOT EXISTS cc_clan_alias_owner_idx ON public.cc_clan_legacy_aliases(owner_user_id);
ALTER TABLE public.cc_clan_legacy_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cc_clan_legacy_aliases FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cc_clan_legacy_aliases TO authenticated;
DROP POLICY IF EXISTS cc_clan_alias_owner_read ON public.cc_clan_legacy_aliases;
CREATE POLICY cc_clan_alias_owner_read ON public.cc_clan_legacy_aliases FOR SELECT TO authenticated
 USING(owner_user_id=(SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.cc_clan_attributions (
 referred_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 inviter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 code_snapshot text NOT NULL CHECK(code_snapshot ~ '^(CLAN|COBRA|BULL|COCHERA|ALQUILER)[1-9][0-9]{0,14}$'),
 source text NOT NULL CHECK(source IN (
  'SIGNUP_CLAN','SIGNUP_ALIAS','BACKFILL_COBRA_BULL','BACKFILL_COCHERA','BACKFILL_ALQUILER'
 )),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT cc_clan_no_self_ref CHECK(referred_user_id<>inviter_user_id)
);
CREATE INDEX IF NOT EXISTS cc_clan_attributions_inviter_date ON public.cc_clan_attributions(inviter_user_id,recorded_at DESC);
ALTER TABLE public.cc_clan_attributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cc_clan_attributions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cc_clan_attributions TO authenticated;
DROP POLICY IF EXISTS cc_clan_attributions_user_read ON public.cc_clan_attributions;
CREATE POLICY cc_clan_attributions_user_read ON public.cc_clan_attributions
 FOR SELECT TO authenticated USING(
   inviter_user_id=(SELECT auth.uid()) OR referred_user_id=(SELECT auth.uid())
 );

-- Las atribuciones históricas conflictivas no se pisan: lista protegida para revisión futura.
CREATE TABLE IF NOT EXISTS public.cc_clan_attribution_conflicts (
 referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 legacy_source text NOT NULL,
 conflicting_inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 conflicting_code text NOT NULL,
 detected_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(referred_user_id,legacy_source)
);
ALTER TABLE public.cc_clan_attribution_conflicts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cc_clan_attribution_conflicts FROM PUBLIC,anon,authenticated;

-- Asignación inicial. CLAN1, CLAN2... en el orden real de creación de cuentas.
-- La migración se ejecuta en una transacción para no perder altas concurrentes.
DO $backfill$
DECLARE v_user record; v_num bigint;
BEGIN
 FOR v_user IN SELECT u.id FROM auth.users u ORDER BY u.created_at,u.id LOOP
  IF NOT EXISTS(SELECT 1 FROM public.cc_clan_codes WHERE user_id=v_user.id) THEN
   v_num:=nextval('public.cc_clan_code_seq'::regclass);
   INSERT INTO public.cc_clan_codes(user_id,code_number,code)
    VALUES(v_user.id,v_num,'CLAN'||v_num::text)
   ON CONFLICT(user_id) DO NOTHING;
  END IF;
 END LOOP;
END $backfill$;

-- Almacenar alias antiguos sin actualizar ni borrar sus tablas originales.
DO $legacy$
BEGIN
 IF to_regclass('public.cc_invitation_codes') IS NOT NULL THEN
  INSERT INTO public.cc_clan_legacy_aliases(code,owner_user_id,legacy_source)
  SELECT upper(btrim(c.code)), c.owner_user_id, 'COBRA_BULL'
  FROM public.cc_invitation_codes c
  WHERE upper(btrim(c.code)) ~ '^(COBRA|BULL)[1-9][0-9]{0,11}$'
  ON CONFLICT(code) DO NOTHING;
 END IF;
 IF to_regclass('public.mc_accounts') IS NOT NULL THEN
  INSERT INTO public.cc_clan_legacy_aliases(code,owner_user_id,legacy_source)
  SELECT upper(btrim(a.invite_code)), a.user_id, 'COCHERA'
  FROM public.mc_accounts a
  WHERE upper(btrim(a.invite_code)) ~ '^COCHERA[1-9][0-9]{0,11}$'
  ON CONFLICT(code) DO NOTHING;
 END IF;
 IF to_regclass('public.ma_accounts') IS NOT NULL THEN
  INSERT INTO public.cc_clan_legacy_aliases(code,owner_user_id,legacy_source)
  SELECT upper(btrim(a.invite_code)), a.user_id, 'ALQUILER'
  FROM public.ma_accounts a
  WHERE upper(btrim(a.invite_code)) ~ '^ALQUILER[1-9][0-9]{0,11}$'
  ON CONFLICT(code) DO NOTHING;
 END IF;
END $legacy$;

-- Atribuciones previas permanecen en sus tablas de origen. Se construye un índice global
-- determinista sin tocar los registros anteriores; en caso de conflicto se registra alerta.
DO $oldattributions$
BEGIN
 IF to_regclass('public.cc_invitation_attributions') IS NOT NULL THEN
  INSERT INTO public.cc_clan_attributions(referred_user_id,inviter_user_id,code_snapshot,source,recorded_at)
  SELECT a.registered_user_id,a.inviter_user_id,upper(a.code_snapshot),'BACKFILL_COBRA_BULL',a.recorded_at
  FROM public.cc_invitation_attributions a
  WHERE a.registered_user_id<>a.inviter_user_id
  ON CONFLICT(referred_user_id) DO NOTHING;
 END IF;
 IF to_regclass('public.mc_invitation_attributions') IS NOT NULL THEN
  INSERT INTO public.cc_clan_attributions(referred_user_id,inviter_user_id,code_snapshot,source,recorded_at)
  SELECT a.registered_user_id,a.inviter_user_id,upper(a.invite_code_snapshot),'BACKFILL_COCHERA',a.created_at
  FROM public.mc_invitation_attributions a
  WHERE a.registered_user_id<>a.inviter_user_id
  ON CONFLICT(referred_user_id) DO NOTHING;
  INSERT INTO public.cc_clan_attribution_conflicts(referred_user_id,legacy_source,conflicting_inviter_id,conflicting_code)
  SELECT a.registered_user_id,'COCHERA',a.inviter_user_id,upper(a.invite_code_snapshot)
  FROM public.mc_invitation_attributions a
  JOIN public.cc_clan_attributions c ON c.referred_user_id=a.registered_user_id
  WHERE c.inviter_user_id<>a.inviter_user_id
  ON CONFLICT(referred_user_id,legacy_source) DO NOTHING;
 END IF;
 IF to_regclass('public.ma_invitation_attributions') IS NOT NULL THEN
  INSERT INTO public.cc_clan_attributions(referred_user_id,inviter_user_id,code_snapshot,source,recorded_at)
  SELECT a.registered_user_id,a.inviter_user_id,upper(a.invitation_code),'BACKFILL_ALQUILER',a.created_at
  FROM public.ma_invitation_attributions a
  WHERE a.registered_user_id<>a.inviter_user_id
  ON CONFLICT(referred_user_id) DO NOTHING;
  INSERT INTO public.cc_clan_attribution_conflicts(referred_user_id,legacy_source,conflicting_inviter_id,conflicting_code)
  SELECT a.registered_user_id,'ALQUILER',a.inviter_user_id,upper(a.invitation_code)
  FROM public.ma_invitation_attributions a
  JOIN public.cc_clan_attributions c ON c.referred_user_id=a.registered_user_id
  WHERE c.inviter_user_id<>a.inviter_user_id
  ON CONFLICT(referred_user_id,legacy_source) DO NOTHING;
 END IF;
END $oldattributions$;

-- Validación mínima pre-registro: NUNCA revela nombres, correos ni id del invitador.
CREATE OR REPLACE FUNCTION public.cc_clan_validate_code(p_code text)
RETURNS TABLE(valid boolean,business text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_code text:=upper(btrim(coalesce(p_code,'')));
BEGIN
 IF length(v_code)>24 OR v_code !~ '^(CLAN|COBRA|BULL|COCHERA|ALQUILER)[1-9][0-9]{0,14}$' THEN
  RETURN QUERY SELECT false,''::text; RETURN;
 END IF;
 IF v_code LIKE 'CLAN%' THEN
  RETURN QUERY SELECT true,'CLAN CARTAN'::text FROM public.cc_clan_codes c WHERE c.code=v_code LIMIT 1;
 ELSIF v_code LIKE 'ALQUILER%' AND to_regclass('public.ma_accounts') IS NOT NULL THEN
  RETURN QUERY SELECT true,'CLAN CARTAN'::text FROM public.cc_clan_legacy_aliases a
   WHERE a.code=v_code AND EXISTS(
     SELECT 1 FROM public.ma_accounts ma
     WHERE ma.invite_code=v_code AND ma.user_id=a.owner_user_id
       AND (EXISTS(SELECT 1 FROM public.cc_admins ad WHERE ad.user_id=a.owner_user_id)
         OR (NOT ma.suspended AND ma.subscription_until>now()))
   ) LIMIT 1;
 ELSIF v_code LIKE 'ALQUILER%' THEN
  RETURN QUERY SELECT false,''::text; RETURN;
 ELSE
  RETURN QUERY SELECT true,'CLAN CARTAN'::text FROM public.cc_clan_legacy_aliases a
   WHERE a.code=v_code LIMIT 1;
 END IF;
 IF NOT FOUND THEN RETURN QUERY SELECT false,''::text; END IF;
END $function$;
REVOKE ALL ON FUNCTION public.cc_clan_validate_code(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cc_clan_validate_code(text) TO anon,authenticated;
-- Public validation RPC deliberately returns a Boolean only; no row/owner PII.

-- Un solo panel y una sola identidad: sin activar pagos ni comisiones.
CREATE OR REPLACE FUNCTION public.cc_clan_my_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Inicia sesión' USING ERRCODE='28000'; END IF;
 RETURN (
  SELECT jsonb_build_object(
   'code',c.code,
   'referrals', (SELECT count(*) FROM public.cc_clan_attributions a WHERE a.inviter_user_id=v_uid),
   'historical_aliases',(SELECT count(*) FROM public.cc_clan_legacy_aliases h WHERE h.owner_user_id=v_uid),
   'rewards_enabled',false
  )
  FROM public.cc_clan_codes c WHERE c.user_id=v_uid
 );
END $function$;
REVOKE ALL ON FUNCTION public.cc_clan_my_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cc_clan_my_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.cc_clan_my_referrals()
RETURNS TABLE(label text, code_snapshot text, referred_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
 SELECT ('Referido #'
   || row_number() OVER(ORDER BY a.recorded_at,a.referred_user_id)::text)::text,
  a.code_snapshot, a.recorded_at
 FROM public.cc_clan_attributions a
 WHERE a.inviter_user_id=(SELECT auth.uid())
 ORDER BY a.recorded_at DESC,a.referred_user_id DESC LIMIT 20;
$function$;
REVOKE ALL ON FUNCTION public.cc_clan_my_referrals() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cc_clan_my_referrals() TO authenticated;

-- Solo se permite código válido si el registro voluntariamente lo declara.
-- No se altera el flujo de alta sin referido.
CREATE OR REPLACE FUNCTION cc_internal.cc_clan_guard_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_code text:=upper(btrim(coalesce(NEW.raw_user_meta_data->>'invitation_code','')));
        v_valid boolean:=false;
BEGIN
 IF v_code='' THEN RETURN NEW; END IF;
 SELECT c.valid INTO v_valid FROM public.cc_clan_validate_code(v_code) c LIMIT 1;
 IF NOT coalesce(v_valid,false) THEN
  RAISE EXCEPTION 'Código de referido no válido' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION cc_internal.cc_clan_guard_signup() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS cc_clan_guard_signup ON auth.users;
CREATE TRIGGER cc_clan_guard_signup BEFORE INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION cc_internal.cc_clan_guard_signup();

-- Códigos se emiten exactamente una vez por usuario.
-- Atribución única; no se permite el cobro de recompensa en esta etapa.
CREATE OR REPLACE FUNCTION cc_internal.cc_clan_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_num bigint; v_code text;
        v_inviter uuid; v_prior uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.cc_clan_codes WHERE user_id=NEW.id) THEN
  v_num:=nextval('public.cc_clan_code_seq'::regclass);
  INSERT INTO public.cc_clan_codes(user_id,code_number,code)
  VALUES(NEW.id,v_num,'CLAN'||v_num::text)
  ON CONFLICT(user_id) DO NOTHING;
 END IF;
 v_code:=upper(btrim(coalesce(NEW.raw_user_meta_data->>'invitation_code','')));
 IF v_code='' THEN RETURN NEW; END IF;
 SELECT c.user_id INTO v_inviter FROM public.cc_clan_codes c WHERE c.code=v_code;
 IF v_inviter IS NULL THEN
  SELECT a.owner_user_id INTO v_inviter FROM public.cc_clan_legacy_aliases a WHERE a.code=v_code;
 END IF;
 IF v_inviter IS NULL OR v_inviter=NEW.id THEN RETURN NEW; END IF;
 -- Si ya hay atribución histórica, respetarla y no cambiar de invitador.
 IF to_regclass('public.cc_invitation_attributions') IS NOT NULL THEN
  SELECT a.inviter_user_id INTO v_prior FROM public.cc_invitation_attributions a
  WHERE a.registered_user_id=NEW.id LIMIT 1;
 END IF;
 IF v_prior IS NULL AND to_regclass('public.mc_invitation_attributions') IS NOT NULL THEN
  SELECT a.inviter_user_id INTO v_prior FROM public.mc_invitation_attributions a
  WHERE a.registered_user_id=NEW.id LIMIT 1;
 END IF;
 IF v_prior IS NULL AND to_regclass('public.ma_invitation_attributions') IS NOT NULL THEN
  SELECT a.inviter_user_id INTO v_prior FROM public.ma_invitation_attributions a
  WHERE a.registered_user_id=NEW.id LIMIT 1;
 END IF;
 IF v_prior IS NOT NULL AND v_prior<>v_inviter THEN
  INSERT INTO public.cc_clan_attribution_conflicts(referred_user_id,legacy_source,conflicting_inviter_id,conflicting_code)
  VALUES(NEW.id,'SIGNUP',v_inviter,v_code)
  ON CONFLICT(referred_user_id,legacy_source) DO NOTHING;
  RETURN NEW;
 END IF;
 INSERT INTO public.cc_clan_attributions(referred_user_id,inviter_user_id,code_snapshot,source)
 VALUES(NEW.id,v_inviter,v_code,CASE WHEN v_code LIKE 'CLAN%' THEN 'SIGNUP_CLAN' ELSE 'SIGNUP_ALIAS' END)
 ON CONFLICT(referred_user_id) DO NOTHING;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION cc_internal.cc_clan_on_signup() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS zz_cc_clan_on_signup ON auth.users;
CREATE TRIGGER zz_cc_clan_on_signup AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION cc_internal.cc_clan_on_signup();

-- Los códigos históricos creados después de la migración también siguen funcionando.
CREATE OR REPLACE FUNCTION cc_internal.cc_clan_sync_legacy_alias()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_code text; v_uid uuid; v_source text;
BEGIN
 v_code:=upper(btrim(coalesce(
  CASE TG_TABLE_NAME WHEN 'cc_invitation_codes' THEN to_jsonb(NEW)->>'code' ELSE to_jsonb(NEW)->>'invite_code' END,'')));
 v_uid:=coalesce(nullif(to_jsonb(NEW)->>'owner_user_id','')::uuid,
                 nullif(to_jsonb(NEW)->>'user_id','')::uuid);
 v_source:=CASE TG_TABLE_NAME WHEN 'cc_invitation_codes' THEN 'COBRA_BULL'
    WHEN 'mc_accounts' THEN 'COCHERA' ELSE 'ALQUILER' END;
 IF v_code ~ '^(COBRA|BULL|COCHERA|ALQUILER)[1-9][0-9]{0,11}$' AND v_uid IS NOT NULL THEN
  INSERT INTO public.cc_clan_legacy_aliases(code,owner_user_id,legacy_source)
  VALUES(v_code,v_uid,v_source) ON CONFLICT(code) DO NOTHING;
 END IF;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION cc_internal.cc_clan_sync_legacy_alias() FROM PUBLIC,anon,authenticated;
DO $legacy_triggers$
BEGIN
 IF to_regclass('public.cc_invitation_codes') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS cc_clan_sync_alias ON public.cc_invitation_codes;
  CREATE TRIGGER cc_clan_sync_alias AFTER INSERT ON public.cc_invitation_codes FOR EACH ROW
   EXECUTE FUNCTION cc_internal.cc_clan_sync_legacy_alias();
 END IF;
 IF to_regclass('public.mc_accounts') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS cc_clan_sync_alias ON public.mc_accounts;
  CREATE TRIGGER cc_clan_sync_alias AFTER INSERT ON public.mc_accounts FOR EACH ROW
   EXECUTE FUNCTION cc_internal.cc_clan_sync_legacy_alias();
 END IF;
 IF to_regclass('public.ma_accounts') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS cc_clan_sync_alias ON public.ma_accounts;
  CREATE TRIGGER cc_clan_sync_alias AFTER INSERT ON public.ma_accounts FOR EACH ROW
   EXECUTE FUNCTION cc_internal.cc_clan_sync_legacy_alias();
 END IF;
END $legacy_triggers$;
COMMIT;
