# V390 · Auditoría de navegación de los cuatro negocios

Base: `dbfbe73f813d0962db63f28e766a2dfd3b907659`. Respaldo de código con historial completo verificado: `/workspace/clan-cartan-before-v390.bundle`. Sin staging, migraciones, cambios de permisos ni operaciones financieras de clientes.

## Fallos corregidos

- La salida de COBRA YA, MI COCHERA y MI ALQUILER reabría el estado recordado del portal. Ahora su botón «Volver a CLAN CARTAN» usa una ruta explícita al selector de los cuatro negocios, limpia el historial de regreso del módulo y conserva la sesión. STREAM conserva su regreso equivalente existente.
- En MI COCHERA, abrir un abono, calendario o corrección desde la ficha móvil destruía esa ficha. Ahora las ventanas secundarias conservan el nodo anterior y su foco: X/Escape regresa a la ficha, y la siguiente X a la lista. Al cerrar el negocio o la sesión se descarta ese historial. Al guardar se refrescan los datos; no se restaura una ficha financiera antigua.
- En COBRA YA, una respuesta tardía de guardado podía cerrar el formulario abierto después. Solo se cierra la ventana original si aún es la activa; la confirmación sigue actualizando los datos, pero no abre una ficha ni reemplaza el nuevo borrador.
- La corrección de MI COCHERA también conserva el formulario nuevo si una operación anterior responde tarde. Se mantiene la protección de doble pulsación y los mismos identificadores de pago.

X de formulario significa cerrar esa ventana, Atrás en billetera/perfil recorre su historial y vuelve al negocio, y Volver a CLAN CARTAN sale al selector. El Cerrar del portal conserva su acción existente hacia el inicio público; no cierra sesión. No se añade una segunda navegación ni un login.

## Seguridad y datos: revisión de solo lectura

Se revisaron metadatos de tablas operativas `cy_*`, `mc_*`, `ma_*`, `sb_oper_*`: RLS activado en todas las tablas encontradas. Las tablas internas de solicitudes/correcciones sin políticas continúan inaccesibles por API directa; no se agregaron políticas permisivas.

Se revisaron las definiciones de `cy371_access`, `cy371_mutate`, `mc_record_payment_once`, `ma_record_payment`: validación de sesión/propietario, guardas existentes e identificadores de solicitudes permanecen en el servidor. La revisión previa V389 cubre las operaciones STREAM y la combinación restrictiva de titularidad/vigencia. Esta entrega no modifica ninguna función SQL ni regla financiera.

El asesor de Supabase devuelve advertencias preexistentes: 7 funciones SECURITY DEFINER ejecutables por anon, 153 por authenticated, y protección de contraseñas filtradas desactivada; también 19 avisos informativos de RLS sin políticas. Se inspeccionaron las 7 funciones públicas: son consultas STABLE de catálogo/códigos, con search_path vacío; no son pagos ni devuelven documentos/teléfonos. El catálogo V3 mantiene la elegibilidad del precio distribuidor en servidor. Que una función autorizada sea SECURITY DEFINER no demuestra por sí solo una vulnerabilidad. No se revocaron funciones necesarias para que desaparezca un aviso.

Pendiente de configuración: revisar Supabase → Authentication → configuración de contraseñas → protección de contraseñas filtradas; su disponibilidad depende del plan. No se modificó la política de autenticación. No se certifica con esta revisión la totalidad de las 153 funciones privilegiadas ni todas las combinaciones de acceso de producción.

## Pruebas y límites

- 14 casos nuevos en Chromium: cuatro negocios a 1366/390/320, X/Escape, regreso de billetera, regreso al selector, sesión conservada, respuesta tardía de COBRA YA y fichas anidadas de MI COCHERA en celular. API y escrituras sintéticas, nunca operaciones reales.
- Regresión de los 30 escenarios existentes de ventanas, DNI, navegación y usabilidad.
- Regresión de DNI y navegación COBRA YA a 1280/390.
- Regresión STREAM: perfiles, marketplace y formularios existentes, con datos controlados.
- Controles de GitHub de portal, finanzas, códigos, API Perú, COBRA YA, MI COCHERA, MI ALQUILER y STREAM antes de integrar. Ver resultados concretos del PR.
- Producción: comprobar versión pública PC/celular, Cloudflare y hashes de los archivos modificados después del despliegue. Las capturas de negocios autenticados son del navegador local con datos controlados; no se presentan como sesiones de clientes de producción.

No se prueban pagos reales, recargas reales ni envío de mensajes. Los límites de consultas y las reglas financieras de cada negocio no se amplían con esta corrección. Una auditoría de navegación no equivale a una certificación integral de seguridad o contabilidad.

## Reversión

Revertir el commit de interfaz en main mediante el flujo GitHub/Cloudflare existente. No hay cambios de esquema o datos que revertir. El bundle permite recuperar el código anterior sin borrar movimientos posteriores.
