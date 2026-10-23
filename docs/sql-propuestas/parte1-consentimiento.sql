-- PROPUESTA PARA STAGING. NO EJECUTAR EN EL SUPABASE DE PRODUCCIÓN.
-- PARTE 1/7: guardar una declaración inicial de condiciones y privacidad.
-- IMPORTANTE: auth.users.raw_user_meta_data es editable por el titular;
-- esta captura acredita solo la declaración enviada durante el alta.
-- Para exigir consentimiento a nivel de servidor, usar un Before User Created
-- Auth Hook validado en un Supabase de pruebas independiente.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cc_registration_legal_audit(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 legal_accepted boolean NOT NULL DEFAULT false,
 data_processing_accepted boolean NOT NULL DEFAULT false,
 terms_version text NOT NULL DEFAULT 'SIN_VERSION',
 privacy_version text NOT NULL DEFAULT 'SIN_VERSION',
 data_processing_version text NOT NULL DEFAULT 'SIN_VERSION',
 source text NOT NULL DEFAULT 'SIGNUP_METADATA',
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cc_registration_legal_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cc_registration_legal_audit FROM public,anon,authenticated;
GRANT SELECT ON public.cc_registration_legal_audit TO authenticated;
DROP POLICY IF EXISTS cc_registration_legal_own_select ON public.cc_registration_legal_audit;
CREATE POLICY cc_registration_legal_own_select
 ON public.cc_registration_legal_audit FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()));
CREATE SCHEMA IF NOT EXISTS cc_internal;
CREATE OR REPLACE FUNCTION cc_internal.capture_legal_signup_declaration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 INSERT INTO public.cc_registration_legal_audit
 (user_id,legal_accepted,data_processing_accepted,terms_version,privacy_version,data_processing_version)
 VALUES (
  new.id,
  coalesce(new.raw_user_meta_data->>'legal_accepted','false')='true',
  coalesce(new.raw_user_meta_data->>'data_processing_accepted','false')='true',
  LEFT(coalesce(new.raw_user_meta_data->>'terms_version','SIN_VERSION'),100),
  LEFT(coalesce(new.raw_user_meta_data->>'privacy_version','SIN_VERSION'),100),
  LEFT(coalesce(new.raw_user_meta_data->>'data_processing_version','SIN_VERSION'),100)
 ) ON CONFLICT(user_id) DO NOTHING;
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION cc_internal.capture_legal_signup_declaration() FROM public,anon,authenticated;
DROP TRIGGER IF EXISTS cc_capture_legal_declaration ON auth.users;
CREATE TRIGGER cc_capture_legal_declaration
 AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION cc_internal.capture_legal_signup_declaration();
COMMIT;
