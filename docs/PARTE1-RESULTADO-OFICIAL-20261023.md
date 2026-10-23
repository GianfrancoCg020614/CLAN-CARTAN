# CLAN CARTAN — PARTE 1/7 CERRADA (FUNCIÓN PRINCIPAL)

**Fecha:** 2026-10-23 · **Responsable técnico:** integración controlada GitHub/Supabase/Cloudflare

## Entrega en web oficial
- URL: https://www.clancartan.com/
- Rama de producción: `main`.
- Cambios UI del registro oficial publicados con PR #33, commit `f6db47014efd139008805805222444e854cfe8e9`.
- Controles backend, auditoría y pruebas incorporados al código con PR #34, commit `f7c3d62b244de3269a9894d1d0e222ea53531ae3`.
- Cloudflare Pages despliegue SUCCESS para `f7c3d62b244de3269a9894d1d0e222ea53531ae3`.
- Confirmación desde la web oficial: casillas de Términos, datos necesarios y publicidad separadas.
- `scripts/parte1-registro.js`: validador de campos que complementa el Auth original.
- Botón de registro permanece deshabilitado hasta aceptar Términos y privacidad; publicidad opcional y revocable.
- Prevención de envío duplicado; inicio de sesión, recuperación y OTP existentes preservados.

## Supabase oficial: MIGRACIONES EJECUTADAS
- Proyecto: `pqalxtrcyrpmwqdlibqd`.
- `clan_cartan_part1_pre_signup_legal_validator`: validación de declaración y versiones.
- `clan_cartan_part1_signup_guard_and_legal_audit`: bloquea nuevas altas desde la tabla `auth.users` sin aceptar Términos y tratamiento necesario; registra la aceptación inicial en `cc_part1_legal_consents` con RLS.
- No se activó un segundo hook en el panel Auth; la validación vigente se aplica como trigger BEFORE INSERT. Evitar duplicidad de validadores innecesarios.
- No se alteraron usuarios existentes ni datos financieros.

## Conciliación real de producción
| Indicador | Antes | Después |
|---|---:|---:|
| Usuarios en Auth | 6 | 6 |
| Perfiles auxiliares `cc_user_details` | 3 | 3 |
| Preferencias publicitarias | 1 | 1 |
| Historial publicitario | 1 | 1 |
| Subbilleteras reales | 1 | 1 |
| Saldo total verificado registrado | S/ 0.00 | S/ 0.00 |
| Triggers de alta Auth | 7 | 9 |
| Registros nuevos de consentimiento real | — | 0 (sin cuentas reales nuevas) |

## Entorno aislado permanente de pruebas
- Supabase: `CLAN-CARTAN-STAGING-PARTE1`, proyecto `szcplebbqhtcgxhvmxdv`.
- Organización: CLAN CARTAN · `sa-east-1`.
- Precio cotizado en la creación: **US$ 0 al mes**, sujeto a límites del plan.
- Dos migraciones aplicadas y verificadas: función de consentimiento + trigger/auditoría.
- Probado: alta sin consentimiento rechazada; declaración completa admitida; fila de auditoría creada y restringida al titular; al terminar 0 usuarios de prueba y 0 filas de auditoría.
- No se copiaron datos de usuarios ni movimientos de producción a staging.

## Pruebas automáticas
- GitHub Actions `Validar portal CLAN CARTAN`: SUCCESS.
- GitHub Actions `Parte 1 · Hook Auth en Postgres aislado`: SUCCESS (14 pruebas).
- GitHub Actions `Parte 1 · Auth real LOCAL y consentimientos`: SUCCESS en la rama de integración; demuestra registro, login, recuperación y acceso RLS sobre un Supabase LOCAL, sin proveedores reales.
- Cloudflare Pages deployment SUCCESS; consulta pública de formulario oficial confirmada.
- PR #34 y migraciones documentados; correcciones y respaldo disponibles.

## Riesgos y pendientes de proveedor (NO afirmar verificados)
- Entrega real de OTP por Brevo/SMTP no comprobada con buzón real de cliente. El flujo fue probado localmente, pero falta prueba externa de email.
- Turnstile no está configurado y validado de extremo a extremo en Auth producción.
- Protección contra contraseñas filtradas, una recomendación Supabase Auth que requiere ajuste desde la consola.
- Tres funciones de validación de códigos antiguos permiten invocación `anon` a propósito del registro; deberán auditarse/rediseñarse con la Parte 2 para el código CLAN único.
- No se ha probado el acceso con una contraseña real del usuario, para proteger su cuenta.
- Los cambios de la Parte 2–7 **no** están implementados por este cierre, y no se acreditó ningún bono ni recompensa.

## Respaldo y reversión
- Código principal anterior: `respaldo/main-antes-parte1-20261023`.
- Código antes del bloqueo Auth: `respaldo/parte1-main-antes-control-auth-20261023`.
- Rama V163.5 preservada: `respaldo/v163-5-antes-parte1-20261023`.
- Reversión de DB, si se presentan incidencias: `docs/sql-propuestas/parte1-rollback.sql` (deshabilita **solo** los dos triggers nuevos, conserva los datos y las constancias).

## Inicio de Parte 2
La Parte 1 funcional está implementada y comprobada. Se puede iniciar la **Parte 2/7: código único `CLAN1, CLAN2, CLAN3...` y atribuciones seguras**, siempre en entorno de pruebas primero; mantener la compatibilidad con códigos COBRA/BULL/COCHERA/ALQUILER existentes. La regla comercial acordada para Parte 4 es S/ 5 por usuario referido y mes **solo cuando active/renueve con saldo real verificado**, máximo una vez por referido en el mes, nunca por alta o gasto de bonos promocionales.
