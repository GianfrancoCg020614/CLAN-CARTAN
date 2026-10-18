# CLAN CARTAN V116 — Códigos por plataforma y recargas a un clic (18-10-2026)

## Registro e invitación
- El formulario de CLAN CARTAN sigue con DNI manual y **código de invitado opcional**. La confirmación de correo requiere el OTP de 8 dígitos. No es necesario introducir ni pegar un código para registrarse.
- La base ahora emite **exactamente un código único por usuario y plataforma existente**: secuencias independientes COBRA1, COBRA2… y BULL1, BULL2…; los códigos no dependen de la afiliación ni del rol ni de tener saldo.
- Se conserva COBRA1–COBRA6 y se asignó BULL1–BULL6 a los seis usuarios anteriores, sin cambiar sus cuentas, claves, registros de referidos o servicios.
- En el portal, la sección **Tus códigos personales** muestra las dos plataformas, el código de cada una, **Copiar código** y **Copiar enlace**. Un nuevo negocio requerirá configurar su serie de emisión y luego se mostrará automáticamente en la misma lista.
- El backend conserva una sola atribución de invitación por registro, evitando incentivos duplicados cuando un usuario tiene dos códigos.

## Interfaz principal
- **Solo la cabecera de CLAN CARTAN** ofrece Ingresar y Crear cuenta. Se quitó Crear cuenta de la tarjeta COBRA YA.
- La zona del perfil autenticado muestra identidad, **dos saldos separados** (COBRA YA y STREAM BULL'S) y **un único botón Recargar**.
- Recargar abre directamente la sección de solicitudes de la billetera; las cantidades **son saldo de prueba**. No se realiza acreditación sin verificación, ni retiro, ni transferencia entre distintos usuarios.
- Se retiró el botón redundante 'Mis billeteras · Transferir' de la portada; las transferencias permitidas siguen disponibles dentro de las billeteras.
- Se mantiene el diseño responsivo y la acción para copiar los códigos/enlaces.

## Resguardo y pruebas
- Rama de recuperación del código anterior: \`resguardo/v115-antes-codigos-y-perfil-v116-2026-10-18\`.
- Migración ejecutada en Supabase: \`v116_one_invitation_code_per_user_per_business\`. Su SQL está versionado en \`supabase/migrations/20261018060000_v116_codes_each_business.sql\`.
- Tras la migración: 6 cuentas, 12 códigos (6 COBRA + 6 BULL), 0 duplicados por pareja usuario/plataforma, 0 pares faltantes.
- CI valida la sintaxis, la portada, el diseño y las RPC públicas COBRA1/BULL1; lectura privada de códigos solo para cuenta autenticada.
- No se realizaron recargas, descuentos, préstamos, mensajes externos, altas de usuarios ni compras reales en las pruebas.

**Pendiente:** la compra real del catálogo STREAM BULL'S depende de pasar los productos/stock/pedidos del modo demostración a operaciones transaccionales en la base, y de la confirmación de pagos externos. Hasta entonces, no descontar saldos por un producto sin stock real verificado. COBRA YA sigue siendo software de préstamos ajenos, no prestamista.
