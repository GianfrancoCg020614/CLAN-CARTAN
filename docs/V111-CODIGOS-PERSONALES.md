# CLAN CARTAN V111 — Código personal único para todas las cuentas

Fecha: 18-10-2026. Dominio: https://www.clancartan.com/

Cada persona registrada recibe **un solo código personal permanente**, sea USUARIO, AFILIADO, RESELLER o SUPER RESELLER, con o sin código de invitado al registrarse. El formulario permite elegir COBRA YA o STREAM BULL'S y asigna consecutivamente COBRA<n> o BULL<n> por secuencias de cada negocio. Con invitación válida el sistema conserva el vínculo con el invitador, independientemente del servicio elegido por el nuevo usuario. Los números no se reciclan ni se prometen sin saltos ante transacciones revertidas.

No hay membresía, acceso comercial, bonificación ni suscripción automática por usar un código. Los códigos permanecen al cambiar rol. Se preserva COBRA1 ya existente. Se asignan códigos a cuentas previas sin uno, priorizando STREAM BULL'S solo cuando ya figure su membresía; las demás empiezan con COBRA YA. El registro manual y OTP de 8 dígitos permanecen; DNI automático solo en COBRA YA.

Migración: supabase/migrations/20261018042000_v111_one_permanent_code_per_registered_user.sql. Resguardo GitHub previo: resguardo/v110-antes-codigos-universales-2026-10-18.

Verificaciones a realizar: alta con y sin código, prefijos de ambos servicios, concurrencia, lectura de código al ingresar, OTP, mantenimiento de historial y no asignación de roles por invitación.
