# V313 — Consulta DNI en formularios nativos

Base: V312, 8706622fd662579a014b37c820a662a2fc3116ee.
Sitio: https://www.clancartan.com/

## Problemas corregidos

MI COCHERA enlazaba Buscar DNI sólo al contenedor principal, pero Registrar carrito se abre en un contenedor distinto, insertado en body. Los botones de propietario/trabajador no llegaban al manejador. Ahora ambos contenedores utilizan el mismo manejador y bloquean consultas simultáneas desde el mismo botón. Los documentos no aptos para consulta muestran una explicación y permiten registro manual.

MI COCHERA y MI ALQUILER verifican formulario conectado, titular, token de sesión, número y tipo de documento antes de aplicar una respuesta. Si se ha cerrado el formulario, cambiado la identidad o cambiado de sesión, se descarta la respuesta. Si el usuario edita el nombre mientras espera, se conserva su edición y se indica que debe revisarla antes de guardar. MI ALQUILER también rechaza eventos repetidos sobre un botón ocupado.

La consulta interna de MI COCHERA sigue antecediendo al proveedor externo y reutiliza una identidad guardada por API Perú. No se cambian autorización, cuota, caché del servidor ni endpoints.

## Verificación y límites

Chrome con formularios reales y consultas simuladas: DNI inválido, documento manual, identidad interna, consulta externa, repetición de clic, cambio de número/tipo, nombre editado, cambio de sesión, cierre/reapertura y trabajador separado del propietario. No se contacta API Perú, no se consume cuota ni se guardan personas, carritos o inquilinos reales.

Se mantiene la suite de roles, billetera única, historial/exportaciones, formularios de los tres negocios, publicaciones y controles financieros. No modifica base de datos, Auth, Edge Functions, RPC o RLS ni crea proyectos. La verificación externa real depende de autorización y cupo que el servidor ya controla.
