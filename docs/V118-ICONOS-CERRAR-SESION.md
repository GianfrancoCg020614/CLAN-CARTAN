# V118 — Iconos para cerrar sesión

Cambio visual solicitado en 18-10-2026: las interfaces de la portada CLAN CARTAN y de COBRA YA ahora tienen un **icono compacto de salir** (sin texto visible). Ambas usan la misma función `cc54SwitchAccount()`, que intenta invalidar la sesión en Supabase Auth, descarta la sesión local y vuelve a cargar la página. Los botones incorporan `aria-label="Cerrar sesión"` y un tooltip `title` por accesibilidad.

Se oculta el botón flotante histórico que duplicaba la acción. **Volver** de COBRA YA permanece separado y no cierra la sesión. Se preservan clientes, préstamos, billeteras, códigos por plataforma, OTP, roles y todas las reglas comerciales.

La V117 anterior se conserva en la rama `resguardo/v117-antes-iconos-cerrar-sesion-2026-10-18`. No se ejecutó SQL ni se modificaron datos. Verificación: GitHub Actions, Cloudflare y recursos CSS/JS; una prueba manual real de cierre de sesión desde una cuenta sigue siendo necesaria.
