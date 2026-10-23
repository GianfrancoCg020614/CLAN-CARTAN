\set ON_ERROR_STOP on
-- Solo para Postgres aislado en GitHub CI.
DO $test$
DECLARE
 event jsonb;
 output jsonb;
 v_decl jsonb;
 i integer;
 scenario text;
BEGIN
 v_decl:=jsonb_build_object(
   'legal_accepted',true,
   'data_processing_accepted',true,
   'terms_version','V161-20261021',
   'privacy_version','V161-20261021',
   'data_processing_version','V164-20261023'
 );
 event:=jsonb_build_object('user',jsonb_build_object('user_metadata',v_decl));
 output:=cc_internal.cc_part1_before_user_created(event);
 IF output<>'{}'::jsonb THEN
   RAISE EXCEPTION 'El consentimiento correcto debe permitir alta: %',output;
 END IF;
 RAISE NOTICE 'PASS 1: consentimiento válido';
 output:=cc_internal.cc_part1_before_user_created(
   jsonb_set(event,'{user,user_metadata,marketing_consent}','false'::jsonb)
 );
 IF output<>'{}'::jsonb THEN RAISE EXCEPTION 'La publicidad no es obligatoria'; END IF;
 RAISE NOTICE 'PASS 2: publicidad falsa';
 output:=cc_internal.cc_part1_before_user_created(
   jsonb_set(event,'{user,user_metadata,marketing_consent}','true'::jsonb)
 );
 IF output<>'{}'::jsonb THEN RAISE EXCEPTION 'La publicidad voluntaria no afecta alta'; END IF;
 RAISE NOTICE 'PASS 3: publicidad verdadera';
 FOR i IN 1..10 LOOP
  CASE i
   WHEN 1 THEN scenario:='sin metadatos';output:=cc_internal.cc_part1_before_user_created('{"user":{}}');
   WHEN 2 THEN scenario:='sin aceptación términos';output:=cc_internal.cc_part1_before_user_created(jsonb_set(event,'{user,user_metadata,legal_accepted}','false'::jsonb));
   WHEN 3 THEN scenario:='sin aceptación privacidad';output:=cc_internal.cc_part1_before_user_created(jsonb_set(event,'{user,user_metadata,data_processing_accepted}','false'::jsonb));
   WHEN 4 THEN scenario:='términos como texto';output:=cc_internal.cc_part1_before_user_created(jsonb_set(event,'{user,user_metadata,legal_accepted}','"true"'::jsonb));
   WHEN 5 THEN scenario:='privacidad como texto';output:=cc_internal.cc_part1_before_user_created(jsonb_set(event,'{user,user_metadata,data_processing_accepted}','"true"'::jsonb));
   WHEN 6 THEN scenario:='versión de términos antigua';output:=cc_internal.cc_part1_before_user_created(jsonb_set(event,'{user,user_metadata,terms_version}','"V150"'::jsonb));
   WHEN 7 THEN scenario:='versión privacidad antigua';output:=cc_internal.cc_part1_before_user_created(jsonb_set(event,'{user,user_metadata,privacy_version}','"V150"'::jsonb));
   WHEN 8 THEN scenario:='versión datos antigua';output:=cc_internal.cc_part1_before_user_created(jsonb_set(event,'{user,user_metadata,data_processing_version}','"V150"'::jsonb));
   WHEN 9 THEN scenario:='metadata nula';output:=cc_internal.cc_part1_before_user_created('null'::jsonb);
   WHEN 10 THEN scenario:='consentimiento omitido';output:=cc_internal.cc_part1_before_user_created(jsonb_set(event,'{user,user_metadata}',v_decl-'legal_accepted'));
  END CASE;
  IF output#>>'{error,message}' IS NULL OR output#>>'{error,http_code}'<>'422' THEN
    RAISE EXCEPTION 'Falla del caso %: %, resultado %',i,scenario,output;
  END IF;
  RAISE NOTICE 'PASS %: %',i+3,scenario;
 END LOOP;
END;
$test$;

DO $permissions$
BEGIN
 IF NOT pg_catalog.has_function_privilege('supabase_auth_admin','cc_internal.cc_part1_before_user_created(jsonb)','EXECUTE') THEN
   RAISE EXCEPTION 'Auth Admin no puede llamar al hook';
 END IF;
 IF pg_catalog.has_function_privilege('anon','cc_internal.cc_part1_before_user_created(jsonb)','EXECUTE') OR
    pg_catalog.has_function_privilege('authenticated','cc_internal.cc_part1_before_user_created(jsonb)','EXECUTE') THEN
   RAISE EXCEPTION 'Roles externos pueden ejecutar hook de alta';
 END IF;
 RAISE NOTICE 'PASS 14: el hook solo es ejecutable por el rol de autenticación autorizado';
END;
$permissions$;
