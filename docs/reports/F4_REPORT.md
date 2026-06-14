# Reporte de Fase — F4 Visual Interactive Rebase

Este documento reporta la implementación de la fase **F4: Interactive Rebase Visual** en GitCron.

## 1. Mecanismo de ejecución elegido y por qué

Se optó por el **Mecanismo de Sequence Editor no interactivo nativo de Git** (Option 1) en lugar de una secuencia de primitivas en JS:
- **Por qué**: Es el enfoque más robusto. Permite delegar en el motor nativo de Git todo el manejo de los estados de rebase (pausado, en conflicto, aplicando), asegurando que si ocurre un conflicto, el repositorio quede en el estado estándar `REBASING`. Esto facilita la resolución de conflictos a través de la UI existente de GitCron, permitiendo luego continuar (`git rebase --continue`) o abortar (`git rebase --abort`).
- **Implementación**: Se escribe de forma dinámica un script helper en `.git/gitcron-rebase-helper.js` y el plan de rebase en `.git/gitcron-rebase-plan.json`. Git es invocado configurando `GIT_SEQUENCE_EDITOR` y `GIT_EDITOR` hacia dicho helper. El helper no interactivo lee el plan, reordena y edita las acciones en `git-rebase-todo`, y reescribe los mensajes en `COMMIT_EDITMSG` leyendo la lista de commits ejecutados en `.git/rebase-merge/done`.

---

## 2. Casos probados y validados

Se realizaron spikes locales automatizados en repositorios de prueba (verificados en Windows) cubriendo los siguientes casos:
1. **Reordenamiento básico**: Intercambio de 2 commits consecutivos.
2. **Reword (Reescritura de mensaje)**: Cambio de mensaje del commit exitoso usando la extracción del SHA actual desde `.git/rebase-merge/done`.
3. **Squash (Combinación)**: Combinación de un commit dentro del anterior, aplicando el nuevo mensaje combinado definido en la UI.
4. **Drop (Descarte)**: Eliminación de un commit intermedio en la secuencia de rebase.
5. **Abortar Rebase**: Detención y retorno al estado original mediante `git rebase --abort`.
6. **Manejo de Conflictos**: Al detenerse el rebase por conflictos (ej. cambios en las mismas líneas en commits reordenados), el proceso retorna un estado con bandera `conflict: true`, detiene la UI en modo conflicto, y permite al usuario usar el resolver de GitCron para guardar la resolución y stagearla antes de continuar.

---

## 3. Red de seguridad y estrategia de respaldo

- **Tag y Referencia de Respaldo**: Antes de iniciar cualquier operación de rebase, se crea un tag local `gitcron/pre-rebase/<timestamp>` y se actualiza la referencia `refs/gitcron/pre-rebase` apuntando al `HEAD` actual.
- **Deshacer Rebase (Undo)**: Se proporciona un botón "Deshacer último rebase" en el pie del panel de staging. Al hacer clic, ejecuta `git reset --hard refs/gitcron/pre-rebase` para volver instantáneamente al estado previo si el resultado no fue el esperado.
- **Limpieza de archivos**: Los archivos temporales `.git/gitcron-rebase-helper.js` y `.git/gitcron-rebase-plan.json` se eliminan al finalizar o abortar el rebase, pero se preservan si el rebase se pausa por conflictos para que `--continue` siga funcionando.

---

## 4. Métricas y Delta de Calidad

- **Tests unitarios (Vitest)**: Se agregaron **11 nuevos tests** en `lib/__tests__/rebase-plan.test.ts` para validar todas las reglas de negocio del plan (squash en la primera posición es inválido, duplicados, descarte completo, mensajes vacíos, etc.). Los **153 tests** corren en verde.
- **Type Checking (tsc)**: `0` errores tipo TypeScript detectados.
- **Fallow Report Delta**:
  - **Archivos Analizados**: `2374` (anterior: `2311`)
  - **Maintainability Index (MI)**: `90.3` (bueno, subió de `90.2`)
  - **Issues de Dead Code / Duplicaciones**: Sin cambios en el baseline de dupes y dead code.
