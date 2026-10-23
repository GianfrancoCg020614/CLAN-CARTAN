-- CLAN CARTAN PARTE 1: reversión sin perder declaraciones existentes.
-- APLICAR SOLO si el nuevo control de alta produce incidentes.
-- No borra usuarios, contraseñas, sesiones, audit rows ni saldos.
BEGIN;
DROP TRIGGER IF EXISTS cc_part1_guard_signup ON auth.users;
DROP TRIGGER IF EXISTS cc_part1_audit_signup ON auth.users;
COMMIT;
