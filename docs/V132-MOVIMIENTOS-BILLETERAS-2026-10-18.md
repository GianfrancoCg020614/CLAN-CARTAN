# CLAN CARTAN V132 — Movimientos reales en mis billeteras
Fecha de implementación: 18-10-2026. Continuidad acumulativa desde V131; V130 sigue como referencia histórica.

## Inspiración externa y límites de lo verificable
- Captura aportada de CyberLink Store: columnas Fecha, Tipo, Monto, Estado, Liberación y Descripción; operaciones «Recarga automática Lemon — BCP/BBVA — Op: UUID»; abonos positivos y compras negativas.
- Se deduce únicamente que **su historial etiqueta algunas recargas Lemon con los bancos BCP/BBVA y una referencia de operación**.
- NO se ha identificado API bancaria, webhook, proveedor o integración privada de CyberLink. La etiqueta BCP/BBVA no demuestra acceso autorizado a movimientos de Lemon ni certifica que la referencia visible sea el ID original del banco. No afirmar mecanismo no comprobado.

## Implementación
- Nueva vista Movimientos dentro de la billetera compartida; filtros COBRA YA / STREAM BULL’S, búsqueda por fecha/tipo/referencia/importe, 10/20/50 por página, botón PDF (imprimir/guardar PDF), descarga Excel compatible CSV UTF-8, estado y descripción.
- Se toman datos REALES únicamente desde RPC `cc_my_real_wallet_movements`, con invoker/RLS y `auth.uid()`. Admite máximo 500 entradas. No mezcla saldo de prueba ni dinero de préstamos de terceros.
- Las órdenes no acreditadas se muestran «pendiente», «expirada», etc. Sin aumentar saldo. Recargas acreditadas se toman del ledger verificado, con conciliación contra duplicados. Historial Binance Merchant desde órdenes y transferencias propias con signo positivo/negativo.
- Se añadió `source_bank` opcional a ledger real; solo se muestra banco emisor si el verificador autorizado lo informó realmente. Nunca inventar BCP/BBVA para CLAN CARTAN.
- `cc_real_wallet_spends` y `cc_charge_verified_real_wallet` quedan preparados para compras/activaciones FUTURAS de saldo real, con consumo atómico/idempotente, permiso exclusivo de service_role. No conectar suscripciones antiguas que todavía dependen de balance_test sin conversión explícita y pruebas.
- SQL aplicado al proyecto Supabase `pqalxtrcyrpmwqdlibqd`, nombre de migración `v132_wallet_movements`. Consulta de privilegios: solo `authenticated` puede leer movimientos; `anon` no; `authenticated` no puede ejecutar función de gasto, `service_role` sí. Consulta sin sesión real devolvió cero filas.
- En el momento de inspección había 0 depósitos, 0 transferencias reales, 0 gastos reales, 0 órdenes Merchant y 0 registros de billeteras reales. **No crear movimientos ficticios para llenar la tabla.**
- El estado de habilitación de Lemon/DALE y Binance sigue en false hasta proveedor auténtico. No se cobran depósitos ni se activa ningún webhook real.

## Límites de informes
- Descarga CSV Excel-compatible, no archivo XLSX nativo; el botón PDF abre impresión para guardar PDF, no entrega PDF generado desde servidor.
- Se cargan como máximo los últimos 500 movimientos por sesión; búsquedas y exportación se limitan a esos registros. Para alto volumen desarrollar cursor/paginación server-side.
- El historial de ventas reales depende de que la futura venta utilice función atómica correspondiente; actualmente las compras históricas de pruebas permanecen fuera del historial REAL.

## Próximos controles
1. Validar los flujos en navegador autenticado como usuario real con pedidos acreditados reales y gastos, sin inventar transacciones.
2. Cuando Lemon entregue API/webhook, verificar banco emisor, referencia única, monto y destinatario antes de registrar `source_bank`.
3. Habilitar recargas solo tras pruebas de conciliación y duplicados.
4. No modificar cronogramas, cartera PNP, clientes, ni transferencias de prueba.
