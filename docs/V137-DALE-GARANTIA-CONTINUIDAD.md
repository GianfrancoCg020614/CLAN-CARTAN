# CLAN CARTAN — V137: DALE/LEMON, garantía opcional visible y continuidad

Fecha: 19 de octubre de 2026, Perú. Hereda y conserva íntegras las reglas V119–V136, especialmente `docs/V136-MANUAL-REAL-Y-CONTINUIDAD.md`.

## Requisitos que el propietario reiteró
- El receptor de recargas PEN debe identificarse como **LEMON / DALE**. Número de destino comunicado por titular: **923319637**, mostrable y copiable.
- El QR deseado es el de su Lemon (captura de la app compartida antes), no se admite sustituirlo por QR de Mercado Pago u otro.
- Quiere una recarga mínima real controlada con cuenta cliente separada y aprobación ADMIN, y posteriormente integración 100% automática.
- COBRA YA debe preguntar **«¿Qué dejó en garantía? (opcional)»** en préstamos y conservar el texto en el historial; cero garantía es válido.

## Implementación V137 en GitHub
- Se muestran **LEMON / DALE · Perú** y **Número DALE: 923319637** en la sección de recarga manual; botón **Copiar número**.
- El número se muestra **solo como dato de referencia**, no como instrucción de cobro mientras el método no esté autorizado. Indicaciones «NO envíes dinero» conservadas.
- Se hace visible el bloque de moneda y garantía opcional en el formulario de COBRA YA (`details.cy105advanced open`). La garantía ya estaba implementada en la función `cy_create_loan_with_collateral`, se almacena en `cy_loan_collateral` y se muestra en el detalle/PDF del préstamo; no se duplicó ni cambió esquema.
- Versionado V137 en index.html para invalidar caché de JS/CSS; test de compatibilidad V132 y V136 actualizado.

## QR: material fuente pendiente (bloqueador)
La captura de la pantalla de Lemon en conversación no es suficiente para acreditar funcionamiento técnico del código QR: intentos de lectura locales de imagen no produjeron payload. Necesitamos **el archivo QR ORIGINAL de la opción «Descargar» de la app Lemon**, no captura de pantalla ni QR reconstruido. Tras recibirlo, validar lectura real con 2 teléfonos, titular/número y destino, y publicarlo en la sección una vez autorizada modalidad comercial. No mostrar ni prometer QR válido antes de ello.

## Condición comercial INALTERADA
Los términos oficiales Lemon Perú actualmente publicados prohíben usar la billetera personal para fines comerciales, con riesgo de bloqueo o cierre:
https://lemon.me/peru/peru-terms/t%C3%A9rminos-y-condiciones-billetera-electr%C3%B3nica

Por ello, mantener la configuración real de Supabase: `cc_manual_recharge_settings.collection_enabled=false` y `merchant_permission_verified=false` hasta autorización comercial **REAL** de Lemon/GMoney. No marcar autorización ficticia. Ni el usuario ni ADMIN puede crear un crédito real sin aprobar en servidor con un receptor comercial habilitado. El flujo V136 de solicitudes está disponible, **no la recaudación personal en vivo**.

## Pasos para una prueba controlada SEGURA
1. Acceder a https://www.clancartan.com/ con cuenta ADMIN; comprobar Billetera → Recarga manual → ADMIN · Recargas pendientes, DALE 923319637, estado de cobro todavía deshabilitado.
2. Con una **segunda cuenta cliente** (que NO sea la ADMIN), registrar solicitud manual S/1 en COBRA YA o STREAM BULL'S sin enviar dinero.
3. Verificar que aparece PENDIENTE en ADMIN y saldo del cliente no cambia; probar rechazo y verificar rechazo en historial.
4. Obtener permiso comercial de Lemon/GMoney con QR Lemon verificable por archivo original; configurar datos con seguridad; ejecutar entonces pago real S/1 desde segunda cuenta y comprobar directamente en Lemon ingreso correcto, fecha, banco e ID único.
5. ADMIN compara monto, cuenta receptora, remitente e identificador con la solicitud; marca confirmación y APRUEBA. Confirmar un único crédito, historial y cambios de ambas billeteras. Probar duplicado con misma referencia usando pruebas supervisadas; jamás aprobar contra una captura o mensaje.

## Otros compromisos
- Mantener login y acceso único, códigos consecutivos COBRA/BULL, RENIEC solo para clientes COBRA YA al pulsar el botón, catálogo público STREAM BULL'S, branding Fintech Premium, no borrar préstamos ni clientes.
- No retiros ni transferencias entre usuarios; las billeteras son saldo interno para pagar servicios, no préstamos de terceros.
- Reembolsos V135 conservados; bonificaciones por referidos solo cuando esté conectado pago real.
- Binance Merchant sigue pendiente. No dar por hecho pagos reales ni suscripciones reales.
- Registrar en README la V137 como punto de continuidad y conservar enlaces anteriores.
