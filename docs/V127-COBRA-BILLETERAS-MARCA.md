# CLAN CARTAN V127 — Billeteras bidireccionales y nueva identidad COBRA YA

Fecha: 18-10-2026.

## Implementado
- Botón compacto **⇄ Transferir** junto a los saldos COBRA y BULL en la barra superior tras iniciar sesión.
- Botón **⇄ Mis billeteras** en la cabecera de COBRA YA; se vincula también el botón existente «Transferir» de su panel.
- Ventana simple con origen, destino, botón ⇄ para invertir dirección, tipo de saldo (prueba o real confirmado), importe, «Todo» y confirmación final «Transferir».
- Ambos sentidos permitidos: COBRA YA → STREAM BULL’S y STREAM BULL’S → COBRA YA, solo entre billeteras de **una misma cuenta**. Ninguna opción para indicar otro usuario.
- Muestra saldos separados para pruebas y reales; el selector nunca mezcla saldos. Los dos importes de la cabecera histórica continúan siendo de prueba y se identifican mediante texto informativo de accesibilidad.
- Recarga y transferencia son acciones diferentes: nunca se considera un depósito no confirmado saldo real.
- Los saldos de prueba usan el RPC ya existente `cc_transfer_test_balance`. Los reales usan el nuevo RPC `cc_transfer_real_balance`.
- En la barra superior, COBRA y BULL muestran **saldo real confirmado** como importe principal y un renglón **Prueba** como secundario; el usuario nunca confunde ambos tipos. El modal selecciona el saldo real si existe saldo real positivo, o el de prueba en caso contrario.
- Supabase migración `v127_real_wallet_self_transfer`: tabla de auditoría `cc_real_wallet_transfers` con RLS y lectura solo del titular, RPC con `auth.uid()`, bloqueo transaccional, saldo insuficiente, protección contra saldos negativos e importe de máximo dos decimales. No se dan permisos directos de INSERT/UPDATE de los saldos reales a usuarios.
- Refresco de ambas billeteras tras transferir, y de estado de acceso a COBRA YA cuando cambia el saldo de prueba.
- Portada: texto comercial explicativo de una cuenta/dos negocios/billeteras. Tarjeta COBRA YA explica clientes, préstamos, cronogramas, abonos y vencimientos.
- Branding COBRA YA: logo original ya incorporado en la variable `--ccc-cobra-logo` reutilizado, fondo oscuro con degradados turquesa, efectos sutiles, diseño adaptable a móvil. Sin nuevas imágenes ni maquetas.

## Verificación técnica
- JavaScript V127 validado sintácticamente.
- Acceso a RPC real para `authenticated`; denegado para `anon`; no hay permiso UPDATE directo sobre `cc_real_service_wallets` para `authenticated`.
- Al momento de revisión no existen transferencias reales o de prueba registradas; no se crean movimientos ficticios para verificar producción.
- Pendiente prueba manual completa con una cuenta autenticada que tenga saldo disponible (real o de prueba) en origen y confirmar el comportamiento en dispositivos móviles.

## Exclusiones vigentes
- Nunca enviar saldo entre usuarios, retirar dinero ni pagar préstamos de prestatarios desde las billeteras.
- No convertir automáticamente saldo simulado en efectivo. Las suscripciones legadas siguen basadas en la contabilidad de prueba hasta su migración verificada.
- La recepción y acreditación automática de fondos nuevos por Binance/Lemon permanece pendiente de integrar verificaciones independientes del proveedor.
