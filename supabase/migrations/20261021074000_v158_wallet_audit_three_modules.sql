-- V158: la auditoría existente debe reconocer la tercera billetera sin relajar sus saldos o restricciones.
alter table public.cc_wallet_financial_audit drop constraint cc_wallet_financial_audit_service_check;
alter table public.cc_wallet_financial_audit add constraint cc_wallet_financial_audit_service_check check(service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA'));