# Continuidad V161 · Monedas, referidos y consentimiento publicitario
**Fecha:** 21-OCT-2026. Continuidad desde V160 en CLAN CARTAN E.I.R.L.

## Pregunta: STREAM BULL’S como servicio preferido + invitación COCHERA1
- Son dos datos INDEPENDIENTES: el nuevo usuario puede descubrir STREAM BULL’S primero mientras el código `COCHERA1` atribuye el referido a su titular de MI COCHERA.
- El código no es bono, no transfiere dinero y no habilita acceso a módulos, afiliaciones o suscripciones; ADMIN es el único que otorga bonos gratuitos, que nunca se transfieren.
- Frontend valida vía RPC de la plataforma del código (COBRA#/BULL# → `cc_validate_invitation_code`; COCHERA# → `mc_validate_invitation_code`) y muestra de dónde procede el código. Registra `invite_business` derivado del CÓDIGO y `preferred_service` separado.
- Registro backend MI COCHERA: `mc_signup_cochera_invitation_capture` y `mc_invitation_attributions` siguen vigentes; evitar atribuir a otro usuario o comisiones automáticas.

## Monedas para las tres plataformas
- `scripts/v161-global-currency-flags.js`: catálogo único código ISO → bandera/nombre. Aplica a selects existentes y futuros y a datos tabulares de moneda, incluidos módulos de préstamos, alquiler, billetera y registro, sin modificar values ISO, montos, deuda ni tipo de cambio.
- PEN 🇵🇪 predeterminado; USD 🇺🇸, EUR 🇪🇺, COP 🇨🇴, MXN 🇲🇽, ARS 🇦🇷, CLP 🇨🇱, BOB 🇧🇴, BRL 🇧🇷, UYU 🇺🇾, PYG 🇵🇾, CAD 🇨🇦, GBP 🇬🇧, GTQ 🇬🇹, CRC 🇨🇷, DOP 🇩🇴, VES 🇻🇪, USDT 🪙. No inventar cotizaciones.

## Registro y consentimiento comercial
- Casillas SEPARADAS: términos y privacidad necesarios para alta, publicidad OPCIONAL sin marcar por defecto: «Yo autorizo comunicaciones publicitarias de CLAN CARTAN por correo electrónico y WhatsApp». No impedir registro por rechazar publicidad.
- Metadata de signup: `marketing_consent` booleano explícito, `terms_version` y `privacy_version` V161-20261021.
- Supabase `cc_marketing_consents` y `cc_marketing_consent_history` con RLS; trigger captura estado exacto del alta, RPC `cc_set_my_marketing_consent` permite rectificar/revocar, UI de preferencias dentro de cuenta.
- Los usuarios que no optan no reciben publicidad por este consentimiento; campañas futuras deberán consultar `authorized=true`, y respetar oposiciones y bajas.

## Textos y límites
- Se eliminaron avisos promocionales antiguos «borradores», «no utilizar aún para el lanzamiento» del formulario y encabezados de las plantillas legales. Términos y privacidad siguen disponibles completos desde sus enlaces.
- **Pendiente legal**: textos requieren revisión jurídica efectiva y completar datos definitivos de operador, domicilio, encargados, reclamaciones y transferencias; quitar la palabra «borrador» NO constituye aprobación legal.
- No borrar ni disfrazar indicaciones «DEMO», «saldo ficticio» o «pago no disponible» cuando esa funcionalidad siga efectivamente simulada; el proyecto no puede representar pagos como confirmados si no lo están.
- Lemon/DALE y Binance comercial siguen bloqueados por provider authorization; billeteras y referidos preservados.
- Registro integral OTP/captura de referidos debe comprobarse con nueva cuenta voluntaria; ninguna cuenta, saldo o pago de ensayo se crean automáticamente.

## Cambios guardados
- Scripts global monedas `v161-global-currency-flags.js`, ajustes de registro `index.html`, marketing `v161-marketing-account.js`, migración Supabase `20261021110000_v161_marketing_optin_audit.sql`, tests V161 y continuidad; V160 y todas las garantías de saldos intactas.
