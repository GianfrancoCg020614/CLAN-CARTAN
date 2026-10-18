# CLAN CARTAN — Punto de continuidad y recuperación de V106

**Registro:** 18-OCT-2026 (fecha UTC de comprobación). **Estado del portal:** V106.  
**Responsable:** CLAN CARTAN E.I.R.L.  
**Dominio oficial previsto:** https://www.clancartan.com/  
**Cloudflare Pages disponible:** https://clan-cartan.pages.dev/  
**Repositorio:** https://github.com/GianfrancoCg020614/CLAN-CARTAN

## Recuperación del código

- Rama principal de trabajo: `main`.
- Rama inmutable de resguardo creada para este punto: `resguardo/v106-2026-10-18`.
- Commit exacto conservado en ese resguardo: `846577227f356e1f8309c4559c43a6a422334a25`.
- La rama protege una copia del **código** ante cambios posteriores; no sustituye un respaldo de base de datos.
- El código fuente de la función Supabase `cc-consulta-dni` está además versionado en `supabase/functions/cc-consulta-dni/index.ts`. No incluir claves ni tokens secretos.

## Datos en Supabase: copia interna no destructiva

- Proyecto Supabase: `COBRA-YA` (`pqalxtrcyrpmwqdlibqd`), región `sa-east-1`, estado observado `ACTIVE_HEALTHY`.
- En Supabase se creó el esquema cerrado `cc_snapshot_v106_20261018` con una copia puntual de **23 tablas de aplicación** del esquema `public`.
- Verificación en el momento de la creación: 23 tablas de origen y 23 copias; 7 clientes, 9 préstamos, 6 abonos y 1 registro de billetera por lado.
- El esquema no concede USAGE a `anon` ni `authenticated` y las tablas originales siguen en `public` con RLS.
- Copia puntual: **NO** es una copia automática ni fuera de Supabase; **NO** incluye `auth.users`, identidades del servicio Auth, secretos, SMTP, DNS, archivos externos ni configuraciones de Cloudflare. Para recuperación integral se necesita un respaldo independiente siguiendo las opciones del panel o exportación controlada.
- No restaurar encima de tablas de producción sin revisar manualmente claves, integridad referencial, roles y fecha del snapshot.

## Estado funcional preservado

- STREAM BULL'S: catálogo público y servicios por afiliación/roles; no borrar vistas, registros ni el logo.
- COBRA YA: control de préstamos otorgados por prestamistas terceros; historial, cronograma, abonos, ampliaciones, clientes, intereses y garantías. CLAN CARTAN **no** presta dinero.
- Una sola cuenta entre negocios, roles con backend Supabase y acceso por pago voluntario, pendiente de pruebas finales.
- Billeteras internas: solamente para servicios propios; movimientos entre las dos billeteras de **un mismo usuario**, no retiros, no pago de préstamos y no transferencias entre usuarios. Mantener piloto **sin dinero real**.
- Registro V106: formulario OTP de seis dígitos en pantalla. La plantilla de Supabase Auth debe usar código `{{ .Token }}`, y falta probar SMTP y verificación real.
- Consulta DNI V106: búsqueda local segura de clientes existentes; Edge Function externa preparada, con consentimiento y cuota interna de 100 intentos/mes. **APIPERU_TOKEN aún no configurado**; cuando no hay servicio, ingreso manual. Verificar autorización y cuota reales del proveedor antes de activarla.
- WhatsApp y correo de clientes pueden quedar vacíos, sin la etiqueta visible «opcional».
- Seguridad: nunca publicar contraseñas, token API Perú, credenciales Supabase privilegiadas o datos personales en GitHub.

## Comprobaciones y pendientes

- GitHub Actions `Validar portal CLAN CARTAN`: ejecución sobre `8465772` concluida correctamente.
- GitHub Actions `pages build and deployment`: ejecución sobre `8465772` concluida correctamente.
- El verificador distingue DNS del contenido y responde sin esperar doce intentos. Resultado observado: el dominio `www.clancartan.com` **no resuelve en DNS**, aunque `clan-cartan.pages.dev` publicó la marca `V106-20261017`.
- **Pendiente Cloudflare:** vincular el dominio personalizado `www.clancartan.com` al proyecto Pages `clan-cartan`, configurar el CNAME/HTTPS desde el panel y comprobar DNS real.
- **Pendiente Supabase Auth:** URL oficial, redirects permitidos, plantilla de email OTP y entrega SMTP.
- **Pendiente API Perú:** crear/configurar token como secreto del backend; pruebas legítimas y política de privacidad.
- **Pendiente lanzamiento:** pruebas funcionales con distintas cuentas y revisión legal, consentimiento y permisos.
- No se ha demostrado funcionamiento de punta a punta del registro OTP o del proveedor DNI externo.

## Regla de continuidad

1. Continuar desde `main` y la versión V106 o posterior; **no volver a V99/V105 salvo restauración explícita**.
2. Antes de cambios delicados, crear nuevo punto de recuperación o exportación apropiada.
3. No sobrescribir ni borrar históricos de pruebas, clientes, préstamos, intereses, pagos, suscripciones, billeteras o roles.
4. No atribuir «dominio conectado», «correo OTP probado», «API DNI activa» ni «respaldo externo completo» sin comprobación objetiva.
