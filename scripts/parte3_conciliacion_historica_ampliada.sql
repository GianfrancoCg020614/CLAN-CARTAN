-- CLAN CARTAN — inspección agregada de conciliación. SOLO LECTURA.
-- No copiar saldos TEST ni sumar bonificaciones promocionales al REAL.
select 'cc_real_service_wallets' origen,count(*) cantidad,coalesce(sum(balance_pen),0) saldo_pen from public.cc_real_service_wallets
union all select 'ma_wallets',count(*),coalesce(sum(real_verified_pen),0) from public.ma_wallets
union all select 'cc_cobra_welcome_bonus_wallets',count(*),coalesce(sum(balance_pen),0) from public.cc_cobra_welcome_bonus_wallets
union all select 'ma_accounts_bonus',count(*),coalesce(sum(bonus_pen),0) from public.ma_accounts
union all select 'mc_accounts_bonus',count(*),coalesce(sum(bonus_pen),0) from public.mc_accounts
union all select 'cc_service_wallets_TEST',count(*),coalesce(sum(balance_test),0) from public.cc_service_wallets
union all select 'cc_wallets_TEST',count(*),coalesce(sum(balance_test),0) from public.cc_wallets;
select 'topups_verified' origen,count(*) cantidad from public.cc_admin_verified_personal_topups
union all select 'real_ledger',count(*) from public.cc_real_wallet_ledger
union all select 'real_spends',count(*) from public.cc_real_wallet_spends
union all select 'real_refunds',count(*) from public.cc_real_wallet_refunds
union all select 'real_transfers',count(*) from public.cc_real_wallet_transfers
union all select 'manual_requests',count(*) from public.cc_manual_recharge_requests
union all select 'topup_orders',count(*) from public.cc_real_topup_orders
union all select 'ma_subscription_events',count(*) from public.ma_subscription_events
union all select 'mc_subscription_events',count(*) from public.mc_subscription_events;
