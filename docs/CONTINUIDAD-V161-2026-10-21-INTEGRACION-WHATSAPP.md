# CLAN CARTAN V161 — Continuidad y preservación (21-10-2026)

## Instrucción vigente
Guardar, integrar y preservar los avances de CLAN CARTAN para COBRA YA, STREAM BULL'S y MI COCHERA. Una cuenta compartida, módulos y contabilidades separados. No eliminar clientes, historiales, préstamos, pagos, bonos, saldos, invitaciones, suscripciones ni reglas de seguridad.

## Última integración: WhatsApp vinculado al RESELLER y su cliente
- COBRA YA: archivo `scripts/v119-clients.js`, commit `dc8b338fa542570e00f28dd6f2a4bcc3810b2850`; botón "WhatsApp al cliente" en formulario de corrección, toma `phone` guardado para ese cliente, prepara mensaje para su cuenta, sin envío automático.
- MI COCHERA: archivo `scripts/v158-mi-cochera.js`, commit `e6875d119c61f272bc09b4ae0aaf859418caa9e3`; botón "WhatsApp · Cobrar" en carrito, usa teléfono guardado del propietario o, si falta, del trabajador; incluye carrito y deuda calculada. Sin envío automático.
- No confundir teléfono del destinatario cliente con número ADMIN destinado a comprobantes de recargas.
- Pendiente: prueba de ambos botones desde el dominio público, revisión de casos sin teléfono o numeración internacional y notificaciones específicas de vencimiento.

## Otras piezas V161 preservadas
- API Perú: funciones existentes de Supabase `cc-consulta-dni` y `mc-verify-dni`, autorización automática según membresía activa, cuota compartida 100/mes y controles por usuario. Botones DNI añadidos a COBRA YA y MI COCHERA; prueba real con DNI autorizado pendiente.
- Monedas con banderas: selector compartido `scripts/shared-currency-selector.js` cambiado a bandera como imagen (commit `8dcbaeb9c3279071e7c0da720af00fdc43ca02b5`), cargador `scripts/v160-invitation-register.js` actualizado con versión 162 (commit `38a08c7a667a0b3f9267d80972166df64742d8c7`). Falta verificar despliegue real y visualización en los tres módulos.
- Referidos: códigos COBRA#, BULL# y COCHERA#, precarga de invitación y RPC de validación presentes; pendientes de prueba integral.
- Billeteras: saldo real y bono segregados; bonos no transferibles ni retirables; transferencias solo entre propias billeteras con dinero real autorizado. Sin acreditar recargas no verificadas.
- Suscripciones: S/15 por 30 días, renovación voluntaria, bloqueo al vencimiento, datos históricos preservados; pruebas reales pendientes.
- Panel ADMIN, auditoría y contabilidad: piezas existentes y compartidas preparadas, integración completa y QA aún pendientes.
- Recargas: Lemon/DALE personal y Binance Pay USDT, acreditación únicamente tras verificación real y prevención de duplicados. No habilitar cobros automáticos no probados.

## Alcance de la actualización
Este registro incorpora los cambios de código existentes al plan de integración, sin afirmar integración universal final, publicación confirmada ni pruebas E2E. No se han creado ni cambiado transacciones, saldos, usuarios o información personal. Conservar versiones y respaldar fuente completa antes de consolidar frontend.

## Próximas verificaciones
1. Despliegue de banderas de moneda y botones de WhatsApp.
2. Pruebas con clientes y cuentas RESELLER autorizadas, sin enviar mensajes reales sin acción del operador.
3. API Perú con DNI autorizado y control de cuota.
4. Referidos, billeteras, suscripciones y panel ADMIN de extremo a extremo.
5. Recargas reales con conciliación y auditoría antes de habilitar automatismos.
