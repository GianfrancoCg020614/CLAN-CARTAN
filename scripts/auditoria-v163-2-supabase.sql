-- V163.2: auditoría SQL exclusivamente de lectura. 77 comprobaciones.
-- No aplicar migración experimental V163 al esquema V162.1 de CLAN CARTAN.
WITH expected_tables(table_name) AS (VALUES ('ma_accounts'),
('ma_bonus_events'),
('ma_expenses'),
('ma_guarantee_events'),
('ma_invitation_attributions'),
('ma_lease_events'),
('ma_leases'),
('ma_ledger'),
('ma_meter_readings'),
('ma_payment_support_settings'),
('ma_properties'),
('ma_subscription_events'),
('ma_tenants'),
('ma_units'),
('ma_wallets'),
('ma_whatsapp_notice_events')),
expected_columns(table_name,column_name) AS (VALUES ('ma_units','property_id'),
('ma_units','serial'),
('ma_units','code'),
('ma_leases','mode'),
('ma_leases','periods'),
('ma_ledger','amount_pen'),
('ma_ledger','period_month'),
('ma_ledger','due_on'),
('ma_meter_readings','consumption'),
('ma_meter_readings','price_per_unit'),
('ma_meter_readings','charged_pen'),
('ma_expenses','amount_pen'),
('ma_subscription_events','funding'),
('ma_wallets','real_verified_pen'),
('ma_guarantee_events','amount_pen'),
('ma_whatsapp_notice_events','phone_snapshot'),
('ma_invitation_attributions','invitation_code')),
expected_functions(fn) AS (VALUES ('ma_add_property'),
('ma_add_unit'),
('ma_start_lease'),
('ma_record_payment'),
('ma_record_guarantee'),
('ma_record_meter'),
('ma_end_lease'),
('ma_ensure_account'),
('ma_transfer_real_balance'),
('ma_validate_invitation_code')),
checks AS (
 SELECT 'tabla:'||table_name AS test,to_regclass('public.'||table_name) IS NOT NULL AS ok FROM expected_tables
 UNION ALL SELECT 'rls:'||table_name,EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t.table_name AND c.relrowsecurity) FROM expected_tables t
 UNION ALL SELECT 'sin_escritura_directa:'||table_name,NOT(has_table_privilege('anon','public.'||table_name,'INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated','public.'||table_name,'INSERT,UPDATE,DELETE')) FROM expected_tables
 UNION ALL SELECT 'columna:'||table_name||'.'||column_name,EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name) FROM expected_columns e
 UNION ALL SELECT 'funcion:'||fn,EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=e.fn) FROM expected_functions e
 UNION ALL SELECT 'sin_tabla_paralela:ma_guarantees',to_regclass('public.ma_guarantees') IS NULL
 UNION ALL SELECT 'sin_tabla_paralela:ma_alerts',to_regclass('public.ma_alerts') IS NULL
) SELECT count(*)::integer AS comprobaciones,count(*) FILTER(WHERE ok)::integer AS correctas,COALESCE(jsonb_agg(test ORDER BY test) FILTER(WHERE NOT ok),'[]'::jsonb) AS fallos FROM checks;
