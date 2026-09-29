# Tasks

Referencias de implementación en [execution.md](execution.md).

## 1. Registro y estados

- [ ] 1.1 Definir discriminante de cierre y parser de retirement.md. **Comprobación:** Distingue retired/completed/archived-unknown; registro inválido o todavía activo no produce retiro confirmado.
- [ ] 1.2 Agregar escritura versionada e idempotente del registro. **Comprobación:** Texto libre se conserva como datos; reintento no sobrescribe un registro distinto.
- [ ] 1.3 Adaptar lector e histórico a cierres desconocidos y retirados. **Comprobación:** Clonar conserva motivo/reemplazo; falta de registro no se cuenta como finalización comprobada.

## 2. Operación main

- [ ] 2.1 Fijar contrato de plan/ejecución y verificar semántica del CLI instalado. **Comprobación:** Ensayo temporal confirma skip-specs y validación; especificar vínculo de root/runtime/huellas sin un segundo mecanismo de autorización.
- [ ] 2.2 Agregar wrapper de retiro usando runtime compartido y argumentos acotados. **Comprobación:** Invoca archive --yes --skip-specs; slug/path inválido falla antes del proceso, incluido Windows.
- [ ] 2.3 Implementar plan de retiro sin escrituras y validar reemplazo/ciclos. **Comprobación:** Plan rechaza root no autorizado y entradas inválidas; explicación nunca llega al shell.
- [ ] 2.4 Implementar ejecución y recuperación bajo exclusión por repo. **Comprobación:** Prueba movimiento/registro/canónicas intactas, doble ejecución, reinicio y fallo intermedio sin éxito falso.
- [ ] 2.5 Conectar IPC, preload y bootstrap productivo. **Comprobación:** Canales reales invocan handlers correctos y revalidan plan obsoleto.

## 3. Interfaz y aceptación

- [ ] 3.1 Agregar acción/formulario de retiro contextual e i18n. **Comprobación:** Muestra alcance/motivo/estado de implementación y pide reemplazo sólo para superseded.
- [ ] 3.2 Mostrar badge, motivo y reemplazo del cierre leído. **Comprobación:** Activo con registro pendiente no desaparece; desconocido no parece completado; enlace resuelve destino real.
- [ ] 3.3 Adaptar sugerencia y atribución de commit al retiro. **Comprobación:** Diferencia retired/archived/activo, conjunto mixto sin mensaje inventado; no crea commit.
- [ ] 3.4 Auditar retiro, reintento y circuito de Git común. **Comprobación:** Specs quedan byte-iguales; archivado normal no regresa; revisar estados desconocidos con Alejandro.
