# CLAN CARTAN E.I.R.L. — PUNTO DE CONTINUIDAD V130
Fecha: 18 de octubre de 2026 (Perú). Último estado verificado en el repositorio: V130, commit `85dfdfef76467aed33a52355433ab637872b48aa`. Este documento no incrementa la versión funcional.

## PARA RETOMAR EN OTRO CHAT
Mensaje recomendado: «Continuamos CLAN CARTAN desde V130. Lee `docs/CONTINUIDAD-V130-2026-10-18.md` en `GianfrancoCg020614/CLAN-CARTAN`, revisa el estado vivo de GitHub y Supabase y continúa sin borrar datos ni reactivar recargas manuales».

## Identidad y arquitectura
- Operador tecnológico: **CLAN CARTAN E.I.R.L.**; correo: **clancartan@gmail.com**. Marca raíz **CLAN CARTAN**, subnegocios **COBRA YA** (gestión de préstamos de terceros, no prestamista) y **STREAM BULL'S** (catálogo de productos digitales, con acceso público a precios generales y beneficios para usuarios con acceso).
- Dominio canónico: https://www.clancartan.com/ ; Cloudflare Pages: https://clan-cartan.pages.dev/ ; repositorio GitHub: https://github.com/GianfrancoCg020614/CLAN-CARTAN (rama principal `main`).
- Supabase: proyecto **COBRA-YA** / ID `pqalxtrcyrpmwqdlibqd`, región São Paulo. Cloudflare Pages para front-end. Correo y acceso únicos para los dos negocios; el registro general CLAN CARTAN es **manual**, sin consulta a RENIEC.
- La marca, logotipos y marketing deben permanecer visibles. Portada, sesión/cambio de cuenta con iconos, navegación sencilla con pocos clics. V128: COBRA YA diseño premium verde/turquesa y emblema de cobra. V129: STREAM BULL'S diseño premium turquesa neón, localizado a su portada/catálogo (no degradar).
- La numeración V119 → V120 → V121/V122… → V129 → **V130** es acumulativa. Los títulos de README históricos pueden estar desactualizados: el punto de continuación definitivo es este documento y GitHub HEAD actual.

## Registros, códigos y perfiles
- Alta única: nombre completo, documento, ubicación internacional, país/código de teléfono, WhatsApp, moneda, email, contraseña, aceptación de términos y privacidad y código de invitado **opcional**.
- Códigos de recomendación por negocio: `COBRA1`, `COBRA2`, … y `BULL1`, `BULL2`, …; mostrar códigos y botones «copiar código» y «copiar enlace» al usuario autorizado. Asignación consecutiva/irrepetible según las reglas del backend vigente; verificar cualquier diferencia antes de modificar código.
- Autenticación Supabase con correo/OTP y SMTP Brevo. No divulgar claves ni tokens. Turnstile requiere sitekey y comprobación servidor real: las capturas por sí solas NO prueban que esté configurado.

## COBRA YA
- Solo roles ADMIN y RESELLER; clientes/prestatarios no necesitan cuentas. Cada RESELLER administra exclusivamente su cartera conforme a RLS; alta, edición, vista de cronogramas, abonos, extensiones y filtros Todos / Por vencer / Vencidos / Pagados. No borrar registros de clientes para «corregir» errores.
- Interés simple mensual sobre capital inicial (ej. S/1000 al 10% → S/1100 a 1 mes; S/1200 a 2 meses). Vencimientos, garantías opcionales, moneda, notificaciones WhatsApp por vencer/vencidos previstas; confirmar qué automatizaciones efectivamente están activas.
- Desde V119: sin clientes muestra estado vacío y botón «Agregar cliente», DNI primero, ingreso manual si API Perú falla o se agota el cupo; formulario de edición conservando teléfono, correo, dirección, observaciones, préstamos, abonos e ID.
- V120: desde «Verificar DNI ahora», después de marcar autorización, consultar API Perú y corregir únicamente nombre devuelto distinto **sin segunda confirmación**; nunca borrar ni sobrescribir correo, teléfono ni otro dato que no provenga del proveedor. No verificaciones automáticas en segundo plano ni consumo de cupos sin intervención. La comprobación integral con RESELLER autorizado y cupo efectivo sigue pendiente.
- Suscripción de prueba previa S/15/30 días activa por descuento de billetera de PRUEBA sin aprobación ADMIN; NO tratar ese flujo ficticio como facturación real hasta migración segura.

## STREAM BULL'S
- Catálogo público visible sin login; con sesión precios/beneficios de afiliado conforme a estado real de backend. Compra con pocos botones («COMPRAR», WhatsApp en caso de falta de stock), descuento automático SOLO tras cobro legítimo del saldo válido, no de un pago externo no verificado.
- Afiliación de prueba anterior S/20 por una sola vez; evitar presentarla como cargo real si el backend usa funciones `_test`. Beneficios/promociones y códigos BULL independientes.

## Billeteras y pagos — DECISIÓN DEFINITIVA V130
- Dos billeteras internas del mismo usuario: COBRA YA y STREAM BULL'S. Solo permiten consumir servicios de las plataformas y transferirse entre sí bajo el MISMO usuario. NO retiros, NO pagar préstamos con saldos internos, NO transferencias entre usuarios. Bonos por referidos configurables originalmente S/5 por mensualidad efectivamente cobrada y autorizada, sujetos a reglas comerciales.
- Métodos de recarga deseados: **Lemon/DALE** (PEN) y **Binance Pay** (USDT). El titular compartió imágenes de QR en el chat anterior. Número DALE registrado en versiones anteriores: `923319637`. Identificador público de Binance: `User-f81cdb6a`. Cualquier QR/identificador debe verificarse antes de aceptar dinero; no insertar ni exponer credenciales secretas.
- Decisión **inequívoca**: NO EXISTE MODALIDAD MANUAL; usuario y administrador NO pueden solicitar, aprobar ni acreditar recargas manualmente. UNA SOLA MODALIDAD, «Recarga automática», para **ambas billeteras**. El usuario elige su billetera y Lemon/DALE o Binance; el saldo solo aumenta tras pago CONFIRMADO de forma independiente por una integración autenticada del proveedor y en operación atómica/idempotente. No usar capturas, SMS de un pagador ni un botón «Ya pagué» como evidencia.
- **Situación real:** aún NO hay webhooks/API verificados de ingresos Lemon/DALE o Binance Pay operativos. Por lo tanto la recarga automática real permanece **inhabilitada** (fail-closed); no sugerir a clientes enviar fondos esperando acreditación automática. Se necesita acceso legítimo a proveedor de confirmación y pruebas de extremo a extremo para habilitarla. Las billeteras y movimientos de prueba NO equivalen a dinero real ni deben mezclarse.
- Supabase contiene `cc_real_topup_orders`, `cc_real_service_wallets` y controles de transacciones, pendientes de proveedor/conciliación verificable. La función `cc_credit_verified_real_topup` existe con requisitos de verificación, pero su existencia NO demuestra recepción de eventos externos ni autoriza acreditaciones arbitrarias.
- V130 ejecutó en Supabase migración `v130_only_verified_automatic_recharges`: revocó ejecución a `authenticated`, `anon` y `public` de `cc_request_test_topup`, `cc_admin_review_test_topup`, `cc_create_pending_real_topup` y `cc_create_pending_usdt_topup`; creó RPC `cc_auto_topup_method_status` visible solo para sesión autenticada, que devuelve ambos proveedores deshabilitados por no tener verificación operativa. **Se comprobó en consulta SQL que las cuatro RPC de solicitudes/aprobación devuelven execute=false a esos roles**. No reabrir antes de conectar proveedor.
- GitHub V130 modificó `scripts/v122-recharges.js` para mostrar únicamente flujo automático y bloquear botón si método no está activo; redirige antiguos botones desde ambos negocios a ese módulo; `styles/v122-recharges.css` oculta controles heredados de aprobaciones y recargas de prueba. Commits de desarrollo: `75e7744f78c81a2071eeb1b2c86dd2da925ecf65`, `8138342d6da1446b74e850a7e4c8e05f9f0169b4`, `85dfdfef76467aed33a52355433ab637872b48aa`.
- **Importante:** los cambios GitHub V130 existen; la versión V130 efectivamente desplegada y la experiencia completa de navegador con cuenta autenticada NO se han comprobado aún. Al volver, verificar index/cache/Cloudflare, enlace único de recarga y que el panel no ofrezca aprobaciones manuales. No afirmar que el cobro 100% automático está operativo.
- Cotización USDT/PEN no debe inventarse. Se requiere referencia vigente, capacidad ejecutable, tasa, vencimiento y concordancia de moneda; si no está disponible, Binance no acepta pagos.

## Prioridades técnicas al continuar
1. Leer este punto de continuidad y comparar con HEAD del repositorio, sin retroceder a una versión histórica.
2. Verificar el despliegue de Cloudflare: marcador V130, cargado de JS/CSS correspondiente (versionado de caché), menú unificado «Recarga automática» en COBRA YA y STREAM BULL'S, sin solicitud/aprobación manual visible.
3. Auditar que el backend tampoco permita acreditación por rutas heredadas indirectas o funciones `SECURITY DEFINER`; preservar RLS, usuarios, capital, abonos, saldos y créditos ya registrados.
4. Conseguir documentación real del proveedor comercial con comprobación automatizada de depósitos entrantes, referencia única, firma/webhook, moneda, monto, destino y ID no duplicable; si no existe, mantener recargas desactivadas, sin modalidad manual sustituta.
5. Implementar recepción backend idempotente con verificación de autenticidad, conciliación con orden y destinatario y créditos en transacción; pruebas pagos legítimos/duplicados/falsificados/incompletos/expirados/concurrencia/reembolsos. No confirmar producción hasta pruebas satisfactorias.
6. Separar por completo los saldos de prueba, saldos reales, pagos y gastos; revisar requisitos comerciales/legales/tributarios de cuenta y modelo de bienes digitales en Perú. Tras habilitación real, actualizar los textos de interfaz que actualmente indican «prueba» **solo donde el dinero sea verdaderamente real**.
7. Para COBRA YA, terminar prueba autenticada de edición DNI sin gastar consultas reales sin autorización; confirmar condiciones de uso/cupo de API Perú.
8. Conservar diseños y elementos comerciales de V128-V129, funcionamiento de invitaciones/códigos y portal único; simplicidad y pocos botones.

## Protección y backups
- No modificar/eliminar filas de producción ni otorgar aprobación financiera sin evidencia autenticada. Antes de migraciones importantes generar copias restaurables y verificar RLS. GitHub preserva el código, NO es respaldo integral de Supabase Auth/datos/secrets.
- El material previo está en `docs/` por versión, con historias de V119, V121, V122 y V129. Este documento unifica decisiones vigentes y marca pendientes, sin falsificar pruebas.
