# CLAN CARTAN — Nuevas reglas aprobadas el 24/10/2026

**Alcance:** STREAM BULL'S + reglas comunes de COBRA YA, MI COCHERA y MI ALQUILER. Reemplaza las referencias históricas a una afiliación única de S/20 en STREAM BULL'S. **Especificación y primera capa de cálculos: NO ES aún un catálogo de ventas ni una liquidación financiera habilitada.**

## 1. Registro y roles
- Registro normal ofrece solamente AFILIADO (AFFILIATE) y RESELLER.
- El AFILIADO paga precio PÚBLICO, puede usar la billetera CLAN y no adquiere privilegios por registrarse.
- **Separación comercial estricta**: SUPER_RESELLER publica sus productos en el catálogo, controla su stock, los pedidos y **sus propios compradores de la plataforma**, y solicita liquidaciones al ADMIN. **RESELLER no publica productos en el catálogo**: compra productos ofrecidos en la página y los revende por su cuenta **FUERA de la página**. El RESELLER puede gestionar sus clientes externos únicamente en su pestaña privada opcional; sus ventas externas NO son pedidos ni clientes de CLAN CARTAN y no originan comisión del 20% en el marketplace.
- Solo ADMIN puede nombrar o retirar a un SUPER_RESELLER. Ese rol existe **únicamente en STREAM BULL'S**, y no da permisos de COBRA YA, MI COCHERA o MI ALQUILER.
- Con rol SUPER_RESELLER conferido por ADMIN, suscripción anual vigente y sin suspensión, la publicación de productos es **AUTOMÁTICA**; no requiere aprobación manual por ficha. ADMIN conserva capacidad de retirar o suspender publicaciones incorrectas o fraudulentas.
- Acceso ADMIN, designación y privilegios se comprueban en servidor, nunca por roles escritos en formularios o user_metadata de JWT.

## 2. Suscripciones y vencimientos
- STREAM BULL'S: **S/25 por 365 días** de suscripción; guardar fecha de inicio y final. Sustituye el antecedente de S/20 por afiliación de pago único. La afiliación a precio público permanece diferenciada del servicio de revendedor.
- COBRA YA, MI COCHERA y MI ALQUILER: **S/15 por 30 días** en las tarifas documentadas actualmente, salvo que ADMIN actualice precios comerciales.
- Conteo inclusivo en America/Lima: fecha inicial día 1; el último día completo, **día 30 o día 365**, vence a **23:59**; siguiente día 00:00 es límite técnico exclusivo.
- Ejemplo: 02/10/2026 + 30 días contando el día inicial → 31/10/2026, 23:59.
- Ejemplo: 24/10/2026 + 365 días contando el día inicial → 23/10/2027, 23:59.
- Distinguir suscripción anual del vendedor STREAM BULL'S de la duración propia de un artículo/perfil digital (30 días por defecto, o la duración definida en la oferta). Conservar historial de renovaciones, fechas, días consumidos/restantes y estados.

## 3. Catálogo STREAM BULL'S: autoría, publicación y WhatsApp
- Categorías iniciales: Netflix, HBO/MAX, YouTube, ChatGPT, Paramount+, Prime Video, Canva, Crunchyroll y otras configurables.
- Ficha obligatoria del producto: servicio, variante, nombre, descripción, fotos, precio público, costo por unidad verificable para comisión, cantidad de stock, modalidad de entrega, duración, condiciones y vendedor; código e ID únicos, estados visible/pausado/agotado.
- Cada ficha muestra **"Publicado por: [nombre comercial del SUPER RESELLER]"** y un **BOTÓN VERDE "Consultar al vendedor por WhatsApp"**.
- El teléfono público de contacto es una propiedad del PERFIL DEL VENDEDOR, no de cada publicación. Cambiarlo en perfil actualiza automáticamente TODOS los botones de publicaciones existentes y futuras. En pedidos antiguos retener el contacto anterior solo si es necesario para auditoría.
- Búsqueda inteligente de productos y vendedores por servicio/nombre/categoría/código/descripción, con filtros de precio, stock, ordenación y paginación.
- Campos de costo, margen y datos privados del vendedor nunca son visibles a compradores. Validar descripción/archivos en servidor, así como condiciones de venta de cada proveedor.

## 4. Stock, pedidos y cobros
- Cada compra reserva existencias atómicamente en el SERVIDOR; no permitir dos reservas sobre la misma plaza. Pago verificado convierte la reserva en venta definitiva, se descuenta stock una sola vez. Checkout expirado/cancelado libera su reserva sin duplicar unidades.
- Producto agotado → no cobrar ni aceptar compra.
- Todos los compradores pagan **a ADMIN** mediante método permitido y comprobable. El vendedor NO recibe automáticamente ingresos directos ni se le convierte por error el dinero retenido en saldo REAL de billetera CLAN.
- Órdenes con ID idempotente, comprador, vendedor, producto, cantidad, precio, costo base documentado, tasa de comisión capturada al confirmar, comprobante de pago, comprobante de entrega, devoluciones y eventos.
- Estados mínimos: pago pendiente, pago verificado esperando entrega, entrega verificada, disponible para liquidación, liquidado, cancelado, devuelto, contracargo. No reconocer captura de pantalla como pago definitivo.

## 5. Participación ADMIN del 20% de GANANCIA y tasa variable por vendedor
- Por defecto ADMIN recibe **20% de la ganancia por venta del SUPER RESELLER**, NO 20% del bruto cobrado. Solo ADMIN puede fijar otra tasa por vendedor; se aplica automáticamente a TODOS sus productos presentes y futuros.
- Ganancia bruta = precio cobrado menos costo directo elegible y verificable del vendedor.
- Participación ADMIN = ganancia bruta × porcentaje de ese vendedor.
- Ganancia del vendedor = ganancia bruta − participación ADMIN.
- Si el costo lo pagó el vendedor, **monto total por liquidar al vendedor = costo recuperable + ganancia neta = cobro al comprador − participación ADMIN**.
- EJEMPLO: precio S/50, costo S/30, margen S/20, ADMIN 20% = S/4, ganancia del vendedor S/16, a liquidar S/46 (S/30 recuperados + S/16 de margen).
- El porcentaje se guarda en centésimas de punto porcentual; 20% = 2000 basis points. Guardar tasa, precio y costo *congelados por pedido* para impedir que cambios de configuración reescriban transacciones pasadas.
- Debe existir auditoría de costos (para evitar inflarlos y ocultar ganancia). No liberar pagos sobre costos falsos, faltantes o no conciliados. Costos de pasarela, impuestos y eventuales fletes requieren política contable expresa.
- Devoluciones y contracargos generan reversos trazables incluso si el vendedor ya había cobrado. Evitar comisiones por pago no verificado o entrega no comprobada.

## 6. Panel ADMIN de SUPER RESELLERS y liquidaciones
- Listado ADMIN: identificador, nombre comercial, WhatsApp, rol/estado, suscripción inicio/fin, tasa personal, productos/stock, pedidos, facturación, costos, margen, comisión ADMIN, importe retenido por entrega, pendientes, devoluciones, total pagado al vendedor y SALDO POR LIQUIDAR.
- Desglose por pedido, producto, periodo y vendedor. Exportación Excel/PDF, auditoría de ajustes y conciliación de abonos externos.
- **SUPER_RESELLER** solo consulta sus productos publicados, stock, compras de sus compradores DENTRO de CLAN CARTAN, entregas, ganancias y liquidaciones; nunca datos de otros vendedores. **RESELLER** solo puede consultar sus propias compras del catálogo y, si activó S/10, el libro privado de clientes/cuentas que gestiona FUERA del portal.
- Periodicidad **semanal, quincenal o mensual** o liquidación a pedido del SUPER RESELLER. Solicitar pago no lo ejecuta automáticamente: ADMIN acepta solicitud, transfiere/abona externamente, registra evidencia, fecha, importe y referencia. Solo un pago verificado reduce el saldo por liquidar.
- Vista de obligaciones y saldos por liquidar separada de los saldos de billetera REAL de compras. Prevención de doble pago, saldo insuficiente de caja, fondos retenidos, contracargos y deudas de ajuste.

## 7. Complemento opcional del RESELLER — S/10
- RESELLER puede activar una **pestaña privada CONTROL DE CUENTAS EXTERNAS por S/10 por activación**. Conforme a la regla común de activaciones de 30 días, se establece como periodo operativo de este complemento **30 días** contados con el día de pago como día 1, vencimiento día 30 a las 23:59 hora Perú. Es un permiso distinto de la suscripción principal STREAM BULL'S de 365 días. La periodicidad de 30 días debe mostrarse expresamente antes de autorizar el débito.
- Acceso opcional solo cuando el derecho esté activado, sin autorizar publicaciones públicas ni otorgar SUPER_RESELLER. Al vencer, el RESELLER **no puede ver, consultar, exportar, crear ni modificar** sus registros externos mediante la UI ni la API: se conserva toda la información privada en el servidor sin borrarla, hasta reactivación válida. Solo se muestra un aviso de módulo bloqueado con botón **Activar / Reactivar por S/10**, duración, saldo y confirmación explícita. No esconder los datos solo con CSS; denegar API/RPC en backend.
- Pago con la **billetera REAL propia del RESELLER** (no bonos de bienvenida): después de pulsar el botón y CONFIRMAR expresamente S/10, el servidor valida rol, suscripción, saldo disponible y nonce de operación; en **una única transacción atómica e idempotente** debita S/10 y activa el acceso inmediatamente, sin necesitar aprobación manual del ADMIN. Si falla o no alcanza el saldo, ningún débito ni activación parcial. **NO existe cargo automático al vencer ni renovación sin autorización del usuario**.
- La reactivación devuelve acceso a las **mismas cuentas, perfiles y clientes guardados**; no duplicar registros ni reiniciar los contratos externos. Si el RESELLER renueva antes del vencimiento de la pestaña, el nuevo periodo empieza el día siguiente al fin anterior, para no perder días ya pagados; si renueva después, comienza ese día como día 1.
- Este control es **exclusivamente privado y voluntario**, para registrar ventas realizadas por el RESELLER a personas **FUERA de CLAN CARTAN**. Las cuentas externas pueden provenir de proveedores externos, de inventario propio o de compras previas, sin que cada registro requiera una orden de CLAN. Los registros nunca se publican en el catálogo ni convierten a esos clientes en compradores de la web. No mezclar los saldos/cobros de su negocio externo con el dinero del ADMIN ni comisión de SUPER RESELLER.
- El ADMIN ve activación, cargo de S/10, vigencia y estado del complemento para facturación y soporte; **no adquiere acceso general a los clientes o credenciales privadas externos del RESELLER** por ese pago.
- Servicios iniciales Netflix, HBO/MAX, YouTube, ChatGPT, Paramount+, Prime Video, Canva, Crunchyroll; el usuario añade nuevas categorías.
- Cuenta principal: proveedor, alias, identificador seguro, fecha de compra/inicio/fin, costo, espacios disponibles, suspendida/vencida, notas. Perfiles P1, P2, P3… con cliente, fecha de conexión, inicio/fin, 30/60/90 días pactados, PIN/identificador, precio, pagado/debe, duración consumida y días restantes.
- Si un cliente termina anticipadamente o una cuenta vence antes que el perfil, registrar días sobrantes, suspender/reactivar, mover a otra cuenta libre y conservar la vigencia pagada, sin doble cobro y con trazabilidad.
- "Atención de hoy": vencen hoy/próximos, deudores, cuentas principales por renovar, espacios libres y los que se liberan hoy/en 3 días/en 7 días; notificaciones WhatsApp preparadas, filtros, informes y búsqueda inteligente.
- Nunca exponer contraseñas, credenciales o PIN privados en catálogo público o logs; cifrado, permisos de propietario y límites de acceso.

## 8. Reglas compartidas por los cuatro negocios
- **TODOS** tienen buscador inteligente para clientes, cuentas, productos, operaciones, nombres, DNI/códigos y vencimientos, según sus datos aplicables; tolerancia a tildes, variaciones razonables, búsqueda parcial, filtros y permisos RLS.
- Todos muestran días consumidos/restantes, estado, fecha inicial y final con hora final **23:59 hora de Lima**, tanto para suscripción como para contratos/plazos que correspondan.
- **MI COCHERA:** agregar el campo **PLACA VEHICULAR OPCIONAL** cuando el registro corresponde a vehículo; no obligar a carritos a tener placa. Podrá distinguir tipo de bien CARRO_COMERCIAL / VEHICULO para ofrecer campos contextuales.
- **COBRA YA:** búsqueda en prestatarios, préstamos, cuotas, pagos y moras.
- **MI ALQUILER:** búsqueda en inmuebles/habitaciones/locales, inquilinos, contratos, documentos, medidores y cobros; funciones V161.2–V161.4 siguen pendientes de activar en producción hasta las 24 E2E.
- **STREAM BULL'S:** búsqueda en productos, vendedores, compradores y cuentas externas propias, con protección de datos personales.

## 9. Datos y desarrollo pendiente (STAGING)
Tablas/entidades propuestas: vendedores/roles por negocio, perfil comercial y WhatsApp, membresías, tasas y auditoría de comisiones, categorías, publicaciones, inventario y reservas, órdenes, entregas, recompensas, balance de obligaciones por vendedor, solicitudes y comprobantes de liquidación, módulos externos y perfiles, eventos de suspensión, historial de búsquedas limitado y configurable.
- Complemento externo: entidad de derecho temporal por RESELLER con fecha inicio/fin, importe S/10, recibo del ledger REAL, request_id idempotente, historial de activaciones y estado. Datos separados de inventario y compradores del catálogo, con RLS de propietario y guardas server-side incluso cuando esté vencido. No borrar registros al expirar.

Autorización: roles asignados por ADMIN en DB con RLS; acciones de stock, pago y liquidación idempotentes solo en backend. No mezclar el ledger de seller-payables con la billetera real compartida ni con bonos de activación.

## 10. Recomendaciones adicionales
- Sistema de reputación del vendedor, incidencias, reportes y suspensión por fraude, sin preaprobación ordinaria de cada publicación.
- Controles de publicaciones duplicadas, propiedad/licencia de servicios digitales, cancelación y reembolso.
- Avisos de stock bajo, suscripción próxima a vencer, solicitudes de pago y cobros disputados.
- Indicadores ADMIN de vendedores más activos, ventas por servicio, margen y cartera pendiente; conciliación de pagos verificables y exportaciones.
- Registro de quién creó, cambió o retiró un producto y de cada modificación de comisión; nunca cambiar comisión histórica.

## 11. Alcance implementado en esta rama
Solo **contrato de negocio, cálculo puro verificable y tests**. No hay todavía nuevas tablas en Supabase, publicación conectada, stock transaccional, cobros ni pagos reales. Ningún dato de producción cambia. Antes de habilitar comercio: aprobar migraciones staging, endpoints/RPC, RLS, simulación concurrente de inventario, cobros firmados, entrega confirmada y flujo de reembolsos y liquidaciones.
