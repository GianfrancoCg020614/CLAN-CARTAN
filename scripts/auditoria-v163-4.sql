-- V163.4: auditoría de integridad financiera exclusivamente de lectura. 174 comprobaciones.
-- No se crean usuarios, registros, cobros o movimientos de prueba.
WITH t(table_name) AS (VALUES ('ma_accounts'),
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
fk(tab,nam) AS (VALUES ('ma_leases','ma_leases_tenant_id_reseller_id_fkey'),
('ma_leases','ma_leases_unit_id_reseller_id_fkey'),
('ma_units','ma_units_property_id_reseller_id_fkey'),
('ma_ledger','ma_ledger_lease_id_reseller_id_fkey'),
('ma_guarantee_events','ma_guarantee_events_lease_id_reseller_id_fkey'),
('ma_meter_readings','ma_meter_readings_lease_id_reseller_id_fkey'),
('ma_expenses','ma_expenses_unit_id_reseller_id_fkey')),
uq(tab,nam) AS (VALUES ('ma_leases','ma_one_live_lease_per_unit'),
('ma_ledger','ma_ledger_rent_period'),
('ma_ledger','ma_ledger_fixed_month'),
('ma_ledger','ma_ledger_single_reversal'),
('ma_ledger','ma_ledger_request_id_key'),
('ma_guarantee_events','ma_guarantee_events_request_id_key'),
('ma_meter_readings','ma_meter_readings_request_id_key'),
('ma_subscription_events','ma_subscription_events_request_id_key'),
('ma_bonus_events','ma_bonus_events_request_id_key'),
('ma_whatsapp_notice_events','ma_whatsapp_notice_events_request_id_key'),
('mc_real_transfer_requests','mc_real_transfer_requests_pkey')),
fn(name,marker) AS (VALUES ('ma_record_payment','p_amount>current_balance'),
('ma_record_guarantee','p_amount>held'),
('ma_record_guarantee','due<p_amount'),
('ma_transfer_real_balance','CC_REAL_WALLET_TRANSFER'),
('ma_activate_real_wallet','cc_real_wallet_spends'),
('ma_activate_bonus','bonus_pen=bonus_pen-15'),
('ma_log_notice','consent_whatsapp'),
('ma_contract_billing_trigger','REVERSAL'),
('ma_start_lease','reseller_id=u'),
('ma_add_unit','for update')),
checks(test,ok) AS (
 SELECT 'tabla:'||table_name,to_regclass('public.'||table_name) IS NOT NULL FROM t
 UNION ALL SELECT 'rls:'||table_name,COALESCE((SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=to_regclass('public.'||table_name)),FALSE) FROM t
 UNION ALL SELECT 'policy:'||table_name,EXISTS(SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.table_name) FROM t
 UNION ALL SELECT 'deny_'||r.name||'_'||v.action||':'||t.table_name,NOT has_table_privilege(r.name,'public.'||t.table_name,v.action)
 FROM t CROSS JOIN (VALUES('anon'),('authenticated')) r(name) CROSS JOIN (VALUES('INSERT'),('UPDATE'),('DELETE')) v(action)
 UNION ALL SELECT 'ownership_fk:'||fk.tab||'.'||fk.nam,EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid WHERE cl.relname=fk.tab AND c.conname=fk.nam AND c.contype='f') FROM fk
 UNION ALL SELECT 'unique_index:'||uq.nam,EXISTS(SELECT 1 FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid JOIN pg_class tab ON tab.oid=i.indrelid WHERE tab.relname=uq.tab AND idx.relname=uq.nam AND i.indisunique) FROM uq
 UNION ALL SELECT 'function_marker:'||fn.name||':'||fn.marker,EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND p.proname=fn.name AND position(fn.marker IN pg_get_functiondef(p.oid))>0) FROM fn
 UNION ALL SELECT 'wallet_balance_nonnegative',EXISTS(SELECT 1 FROM pg_constraint WHERE conname='cc_real_service_wallets_balance_pen_check' AND pg_get_constraintdef(oid) ILIKE '%>=%')
 UNION ALL SELECT 'four_real_wallet_services',EXISTS(SELECT 1 FROM pg_constraint WHERE conname='cc_real_service_wallets_service_check' AND pg_get_constraintdef(oid) LIKE '%MI_ALQUILER%' AND pg_get_constraintdef(oid) LIKE '%MI_COCHERA%' AND pg_get_constraintdef(oid) LIKE '%COBRA_YA%' AND pg_get_constraintdef(oid) LIKE '%STREAM_BULLS%')
) SELECT count(*)::integer AS comprobaciones,count(*) FILTER(WHERE ok)::integer AS correctas,COALESCE(jsonb_agg(test ORDER BY test) FILTER(WHERE NOT ok),'[]'::jsonb) AS fallos FROM checks;
