# V316 — Categoría real y activaciones independientes

Base: V315, main 22230f36fb695c0a2a17bb4359064b6207226de0. Se conservan repositorio, Pages y Supabase existentes.

## Comportamiento

- Sin activaciones vigentes: AFILIADO. Con una o varias: RESELLER, detallando los negocios activos. Una etiqueta histórica de membresía pendiente no convierte a la cuenta en reseller.
- SÚPER RESELLER requiere permiso ADMIN y membresía anual STREAM BULL’S vigente; se muestra vinculado a ese negocio. Un permiso guardado sin membresía vigente no concede esa categoría ni publicaciones.
- ADMIN ve los cuatro estados de cada cuenta, vencimientos, suspensión y origen de la última activación cuando está registrado. Los bonos de activación se distinguen del saldo real.
- El directorio filtra por categoría y por negocio activo, conserva los filtros al actualizar y cuenta afiliados y resellers activos sin confundir ADMIN con un cliente de pago.
- Cada cliente ve sus cuatro activaciones en el resumen. Se avisa cuando una vigencia termina en siete días o menos. Los estados vencidos conservan sus fechas e historial.
- «Retirar permiso Súper reseller» describe la acción sin prometer convertir en reseller a quien no tiene activación.
- STREAM BULL’S operativo se monta solo al entrar explícitamente en el negocio: ya no reemplaza el resumen general por coincidir un título. Se conservan los controles nativos de cuentas, clientes, vencimientos y posiciones. El acceso de supervisión conserva accesos útiles si el módulo no corresponde.

## Supabase

Migración aplicada: `20261104051658_v316_business_access_per_platform.sql` (versión registrada por Supabase). Agrega una consulta privada de las cuatro vigencias y una RPC autenticada que consulta únicamente al titular. Enriquece la RPC ADMIN existente sin cambiar su firma, campos anteriores ni guarda ADMIN.

La función privada usa SECURITY INVOKER, search_path vacío y no permite EXECUTE a anon/authenticated. La RPC propia no acepta un identificador de otro usuario; exige auth.uid(). La RPC ADMIN conserva su guarda y permisos anteriores. No se cambian filas de usuarios, roles, saldos, pagos ni membresías. No se crea ningún proyecto ni se modifica Auth/Turnstile.

Validación SQL de solo lectura antes de aplicar: sin cuenta retorna cuatro INACTIVE; CLAN3 no tiene activaciones y CLAN2 tiene STREAM BULL’S vigente. La misma consulta posterior coincide. Privilegios comprobados: anon sin acceso a ambas RPC, authenticated sin ejecución del helper con usuario arbitrario. Asesor de seguridad: cuatro avisos previos y cuatro posteriores, ninguno nuevo.

## Navegador

Fixtures con código real y API interceptada: ADMIN, afiliado, cada una de las cuatro plataformas, vencimientos/suspensión y fallos de consulta. Se verifican filtros, bonos separados, avisos de renovación, ausencia de permisos falsos, integración del módulo operativo nativo y ancho móvil. Los escenarios privados no ejecutan pagos ni cambian datos reales. Se añade la regresión V316 al workflow existente y se actualizan expectativas antiguas incompatibles con la clasificación solicitada.

Las etiquetas no sustituyen la autorización del servidor. Ante fallo de la consulta de vigencias, el panel queda sin verificar y bloquea operaciones sensibles. Un bono autorizado puede activar los tres negocios compatibles; no se describe como depósito o pago real, ni habilita STREAM BULL’S.
