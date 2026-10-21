-- V158: rollback de pruebas no revierte nextval; restaurar COCHERA1 solo si todavía no existen cuentas.
DO $$ BEGIN
 LOCK TABLE public.mc_accounts IN ACCESS EXCLUSIVE MODE;
 IF NOT EXISTS (SELECT 1 FROM public.mc_accounts) THEN
  ALTER SEQUENCE public.mc_invitation_seq RESTART WITH 1;
 END IF;
END $$;