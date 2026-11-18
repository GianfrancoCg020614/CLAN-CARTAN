#!/usr/bin/env bash
# Disposable fixture only. Refuse every hosted database and every existing schema.
set -euo pipefail
[[ "${PGHOST:-}" == 127.0.0.1 && "${PGDATABASE:-}" == capacity && "${ISOLATED:-}" == YES ]] || { echo 'Only localhost database capacity, ISOLATED=YES allowed'; exit 2; }
[[ $(psql -XAt -c "select to_regclass('public.cc_real_service_wallets') is null") == t ]] || { echo 'Refusing nonempty fixture'; exit 2; }
psql -v ON_ERROR_STOP=1 -f scripts/sql/v320-foundation.sql
for name in capture_real_wallet_change cc_portal_charge_unified cc_business_access_v316 sb_delivery_is_seller cc_portal_admin_set_super_reseller cc_stream_distributor_eligible cc_portal_purchase_stream_product; do
  psql -v ON_ERROR_STOP=1 -f "supabase/recovery/v320_${name}.sql"
done
psql -v ON_ERROR_STOP=1 -f scripts/sql/v320-audit-trigger.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261105072557_v320_unified_finance_monthly_settlements.sql
psql -v ON_ERROR_STOP=1 -f scripts/sql/v321-foundation.sql
for name in reserve_verified_payment_receipt cc_submit_manual_recharge cc_admin_decide_manual_recharge_v189 cc_binance_merchant_reserve cc_binance_merchant_credit; do
  psql -v ON_ERROR_STOP=1 -f "supabase/recovery/v321_${name}.sql"
done
psql -v ON_ERROR_STOP=1 -f scripts/sql/v321-receipt-triggers.sql
psql -v ON_ERROR_STOP=1 -f scripts/sql/v321-source-acls.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261105124920_v321_recharge_rec_and_reconciliation.sql
psql -v ON_ERROR_STOP=1 -f scripts/sql/v393-foundation.sql
for name in cc_recharge_create cc_submit_manual_recharge cc_recharge_mail_service reconcile_lemon_notice; do
  psql -v ON_ERROR_STOP=1 -f "supabase/recovery/v393_${name}.sql"
done
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261115205718_binance_mail_fixed_quote_receipts.sql
psql -v ON_ERROR_STOP=1 -f scripts/sql/v393-regression.sql
psql -v ON_ERROR_STOP=1 -f scripts/sql/v394-foundation.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261118003156_account_admin_referral_audit.sql
psql -v ON_ERROR_STOP=1 -f scripts/sql/v394-regression.sql
psql -X -v ON_ERROR_STOP=1 -f scripts/sql/capacity-http-seed.sql
