# CLAN CARTAN — V103: seguridad de billeteras, escalabilidad y validación

Fecha: 17 de octubre de 2026. Base: V102. Todas las cantidades económicas descritas corresponden al piloto con saldo **ficticio**.

## Supabase: saldo canónico por servicio

Migración `use_canonical_cobra_wallet_v103`:
- `cy_subscription_status()` consulta `cc_service_wallets` para el saldo de COBRA YA, en lugar de `cc_wallets` (tabla heredada).
- `cc_admin_reseller_requests()` utiliza la misma billetera por servicio para sus reportes ADMIN.
- `cc_admin_test_credit(email,amount,reference)` acredita el saldo de la billetera `COBRA_YA`; mantiene la referencia única del libro de movimientos y sincroniza el registro heredado solo por compatibilidad.

Pruebas SQL en transacciones **revertidas**:
- Transferencia ficticia COBRA YA → STREAM BULL'S: el saldo consultado coincide con la billetera de servicio.
- Crédito administrativo ficticio: se acredita a la billetera canónica y la segunda acreditación con igual referencia resulta rechazada.
- Comprobaciones de aislamiento: un usuario sin billetera no puede consultar el saldo de otro usuario.

## Menos privilegios innecesarios

Migración `least_privilege_self_read_functions_v103`: se cambió de `SECURITY DEFINER` a `SECURITY INVOKER` para las tres funciones de consulta personal siguientes: `cc_my_test_wallets()`, `cy_subscription_status()` y `sb_my_affiliation_test()`. Las tablas cuentan con RLS y permisos SELECT del rol autenticado.

Los avisos de `authenticated_security_definer_function_executable` del asesor de Supabase descendieron **de 18 a 15**. Quince funciones privilegiadas todavía requieren auditoría; no deben revocarse indiscriminadamente, porque algunas implementan operaciones de backend necesarias.

Tres operaciones adicionales sobre préstamo ajeno —corregir, prorrogar y cerrar— fueron rechazadas en simulaciones SQL autenticadas, siempre usando ROLLBACK. No sustituyen las pruebas de sesiones reales de navegador.

## Preparación para crecimiento

Migración `index_foreign_keys_for_scale_v103`: trece índices destinados a búsquedas por claves foráneas de membresías, billeteras, recargas, préstamos, cuotas, correcciones, extensiones y abonos. El asesor de Supabase dejó de reportar claves foráneas sin índice. El asesor puede catalogar temporalmente los índices nuevos como no usados debido al escaso volumen del piloto; eso no demuestra que sean innecesarios.

## Frontend GitHub

- Registro de cuenta y restablecimiento de contraseña: mínimo **12 caracteres** en las validaciones del navegador.
- Se verificó la sintaxis de los **14 scripts en línea** del portal.
- Se amplió `scripts/check-v100.mjs` para verificar los requisitos de contraseña, además de la ausencia de retiros y renovación automática.
- Nuevo flujo en `.github/workflows/validar-portal.yml`: en cada push/PR a main ejecuta una comprobación estática con Node 22, sin secretos ni servicios externos. La ejecución del primer workflow aún no se ha verificado desde esta conexión.

## Datos preservados

Las consultas posteriores reportaron 9 préstamos, 6 abonos, 18 cuotas, 0 transferencias permanentes nuevas y 0 tablas públicas sin RLS. Los movimientos de dinero ficticio de las pruebas se revirtieron.

## Pendientes externos o de aceptación

1. **Cloudflare Pages:** verificar desde su panel que el último commit V103 esté desplegado y probar la UI en celular y laptop. El entorno de consulta no pudo acceder al sitio público; esto no demuestra que esté caído.
2. **SMTP de confirmación y recuperación:** el SMTP por defecto tiene limitaciones. Integrar un proveedor confirmado compatible con Supabase, sin asumir que Cloudflare Email Routing sirve para enviar SMTP. No introducir claves privadas en GitHub ni en imágenes enviadas al chat.
3. **Autenticación real:** probar registro/confirmación, ingreso/salida, recuperación, actualización del token y dos usuarios independientes.
4. **Funciones privilegiadas:** revisar las 15 restantes con pruebas de denegación/permiso por rol.
5. **STREAM BULL'S:** catálogo público de prototipo y beneficios de afiliados deben validarse en frontend y Supabase.
6. **Operación comercial:** documentación legal definitiva, pagos verificados y revisión normativa antes de activar transacciones reales.

No comprar ningún plan sin autorización; no habilitar retiros ni pagos de préstamos mediante las billeteras.
