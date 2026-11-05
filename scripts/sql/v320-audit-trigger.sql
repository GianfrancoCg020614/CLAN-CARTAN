create trigger fixture_audit after insert or update on public.cc_real_service_wallets for each row execute function cc_internal.capture_real_wallet_change();
