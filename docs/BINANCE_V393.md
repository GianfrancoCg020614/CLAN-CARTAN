# V393 — Binance personal: cotización fija y aviso de uso único

La recarga utiliza el REC, la sesión, el registro de movimientos y la billetera existentes. Se conserva el QR oficial del proyecto. No se alteran préstamos ni los demás negocios.

## Funcionamiento

1. El cliente introduce USDT. El servidor consulta la misma referencia USD/PEN del catálogo (`open.er-api.com`) y USDT/USD de Coinbase; no supone paridad perfecta. Si faltan datos recientes o USDT se desvía más de 0,5%, no ofrece una cotización.
2. Se fija el importe PEN antes de pagar: tipo bruto redondeado a seis decimales, coste 0,25%, protección 2%, tipo neto a seis decimales e importe PEN a dos decimales. Ambos porcentajes se muestran antes de pagar. No se descuenta nada adicional al acreditar. Límites: PEN 5–1000, USDT ocho decimales, cinco cotizaciones por 24 horas, vigencia 15 minutos. El saldo PEN prometido se conserva; una condición de mercado insuficiente manda a revisión, sin reducirlo silenciosamente.
3. Solo el servicio autenticado de lectura del buzón puede registrar el recibo. Debe ser el aviso original entrante de `do-not-reply@ses.binance.com`, con DKIM/DMARC válidos, destinatario receptor cubierto por la firma DKIM efectivamente validada, plantilla de pago recibido y fecha/hora UTC original dentro del cuerpo. La fecha de llegada y del asunto no sustituyen la del pago.
4. La referencia interna `BMAIL-<SHA256>` usa cuenta receptora, nombre completo normalizado, USDT exactos y fecha/hora UTC. No se presenta como número de operación de Binance. Se conserva además la deduplicación por ID del mensaje. Una copia con otro ID no puede acreditar otra vez.
5. La primera vinculación pagador Binance → cuenta CLAN requiere comprobación de ADMIN. En **Control de recargas**, ADMIN selecciona el aviso original, confirma que corresponde al titular, registra evidencia y puede marcar la vinculación para futuras recargas. No basta con cambiar el nombre del perfil para reclamar pagos ajenos. El mismo nombre receptor/pagador no puede vincularse automáticamente a dos cuentas.
6. Tras la vinculación, una coincidencia exacta y única con una cotización pendiente puede acreditarse automáticamente. Otro pago del mismo monto necesita una fecha/hora original distinta y su propia solicitud. No se elige por coincidencias parciales.
7. Saldo, movimiento, reserva global del recibo, REC, auditoría y aviso consumido se confirman en una sola transacción. Hay bloqueos e índices únicos para solicitudes simultáneas. Los casos ambiguos o con fallos quedan en revisión y no se reasignan automáticamente después.

Se incorporan cinco tablas privadas con RLS, acceso de servicio y RPC con comprobaciones de propietario/ADMIN. La migración es aditiva; ninguna tabla histórica se elimina ni se renumeran movimientos. Se agrega un trigger de protección únicamente a los nuevos pedidos cotizados: una aprobación genérica no puede saltarse el recibo canónico.

## Publicación y reversión

- Base anterior: `6bbcb4017be93387fcbee662cba06ca7d61a9fb9`. Respaldo Git recuperable: `/workspace/clan-cartan-before-v393.bundle`.
- Código anterior de la función de correo: versión 18; conservar copia antes del despliegue. Las funciones SQL existentes relevantes se conservan en `supabase/recovery/v393_*.sql`; son código, no copias de tokens.
- Aplicar la migración V393 con el sistema desactivado por defecto. Desplegar `cc-recharge-mail` con el protocolo nuevo. Configurar la única conexión receptora existente, sin crear otro buzón ni exponer sus tokens. Activar únicamente después de las comprobaciones.
- Reversión: desactivar `cc_internal.binance393_settings.enabled`, restaurar la versión anterior del código Edge y revertir el commit web usando el flujo de publicación existente. **Conservar las tablas nuevas, recibos consumidos, movimientos y el guard de pedidos ya cotizados**; revisar manualmente los pedidos pendientes. No se debe borrar historial ni revertir créditos confirmados como si fueran código.
- La política comercial anterior de Binance personal no se marca artificialmente como verificada. Este es un protocolo de aviso bancario aprobado por el propietario, distinto de Binance Merchant y de ofertas P2P ejecutables. Las fuentes de referencia no se presentan como operaciones reales de conversión.

## Pruebas

- `node scripts/test-v393-binance.mjs`: integridad del aviso, UTC real, firma del destinatario, moneda, cotización, datos antiguos/depeg, identidad autenticada e ingreso sin sesión.
- `scripts/sql/v393-regression.sql` y `bash scripts/test-v393-concurrency.sh`, en PostgreSQL aislado con las bases financieras previas: precisión decimal, permisos, propietario, idempotencia, mismo pago/otro correo, igual importe/hora diferente, vínculo ADMIN, carrera manual/automática, seis trabajadores, rollback, ambigüedad y regresión de Lemon.
- `python scripts/test-v393-recharges-ui.py`: componentes de producción con API ficticia en Chromium, PC/celular, cierre/Escape, reapertura, errores sin QR, menú y flujo PEN de Lemon. Las capturas de este ensayo son **datos ficticios**, no comprobantes ni sesiones reales de clientes.
- Regresiones existentes de avisos V321/V392, programador y worker.

La prueba de extremo a extremo con una transferencia real no se simula ni se declara ejecutada. Requiere un pago real posterior a la publicación y la primera comprobación de ADMIN. No se acreditan avisos históricos a cotizaciones nuevas.
