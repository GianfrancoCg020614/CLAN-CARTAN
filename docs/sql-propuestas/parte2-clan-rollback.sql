-- PARTE 2 ROLLBACK REVERSIBLE: SE DETIENE EMISIÓN/ATRIBUCIÓN CLAN SIN ELIMINAR DATOS.
-- Aplicar solo si falla el registro tras despliegue. Conservar tablas, códigos y vínculos.
BEGIN;
DROP TRIGGER IF EXISTS cc_clan_guard_signup ON auth.users;
DROP TRIGGER IF EXISTS zz_cc_clan_on_signup ON auth.users;
DO $triggers$
BEGIN
 IF to_regclass('public.cc_invitation_codes') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS cc_clan_sync_alias ON public.cc_invitation_codes;
 END IF;
 IF to_regclass('public.mc_accounts') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS cc_clan_sync_alias ON public.mc_accounts;
 END IF;
 IF to_regclass('public.ma_accounts') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS cc_clan_sync_alias ON public.ma_accounts;
 END IF;
END $triggers$;
COMMIT;
-- REVERTIR además el frontend mediante respaldo/main-antes-parte2-20261023.
-- No borrar cc_clan_codes, cc_clan_attributions ni cc_clan_legacy_aliases:
-- se requieren para reactivar sin perder referidos.
