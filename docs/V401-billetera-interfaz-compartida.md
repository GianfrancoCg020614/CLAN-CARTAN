# V401 · Billetera y controles compartidos

Fecha: 20/11/2026. Base de producción: cbae816d64f413b8cf2507b41081fe471003a482 (V400).

La billetera existente presenta tarjetas separadas de saldo real y bono compartido, cuatro pestañas con iconos y movimientos compactos. Se elimina el saldo duplicado en la cabecera del resumen y se pagina la lista ya consultada, sin añadir consultas ni alterar cálculos. Los importes grandes conservan sus dígitos y disponen de una columna en móvil cuando hace falta. La supervisión financiera administrativa conserva su vista y permisos.

La ayuda se integra en la barra de controles de COBRA YA, MI COCHERA, MI ALQUILER y el panel de STREAM BULL’S, sin cubrir fichas ni acciones. MI ALQUILER agrupa actualización, tema y ayuda. Día/noche conserva la preferencia común y los acentos de cada negocio. Se corrige el contraste de la marca del panel en modo claro.

No hay migraciones, reglas financieras nuevas, cambios de saldo, activaciones ni compras reales. El bono sigue restringido a las activaciones permitidas de los tres negocios existentes; STREAM BULL’S utiliza saldo real.

## Verificación

- Chromium sobre index real local con API simulada: afiliado, reseller y administrador; PC 1366px, móvil 390/320px; ambos temas, saldo cero y grande, bono, navegación de recargas y paginación; sin escrituras financieras.
- Navegación: 14 casos entre los cuatro negocios, retorno al origen, cierre de modales, conservación de sesión y ayuda integrada.
- MI ALQUILER: resumen desde PostgreSQL local y pantallas 1366/390/320px, formularios, búsqueda, exportación y vencimiento; escrituras simuladas.
- STREAM BULL’S: 39 casos de roles/vistas locales.
- Soporte: respuestas tardías, cambio de cuenta, formulario pendiente, 181 mensajes accesibles y adjunto de otra conversación bloqueado.
- Sintaxis: JavaScript modificado y los 13 bloques inline.

Las capturas de billetera y negocios provienen de Chromium con datos sintéticos controlados; no son cuentas privadas de producción. La publicación y coincidencia de recursos se verifican por separado después de integrar el PR. Estas pruebas de interfaz no acreditan capacidad para 10 000 usuarios concurrentes.

## Conservación y reversión

Respaldo previo verificado: /workspace/clan-antes-interfaz-v401.bundle. No se modifica la base de datos; para revertir basta revertir el commit de esta entrega y publicar con el flujo habitual de main/Cloudflare Pages. No se crea staging.

## Comprobación del propietario

Abrir www.clancartan.com, actualizar la página, entrar a la billetera y comprobar ambos saldos por separado. Revisar las cuatro pestañas, alternar día/noche y entrar a cada negocio. Ayuda debe estar junto a los controles sin cubrir datos. Volver a CLAN CARTAN debe mostrar el inicio con los cuatro negocios, conservando la sesión.
