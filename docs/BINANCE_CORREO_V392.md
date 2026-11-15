# V392 · Lectura del aviso «Pago recibido correctamente»

Base web V391 `e1ab0edaa01b2edddd69b2a410b41bb652285f73`. Respaldo Git completo `/workspace/clan-cartan-before-v392.bundle`. Copia de la función desplegada y definiciones de correo: `/workspace/backups/recargas-mail-antes-v392.json`. No se modifican fórmulas, billeteras, solicitudes, roles, tasas ni reglas de acreditación.

## Formato recibido y corrección

La captura muestra remitente de correo `do-not-reply@ses.binance.com`, asunto `[Binance] Pago recibido correctamente`, nombre visible del pagador, fecha UTC e importe como `5 USDT`. TLS visible en una captura no verifica DKIM/DMARC ni la identidad del pagador.

El lector reconoce ahora USDT antes o después del número y conserva ocho decimales exactos, sin convertir ni redondear a céntimos. Dos cantidades USDT diferentes que antes se redondeaban al mismo valor se tratan como ambiguas. PEN conserva la normalización existente utilizada por Lemon. Se conservan extracción de pagador, HTML/Gmail, exclusión de OTP y credenciales, lista de remitentes exactos y comprobación de autenticación del correo original.

Los ejemplos de tests contienen identidades sintéticas. No se copia el nombre, destinatario ni pago real de la captura a los fixtures públicos.

## Conservación del código vigente

La función `cc-recharge-mail` desplegada estaba en versión 17 y tenía correcciones no presentes en GitHub: soporte HTML y pagador, errores JSON/cuerpo vacío, y configuración de orígenes ya existente. Se recupera ese código antes de modificar el lector, para que una publicación del repositorio no deshaga las correcciones de Lemon. El handler sincronizado se conserva sin cambios respecto de la versión 17; la modificación funcional nueva está en `_shared/payment-notices.mjs`. Solo se despliega `cc-recharge-mail`, conservando `verify_jwt=false` y su autenticación propia existente. No se despliega ni modifica la función de entregas STREAM.

## Alcance y bloqueo de la acreditación automática Binance

El servidor ya concilia Lemon automáticamente con remitente autenticado, pagador, importe PEN, plazo, transacción única y una solicitud coincidente. Esa lógica SQL se conserva íntegra.

La parte visible de la captura Binance no contiene un identificador de operación ni REC. El lector no inventa una transacción a partir del ID del correo, nombre o importe. La consulta de avisos muestra metadatos; la conciliación en servidor decide el crédito. Los nuevos avisos Binance quedan para revisión: esta entrega NO habilita su acreditación automática.

Para terminar la automatización pedida deben verificarse datos que permitan asociar el pago a una única solicitud y prevenir repetición de la misma transferencia, además de fijar en servidor USDT, tasa y PEN anunciados. Si el correo completo o el detalle de Binance Pay incluye número de operación/REC u otro identificador fiable, debe revisarse. No se promete identificación financiera solo por nombre, monto y hora.

El QR existente `assets/qr-binance-personal.png` fue decodificado localmente: enlace oficial `https://app.binance.com/uni-qr/812BvNys`. Ya lo usan las ventanas de recarga. Verificar el dominio del QR no verifica titularidad ni confirma un pago.

## Verificación y reversión

23 pruebas Node: 10 del lector y acceso a correo existentes y 13 del formato Binance, ocho decimales, importes ambiguos, remitentes, DKIM/DMARC, HTML/Gmail y conservación de Lemon. Sin transferencias, pagos ni créditos reales de prueba. Antes de desplegar se verifica que la función siga en la versión/huella revisada; después se comprueban los archivos desplegados.

Registrar el remitente exacto de Binance en la configuración del buzón ADMIN conectado permite leer esos avisos; no modifica ni habilita la conciliación financiera Binance. Los procesos no envían mensajes. Cualquier aviso sin correspondencia fiable permanece sin acreditar.

Reversión: desplegar los tres archivos originales de `cc-recharge-mail` guardados en el respaldo (versión 17) y, si esta entrega agregó el remitente, quitar solo ese remitente de la configuración. No borrar avisos, pagos ni movimientos históricos. La web conserva V391 porque no se publica como terminada una recarga automática Binance que aún requiere datos de identificación.
