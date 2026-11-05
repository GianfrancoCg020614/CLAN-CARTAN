-- Permisos existentes auditados: los endpoints financieros Merchant son solo de servicio.
revoke all on function public.cc_binance_merchant_reserve(uuid,text,numeric,text),public.cc_binance_merchant_credit(text,text,text,text,numeric,timestamptz) from public,anon,authenticated;
grant execute on function public.cc_binance_merchant_reserve(uuid,text,numeric,text),public.cc_binance_merchant_credit(text,text,text,text,numeric,timestamptz) to service_role;
revoke all on function public.cc_submit_manual_recharge(text,numeric,text,text),public.cc_admin_decide_manual_recharge_v189(uuid,boolean,text,text,boolean) from public,anon;
grant execute on function public.cc_submit_manual_recharge(text,numeric,text,text),public.cc_admin_decide_manual_recharge_v189(uuid,boolean,text,text,boolean) to authenticated;
