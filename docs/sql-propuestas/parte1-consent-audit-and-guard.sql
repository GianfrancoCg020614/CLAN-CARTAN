-- CLAN CARTAN PARTE 1/7: auditoría de declaraciones y bloqueo de altas sin condiciones.
-- Requiere cc_internal.cc_part1_before_user_created(jsonb), introducida
-- por la migración previa del hook. Es idempotente, no edita usuarios existentes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cc_part1_legal_consents (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 terms_version text NOT NULL,
 privacy_version text NOT NULL,
 data_processing_version text NOT NULL,
 declared_at timestamptz NOT NULL DEFAULT now(),
 declaration_source text NOT NULL DEFAULT 'SIGNUP'
);
ALTER TABLE public.cc_part1_legal_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cc_part1_legal_consents FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cc_part1_legal_consents TO authenticated;
DROP POLICY IF EXISTS cc_part1_legal_self_select ON public.cc_part1_legal_consents;
CREATE POLICY cc_part1_legal_self_select
 ON public.cc_part1_legal_consents FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION cc_internal.cc_part1_enforce_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE check_result jsonb;
BEGIN
 check_result := cc_internal.cc_part1_before_user_created(
   pg_catalog.jsonb_build_object('user',
      pg_catalog.jsonb_build_object('user_metadata',coalesce(NEW.raw_user_meta_data,'{}'::jsonb))
   )
 );
 IF check_result ? 'error' THEN
   RAISE EXCEPTION USING ERRCODE='23514',
     MESSAGE='Debes aceptar los Términos y la Política de privacidad para crear tu cuenta.';
 END IF;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION cc_internal.cc_part1_enforce_signup() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS cc_part1_guard_signup ON auth.users;
CREATE TRIGGER cc_part1_guard_signup
 BEFORE INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION cc_internal.cc_part1_enforce_signup();

CREATE OR REPLACE FUNCTION cc_internal.cc_part1_audit_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
 INSERT INTO public.cc_part1_legal_consents
 (user_id,terms_version,privacy_version,data_processing_version)
 VALUES (
  NEW.id,
  NEW.raw_user_meta_data->>'terms_version',
  NEW.raw_user_meta_data->>'privacy_version',
  NEW.raw_user_meta_data->>'data_processing_version'
 ) ON CONFLICT (user_id) DO NOTHING;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION cc_internal.cc_part1_audit_signup() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS cc_part1_audit_signup ON auth.users;
CREATE TRIGGER cc_part1_audit_signup
 AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION cc_internal.cc_part1_audit_signup();
COMMIT;
