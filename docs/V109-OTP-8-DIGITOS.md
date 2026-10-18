# V109 — Correo OTP real de 8 dígitos

**Motivo (18-OCT-2026):** el código real de verificación de Supabase para CLAN CARTAN tiene 8 dígitos, mientras que el formulario V108 solo mostraba 6 casillas y la plantilla de correo indicaba erróneamente «6 dígitos».

## Corrección publicada en código
- `index.html` V109 ofrece **8 casillas** y valida un OTP de **8 dígitos**; adapta pegado de código, avance de foco, botones y mensajes a ocho cifras.
- `scripts/check-v100.mjs` ahora verifica el número de casillas, longitud de OTP, registro manual CLAN CARTAN y permanencia de la consulta DNI exclusiva de COBRA YA.
- `supabase/templates/confirm-signup.html` y `confirm-signup-minimal-v108.html` actualizaron el texto de la plantilla de referencia a ocho dígitos, manteniendo `{{ .Token }}` dinámico.
- **La plantilla realmente activa en Supabase NO se modifica automáticamente desde GitHub**; en Auth > Emails > Templates > Confirm signup reemplazar manualmente «código de 6 dígitos» por «código de 8 dígitos» y guardar, sin tocar `{{ .Token }}`.
- Confirmación por correo al registrar ya enviaba un mensaje real con 8 dígitos; esta corrección sincroniza el frontend con el backend y evita truncamiento del OTP.

## Prueba de acceso comunicada por el titular — 18-OCT-2026

- El titular confirmó en la conversación: **«ya ingreso»** después de la corrección de las ocho casillas. Esto se registra como **prueba de acceso satisfactoria comunicada por el usuario**, no como verificación independiente de los registros de Auth.
- Previamente, el titular confirmó recepción efectiva de correo de Brevo/Supabase con un código de 8 dígitos.
- La consulta independiente a las tablas de Auth no pudo completarse por controles de acceso de la integración; no afirmar una verificación directa de la base de datos.
- No se cambió ningún usuario, correo, clave, token, cliente, préstamo ni regla de COBRA YA para este registro de avance.

## Alternativa futura
Supabase permite configurar la longitud de OTP del proveedor Email (entre 6 y 10). Si se decide volver a seis dígitos, cambiar **coordinadamente** la opción Email OTP length del servidor, el número de casillas de la página y el texto de la plantilla. No cambiar solo una pieza.

## Seguridad y pruebas
- El código que se mostró en las capturas de esta conversación debe considerarse expuesto; solicitar uno nuevo mediante Reenviar y no reutilizar el anterior.
- No se registraron ni compartieron contraseñas, tokens ni códigos de usuario en archivos fuente. El registro general de CLAN CARTAN permanece manual. Consultas DNI, cuotas, clientes, préstamos y billeteras de COBRA YA permanecen intactos.
- Verificar en la web que se muestren ocho casillas y confirmar un nuevo código con correo propio autorizado. La validación de GitHub solo comprueba sintaxis y estructura, no sustituye la prueba completa real.
- Resguardo previo en `resguardo/v108-antes-otp8-2026-10-18`.
