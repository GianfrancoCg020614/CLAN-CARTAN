# CLAN CARTAN V163.5 — Integración segura y publicación controlada
**Rama:** `feature/v163-5-integracion-segura` desde V163.1 (PR #30) y V162.1 (PR #27). **Producción sin cambiar.**
## Qué se preserva
COBRA-YA, STREAM BULL'S, MI COCHERA y MI ALQUILER; cuentas, referidos, DNI consentidos, RLS, saldos reales, bonos no transferibles, contratos, pagos, garantías y logs. Se respeta el logo oficial integrado en V163.1 y toda la historia Git.
## PRs preexistentes
- #27 V162.1 base (borrador)
- #28 API Perú `.dev` (incorporada la modificación única sin fusionar el PR original)
- #29 OTP/Turnstile (incorporados archivos sin activar Auth)
- #30 Logo V163.1 (incluido por herencia en rama)
- Esta rama V163.5 consolida las propuestas en un nuevo PR borrador contra V162.1.
## QA y prepublicación
- CI anterior V161–V162.1 y nuevas comprobaciones estáticas V163.5.
- `node scripts/check-v163-5-integracion.mjs` valida código; `node scripts/check-v163-5-prepublicacion.mjs` es un gate deliberado que bloquea si faltan evidencias E2E.
- La matriz `docs/matriz-e2e-v163-4.json` contiene 24 pruebas, en **No ejecutada** hasta que se hagan en staging.
- Para pruebas aisladas Supabase, valorar y aceptar antes cualquier costo de rama.
- Revisar GitHub Actions y la URL de preview Cloudflare. Comprobar login, módulos, HTTP, JS, CSS y logo.
- No fusionar a `main` ni cambiar Auth, secretos, migraciones o conciliación financiera sin demostrar E2E y respaldo/rollback. Configurar protección de rama y checks obligatorios; un workflow solo no reemplaza la protección.
- Una vez completado QA, fusionar con control de dependencias a V162.1, después aprobar el PR #27 a `main`, verificando que todos los gates están aprobados. Publicar y comprobar producción, manteniendo rollback.
## Secretos
No publicar service_role, APIPERU_TOKEN, SMTP o Turnstile secret. No desplegar `ma-verify-dni` hasta confirmar su token `.dev`. No habilitar WhatsApp automático ni cobros reales.

## Continuidad y restauración (registrada)
Ramas de respaldo antes de fusionar: `respaldo/clan-cartan-main-v161-20261022` y `respaldo/mi-alquiler-v162-1-20261022`. No hacen rollback automático; sirven como referencias verificables de fuentes para restauración controlada. Consolidación PR #31 abierta en borrador. No eliminar o rebasar ramas originales #27–#30. Antes de liberar, cotejar preview con respaldo y obtener aprobación comercial y E2E.
