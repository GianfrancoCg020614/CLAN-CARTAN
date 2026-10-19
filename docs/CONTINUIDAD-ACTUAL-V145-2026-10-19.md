# CLAN CARTAN EIRL. · CONTINUIDAD OPERATIVA V145 · 19/10/2026

Base conservada: V142 y V143. Código en main y migración consolidada `supabase/migrations/20261019233000_v145_finanzas_admin_bono_restringido.sql`.

## Implementación
- Se distingue saldo real recibido por recargas verificadas, saldo promocional exclusivo y saldos históricos TEST. No se convierten ni mezclan.
- ADMIN gestiona bonos gratuitos para RESELLER COBRA YA, con correo, importe, motivo y referencia idempotente; el destinatario no puede ser el mismo administrador. El bono se acredita en `cc_cobra_welcome_bonus_wallets`, aislado de la billetera real.
- El RESELLER puede activar COBRA YA por 30 días utilizando S/15 de bono mediante la RPC `cc_activate_cobra_welcome_bonus()`. Esta operación no genera un depósito, una comisión de S/5 ni un traslado a STREAM BULL'S.
- Para activar con dinero real se usa exclusivamente `cc_pay_cobra_subscription_real()`; hasta verificar el proveedor y la autorización comercial sigue deshabilitada por `cc_cobra_real_payment_settings.enabled=false`.
- Las RPC que generan suscripciones, afiliaciones, recargas o transferencias TEST ya no son ejecutables por usuarios; el historial no fue borrado.
- El panel ADMIN real se abre desde la portada, muestra formulario de bonos, cola manual condicionada a depósito auténtico, resumen contable operativo, historial paginado de operaciones y auditoría de saldos antes/después.
- La portada V145 y nuevas reglas de UX se integran a través de `scripts/patch-v145-production.mjs` y el workflow `.github/workflows/publicar-v145.yml`, porque `index.html` es grande. La comprobación de despliegue es independiente.

## Prohibiciones y precauciones
- No retiros, no préstamos desde billeteras, no transferencias entre usuarios.
- Solo saldo real confirmado del MISMO usuario puede transferirse entre COBRA YA y STREAM BULL'S.
- Los bonos gratuitos no constituyen ingreso por recarga ni son transferibles.
- Los comprobantes internos no reemplazan comprobantes SUNAT. Recarga pagada no es automáticamente utilidad neta.
- Se bloqueó la realización de compras y afiliaciones locales ficticias en la interfaz; STREAM BULL'S no tiene todavía una pasarela comercial validada.
- No borrar registros existentes hasta instrucción del titular.
- Para habilitar cobranza automática hacen falta autorización Lemon/DALE y Binance, callbacks seguros, conciliación con depósito genuino, pruebas controladas de E2E y términos/política aprobados.

## Estado de calidad
- GitHub Actions `Validar portal CLAN CARTAN` y `Verificar despliegue Cloudflare Pages` aprobados en ejecuciones de V145.
- Portada V145 verificada en `https://www.clancartan.com/` y `https://clan-cartan.pages.dev/` mediante extracción de metadatos.
- El flujo autenticado ADMIN/RESELLER no se ha probado con credenciales del usuario desde navegador; no se debe afirmar que todo escenario E2E está validado.
- La revisión RLS de Supabase mantiene advertencias históricas en funciones `SECURITY DEFINER` expuestas (algunas intencionales); requieren auditoría adicional antes de manejar pagos automatizados.

## Para siguiente chat
Retomar desde V145 sin borrar usuarios, saldos, préstamos, cronogramas, datos de DNI, atribuciones ni registros TEST históricos. Revisar primero versiones GitHub/Cloudflare y migraciones Supabase, después terminar autorización comercial Lemon/DALE y Binance, QA con cuentas reales autorizadas y documentación contractual definitiva.
