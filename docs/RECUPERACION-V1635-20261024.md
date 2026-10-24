# CLAN CARTAN — recuperación incremental V163.5 sobre la versión actual
Fecha de verificación: 2026-10-24 (UTC).

## Cambios efectivamente realizados
- Rama: `feature/v1635-wallet-lectura-sobre-main-20261024`, basada en `main` publicado `6b305d3`.
- PR borrador: https://github.com/GianfrancoCg020614/CLAN-CARTAN/pull/42
- `scripts/v1635-rescate-ui.js`: preserva las cuatro tarjetas y el tema visual y carga el lector read-only.
- `scripts/v1635-wallet-resumen.js`: consulta `cc_real_service_wallets` con el JWT de CLAN CARTAN y `user_id`, muestra total y desglose en cuatro servicios (PEN) sin acreditar ni gastar. Evita duplicados, importes inválidos, respuestas atrasadas y exposición del resumen tras logout.
- Sin cambios en Auth, registro, consentimientos, `scripts/v172-clan-referrals.js`, pagos ni funciones SQL.

## Resultados comprobados
- GitHub Actions `Validar portal CLAN CARTAN`: **SUCCESS**, corrida 40073496796 en commit `b76401d8`: https://github.com/GianfrancoCg020614/CLAN-CARTAN/actions/runs/40073496796
- Vista previa Cloudflare **SUCCESS** para el mismo commit: https://3a384c23.clan-cartan.pages.dev
- Supabase producción: tabla `cc_real_service_wallets` con RLS y política de lectura `auth.uid() = user_id` para `authenticated`. El recuento agregado observado en esa consulta no mostró registros de saldo. Es necesario probar posteriormente con usuarios de prueba autorizados; **no afirmar que un usuario existente tenga saldo**.
- Supabase staging `CLAN-CARTAN-STAGING-PARTE1` contiene `cc_clan_real_wallets` y `cc_clan_activation_bonus_wallets` bajo RLS. El modelo final **no es todavía** el de `main`.
- Seguridad: linter Supabase muestra advertencias previas sobre funciones `SECURITY DEFINER` ejecutables por roles amplios, incluidas cuatro validaciones de código accesibles anónimamente. Se debe revisar el diseño antes de activar nuevos procesos. No se cambian permisos automáticamente.
- Intento de navegador externo no ejecutado por saldo insuficiente del proveedor TinyFish. Chrome headless incluido en CI pasa comprobaciones públicas previas; no equivale a E2E con sesión.

## Pendientes y puertas de seguridad
1. MI ALQUILER V161.2–V161.4: recuperación funcional con 24 E2E pendientes en staging equipado con migraciones y usuarios sintéticos; no enlazar desde producción hasta aprobarlos.
2. Billetera **contable única**: conciliar `cc_real_service_wallets`, `ma_wallets`, ledgers, TEST y bonos, y migrar con contrato de no doble gasto. Rama staging ya existente `feature/parte3-billetera-unica-bonos-separados` contiene avances; **no** fusionarla íntegra sobre main.
3. Bonos ADMIN y bienvenida: solo activaciones de COBRA YA / MI COCHERA / MI ALQUILER, no STREAM BULL'S ni transferencias. En backend, no solo por apariencia.
4. Recompensas por referidos: acreditar como REAL solo pagos verificables con comprobante de servicio real y antifraude, una vez por periodo según reglas, y reversos auditables. Las pruebas sintéticas en staging no demuestran pasarelas o entregas reales.
5. Prueba browser con login y logout en preview, distintos móviles, permiso por titular, respaldo y rollback. No emplear identidades o datos de producción como fixtures.
6. No habilitar operaciones ni cobros externos automáticos por este cambio de UI.

## Decisión
Continuar sobre la **misma aplicación CLAN CARTAN**, reutilizar componentes originales de COBRA YA, sin construir un COBRA YA independiente. Mantener PR en borrador y `main` intacto hasta E2E y aprobación de integración financiera.
