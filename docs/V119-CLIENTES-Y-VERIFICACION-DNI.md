# CLAN CARTAN V119 — Clientes, consulta DNI y corrección segura

Fecha: 18-10-2026. Empresa: CLAN CARTAN E.I.R.L. Producto: COBRA YA.

## Comportamiento
- Cuando el prestamista autorizado no tiene clientes registrados, se muestra «Aún no tienes clientes registrados» y un botón «Agregar cliente». Esto se basa en la lista real de clientes que pertenece a la cuenta autenticada, no en datos ficticios de otros usuarios.
- «Agregar cliente» abre una ventana con el **logo COBRA YA** y el documento primero. Conserva la consulta previa del DNI en la propia cartera y la posibilidad de completar el nombre mediante la función Edge `cc-consulta-dni`, solo con autorización explícita.
- Si API Perú no responde, no está configurada o se agota el cupo, **nombres y apellidos se escriben manualmente** y se puede registrar al cliente sin bloqueo. No se requiere autorización de API para guardar manualmente.
- Campos disponibles: documento, nombre completo, teléfono/WhatsApp, correo, dirección, distrito o ciudad, referencia domiciliaria y observaciones. Los cuatro últimos son opcionales.
- «Editar» abre una ventana en lugar de cinco `prompt`. Permite corregir cualquier campo y guardar los cambios en la misma ficha real de Supabase, manteniendo el ID del cliente y sus préstamos/abonos existentes.
- En «Verificar DNI ahora», el usuario debe marcar autorización. Si la consulta retorna un nombre, compara el guardado y el consultado; **nunca reemplaza el nombre automáticamente**. «Usar nombre consultado» requiere confirmación, y después «Guardar corrección» aplica el cambio bajo RLS de `cy_clients`.
- Un usuario puede regresar después cuando se restablezca el cupo y consultar manualmente el DNI desde «Editar»; **no hay consultas recurrentes automáticas que consuman cupos o cuotas sin permiso**.
- La consulta NO es conexión directa con RENIEC: utiliza un proveedor de terceros (API Perú). La disponibilidad efectiva depende de la configuración y saldo/cupo del proveedor y de los límites definidos por el servicio.

## Base de datos y seguridad
- Migración V119 `v119_optional_client_contact_fields`: se agregaron únicamente las columnas opcionales `address`, `district`, `address_reference` en `public.cy_clients`; el campo `notes` ya existía. No se reescribieron filas anteriores ni se cambiaron permisos.
- Las reglas RLS preexistentes permiten leer y corregir solo clientes de la cartera autorizada; toda petición de edición verifica el identificador del usuario. No se envían datos personales a otro usuario.
- Se preservaron todos los roles, billeteras internas, saldos, suscripciones, préstamos, pagos y cronogramas. No se habilitan pagos de préstamos desde las billeteras.
- Rama de recuperación de código: `resguardo/v118-antes-clientes-dni-v119-2026-10-18`.

## Validación pendiente
- Verificar manualmente con una cuenta RESELLER COBRA YA real los casos: sin clientes, cliente con DNI existente, consentimiento, API sin cupo, edición y corrección verificada. No gastar el cupo de API en pruebas automáticas sin consentimiento.
- Confirmar la configuración y disponibilidad efectiva de `APIPERU_TOKEN`. La existencia de la función Edge no garantiza créditos, conectividad, ni exactitud de la fuente externa.
- Copia externa recuperable de Supabase/Auth pendiente: una rama GitHub no es respaldo integral de la base.
