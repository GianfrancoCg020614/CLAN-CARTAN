# V394 — Cuenta, supervisión ADMIN y bono compartido

## Cambios

- Cambio de contraseña desde Perfil usando Supabase Auth y la sesión existente. Validación de coincidencia y 12–128 caracteres, bloqueo de doble envío y soporte del código de reautenticación si el servidor lo exige. Sin guardar contraseñas en el navegador. Se corrige la reapertura del formulario de recuperación después de un cambio exitoso.
- Inicio ADMIN compacto: usuarios, recargas por revisar, pedidos pendientes y fondos PEN de usuarios, expresamente diferenciados de ingresos del negocio.
- Directorio ADMIN con búsqueda en servidor y páginas de 20, sin limitar las búsquedas a los primeros 250 usuarios. La ficha abre saldos, bonos, recargas, auditoría, compras/ventas y los registros operativos de COBRA YA, MI COCHERA, MI ALQUILER y STREAM BULL’S. Se conservan los permisos de roles existentes y se verifica ADMIN en cada RPC nuevo. No se exponen claves privadas, hashes de contraseñas ni tokens.
- Bono de activación compartido: destinatario, importe, motivo y **Aceptar**. Se elimina del flujo nuevo la elección de negocio y la activación adicional. Se usa una fuente existente del fondo compartido, con historial en `cc_admin_promo_grants`; no se crea otra billetera. Los saldos anteriores permanecen en sus fuentes existentes y la activación conserva su consumo compartido. Una cuenta verificada puede recibir el bono sin tener que ser reseller de COBRA YA. La entrega es idempotente, no activa ni renueva negocios y no cambia dinero real. Una entrega confirmada exige pulsar «Otorgar otro bono» antes de volver a enviar.
- Estado de referidos por código: diferencia activación con bono promocional, espera de pago real y premios acreditados. Se mantiene la regla confirmada por el propietario: las activaciones pagadas con bono no generan el premio de S/5. No se acredita ningún premio retroactivo sin un pago real elegible.

## Google y Apple: pendiente de configuración y validación real

Los dos proveedores están deshabilitados en la configuración pública de Supabase al realizar la auditoría. Los botones muestran ese estado y permanecen deshabilitados. Se prepara el cliente PKCE y el retorno a la sesión existente, con verificación de identidad y roles en el servidor. No se crean usuarios, roles o billeteras paralelas.

Esto **no equivale a una alta social comprobada**. Antes de habilitarla para nuevas cuentas, hay que configurar ambos proveedores y completar la validación de consentimiento/perfil del alta social: el control legal actual exige las declaraciones de registro y no debe eliminarse ni atribuir consentimientos ficticios a un usuario de Google/Apple. Las cuentas nuevas pueden utilizar el registro por correo que ya existe.

Intervención del propietario:

1. Abrir [proveedores de Supabase](https://supabase.com/dashboard/project/pqalxtrcyrpmwqdlibqd/auth/providers). Configurar el cliente OAuth de Google y, si dispone de ella, la cuenta Apple Developer con Sign in with Apple. Guardar secretos exclusivamente allí, nunca en el chat o el repositorio.
2. Callback del proveedor: `https://pqalxtrcyrpmwqdlibqd.supabase.co/auth/v1/callback`. Mantener como sitio principal `https://www.clancartan.com` y revisar las redirecciones autorizadas para el dominio utilizado.
3. Seguir las guías oficiales: [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple). Antes de abrir el alta social, comprobar consentimiento, vinculación de cuentas existentes y retorno al mismo usuario sin conceder roles comerciales.

## Validación y límites

- Auth real local GoTrue v2.197.0: alta ficticia, ingreso, rechazo del cambio sin sesión, actualización, rechazo de contraseña anterior, acceso con la nueva y conservación del identificador. No se cambia la contraseña de ningún cliente ni se envían correos de prueba a personas reales.
- PostgreSQL aislado: 21 comprobaciones de permisos, secciones operativas, paginación, búsquedas más allá de 250 cuentas, destinatario, idempotencia, ausencia de activaciones/cambios de dinero real y estado del referido con bono. Seis llamadas concurrentes generan una sola entrega.
- Chromium PC/celular: validaciones de contraseña, reautenticación, búsqueda y páginas, fichas, bono sin selector de negocio ni activación, doble clic, explicación de referido, proveedores deshabilitados y cierre al cambiar de cuenta. Capturas con datos ficticios en `artifacts/v394/`.
- Regresiones existentes de sintaxis inline, autenticación persistente, registro legal y códigos CLAN.

Las capturas de pruebas no representan sesiones reales de clientes. El ingreso con proveedores sociales y los correos de recuperación en producción no se declaran comprobados. No se ejecutan entregas de bonos, recargas ni cambios de credenciales de clientes para probar.

## Respaldo y reversión

Base: `f7e17a4e9d0c5871ae43339962d136eff4b1af54`. Respaldo recuperable `/workspace/clan-cartan-before-v394.bundle`.

La migración agrega RPC con permisos restringidos; no elimina tablas ni modifica reglas financieras existentes. Para revertir la interfaz, publicar el commit anterior mediante el flujo existente. Conservar los RPC y todos los movimientos de bonos ya confirmados; no borrar su historial ni descontar entregas como parte de una reversión de código. No se crea STAGING.
