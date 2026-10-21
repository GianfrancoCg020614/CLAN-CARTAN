# CLAN CARTAN · MI ALQUILER V162 · integración final de desarrollo

Fecha 21-OCT-2026 · Rama `integracion/mi-alquiler-v162` · Base preservada V161 y V161.1

## Integración que sí existe

- V161.1: cuarta tarjeta MI ALQUILER y acceso con la sesión compartida de CLAN CARTAN.
- V161.2: habitaciones y locales, inquilinos, contratos, historial, RLS por RESELLER.
- V161.3: cobros, saldo contractual, lecturas medidores, tarifas fijas, gastos, garantías no consideradas ingresos y bono ADMIN para la suscripción de 30 días.
- V161.4: WhatsApp al teléfono del inquilino registrado por su RESELLER, aceptación de avisos, panel de vencimientos, búsqueda tolerante a errores, XLSX y PDF desde impresión, Edge API Perú bajo JWT.
- V162: referencias idempotentes de WhatsApp vinculadas a contrato/fecha/teléfono; cuarta opción en formulario de registro; códigos `ALQUILER1...` validados contra una cuenta activa o ADMIN; captura de referidos en tabla separada sin membresías ni bonos gratuitos; botón de copiar enlace de invitación.

## Seguridad / verificación

- SQL aplicado en Supabase: `v162_mi_alquiler_notice_idempotency`, `v162_mi_alquiler_referrals`.
- Consultas de auditoría: 14 tablas existentes con RLS; 0 tablas MI ALQUILER con escritura directa para `anon` o `authenticated`.
- Validación RPC `ma_validate_invitation_code`: rechaza `ALQUILER0` y `COBRA1`; autorizada para validar un código antes del registro, retorna sólo `valid, business`. Esta función es SECURITY DEFINER intencionalmente porque las cuentas no son públicas; revisar advisory de Supabase sin eliminar el control de acceso.
- En Supabase, 0 alquileres, 0 movimientos financieros, 0 avisos y 0 atribuciones de prueba persistidos tras auditoría.
- Sintaxis de cuatro scripts JavaScript verificada localmente; test de utilidades V162 (formato WhatsApp, fechas, XLSX con DNI como texto) pasó.
- Pruebas de sesiones, contratos y movimientos cross-account de las versiones anteriores ya fueron efectuadas antes en transacciones reversibles.
- Un intento adicional de prueba transaccional V162 fue bloqueado por controles del entorno: NO se considera prueba superada.
- Las modificaciones de registro `index.html` y el workflow se mantienen sólo en esta rama y deberán aprobar pruebas CI en PR antes de fusionar.

## Bloqueadores previos a publicación comercial

1. API Perú: función `ma-verify-dni` desplegada con JWT pero **no se ha confirmado llamada real** con `APIPERU_TOKEN`, cuotas, autorización ni respuesta de un DNI proporcionado legítimamente. Registro manual permitido.
2. Mensajería: funciona enlace de WhatsApp al número individual y registro de apertura. **NO existe envío automático desatendido** ni confirmación de entrega; ello requiere WhatsApp Business Platform, consentimiento y configuración.
3. Suscripción S/15: bonificaciones promocionales y renovación por bono están implementadas; **no existe cobro real conciliado** de Lemon/DALE/Binance/Supabase en MI ALQUILER. Nunca marcar un pago por simple captura o comprobante.
4. Pruebas con cuentas ADMIN/RESELLER reales autorizadas, cierre completo de registro y capturas de referido sobre entorno de pruebas sin tocar datos de producción.
5. Auditoría de seguridad de funciones SECURITY DEFINER expuestas, control de cuota, despliegue HTTPS, recuperación y política de privacidad.
6. Fusión a `main`, Cloudflare y acceso público: **pendiente**. No convertir la rama draft en lanzamiento sin validar bloqueadores.

## Regla de continuidad

La V162 es una integración técnica preparada para revisión; no está publicada comercialmente. STREAM BULL'S, COBRA YA y MI COCHERA siguen intactos. No usar billeteras de alquileres para pagar obligaciones privadas ni mover bonos a otros módulos. No habilitar pagos reales ni WhatsApp automático hasta certificación.
