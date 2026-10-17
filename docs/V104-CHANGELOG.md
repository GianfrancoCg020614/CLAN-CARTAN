# CLAN CARTAN — V104: comprobación autónoma de Cloudflare

Fecha: 17 de octubre de 2026. Continúa de V103; no sustituye ni modifica los saldos de prueba o funciones de Supabase.

## Cambios
- `index.html` incorpora una marca pública `<meta name="cc-deploy-version" content="V104-20261017">`. La marca no contiene credenciales ni datos privados.
- Se retiró del HTML una etiqueta `script` externa de Kaspersky Labs, aparentemente introducida al copiar la página desde un navegador. No es necesaria para la web y no debería publicarse como dependencia de CLAN CARTAN.
- Nuevo workflow `.github/workflows/verificar-cloudflare.yml`: en cada actualización de `main`, cuando se ejecuta manualmente y diariamente, el runner de GitHub consulta `https://clan-cartan.pages.dev/` y compara la marca de versión del HTML remoto con la de `index.html`.
- El workflow vuelve a intentarlo varias veces para dar tiempo a la publicación. Si no coincide o la página no responde, falla y deja un resumen de diagnóstico en GitHub Actions. **No administra ni modifica Cloudflare**.
- El validador existente `scripts/check-v100.mjs` también verifica que exista la marca de despliegue y que no vuelva a introducirse el script de Kaspersky.

## Limitaciones
- La conexión de Cloudflare aún no está disponible en este chat; el sitio público no fue accesible desde la consulta externa efectuada. No es correcto declarar que el despliegue ya tuvo éxito o que falló.
- La comprobación usa una marca de versión del HTML: **cada publicación funcional futura debe actualizar su marca**, de lo contrario solo confirmará que esa misma marca sigue visible, no que el código más reciente se haya desplegado.
- El workflow está registrado en GitHub; aún falta observar una ejecución finalizada satisfactoriamente desde GitHub Actions. No se han configurado secretos, SMTP ni servicios de pago.

## Próximos objetivos
1. Comprobar el resultado del workflow y del despliegue Cloudflare.
2. Configurar una pasarela SMTP compatible con Supabase únicamente después de verificar proveedor, dominio y coste. No contratar nada sin autorización.
3. Probar desde navegador registro, recuperación, catálogo público, accesos autorizados, préstamos, billeteras y sesiones.
4. Seguir auditando las funciones SQL privilegiadas sin romper operaciones legítimas.

Mantener la distinción entre saldos ficticios y reales, sin retiros ni pagos de préstamos mediante billeteras.
