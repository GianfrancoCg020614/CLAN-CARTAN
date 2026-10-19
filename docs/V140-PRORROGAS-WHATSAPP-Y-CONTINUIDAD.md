# CLAN CARTAN E.I.R.L. — V140: prórrogas claras y WhatsApp profesional
Fecha: 19 de octubre de 2026 (Perú). Acumula V139 y todos los cambios previos sin borrar datos.

## Prórrogas COBRA YA
- Se reemplaza el prompt de introducir una cifra por **selector táctil de opciones +1 mes, +2 meses … hasta +12 meses**, limitado a un máximo de 120 meses totales.
- El cuadro muestra claramente plazo anterior, ampliación elegida, **plazo TOTAL resultante**, fecha de vencimiento anterior y nueva, y **contador actualizado de días** al cambiar el selector, antes de guardar.
- Confirma mediante la RPC existente `cy_extend_loan_months` (aplicada desde V139, atomicidad y registro de prórroga); no crea otro préstamo ni mueve fondos.
- Se conserva el historial de préstamos y abonos, la fecha, ID, RLS y reglas financieras. No se aplica interés nuevo por la ampliación: cualquier interés adicional debe pactarse y registrarse expresamente en un proceso distinto.
- El contador de los filtros Todos/Por vencer/Vencidos se recalcula al refrescar desde Supabase tras el guardado.

## Mensajes WhatsApp
- Se reformatea **Inicio de préstamo / Próximo a vencer / Vencido** con títulos diferenciados, emojis Unicode, campos de capital, tasa, plazo total, saldo o monto, moneda y fecha de vencimiento real según el caso.
- Se agrega enlace oficial completo **https://www.clancartan.com/** y frase invitando a descubrir los servicios digitales de CLAN CARTAN E.I.R.L.
- El enlace es de marketing público: los prestatarios **no** tienen cuenta ni acceso a su préstamo en el sistema. Los pagos son gestionados directamente por el prestamista; no pasan por billeteras CLAN CARTAN.
- WhatsApp usa `encodeURIComponent` para pasar texto Unicode y saltos de línea, sin prometer envíos automáticos (se abre mensaje preparado para que el prestamista lo envíe).
- No se cambia el receptor del WhatsApp ni se exponen nombres/teléfonos en enlaces públicos de CLAN CARTAN.

## Continuidad y verificación
- Resguardo: `resguardo/v139-antes-whatsapp-v140-20261019`.
- Desarrollo: `dev/v140-whatsapp-y-prorrogas`.
- Pruebas: `scripts/check-v140-cobra-whatsapp.mjs` junto a validaciones históricas.
- Las recargas Lemon/DALE, Binance y manuales no se activan ni se alteran. Mantener todas las decisiones de seguridad, respaldos y documentación V130–V139.
- Pendiente tras despliegue: prueba visual móvil con RESELLER y WhatsApp configurado, sin modificar datos de terceros ni realizar abonos reales sin autorización.
