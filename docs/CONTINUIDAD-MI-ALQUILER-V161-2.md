# CLAN CARTAN — MI ALQUILER V161.2 (Parte 2/5)

Base: rama de desarrollo `integracion/mi-alquiler-v161-1` sobre `main` V161 preservada.
Rama nueva: `integracion/mi-alquiler-v161-2` (sin fusionar ni publicar).

## Alcance implementado
- Supabase: esquema independiente `ma_` (cuentas, inmuebles, unidades H-001/L-001, inquilinos y contratos), historiales de ampliación/retiro.
- Un solo login existente en CLAN CARTAN, sin contraseñas paralelas.
- RLS con propietario y membresía activa; RPC con controles de pertenencia y permisos. ADMIN puede usar su propio espacio; no obtiene lecturas de inquilinos de otros RESELLER.
- Un único alquiler activo por unidad, y referencias compuestas evitan mezclar unidades, contratos e inquilinos de distintos propietarios.
- Tarifa diaria o mensual; ingreso, próxima fecha de vencimiento, ampliación (con ancla de fecha mensual), retiro y limpieza.
- WhatsApp del inquilino se guarda con consentimiento; aún NO se envían mensajes.
- DNI se registra manualmente en esta etapa, sin afirmar validación API Perú.
- Sin movimientos de dinero, pagos, recargas ni cambios en los otros módulos.

## Control de suscripciones
Un RESELLER con `ma_accounts.subscription_until` nula o vencida no puede acceder ni registrar datos hasta la integración comercial V161.3. Su cuenta e historial permanecen guardados. ADMIN autenticado por la tabla `cc_admins` puede probar únicamente sus propios inmuebles. No se han regalado membresías ni activado saldos.

## Siguientes versiones
- V161.3: cobros, deudas, medidores, garantías, gastos, administración comercial, billetera/bonos bajo reglas existentes.
- V161.4: consulta DNI vía backend autorizado y cuotas, avisos WhatsApp al número individual del inquilino, exportaciones, reportes, auditoría.
- V162: regresión, seguridad, pruebas reales verificables y aprobación antes de fusionar/publicar.

## Despliegue
Esta rama NO se despliega ni fusiona a `main`. Supabase contiene únicamente tablas nuevas `ma_*`; no tocar saldos ni autorizaciones comerciales existentes. El código de V161.2 no modifica `index.html`, autenticación, catálogo ni transacciones de otros servicios.