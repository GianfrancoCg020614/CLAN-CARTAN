-- V156.1: preserva igualdad exacta Lemon/PEN y admite truncamiento conservador
-- para USDT, siempre acotado por el neto PEN realmente liquidado.
alter table public.cc_admin_verified_personal_topups
 drop constraint if exists cc_personal_topups_conversion_check;
alter table public.cc_admin_verified_personal_topups
 add constraint cc_personal_topups_conversion_check
 check (
   (provider='LEMON_DALE_PERSONAL' and credited_pen=round(received_amount*rate_pen_per_unit,2))
   or
   (provider='BINANCE_PERSONAL' and credited_pen>0
       and credited_pen<=trunc(received_amount*rate_pen_per_unit,2)
       and net_settled_pen is not null and credited_pen<=net_settled_pen
       and settlement_reference is not null and quote_id is not null)
 );