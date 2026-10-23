-- CLAN CARTAN / Parte 1: control de aceptación en Supabase Auth.
-- SOLO usar después de validar en staging; NO activar directamente en producción.
-- Esta función NO se instala como hook hasta configurar explícitamente Auth Hooks.
--
-- Una vez probado, colocar en migración de staging y configurar:
-- [auth.hook.before_user_created]
-- enabled = true
-- uri = "pg-functions://postgres/cc_internal/cc_part1_before_user_created"
--
-- Nota legal: este hook comprueba declaraciones del formulario; no puede
-- demostrar que una persona leyó efectivamente los documentos.
BEGIN;
CREATE SCHEMA IF NOT EXISTS cc_internal;

CREATE OR REPLACE FUNCTION cc_internal.cc_part1_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_user jsonb := event->'user';
  v_decl jsonb := v_user->'user_metadata';
  v_approved boolean;
BEGIN
  v_approved :=
    coalesce(jsonb_typeof(v_decl->'legal_accepted')='boolean'
      AND v_decl->>'legal_accepted'='true',false)
    AND coalesce(jsonb_typeof(v_decl->'data_processing_accepted')='boolean'
      AND v_decl->>'data_processing_accepted'='true',false)
    AND coalesce(v_decl->>'terms_version','')='V161-20261021'
    AND coalesce(v_decl->>'privacy_version','')='V161-20261021'
    AND coalesce(v_decl->>'data_processing_version','')='V164-20261023';

  IF NOT v_approved THEN
    RETURN pg_catalog.jsonb_build_object(
      'error',pg_catalog.jsonb_build_object(
         'http_code',422,
         'message','Debes aceptar los Términos y la Política de privacidad actuales para crear una cuenta.'
      )
    );
  END IF;

  -- Marketing NO condiciona el registro. No leer 'marketing_consent'.
  RETURN '{}'::jsonb;
END;
$function$;

REVOKE ALL ON FUNCTION cc_internal.cc_part1_before_user_created(jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA cc_internal TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION cc_internal.cc_part1_before_user_created(jsonb) TO supabase_auth_admin;
COMMIT;
