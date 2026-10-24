# CLAN CARTAN — Parte 4/7: acreditación automática por referidos

## Entorno implementado
Se aplicó migración **solo en Supabase STAGING** (proyecto szcplebbqhtcgxhvmxdv), nombre `parte4_acreditacion_referidos_staging_server_only`. No se aplicó a PROD.

Objetos creados:
- `public.cc_clan_verified_real_activations`: evidencia de activaciones, con `activation_key` y `source_receipt_id` únicos, servicio, referido, monto REAL positivo y fecha comprobada. La evidencia debe introducirla exclusivamente un backend que haya validado de forma independiente el pago; NO confiar en parámetros del navegador.
- `public.cc_clan_credit_verified_referral(p_activation_key text)`: RPC solo para `service_role`; niega anónimo y usuario autenticado.
- La función comprueba evidencia verificada, atribución de referido, rol activo RESELLER/SUPER_RESELLER, mes calendario `America/Lima`, unicidad por invitador+referido+mes, y llama `cc_clan_post_wallet_operation` por **S/ 5 REAL** en la misma transacción. Si ya pagó el mes responde `ALREADY_PAID_THIS_MONTH`.
- La recompensa pasa a `PAID` únicamente tras completar el asiento de saldo.

## Estado y bloqueos para pasar a producción
1. **Falta conectar el flujo real de activaciones cobradas** para insertar `cc_clan_verified_real_activations` únicamente desde el servidor tras conciliación de pago REAL. Sin esa conexión, no hay créditos automáticos.
2. Realizar pruebas end-to-end con identidades STAGING, con pagos de prueba y verificación del asiento de S/5, concurrencia e idempotencia; probar mismo referido en distintas plataformas durante un mes y al cambiar mes Lima.
3. Revisar el ciclo de reversiones, fraude y permisos de facturación; verificar rol/atribución congelados al registro del cliente.
4. Tras las pruebas, promover la migración completa y servidor a PROD. No ejecutar manualmente contra fondos productivos.

**Regla confirmada:** Sin aprobación ADMIN al momento de recompensa: abono automático al RESELLER/SUPER RESELLER por un único referido y mes una vez activación REAL confirmada. Bonos de bienvenida no califican.
