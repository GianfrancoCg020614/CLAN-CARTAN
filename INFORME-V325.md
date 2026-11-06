# V325 — Separación de activación y renovación

Base auditada: V324, commit acc682c903a90130705b314753cb1fd98b409b1e.
Autorización: conservar renovaciones voluntarias y proteger Activar frente a una membresía ya vigente.

## Cambios

- Nueva RPC `cc_finance_activate_membership`: reutiliza la transacción, saldo, referencias y bonos existentes; comparte su cerrojo para proteger solicitudes simultáneas con referencias distintas.
- Membresía vigente: responde `ALREADY_ACTIVE`, importe cero y `charged: false`. No crea renovación, cargo ni bono.
- Reintento de un pago confirmado: devuelve el resultado original; no cobra otra vez ni rehabilita pagos reembolsados.
- Renovación: conserva `cc_finance_pay_membership`, confirmación explícita, tarifas y tiempo pagado.
- El panel captura la intención del botón al renderizar. Nunca convierte automáticamente una activación en renovación. Referencias independientes por intención.
- Catálogo habitual: elimina la referencia adicional al precio público para distribuidores. Administración conserva sus precios de gestión.
- Cloudflare Pages: publicaciones de ramas deshabilitadas (`preview_deployment_setting: none`); producción conserva `main`. Sin staging nuevo.

## Datos y reglas conservados

COBRA YA, MI COCHERA y MI ALQUILER: S/15 mensuales. STREAM BULL’S: S/25 anual.
Una billetera, comisiones, historial, permisos por negocio y bonos existentes. Sin movimientos financieros reales de prueba.
No existe precio especial independiente de súper reseller: continúa el precio distribuidor cuando existe membresía STREAM vigente, sin inventar tarifas.

## Verificación

- SQL aislado: cuatro servicios, reintentos, servicio vigente con otra referencia, saldo exacto, bonos únicos, vigencia anual, renovación anticipada, reactivación, rollback por fallo, saldo insuficiente y acceso ajeno/anónimo.
- Manejador real con API ficticia: intención, confirmación cancelada, activo sin cobro, saldo cero y doble clic.
- Navegador aislado móvil: cinco perfiles de catálogo y paneles financiero/administrativo; un precio, checkout ficticio, exportaciones y ausencia de desbordamiento.
- CI incorpora dos conexiones PostgreSQL simultáneas con referencias distintas; comprobar resultado en la ejecución del commit.
- Producción: función instalada y permisos verificados mediante consultas sin cargos. La publicación del panel debe comprobarse por commit y versión.

## Límites y siguiente conjunto de trabajo

Esta entrega cubre la separación autorizada y la corrección de precio visible. La ventana compacta de activación y la revisión completa del saldo visible en todos los módulos del prompt integral siguen pendientes; no se declaran terminadas.
La prueba real de API Perú continúa aplazada a petición del propietario.
Los avisos de seguridad preexistentes se conservan: funciones públicas deliberadas, funciones autenticadas y protección de contraseñas filtradas deshabilitada. La RPC nueva exige identidad y no admite `anon`.

## Recuperación

Versión anterior recuperable desde el commit base y copia local `/workspace/backups/v325-before`.
La migración es aditiva: no reescribe datos ni la función de cobro vigente. Para retirar la función nueva, restaurar primero el panel anterior y después eliminar exclusivamente su RPC; conservar todos los movimientos históricos.
