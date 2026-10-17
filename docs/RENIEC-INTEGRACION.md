# Integración futura de RENIEC — CLAN CARTAN / COBRA YA

## Objetivo
Una vez que un prestamista autorizado introduce un **DNI peruano válido de ocho dígitos**, el sistema podrá consultar, previa autorización y conforme a la finalidad legítima, los nombres y apellidos del titular y sugerirlos en un formulario de alta de cliente.

## Lo implementado en V105
Autocompletado de clientes **ya guardados en la misma cartera**, gracias a `public.cy_lookup_dni_saved(text)`. No consulta bases de terceros. Nunca mostrar nombres inventados.

## Lo que se requiere para nombres de DNI no registrados
1. Contratar o autorizar formalmente el servicio de RENIEC (o proveedor con permiso verificable) y confirmar qué atributos se entregan, restricciones, finalidades, tarifas y derechos de uso.
2. Disponer de credenciales y documentación técnica del servicio. En servicios oficiales pueden requerirse certificados y mecanismos de verificación específicos. No asumir que hay una API abierta de consulta de nombres.
3. Obtener base legal aplicable para el tratamiento de información personal, proporcionar aviso de privacidad y registrar finalidades apropiadas. La consulta masiva o arbitraria a terceros no debe ser posible.
4. Implementar Supabase Edge Function con **JWT válido**, autorización a COBRA YA (membresía activa), limitación de tasa por usuario, auditoría de acceso sin DNI completo en logs y entrada estricta de 8 dígitos.
5. Guardar tokens de RENIEC únicamente como **secrets del backend**, nunca en la web o el repositorio. Solicitar en backend únicamente atributos mínimos de nombre y apellido; manejar respuestas «no encontrado», «sin permiso» y «proveedor temporalmente inactivo».
6. Activar primero en pruebas controladas con titulares que hayan autorizado la verificación. Añadir controles para que no puedan consultarse DNIs de forma masiva.

## Flujo recomendado
- DNI ingresado → búsqueda local restringida por RLS → si existe, autocompletar de inmediato.
- Si no existe, verificar que se tenga permiso de consulta → backend de verificación oficial → devolver solo el nombre completo necesario para el préstamo → permitir al prestamista confirmar/editar antes de guardarlo.
- Si no se dispone del servicio o falla, **no bloquear** la creación manual: mostrar el motivo sin revelar detalles técnicos o secretos.

## Seguridad y transparencia
COBRA YA administra préstamos **otorgados por terceros**; CLAN CARTAN E.I.R.L. no otorga préstamos. Las billeteras únicamente pagan servicios internos, con saldos ficticios durante el piloto. El nombre obtenido a partir de DNI no acredita por sí solo identidad vigente, consentimiento, capacidad de pago o validez de la operación.

Referencia: servicio RENIEC «Web Service de Datos», documentación oficial https://identidad.reniec.gob.pe/documents/d/guest/requisitos
