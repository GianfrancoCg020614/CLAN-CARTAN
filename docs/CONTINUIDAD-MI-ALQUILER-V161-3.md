# MI ALQUILER — V161.3 (21-OCT-2026) · Parte 3/5

**Base preservada:** V161, V161.1 y MI ALQUILER V161.2. Rama `integracion/mi-alquiler-v161-3`, sin fusión a `main`, sin publicación en Cloudflare.

## Incluido

- Cobros de alquiler por día y mes, facturación de los períodos contratados y anulaciones de períodos futuros al cerrar un contrato (se conservan movimientos de auditoría).
- Abonos parciales con UUID de solicitud idempotente y saldo máximo comprobado por arrendador.
- Medidores de luz, agua y gas: primera lectura como base, consumo posterior = diferencia × precio, y registro histórico.
- Cuota/tarifa fija por servicio y mes, sin duplicación.
- Garantía separada de ingresos: recibido, devuelto, aplicado a deuda, retención justificada; jamás mezcla un depósito con renta.
- Gastos del RESELLER con categorías y unidad opcional. Gastos no se cargan a la deuda del inquilino.
- Suscripción de MI ALQUILER S/15 por 30 días **solo con bono promocional concedido por ADMIN**. Bonos no transferibles ni retirables. Billetera real en PEN, inicializada a cero y sin acreditación desde frontend.
- Backend Supabase: tablas RLS de lectura por propietario y escritura exclusiva por RPC con sesión validada, bloqueo si vence o se suspende la membresía, auditoría y restricciones de operaciones.
- UI V161.3 móvil en sección Finanzas, con ADMIN, saldos del contrato y del bono. Sin llamadas de terceros.

## Límites pendientes

- **NO habilitados** pagos comerciales con billetera Lemon/DALE ni Binance Pay, transferencias reales entre servicios, cobro de suscripción real, o envío automático WhatsApp. Estos requieren autorización, conciliación y validación auténtica.
- **NO** acreditar recarga por pantallazo, número de operación, declaración de usuario o mensaje WhatsApp.
- API Perú real, mensajes al número verificado que RESELLER registre, búsquedas y exportaciones adicionales se ejecutan en V161.4.
- Los registros financieros de un alquiler pertenecen al RESELLER: las billeteras CLAN CARTAN se usan únicamente para pagar la suscripción, jamás para cobrar la renta de terceros.

## Pruebas

- Migración Supabase aplicada con éxito; comprobada RLS en las tablas nuevas.
- Test SQL en `BEGIN ... ROLLBACK`: alquiler S/900 y dos extensiones; abono S/1000 retransmitido sin duplicado; luz base 10 y lectura 20 a S/2 = S/20; internet fijo S/15; garantía S/200, aplicación S/50; saldo contrato S/1685; gasto S/60 separado.
- Cuenta RESELLER ajena: denegación de lectura RLS y de cobro por RPC.
- Bono ADMIN S/30 y activación voluntaria S/15 por 30 días; saldo real cero.
- Sin datos ficticios persistentes; mantener pruebas futuras con rollback.

## Siguiente versión

**V161.4:** WhatsApp por el número individual del inquilino; API Perú protegido por backend; alertas y reportes. **V162:** pruebas finales e integración previa a publicación, previa aprobación del titular.