# Revisión interna complementaria · 2026-11-03

Se corrigió public.ma_ensure_account(): una cuenta no administrativa sin fecha de membresía podía recibir active=null. El cliente V161.2 exige un booleano y mostraba «Respuesta de membresía no válida». Ahora retorna false y muestra «Pendiente de activación». No se conceden membresías ni se cambia saldo alguno.

Verificación previa: cinco casos SQL (pendiente, vigente, vencida, suspendida y ADMIN) y pantalla con respuesta false en navegador aislado.
Verificación posterior: llamada a la función real con contexto de usuario no ADMIN dentro de BEGIN/ROLLBACK; se comprobó active=false booleano mediante aserción SQL. No se conservaron escrituras de la prueba.
Migración aplicada en Supabase: 20261103005043_fix_ma_membership_active_boolean.
Se conservan SECURITY DEFINER, search_path y permisos existentes; el único cambio es coalesce de la expresión active.

Pruebas internas con API simulada:
- MI COCHERA: apertura, alta vacía, tarifa negativa, prevención de envío inválido, cierre y retorno.
- MI ALQUILER: cinco secciones, inmueble vacío, prevención de envío y cierre.
- STREAMBULLS: montaje, acciones, formulario de cuenta vacío, prevención de envío y cancelar.
- COBRAYA: apertura, cliente vacío y préstamo sin cliente no envían altas.

Límite explícito: las pruebas simuladas no constituyen autenticación real ni prueban persistencia completa. El entorno no dispone de credenciales ni sesión de clancartan.com, y no se encontró una cuenta identificada como prueba. Sigue pendiente una sesión real para alta/edición completa, OTP y pagos. No se usó TinyFish ni se crearon proyectos.
