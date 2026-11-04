# V315 — Perfil sin pérdida de borradores y catálogo más sencillo

Base: V314, main c46531e4c5ea98d69baf1043bf9833c7a1dba79f. Mismo repositorio, Pages y Supabase.

- Mi perfil conserva en memoria los campos editados al actualizar, navegar o renovar el token del mismo titular. El borrador se borra al cambiar de cuenta o cerrar sesión y no se guarda en almacenamiento del navegador.
- La llegada del correo modifica únicamente el campo de lectura; ya no reconstruye todo el formulario. El texto de carga no provoca una validación de email inválido.
- Un guardado pendiente no permite otra solicitud por doble pulsación, no obliga a volver al perfil si el usuario navegó y no sobrescribe ediciones posteriores. Fallos y cambios pendientes aparecen junto al botón, que vuelve a estar disponible.
- El catálogo busca sin tildes y combina términos entre título, servicio y descripción; escucha directamente el campo existente.
- El acceso Mi perfil cambia a Ingresar después de cerrar sesión y mantiene un único controlador al volver a entrar.
- Versión y cachés a V315. Sin cambios de RPC, Auth, Turnstile, datos, esquema ni precios.

Verificación: fixtures con módulos reales, API interceptada y guardados en memoria a 375×844 y 1440×900; ambos escenarios pasan. Con V314 se reproduce la reconstrucción del formulario al llegar el correo, y fallan la búsqueda del catálogo y el destino de perfil después de cerrar sesión. Se incorpora la regresión al workflow existente; el conjunto completo de GitHub debe aprobarse antes de integrar. Sintaxis inline, puente de portada y contrato de roles comprobados localmente.

Las pruebas no usan contraseñas ni sesiones reales ni modifican perfiles o saldos del servidor. El borrador conserva datos solo durante la vida de la página. El guardado sigue sujeto a la RPC y permisos existentes.
