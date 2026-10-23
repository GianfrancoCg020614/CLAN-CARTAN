# CLAN CARTAN V163.5 — Interfaz unificada de cuatro negocios

## Cambios ejecutados en la rama de integración
- Inicio y descripciones coherentes de STREAM BULL'S, COBRA YA, MI COCHERA y MI ALQUILER.
- Grilla visual premium responsive y consistente; logo oficial preservado.
- Control claro/oscuro accesible persistido **solo en almacenamiento local para preferencia visual**, nunca tokens, contraseñas ni saldos.
- Registro: botón inactivo hasta aceptar los Términos y la finalidad necesaria de tratamiento de datos; la publicidad se solicita por separado, nunca preseleccionada ni impuesta, y puede revocarse en "Preferencias de comunicaciones" después del alta. Se anota aceptación en metadata además del registro legal preexistente.
- Invitaciones BULL1–BULL4, COBRA1–COBRA4, COCHERA1–COCHERA3 y ALQUILER1–ALQUILER3 se muestran como **ejemplos**. Cada cuenta puede compartir exclusivamente los códigos únicos realmente asignados y verificados por el servidor. El perfil MI ALQUILER aporta su código si `ma_accounts` lo contiene; si aún no existe se avisa, sin inventar.
- Billetera unificada **de visualización**: consulta por titular `cc_real_service_wallets` para cuatro servicios y muestra una suma en PEN más subbalances. No mezcla bonos, pruebas o depósitos pendientes; no crea movimientos ni nuevas billeteras; conserva la capacidad existente de transferencias auditadas entre saldos reales.
- Marketing sigue bajo `cc_marketing_consents` y función `cc_set_my_marketing_consent` de usuario.
- No se habilitó ningún cobro, SMS, WhatsApp automático, CAPTCHA de servidor ni cambios en producción.

## Recomendación arquitectura financiera
**Una cuenta + un resumen de saldo real + cuatro subbilleteras por servicio, en lugar de colapsar los libros de contabilidad.** La separación conserva trazabilidad, conciliación, reversos, permisos y conciliación de proveedores. El usuario percibe una sola billetera porque puede consultar el total y transferir entre servicios propios mediante RPC segura existente.

**Bonificaciones por referidos:** son promocionales hasta que se cumplan condiciones verificables: referido auténtico, elegibilidad, compra/activación comprobada, ventana antifraude y operación idempotente aprobada y financiada. Una vez efectivamente otorgada como crédito monetario, se registra en un libro de origen **RECOMPENSA_REFERIDO_APROBADA** y se acredita al saldo real verificable con contrapartida auditada; no basta registrar un enlace ni un referido para convertirlo en fondos y no se duplica por varias plataformas. No se modifica el backend financiero ni saldos existentes en este PR.

**Bonos de bienvenida / ADMIN:** exclusivamente para activar o renovar COBRA YA, MI COCHERA y MI ALQUILER; nunca STREAM BULL'S. No se convierten en dinero ni se transfieren, retiran o aplican a compras. Mantener ledger distinto, caducidad, autorización ADMIN, reversos e idempotencia. Las políticas comerciales deben validarse con un entorno aislado antes de desarrollar migraciones.

## Pruebas y publicación
- Ejecutar `node scripts/check-v164-portal.mjs` y la CI histórica.
- Comprobar en móviles y escritorio tema, consentimiento de datos, registro no iniciado sin aceptación, mantenimiento del login, catálogo, recibos, accesibilidad, lista de códigos propios y consultas RLS.
- Ejecutar 24 E2E de MI ALQUILER en staging protegido antes de fusionar a `main` y activar servicios externos.
- Conservar PR #31, ramas respaldo, datos históricos y esquema V162.1. No aplicar migración experimental V163.
