-- V193 · La billetera única tiene cuatro negocios: MI ALQUILER debe poder auditarse igual que los otros tres.
alter table public.cc_wallet_financial_audit
 drop constraint cc_wallet_financial_audit_service_check;
alter table public.cc_wallet_financial_audit
 add constraint cc_wallet_financial_audit_service_check
 check(service in ('STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER'));
