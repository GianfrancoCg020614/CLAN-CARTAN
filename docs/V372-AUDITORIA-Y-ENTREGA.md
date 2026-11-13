# COBRA YA V372 — auditoría, implementación y verificación

Base conservada: V371, commit `2688f4adea30aa1648aa96ce325f7aae3dd323b0`. Proyecto Supabase CLAN CARTAN `pqalxtrcyrpmwqdlibqd`; Cloudflare Pages existente `clan-cartan`. No se crea staging ni se modifican operaciones de otros negocios.

## Auditoría previa

- Ya existen sesión y billetera únicas, activación verificada en servidor, préstamos multimoneda, cronogramas, abonos FIFO a cuotas, correcciones justificadas, ampliaciones sin añadir intereses, garantías y códigos PR por propietario.
- V371 ya tiene búsqueda paginada con normalización, alias/documento/teléfonos/referencias, relevancia, tolerancia limitada a errores y un índice GIN. Se conserva ese buscador; no se crea otro.
- Las tablas `cy_*` existentes tienen RLS. Los RPC V371 revisados derivan propietario de `auth.uid()`, validan activación, fijan `search_path` y no admiten ejecución anónima. Las escrituras conservan sus bloqueos e idempotencia.
- La agenda anterior solo filtraba por el próximo vencimiento del préstamo; podía omitir otras cuotas del mismo préstamo dentro del periodo. V372 agrupa las cuotas pendientes por préstamo y periodo, sin duplicar el préstamo dentro de ese listado. Un préstamo con deuda de periodos distintos puede aparecer en los filtros correspondientes.
- No hay asignaciones contables de abonos a capital/intereses ni una regla aprobada para congelación. **No se inventa ese desglose ni se cambia el modelo.** Se solicitó al propietario definir si desea una regla futura; mientras no exista aprobación, esos indicadores se muestran sin desglose y no se ofrecen abonos exclusivos a capital/intereses ni congelación.
- Los abonos históricos no guardan un saldo posterior inmutable. Los comprobantes muestran explícitamente el saldo **actual al consultar** y su instante de consulta, sin reconstruir un saldo histórico.
- No había una zona horaria persistida por propietario. Se añade únicamente esa preferencia no financiera.

## Cambios

Se mantienen logotipo original, cabecera única, distribución, navegación, búsqueda y diseño responsive de V371. Se amplía el contenido de Vencimientos, Reportes y las ventanas existentes.

- Agenda: hoy, mañana, próximos siete días (mañana hasta hoy + 7), vencidos y completamente pagados. Importes desde cuotas con saldo pendiente; cada préstamo aparece una vez por filtro. Filtros por moneda, paginación estable y acciones de ficha, abono y mensaje.
- Zona horaria: detectada en el primer dispositivo y guardada una vez por cuenta; una inicialización concurrente no reemplaza la preferencia ya guardada. Se puede cambiar en Configuración. El servidor calcula la fecha real en esa zona; cambiarla no mueve vencimientos registrados.
- WhatsApp: vista previa de recordatorio, deuda vencida, pago completo y comprobante de abono; encabezado y cierre solicitados. Importes decimales verificados contra el cronograma, sin DNI, direcciones o garantías. Solo prepara un enlace; no envía mensajes automáticamente ni afirma envío. El teléfono debe incluir código de país.
- Comprobantes: UUID del abono, préstamo, cliente, fecha, moneda, importe, estado y saldo actual. PDF descargable real de una página, impresión y enlace WhatsApp con los datos del comprobante. No se registra otro pago al consultar, imprimir, descargar o compartir.
- Reportes: capital registrado, intereses pactados, abonos acumulados, saldo total, cuotas vencidas y cobros del periodo; selector de moneda y CSV con monedas separadas. Capital recuperado/pendiente e intereses cobrados quedan identificados sin desglose.
- Ampliación/corrección: vista previa de capital, total, saldo y vencimiento antes de confirmar; se reutilizan las mismas funciones financieras. Se corrige además la presentación de la estimación de un préstamo de un céntimo, sin modificar su cálculo en servidor.
- Se conserva el comportamiento aprobado: X cierra la ventana y vuelve al contexto anterior; no se añade un Atrás redundante en ventanas.

## Migración y autorización

Archivo: `supabase/migrations/20261113184952_cobra_ya_v372_collections_reads.sql`, creado con `supabase migration new`.

Aplicada y verificada en Supabase con versión de historial `20261113184952`; el archivo se sincroniza con ese identificador remoto. Las huellas de clientes, préstamos, abonos y cuotas coinciden antes y después. El asesor de seguridad no registra hallazgos nuevos para V372.

Es aditiva: una tabla `cy372_settings` para zona horaria y seis funciones `cy372_*`. Todas son **SECURITY INVOKER** con `search_path` vacío, ejecución anónima revocada, validación de activación y consultas limitadas explícitamente al propietario, además de RLS. La tabla nueva tiene permisos mínimos y políticas SELECT/INSERT/UPDATE con propietario y activación; no se permite cambiar el propietario de una preferencia.

No se alteran esquemas de préstamos/abonos ni funciones de escritura financieras. No se renumeran préstamos y no se convierten monedas. No se ejecutan actualizaciones de registros financieros en producción.

Los asesores de Supabase detectaron avisos globales preexistentes sobre funciones privilegiadas y configuración de contraseñas; V372 no cambia esos sistemas. Las tablas privadas V371 conservan su denegación por defecto. Referencias: [funciones privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Respaldo y reversión

- Código e historial: `/workspace/clan-cartan-before-v372.bundle`; verificado con `git bundle verify` antes de modificar.
- Copia consistente de clientes, préstamos, cuotas, abonos, correcciones, ampliaciones, garantías y definiciones V371: `/workspace/backups/v372-supabase-before.json`, permisos 0600, JSON leído y validado. SHA256 `34ebbb1551918397e7361a91fa9929a7a79033e020c9608050407b68168480f3`.
- Es una copia del módulo, no un respaldo completo de Auth ni de los demás negocios. La migración no reemplaza esos datos.
- Reversión: volver a publicar el commit base V371 mediante el flujo existente de GitHub/Cloudflare. Conservar la tabla de preferencia y las funciones aditivas: V371 no las utiliza. No restaurar automáticamente el JSON sobre producción, ya que podría sobrescribir operaciones posteriores. No es necesario eliminar datos para revertir esta interfaz.

## Pruebas y evidencias

Los datos se generan exclusivamente en PostgreSQL local/CI aislado; no se registran préstamos, activaciones ni pagos de prueba en producción.

- `check-v371-database.sql`: reglas existentes, búsqueda, monedas, historial, idempotencia y aislamiento.
- `check-v372-database.sql`: cuotas parciales/pagadas, filtros, importes agrupados sin duplicados, reportes, comprobantes de solo lectura, RLS entre propietarios, preferencia horaria, vencimiento, ausencia de funciones V372 privilegiadas y ejecución anónima; 60 préstamos controlados verifican límite de 50 y páginas sin superposición.
- `test-v371-concurrency.py`: numeración e idempotencia simultáneas existentes.
- `test-v372-tools.mjs`: importes exactos, rechazo de información incompleta/incoherente, fechas, cambio de día por zona horaria, mensajes y privacidad.
- `test-v371-dni-navigation.py`: DNI automático y navegación PC/celular con API simulada.
- `test-v372-browser.py`: interfaz real con RPC redirigidos a PostgreSQL aislado, alta de cliente/préstamo, abono anticipado parcial y completo en SQL, respuesta perdida y reintento, PDF real leído con pypdf, documento de impresión, WhatsApp sin envío, agenda/reportes, vistas previas y tamaños 1280, 390, 320 y orientación horizontal; errores de conexión, vencimiento, cierre, sesión y estado vacío.

Las capturas `artifacts/v372/*local.png` son capturas reales de Chromium **con datos controlados locales**, no imágenes generadas ni una sesión autenticada de producción. No se dispone de la sesión privada del propietario para inspeccionar su cartera publicada; la comprobación interna de producción debe completarse desde su sesión. La publicación pública y los archivos entregados se verifican por separado.

## Pasos de verificación del propietario

1. Entrar en https://www.clancartan.com e iniciar la sesión existente; abrir COBRA YA con activación vigente.
2. En Configuración, comprobar la zona horaria de la agenda.
3. Abrir Vencimientos y revisar hoy/mañana/próximos/vencidos/pagados por moneda.
4. Abrir un préstamo, revisar su cronograma y preparar WhatsApp; revisar el texto antes de enviarlo.
5. Desde un abono ya registrado, abrir Comprobante, descargar PDF o imprimir; comprobar UUID y moneda. No hace falta registrar un pago nuevo para verificarlo.
6. En Reportes, elegir periodo y moneda. Los indicadores sin desglose se mantienen pendientes hasta definir una regla financiera.
