
REVOKE ALL ON FUNCTION public.cy_loans_apply_business_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_expense_snapshot_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_expenses_lock_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_guarantee_snapshot_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_lease_financial_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_leases_lock_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_ledger_snapshot_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_meter_snapshot_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_unit_currency_after_lease_end() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ma_units_apply_business_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mc_accounts_apply_business_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mc_apply_cart_currency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mc_apply_movement_currency() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.cy_loans_apply_business_currency() IS 'Trigger interno: fija moneda compartida de nuevos préstamos. No es una RPC pública.';
COMMENT ON FUNCTION public.ma_units_apply_business_currency() IS 'Trigger interno: fija moneda compartida de nuevas tarifas. No es una RPC pública.';
COMMENT ON FUNCTION public.mc_apply_cart_currency() IS 'Trigger interno: fija moneda compartida de nuevos carritos. No es una RPC pública.';
