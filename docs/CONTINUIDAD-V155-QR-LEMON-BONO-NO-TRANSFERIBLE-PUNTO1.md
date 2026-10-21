# CLAN CARTAN V155 · Lemon solo QR + bono ADMIN intransferible · Punto 1

Fecha: 20 OCT 2026, Perú.

## Cambio confirmado de visibilidad
- En `scripts/v146-personal-manual-topups.js` se mantienen QR Lemon/DALE y Binance, y el ID 1276635702 de Binance.
- El teléfono de Lemon y su CCI no se muestran en las leyendas, encabezados ni formulario público de recarga. Se eliminó el botón heredado de copiar teléfono en `scripts/v136-manual-recharges.js`.
- La función `cc_manual_recharge_public_status` ya no devuelve `destination_label` privado al cliente: sustituye el dato por instrucción genérica para verificar destinatario en la aplicación. La dirección del QR solo se expone cuando el comercio está habilitado.
- Un QR de pago es decodificable por naturaleza: no promete confidencialidad del número de cuenta codificado; la medida elimina su visualización directa como texto.
- Los QR personales existentes se conservan como referencia; no implican autorización de cobro comercial ni acreditación automática.

## Bono gratuito administrado por ADMIN
- `cc_admin_grant_welcome_balance` exige ADMIN; destinatario RESELLER COBRA YA con correo confirmado; importe S/0.01–S/1000, motivo y solicitud irrepetible.
- Saldo entra a `cc_cobra_welcome_bonus_wallets`, NO a `cc_real_service_wallets`; no es depósito, ingreso ni comisión por referido.
- `cc_activate_cobra_welcome_bonus` permite gastar S/15 del bono únicamente para activar COBRA YA por 30 días.
- `cc_transfer_real_balance` maneja solo saldo pagado `cc_real_service_wallets`; por tanto el bono gratuito ADMIN **no se transfiere** a Stream Bull's, otro usuario ni a la billetera real, y tampoco se retira.
- Prueba reversible SQL: ADMIN concedió S/15 de bono a RESELLER de prueba, RESELLER intentó transferir S/15 del bono, se rechazó por insuficiencia de saldo real. Se hizo ROLLBACK; no quedó ningún bono, ingreso ni transferencia de prueba. RLS de bonos es lectura de titular únicamente, sin INSERT/UPDATE para authenticated.
- Esta regla no modifica los bonos por referidos, que son distintos y conservan sus reglas anteriores.

## Punto 1, NO punto 2
- No se ha comprobado una transacción monetaria real; conservar protección V153 contra recargas duplicadas.
- Configuración de recaudación comercial Lemon/DALE sigue inhabilitada y su QR autorizado no está registrado; los QR personales son solamente referencias visuales.
- Suscripción real de S/15 COBRA YA permanece deshabilitada.
- Para finalizar el punto 1 se requiere método de cobro comercial autorizado por proveedor, depósito real del RESELLER, confirmación externa ADMIN, una acreditación y comprobación de movimientos, contabilidad y auditoría. No afirmar prueba real completada.
