# V327 — Recuperación sencilla de consultas de activación

Base: V326, commit 50cefeb05c2b4960b64336b796db3e3a772e2def.

- «Volver a verificar» aparece solo cuando falla la consulta o cuando debe revisarse la tarifa; permite recuperar datos sin cerrar la ventana.
- Mientras la tarifa o el saldo no están verificados, se oculta la acción de pago y se evita presentar el precio anterior como vigente.
- Reintentar consulta tarifa, vigencia y saldo. No ejecuta cobros, renueva, borra referencias de pago ni acredita dinero.
- Las consultas repetidas por doble clic se bloquean mientras la verificación está pendiente.
- Cerrar durante una consulta ya no puede dejar bloqueada la próxima ventana. Una respuesta de la ventana anterior no sustituye los datos de la nueva.
- Mensajes de conexión más claros. Las tarifas, permisos, billetera y reglas del servidor permanecen intactos.

Pruebas: se amplían los escenarios existentes de navegador a 16. Casos nuevos: recuperación tras fallo de saldo, recuperación tras fallo de tarifa y reapertura durante una consulta pendiente. El caso de cambio de precio comprueba que el precio anterior queda bloqueado y el nuevo se verifica sin cargos automáticos. Datos y dinero exclusivamente ficticios.

Sin migraciones ni staging. Copia de recuperación local: `/workspace/backups/v327-before`; versión anterior recuperable desde el commit base. La publicación se verifica por commit de producción y meta V327-20261106.
