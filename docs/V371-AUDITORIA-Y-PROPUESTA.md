# COBRA YA V371 — auditoría previa y propuesta para aprobación

> Registro histórico de la auditoría inicial. El propietario aprobó posteriormente la migración, la numeración por propietario y el uso del logotipo existente. La migración fue aplicada manualmente y verificada. Estado y pruebas actuales: [V371-IMPLEMENTACION.md](V371-IMPLEMENTACION.md).

Fecha: 12 de noviembre de 2026 (UTC). Estado: auditoría inicial; V371 NO implementada ni publicada.

## Identidad y respaldo

- Repositorio: https://github.com/GianfrancoCg020614/CLAN-CARTAN, rama main.
- HEAD auditado: `cd0361df318ab2a547f9797b1276740fc09ff34d`.
- Cloudflare Pages: proyecto `clan-cartan`; producción automática desde main; previews deshabilitados. No se creó staging.
- Despliegue canónico confirmado por API: `a987b888-2a5e-4a0f-b1d3-35fc4ce7211e`, estado deploy/success, commit coincidente con HEAD; finalizó el 12-11-2026 a las 04:54:51 UTC.
- Dominio: https://www.clancartan.com/.
- Supabase: proyecto CLAN CARTAN, `pqalxtrcyrpmwqdlibqd`, ACTIVE_HEALTHY, Postgres 17.
- Bundle Git local completo: `/workspace/clan-cartan-before-v371.bundle`. Verificado con `git bundle verify`.
- SHA256 del bundle: `0371417b6b71b069723c4a39e55aa97b5742d32087d62f7fcc3a6c2c6f9c923c`.
- El bundle respalda código e historial, NO es un respaldo de la base de datos. Antes de aplicar una migración se debe verificar el mecanismo de recuperación de Supabase y registrar su punto de recuperación.

## Componentes y parches encontrados

`index.html` contiene la estructura del módulo, formularios y el controlador `cy53`: sesión compartida, consultas REST, clientes, préstamos, cronogramas, abonos y ficha imprimible. `scripts/v152-cobra-fast.js` añade alias, búsqueda local, ficha histórica y formularios de abono. `scripts/v326-wallet-access.js` consulta `cc_finance_wallet` y presenta `available_pen`, la fuente existente para la billetera central.

V368 añadió `scripts/cobra-phase1-v368.js`, `styles/cobra-phase1-v368.css` y el evento `cy368:data`. Reconstruye un panel encima de los componentes existentes. V369 compactó el panel, ocultó la billetera de esa capa y separó saldos por moneda (`425912e`, `bd55198`). Los últimos ajustes ocultan logotipo/título y neutralizan visualmente su contenedor (`cd76e45`, `cd0361d`); no eliminaron la estructura duplicada.

La búsqueda de V368 filtra texto de filas y la de V152 filtra datos ya descargados. No hay búsqueda paginada normalizada en servidor. `refresh()` solicita listados completos, susceptibles a límites de respuesta REST; sus contadores no garantizan totalidad al crecer la cartera. V368 cuenta todos los préstamos como activos y obtiene un saldo buscando texto de marca, por lo que no debe reutilizarse como fuente financiera.

Hay activos oficiales existentes: `assets/cobra-ya-premium.svg`, `assets/cc-logo-cobraya-hd.avif`, `assets/logo-cobraya-v304.avif`. La elección definitiva requiere inspección visual del activo y de la cabecera publicada; no se ha generado ni sustituido ningún logotipo.

## Integración que debe conservarse

- `CC_V53_SESSION`, autenticación y activación existentes.
- `cy_create_loan_with_collateral`, que delega en el cálculo mensual existente.
- `cy_record_payment`: valida autorización, propiedad, estado e importe numeric con dos decimales; bloquea el préstamo y aplica el movimiento a cuotas en transacción.
- Clientes existentes reutilizados por DNI; índice único de DNI peruano por propietario; registro cliente/préstamo deshabilita botones mientras guarda.
- Garantías, correcciones, prórrogas, pagos e impresión de cronogramas existentes.
- Billetera central mediante `cc_finance_wallet`, sin sumar bonos, saldos de prueba ni cartera prestada.
- `cc166OpenProfile`, `cc166OpenWallet` y navegación del portal; no se debe crear otro login ni otra billetera.

## Evidencia de seguridad y datos

Consultas de catálogo verificaron RLS activo en `cy_clients`, `cy_loans`, `cy_installments`, `cy_payments`, `cy_loan_collateral`, `cy_loan_corrections` y `cy_loan_extensions`. Las políticas de lectura combinan propietario y autorización de COBRA YA con excepción administrativa. INSERT/UPDATE de clientes restringen owner_id y autorización; UPDATE tiene USING y WITH CHECK. Esto no sustituye pruebas de ejecución con dos usuarios.

Las tres RPC de creación/cobro inspeccionadas no son ejecutables por anon; sí por authenticated. Las dos definiciones revisadas (`cy_record_payment`, `cy_create_loan_with_collateral`) verifican auth.uid() y autorización de COBRA YA. Ser SECURITY DEFINER requiere revisar cada cuerpo y permiso, no asumir que RLS controla sus consultas internas.

Consulta agregada de las tablas de producción: **0 clientes, 0 préstamos, 0 abonos, 0 cuotas** en el momento de auditoría. No se crearon datos ficticios en producción. Las cifras de la referencia visual no son saldos verificados.

El asesor de Supabase también devuelve advertencias generales de funciones SECURITY DEFINER ejecutables y protección de contraseñas filtradas desactivada. No demuestra por sí solo una fuga ni autoriza cambiar otros módulos. Revisar por separado si se amplía el alcance:
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Decisión que requiere aprobación del propietario

El pedido exige búsqueda indexada sin descargar todos los clientes, códigos PR, teléfonos alternativos, fecha/medio del abono e idempotencia real. El esquema actual carece de esos campos y las RPC no aceptan una clave de operación. Deshabilitar un botón reduce doble pulsación, pero no impide duplicados por reintento después de una respuesta perdida.

Se propone una migración **aditiva**, acotada al módulo COBRA YA, con este contrato:

| Cambio propuesto | Justificación e impacto |
| --- | --- |
| `cy_clients.alternate_phones text[]` y `search_references text[]`, opcionales | Almacenar teléfonos adicionales y referencias que el propietario decida hacer buscables. No indexar automáticamente todas las observaciones privadas. |
| `cy_loans.loan_code text`, único por owner_id | Código estable `PR-0001`, `PR-0002`… por propietario, generado transaccionalmente. Conservar UUID como identificador y todas las relaciones. No requiere renumerar códigos existentes: no existe esa columna. |
| `cy_payments.paid_on date` y `payment_method text`, opcionales | Guardar fecha declarada y medio del abono, conservando created_at como fecha de registro. No retroceder movimientos ni recalcular reglas financieras. |
| Registro privado de solicitudes idempotentes | Clave por propietario/tipo/operación y huella de argumentos; mismo reintento devuelve el mismo resultado, argumentos diferentes con la misma clave se rechazan. Guardar resultado en la misma transacción del movimiento. Aplicar a altas de cliente, préstamo y abono. |
| Funciones nuevas `cy_v371_*` e índices de búsqueda normalizada | Búsqueda con auth.uid(), autorización vigente, orden por relevancia, máximo de página y paginación; agregados y listados por moneda en servidor. Comprobar disponibilidad de extensiones antes de seleccionar trigramas. Evitar exponer documento/teléfono completo en sugerencias. |

Las nuevas RPC de escritura envolverían las operaciones existentes sin cambiar fórmula de interés, conversión, saldo de billetera, cronogramas o movimientos ajenos. Revocar ejecución a PUBLIC/anon en las nuevas RPC; conceder solo el acceso necesario a authenticated; mantener datos auxiliares en esquema privado y verificar propiedad en cada operación. No modificar permisos de otros módulos.

**Impacto operativo:** creación de columnas, índices y funciones; puede tomar bloqueos breves. Releer conteos y esquema al aplicar para detectar concurrencia. Revisar el SQL final y ejecutar pruebas antes de publicar la interfaz que dependa de él. La propuesta todavía no es un script de migración listo para ejecutar.

**Reversión de datos:** desactivar uso de RPC nuevas y restaurar interfaz anterior; conservar columnas, claves y movimientos registrados. No borrar solicitudes idempotentes ni campos con datos. Si hay un fallo antes del commit de la migración, rollback de su transacción. No se propone DROP de tablas, columnas ni historial.

**Reversión de código/publicación:** verificar primero HEAD remoto y cambios concurrentes. Revertir únicamente commits V371 mediante nuevos commits, nunca reset forzado sobre main. Si hay una incidencia de producción, volver al despliegue canónico auditado cuando siga siendo la base correcta; no revertir un despliegue ajeno posterior sin revisar. Comprobar dominio, sesión y navegación después. El bundle permite reconstruir el código auditado en un directorio separado sin sobrescribir trabajo.

Esta aprobación se solicita por los apartados 16 y 21 del pedido del propietario: presentar justificación, impacto y reversión antes de una migración indispensable e informar decisiones empresariales antes de ejecutarlas. No procede de una restricción adicional de un skill.

## Reconstrucción prevista tras resolver la decisión

1. Eliminar la estructura repetida de cabecera y navegación; reemplazar la capa V368–V370, sin apilar CSS de ocultación.
2. Cabecera única con activo oficial, menú, regreso al portal, búsqueda, atención y perfil; drawer móvil y lateral plegable de escritorio.
3. Inicio compacto con selector de moneda, billetera real y cuatro indicadores interactivos; acciones únicas; atención lateral/desplegable.
4. Listados paginados; escritorio en tabla y móvil en fichas; ficha de cliente con seis pestañas y formularios adaptables que reutilicen operaciones existentes.
5. Integrar el contrato nuevo aprobado, comprobando acceso, idempotencia y precisión monetaria en servidor.
6. Verificar pantallas y flujos en PC/móvil, datos y vacíos, dos usuarios aislados, sesión vencida, desconexión, respuestas perdidas y operaciones repetidas. Usar fixtures locales para estados con datos; no crear operaciones reales sin necesidad.
7. Publicar por main y Cloudflare Pages existentes, sin staging, solo cuando pase la verificación. Actualizar V371 al corresponder y capturar el resultado real.

## Verificaciones iniciales ejecutadas

- Bundle completo: PASS.
- `node scripts/check-v138-cobra-ui.mjs`: PASS.
- `node scripts/check-v159-cobra-and-codes.mjs`: PASS.
- `node scripts/check-v152-cobra.mjs`: FAIL preexistente: solo admite metadatos de versiones antiguas; no prueba por sí solo un fallo funcional actual.
- Lectura API Cloudflare: deploy/success y commit de producción confirmado.
- Catálogo Supabase: políticas, índices, campos y permisos de RPC revisados; conteos agregados sin exponer datos personales.
- No se probaron altas/abonos reales, responsive ni sesión autenticada desde navegador. No hay capturas reales de V371 porque aún no existe.

## Entrega actual

Solo este documento local y el respaldo Git. No se modificó código de aplicación, base de datos ni configuración; no se creó commit GitHub ni despliegue. No se marca el trabajo como finalizado. Pendiente aprobación de la migración aditiva y del formato de código propuesto antes de ejecutarlos.
