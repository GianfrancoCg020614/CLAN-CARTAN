# V403 · Interfaz moderna de los cuatro negocios

Base conservada: V402, 53d6338d542ee7ff8a690d16bd5e0fc41e5b4f87. Respaldo previo: /workspace/clan-antes-v403.bundle.

Se moderniza la presentación existente sin reconstruir módulos, agregar controles ni cambiar funciones:

- Tipografía del sistema, jerarquía de títulos y cifras tabulares más claras, sin descargar fuentes nuevas.
- Tarjetas con bordes más sutiles, radios coherentes, profundidad suave y colores propios conservados.
- Menús laterales ligeros: las opciones inactivas dejan de parecer botones de acción repetidos; la sección seleccionada conserva su contraste.
- Pestañas segmentadas más limpias y buscadores consistentes.
- Iconos de indicadores sobre pequeñas superficies de color, dimensionados para no invadir los importes en celular.
- Respuesta discreta al pulsar y al pasar el puntero. Se respetan las preferencias de movimiento reducido.
- Temas día/noche con superficies más claras y un fondo azul oscuro cómodo.
- Estados vacíos más simples, conservando todos sus mensajes y acciones.

COBRA YA conserva préstamos, clientes y cobros; MI COCHERA conserva carritos y operaciones; MI ALQUILER conserva inmuebles, inquilinos y contratos; STREAM BULL’S conserva las diferencias de sus roles. La entrega no modifica JavaScript de negocio, modelos financieros, saldos, Auth, RLS ni datos de Supabase.

## Verificación y conservación

Se usan las pruebas existentes de navegación (14 casos en 1366/390/320px), los siete perfiles de STREAM BULL’S y la billetera con datos sintéticos. Se conservan las pruebas de cierres, regreso al inicio, búsqueda, formularios, ayuda y ausencia de desbordamiento. Las capturas de ambos temas se guardan en artifacts/v403 y en GitHub Actions; no son cuentas privadas de producción.

La publicación utiliza main y Cloudflare Pages existentes, sin staging. El dominio se verifica mediante el marcador V403-20261120 y la coincidencia SHA-256 del CSS servido con el código probado. Para revertir, basta revertir esta entrega y publicar con el flujo habitual; no hay migraciones ni cambios de datos que deshacer.
