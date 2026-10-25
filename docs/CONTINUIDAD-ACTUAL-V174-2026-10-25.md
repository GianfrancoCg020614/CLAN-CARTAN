# CLAN CARTAN · V174 · panel unificado + registro CLAN
Fecha: 25 de octubre de 2026 (Perú).

## Problema atendido
El panel anterior mezclaba varios menús con las pestañas de los cuatro negocios en todas las pantallas. Los usuarios veían accesos repetidos y algunas vistas no contenían operaciones funcionales.

## Decisiones de producto
- **Un catálogo** para compras, con tarifas calculadas por el servidor (público para afiliados; distribuidor para membresías vigentes).
- **Inicio orientado al rol**: ADMIN supervisa usuarios/publicaciones/ventas; SÚPER RESELLER activo gestiona publicaciones/ventas; RESELLER compra y consulta negocios; AFILIADO compra y consulta su billetera.
- **Una billetera**, con movimientos dentro de la sección Billetera; se quita el acceso duplicado de la barra lateral.
- **Un selector de negocios**, visible solo en "Mis negocios" o al consultar cada negocio, en lugar de cuatro pestañas globales.
- **Sin botones a módulos ficticios**: se retiran del menú referencias a Control externo y páginas de relleno. Los módulos de COBRA YA, MI COCHERA y MI ALQUILER existentes no se borran.
- Las membresías y permisos son estados verificados: asignar rol SÚPER RESELLER o RESELLER **no** activa descuento, publicación ni saldos.
- El panel de ventas/publicaciones se limita a STREAM BULL'S, y ADMIN sigue siendo el único que administra usuarios.
- No se reinstalan pruebas gratuitas ni paneles "Administración anterior".

## Registro de usuarios
El nuevo `public.cc_portal_user_registry` asigna identificadores permanentes CLAN1, CLAN2, CLAN3 y sucesivos, con alias administrativo.
- **CLAN1**: ADMIN, cuenta original.
- **CLAN2 · CLAN CARTAN**: SÚPER RESELLER asignado, membresía pendiente.
- **CLAN3 · LUIS CAR**: RESELLER asignado, membresía pendiente.

El identificador no depende de ordenar listas. La RPC `cc_portal_admin_accounts_v2` valida que el usuario actual sea ADMIN, inscribe nuevos usuarios faltantes sin renumerar a los existentes y devuelve los datos administrativos. La RPC `cc_portal_admin_set_registry_alias` permite únicamente a ADMIN cambiar el nombre de registro, sin tocar correo, contraseña, permisos, membresías, caja o saldo. La tabla tiene RLS activado y no tiene acceso directo para usuarios públicos ni autenticados.

## Estado comercial verificado
- Tres usuarios autenticados en la base de datos de producción al implementar V174.
- Dos membresías STREAM BULL'S con estado PENDING.
- Ninguna suscripción comercial activa.
- Cero publicaciones y cero pedidos de STREAM BULL'S.
- No publicar productos ni inventar precios hasta que existan publicaciones legítimas.

## Control de calidad y límites
- Tests automatizados de seis escenarios: afiliado, reseller vigente, súper reseller vigente, ADMIN, y ambos roles pendientes (mocks sin operaciones reales).
- Pruebas automatizadas de checkout, perfil, actualización de sesión y publicaciones, sin afectar pagos ni usuarios productivos.
- El flujo completo con **credenciales reales** sigue requiriendo comprobación manual antes de vender al público.
- Conservar el registro, la autenticación, los códigos de referido, las cuentas y los saldos productivos.
