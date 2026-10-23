# CLAN CARTAN · Parte 1/7 · Publicación incremental compatible

## Objetivo
Mejorar la página oficial V161, **sin fusionar** las funcionalidades aún no certificadas de las ramas V162/V163. La integración únicamente incorpora validación del formulario y autorización separada del tratamiento necesario de datos.

## Cambios seguros
- Tres casillas en registro: Términos y tratamiento de datos necesarios (controlan el botón Registrar), publicidad independiente voluntaria.
- Reutiliza el formulario real, Auth, confirmación OTP, recuperación y permisos de la web oficial; no reemplaza el sistema de usuarios ni su base de datos.
- Validador de campos reutilizable y protección contra dobles clics que podrían enviar solicitudes repetidas.
- Metadata de alta documenta `data_processing_accepted` y `data_processing_version`, sin utilizar estos campos editables por el usuario para conceder roles.
- No altera billeteras, recargas, créditos, referidos, planes, acceso ADMIN ni Supabase.
- No habilita MI ALQUILER en la web oficial mientras la etapa de integración más amplia siga sin E2E.

## Límites honestos
- Estas comprobaciones de frontend no sustituyen un Auth Hook de servidor que imponga aceptación de condiciones a todas las vías de alta. Este requisito sigue pendiente de staging y verificación legal.
- Aún falta validar entrega real de correos OTP, Turnstile, Brevo y pruebas manuales de alta de extremo a extremo.
- La primera parte se actualiza **incrementalmente** y no se declara completamente cerrada sin controles de servidor y E2E.
- Preservación: `respaldo/main-antes-parte1-20261023` y `respaldo/v163-5-antes-parte1-20261023`.

## Validación
Ejecutar GitHub Actions y comprobar que Cloudflare Pages publica exclusivamente el commit fusionado con el respaldo disponible para reversión. Si falla CI o la autenticación, **no fusionar** o revertir a la referencia del respaldo.
