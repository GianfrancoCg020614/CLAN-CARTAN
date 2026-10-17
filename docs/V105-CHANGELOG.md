# V105 — Dominio, navegación sencilla y DNI en COBRA YA

Fecha: 17 de octubre de 2026. Base: V104. Se preservan el historial y los datos de prueba.

## Dominio y marca
- URL canónica del portal: **https://www.clancartan.com/**.
- Añadidos metadatos `canonical` y `og:url` y enlace visible en portada; `index.html` lleva `cc-deploy-version=V105-20261017`.
- Las nuevas confirmaciones de registro eligen un `redirect_to` que coincide con el origen actual entre `www.clancartan.com`, `clancartan.com` y `clan-cartan.pages.dev`. Fuera de esos hosts utilizan el respaldo `clan-cartan.pages.dev`.
- `.github/workflows/verificar-cloudflare.yml` comprueba prioritariamente el dominio `www` y verifica el respaldo si falla.
- Archivo `_headers` añade encabezados de protección básicos para Cloudflare Pages.
- **Importante**: el conector actual no administra DNS ni la configuración Auth del panel Supabase. No se ha podido confirmar desde las herramientas que `www.clancartan.com` resuelva y entregue V105.

## COBRA YA — menos clics
- Formulario en dos etapas: **cliente → préstamo** con opciones secundarias plegadas (cuotas, moneda y garantía).
- El teléfono del cliente pasa a ser opcional al registrar, y se muestra ayuda accesible en el campo DNI.
- Con DNI peruano de **8 números**, la pantalla intenta recuperar exclusivamente los datos del cliente que **ese prestamista** ya guardó; si existe, completa nombre y teléfono y selecciona automáticamente el cliente para registrar su préstamo sin presionar «Guardar» otra vez.
- Si el DNI es nuevo, aparece un mensaje honesto: todavía no hay consulta oficial de RENIEC; el usuario completa el nombre manualmente y puede guardar. Después de guardarlo, se selecciona el cliente y se pasa a ingresar el préstamo.
- La pantalla confirma coincidencias de forma automática y vuelve a comprobar antes de guardar para evitar duplicados.
- CSS móvil actualizado: campos principales más grandes y opciones avanzadas plegadas.

## Supabase
- Migración `v105_lookup_saved_client_dni_securely`: índice `cy_clients_owner_document_v105` y RPC `cy_lookup_dni_saved(text)` de tipo **SECURITY INVOKER**. La consulta devuelve solo `client_id`, `full_name`, `phone` de filas con `owner_id=auth.uid()`, sujetas a RLS; solo usuarios autenticados pueden ejecutar la función.
- Migración `v105_prevent_duplicate_clients_dni_per_lender`: índice único parcial por (propietario, DNI de 8 números). Cada RESELLER mantiene una cartera independiente.
- Pruebas transaccionales, finalizadas en `ROLLBACK`: el titular recupera un DNI de muestra, un DNI inválido no arroja resultados y otro prestamista no puede leer esa identidad. No se guardó el DNI ficticio temporal.

## DNI de una persona que no está registrada
- **Todavía NO se consulta RENIEC** ni se inventan nombres. Este paso requiere un convenio, credenciales y/o proveedor autorizado, reglas contractuales y finalidad legítima de protección de datos.
- Se recomienda integración de servidor desde Supabase Edge Functions; **nunca** poner tokens de RENIEC ni claves privadas en HTML, GitHub, navegador o mensajes.
- Documentación de requisitos: [Especificación de integración](RENIEC-INTEGRACION.md).

## Configuraciones pendientes de panel

1. Confirmar en Cloudflare Pages que `www.clancartan.com` está agregado como dominio personalizado, certificado HTTPS activo, DNS y redirección del dominio raíz a `www` si procede. No suponerlo a partir de una captura de Cloudflare Turnstile.
2. Supabase > Authentication > URL Configuration: **Site URL** `https://www.clancartan.com/`; **Redirect URLs** `https://www.clancartan.com/**`, `https://clancartan.com/**` y conservar `https://clan-cartan.pages.dev/**` como respaldo. El conector Supabase disponible no ofrece edición de configuración Auth.
3. Activar envío de correo transaccional con SMTP compatible con Supabase antes de pruebas públicas de confirmación/restablecimiento.
4. Integrar y validar Turnstile REAL solo cuando existan su `site key` y su `secret key` (en backend), sin usar una mera imagen de «Operación exitosa» como protección.
5. Pruebas de aceptación completas en celular y laptop y permisos de acceso desde dos cuentas reales.

Conservar billeteras internas sin retiros, sin pagos de préstamos, sin transferencias entre usuarios y sin cobros reales hasta aprobar el lanzamiento.
