-- CI ONLY: complete the prior finance fixture with the audited production shape.
alter table cc_internal.recharge_registry add column expires_at timestamptz;
alter table cc_internal.recharge_mail_events add column payer_name_hint text;
alter table public.cc_real_topup_orders add column quote_market_rate_pen_per_usdt numeric,add column quote_conversion_cost_pct numeric,add column quote_protection_margin_pct numeric,add column quote_available_usdt numeric;
alter table public.cc_real_topup_orders add constraint fixture_binance_protection check(provider<>'BINANCE' or (quote_protection_margin_pct between 2 and 20 and quote_conversion_cost_pct between 0 and 15 and quote_available_usdt>=payment_amount and quote_rate_pen_per_usdt=round(quote_market_rate_pen_per_usdt*(100-quote_conversion_cost_pct-quote_protection_margin_pct)/100,6)));
alter table public.cc_real_topup_orders add constraint fixture_binance_credit check((provider in('LEMON_DALE','MANUAL_ADMIN') and payment_currency='PEN' and payment_amount=amount_pen and quote_rate_pen_per_usdt is null) or (provider='BINANCE' and payment_currency='USDT' and payment_amount>0 and quote_rate_pen_per_usdt>0 and amount_pen=round(payment_amount*quote_rate_pen_per_usdt,2) and quote_valid_until is not null and quote_source is not null));
alter table public.cc_real_topup_orders add constraint fixture_status_evidence check(status not in('CREDITED','VERIFIED') or (provider_transaction_id is not null and verified_at is not null));
create table cc_internal.lemon_assisted_settings(id boolean primary key,enabled boolean);
create table public.cc_manual_recharge_settings(id boolean primary key,qr_asset_url text);
