# V163.3 — Servicios externos
**Código integrado, servicios vivos SIN certificar E2E.**
- API Perú: en GitHub se normalizó la función MI ALQUILER de `.pe` a `.dev`, igual que `cc-consulta-dni` y `mc-verify-dni`. No desplegar hasta confirmar que `APIPERU_TOKEN` corresponde al proveedor `.dev`; requieren permiso legal y DNI autorizado. JWT, membresía y cuota compartida intactos.
- Brevo: archivo `supabase/templates/confirm-signup-recovery-v162-1.html` guarda `{{ .Token }}`; debe comprobarse el cuerpo y la entrega en Supabase Authentication > Emails y casilla propia. No modificar la plantilla activa sin copia.
- Turnstile: widget Cloudflare `CLAN CARTAN Auth - Supabase` ya creado, sitekey pública `0x4AAAAAAFgi3l7LiJrucZTP`. Mantener desactivado en Supabase hasta pruebas integrales de signup, login y recuperación con frontend que envíe captchaToken y maneje reinicios. Guardar secret solamente en Auth, nunca en GitHub.
- WhatsApp: funciona `wa.me` por usuario con consentimiento; evento OPENED no prueba envío, entrega ni lectura. No hay mensajes automáticos ni se habilitan aquí.
- TinyFish: herramienta complementaria, no necesaria para la compilación básica.
