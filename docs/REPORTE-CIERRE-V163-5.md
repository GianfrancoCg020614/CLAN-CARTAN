# CLAN CARTAN — Preservación y continuidad V163.5
Fecha 22/10/2026. Este registro se guarda en GitHub en una rama separada para conservar el progreso de las cinco fases.
- V163.1 branding/logo en tarjeta y cabecera, acceso común; hereda PR #30.
- V163.2 compatible con schema V162.1, 77/77 checks leídos.
- V163.3 API Perú `.dev` preparada, plantilla OTP importada desde PR #29, Turnstile y WhatsApp conservados sin activación riesgosa.
- V163.4 auditoría SQL 174/174 sin cambios en tablas, 24 E2E siguen pendientes.
- V163.5 flujo GitHub actualizado con chequeo estático y bloqueo de publicación hasta validaciones certificadas.
- Producción `main` sigue en commit `1119615c6aed1d9bc5ef6f2ad0af370d3128e78a` observado al preparar esta rama; confirmar al publicar.
- No se ejecutaron transacciones, migraciones destructivas ni llamadas a terceros con DNI, OTP o WhatsApp. Si se necesitara rollback, restaurar `main` sin mezclar schema experimental.

## Avance efectivo de integración, verificado mediante conectores
- GitHub: rama `feature/v163-5-integracion-segura`, PR borrador #31: https://github.com/GianfrancoCg020614/CLAN-CARTAN/pull/31.
- GitHub Actions: flujo completo `Validar portal CLAN CARTAN` aprobado en commit `ec7bc8beb18d5a2f1683807b852b69aa54835c26`; las aserciones antiguas V161.4/V162 sobre `.pe` se actualizaron a `.dev`.
- Cloudflare Pages: vista previa de esa revisión `https://8d01bab6.clan-cartan.pages.dev` desplegada con éxito. `main` permanece en `1119615c6aed1d9bc5ef6f2ad0af370d3128e78a`.
- Supabase: se reejecutaron en base activa las auditorías SQL **77/77** y **174/174** con cero fallos; los scripts reproducibles se guardaron en GitHub. Ninguna operación de escritura.
- Backups GitHub: `respaldo/clan-cartan-main-v161-20261022` (SHA `1119615c...`) y `respaldo/mi-alquiler-v162-1-20261022` (SHA `6d4889d...`).
- 24 E2E de operaciones reales siguen pendientes de staging, 0 aprobadas; la publicación de producción permanece no autorizada.
- Lo anterior constituye pruebas estáticas + despliegue de vista previa, no certificación de suscripción ni cobro comercial ni captura de DNI/OTP.

## Actualización de interfaz cuatro negocios (23-OCT-2026)
- Registro protegido: Términos y autorización de tratamiento necesario marcados para habilitar Registro. Publicidad por correo/WhatsApp separada, desmarcada y revocable.
- Códigos compatibles BULL1–4, COBRA1–4, COCHERA1–3, ALQUILER1–3 como formatos; solo enlaces del usuario dueño y validados, MI ALQUILER consultado en RLS.
- Tarjetas modernas unificadas, claro/oscuro persistente para presentación.
- Billetera global de visualización: solo saldos reales verificados de cuatro servicios, sin mezclar bonos.
- CI GitHub PASSED: `39988218220`, commit `77bf129fd4555f09bbebbb8e0df25fef23f02210`.
- Preview comprobada por estado de despliegue Cloudflare: `https://34ee10f7.clan-cartan.pages.dev` SUCCESS.
- 24 E2E de usuarios reales faltan; reglas financieras de bonos de referido a saldo real NO activadas, requieren ledger y pruebas.
- Producción `main` conserva `1119615c6aed1d9bc5ef6f2ad0af370d3128e78a`.
