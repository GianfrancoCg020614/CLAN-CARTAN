# CLAN CARTAN V106 — registro OTP y DNI con API Perú
Fecha: 17 de octubre de 2026.
## Cambios desplegados
- GitHub: index.html actualizado con seis casillas para código de correo; POST /auth/v1/verify, reenvío desde /auth/v1/resend. El proveedor Supabase debe usar plantilla de confirmación {{ .Token }} en vez de enlaces para enviar código.
- En COBRA YA: DNI consultado primero entre clientes del prestamista, y después vía Edge Function cc-consulta-dni cuando el prestamista confirma autorización. Autocompletado de nombre desde resultado real; si no está disponible, ingreso manual.
- WhatsApp y correo de cliente ahora se pueden guardar vacíos y no muestran la etiqueta «opcional».
- Supabase: cy_clients.email, cuota mensual compartida, registro de consultas sin guardar el DNI y límite de 20 consultas por usuario en 24 h. Se reserva hasta 100 solicitudes por mes calendario (zona Lima); llamadas fallidas también consumen reserva para no superar el máximo.
- Supabase Edge Function cc-consulta-dni desplegada con JWT obligatorio, autorización mediante roles y llamada desde backend. Sin token de API Perú, responde manual y no consulta.
## Pendientes externos necesarios
1. Configurar APIPERU_TOKEN como secreto de Edge Function tras obtenerlo legalmente en https://app.apiperu.dev/dashboard; jamás escribirlo en GitHub o chat.
2. Confirmar que el plan otorgue 100 solicitudes mensuales, autorización de uso, endpoint y formato reales. El número 100 es un tope preventivo local, no verificación del saldo del proveedor. Verificar también el momento de renovación si el proveedor usa otra zona horaria o ventana.
3. Supabase Authentication > Email Templates > Confirm signup: reemplazar enlace por un diseño de código con {{ .Token }} y verificar proveedor SMTP, cuota de correo, URL y Redirect URLs.
4. Confirmar DNS, HTTPS y funcionamiento de https://www.clancartan.com/ en Cloudflare Pages.
5. Probar con cuenta real el alta, código, reenvío, límite de consultas, permisos y un DNI cuyo titular haya dado autorización.
6. Revisar y aprobar documentos legales antes de habilitar servicio comercial con datos personales.
## Importante
Cobra Ya gestiona préstamos de terceros, no otorga préstamos. Sin movimientos reales; billeteras únicamente para pagar servicios internos, sin retiros, pagos de préstamos ni transferencias a otros usuarios.