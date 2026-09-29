# Tasks

Lista de resultados y comprobaciones pendientes. Referencias de implementación en [execution.md](execution.md).

## 1. Lectura y scope

- [ ] 1.1 **Orquestador/auditor:** Fijar claves editables/defaults por contrato real de la versión. **Comprobación:** Distingue perfil global, integración instalada y config.yaml del repo; desconocidos sólo lectura.
- [ ] 1.2 **IA local:** Modelar estado global y efectivo por repo con campos desconocidos saneados. **Comprobación:** Dos repos con integraciones distintas conservan sus estados efectivos.
- [ ] 1.3 **IA local:** Mover edición del perfil global a Settings con enlace desde SDD. **Comprobación:** Existe un único editor global y se ve el alcance antes de cambiar.

## 2. Edición

- [ ] 2.1 **IA local:** Implementar plan y preview de set/unset con lista permitida. **Comprobación:** Rechaza clave no soportada y cambio concurrente; no escribe al planificar.
- [ ] 2.2 **IA local:** Implementar reset/profile con alcance explícito y relectura. **Comprobación:** Default viene de contrato verificado; fallo no informa éxito y config.yaml del repo queda intacto.
- [ ] 2.3 **IA local:** Conectar formulario global a los planes y resultados reales. **Comprobación:** Muestra valores efectivos después de releer y permite recuperar error sin perder edición.
- [ ] 2.4 **IA local:** Invalidar estado de repos abiertos afectados sin actualizar su integración. **Comprobación:** Dos repos reflejan divergencia nueva; no ejecuta openspec update automáticamente.

## 3. Aceptación

- [ ] 3.1 **Orquestador/auditor:** Auditar cambio global, fallo, edición externa y alcance visual. **Comprobación:** Sin editores duplicados; estado global no promete integración instalada; revisión con Alejandro.
