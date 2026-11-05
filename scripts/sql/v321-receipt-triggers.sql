create trigger fixture_topup_receipt before insert on public.cc_real_wallet_ledger for each row execute function cc_internal.reserve_verified_payment_receipt();
create trigger fixture_merchant_receipt before insert on public.cc_binance_merchant_credits for each row execute function cc_internal.reserve_verified_payment_receipt();
