# CLAN CARTAN — Nuevas reglas aprobadas el 24/10/2026

**Alcance:** STREAM BULL'S + reglas comunes de COBRA YA, MI COCHERA y MI ALQUILER. Reemplaza las referencias históricas a una afiliación única de S/20 en STREAM BULL'S. **Especificación y primera capa de cálculos: NO ES aún un catálogo de ventas ni una liquidación financiera habilitada.**

## 1. Registro y roles
- Registro normal ofrece solamente AFILIADO (AFFILIATE) y RESELLER.
- El AFILIADO paga precio PÚBLICO, puede usar la billetera CLAN y no adquiere privilegios por registrarse.
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
- Vendedor solo consulta sus productos, ventas, ganancias, comisiones y solicitudes, no las operaciones de otros vendedores.
- Periodicidad **semanal, quincenal o mensual** o liquidación a pedido del SUPER RESELLER. Solicitar pago no lo ejecuta automáticamente: ADMIN acepta solicitud, transfiere/abona externamente, registra evidencia, fecha, importe y referencia. Solo un pago verificado reduce el saldo por liquidar.
- Vista de obligaciones y saldos por liquidar separada de los saldos de billetera REAL de compras. Prevención de doble pago, saldo insuficiente de caja, fondos retenidos, contracargos y deudas de ajuste.

## 7. Complemento opcional del RESELLER — S/10
- RESELLER puede contratar por **S/10 adicionales** una pestaña de **CONTROL DE CUENTAS EXTERNAS**. Antes de cobrar falta definir explícitamente si S/10 es único, anual, mensual o por cada periodo; guardar esa configuración en servidor.
- Acceso opcional solo cuando el derecho esté activado, sin autorizar publicaciones públicas ni otorgar SUPER_RESELLER.
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

Autorización: roles asignados por ADMIN en DB con RLS; acciones de stock, pago y liquidación idempotentes solo en backend. No mezclar el ledger de seller-payables con la billetera real compartida ni con bonos de activación.

## 10. Recomendaciones adicionales
- Sistema de reputación del vendedor, incidencias, reportes y suspensión por fraude, sin preaprobación ordinaria de cada publicación.
- Controles de publicaciones duplicadas, propiedad/licencia de servicios digitales, cancelación y reembolso.
- Avisos de stock bajo, suscripción próxima a vencer, solicitudes de pago y cobros disputados.
- Indicadores ADMIN de vendedores más activos, ventas por servicio, margen y cartera pendiente; conciliación de pagos verificables y exportaciones.
- Registro de quién creó, cambió o retiró un producto y de cada modificación de comisión; nunca cambiar comisión histórica.

## 11. Alcance implementado en esta rama
Solo **contrato de negocio, cálculo puro verificable y tests**. No hay todavía nuevas tablas en Supabase, publicación conectada, stock transaccional, cobros ni pagos reales. Ningún dato de producción cambia. Antes de habilitar comercio: aprobar migraciones staging, endpoints/RPC, RLS, simulación concurrente de inventario, cobros firmados, entrega confirmada y flujo de reembolsos y liquidaciones.
