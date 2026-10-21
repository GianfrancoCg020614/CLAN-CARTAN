-- V159: las pruebas con ROLLBACK no revierten nextval(); si ninguna cuenta real de MI COCHERA
-- existe todavía, devolver consecutivo inicial COCHERA1 sin borrar registros.
DO $$ BEGIN
 LOCK TABLE public.mc_accounts IN ACCESS EXCLUSIVE MODE;
 IF NOT EXISTS (SELECT 1 FROM public.mc_accounts) THEN
   ALTER SEQUENCE public.mc_invitation_seq RESTART WITH 1;
 END IF;
END $$;