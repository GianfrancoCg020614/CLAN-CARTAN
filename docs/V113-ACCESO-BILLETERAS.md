# CLAN CARTAN V113 — Acceso y billeteras (18-10-2026)

## Implementación
La vista COBRA YA muestra una tarjeta compacta con saldo, estado, plan mensual de S/15, fecha de vencimiento y tres acciones: Activar, Recargar y Transferir. Se oculta la tarjeta duplicada de solicitud de autorización y el rótulo heredado V55. La tarjeta usa un diseño responsive común con el portal CLAN CARTAN y la ventana STREAM BULL'S.

La función cy_pay_subscription_test cobra SOLO saldo FICTICIO de la billetera COBRA YA, registra el asiento y la vigencia de 30 días y activa inmediatamente la membresía RESELLER. Si no existía, la crea y la activa dentro de la misma transacción. Impide dobles descuentos mientras el plan está vigente, bloquea suspensión y rol incompatible; el fallo revierte todo. Ya no requiere aprobación ADMIN por el pago descontado.

Para STREAM BULL'S se muestra saldo de la billetera y la opción de solicitar recarga; la afiliación de S/20 sigue activándose en su propia operación si el saldo disponible es suficiente. En CLAN CARTAN la sección Mis billeteras permite ver ambos saldos, transferir entre las billeteras del MISMO usuario y solicitar una recarga de prueba.

## Alcance de recargas (solo piloto)
No se habilitaron pagos reales, Yape, QR automático ni acreditación basada en capturas. Las recargas actuales son SOLICITUDES FICTICIAS y aún requieren aprobación antes de abonar el saldo. La activación automática se produce cuando el usuario confirma que se descuente un saldo que YA está disponible en su billetera. Para recargas reales deberá integrarse un procesador con comprobación verificable, idempotencia, conciliación y controles legales.

## Resguardo y pruebas
Respaldo: resguardo/v112-antes-billetera-v113-2026-10-18.
Migración Supabase: v113_atomic_cobra_self_activation_after_internal_wallet_payment.
Archivos de estilo y lógica: styles/v113-wallet.css y scripts/v113-wallet.js.

Sin efectuar descuentos en cuentas existentes. GitHub Actions comprobará sintaxis y consultas de solo lectura. Falta prueba punta a punta con cuenta ficticia autorizada y saldo para verificar visualmente la activación después de pagar. DNI CLAN CARTAN continúa manual; API DNI solo en clientes COBRA YA. No se cambiaron reglas de retiro, préstamo ni transferencias a terceros.
