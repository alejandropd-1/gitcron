# F4 — Interactive rebase visual (brief para el agente ejecutor)

> **Leé primero:** `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`. Trabajá por
> TANDAS y PARÁ en cada checkpoint. Esta fase **escribe historia de Git** (reordena/combina
> commits) — la más delicada del roadmap. Leé la invariante #6: la escritura está autorizada
> acá, SIEMPRE detrás de confirmación explícita y con las salvaguardas de abajo. Nada fuera
> de este brief.

## Por qué esta feature

Reescribir una serie de commits locales antes de pushear: **reordenar, combinar (squash/fixup),
descartar (drop), reescribir mensaje (reword)**. Firma de los clientes Git pro. Es alto riesgo
porque reescribe SHAs; el diseño prioriza que sea reversible y nunca silencioso.

## Estado de partida (verificado)

- Ya existen, como referencia de "escritura de historia con confirmación": `git:squash`
  (combina últimos N), `git:amend`, `git:cherry-pick`, `git:reset-commit` (soft/mixed/hard
  con `ResetCommitModal` + checkbox de confirmación para hard). **Mirá `ResetCommitModal.tsx`
  y el handler `git:squash` antes de diseñar** — el lenguaje de confirmación destructiva ya
  está establecido.
- `motion/react` ya se usa para drag-to-reorder en `RepoTabs.tsx` → reusá ese patrón de drag.
- `DangerConfirmDialog.tsx` para confirmaciones.
- NO existe ningún `git:interactive-rebase`.

## Decisión de implementación (NO negociable)

**No** abrir el editor interactivo de git (`git rebase -i` espera `$GIT_EDITOR` por TTY —
frágil, no determinístico, mal en Electron). En su lugar:

1. La UI arma un **plan declarativo**: una lista ordenada de `{ hash, action, newMessage? }`
   donde `action ∈ pick | reword | squash | fixup | drop`.
2. El backend ejecuta ese plan vía `GIT_SEQUENCE_EDITOR` apuntado a un script que **escribe
   el todo-list que la UI ya decidió** (no interactivo: `GIT_SEQUENCE_EDITOR` recibe el
   archivo todo y lo sobrescribe con el plan), y `GIT_EDITOR` apuntado a un mecanismo no
   interactivo para los mensajes de reword/squash. Alternativa equivalente y más simple si
   resulta más robusta: aplicar el plan con primitivas (`reset`, `cherry-pick`,
   `commit --amend`) en secuencia — evaluá ambas en TANDA 0 y proponé la que menos superficie
   de fallo tenga.
3. La construcción/validación del plan va en un **módulo puro testeable** `lib/rebase-plan.ts`
   (valida: no se puede squash/fixup en la primera fila, el orden es consistente, no quedan
   acciones imposibles), con tests Vitest. La ejecución vive en el handler; la decisión, en JS puro.

## Salvaguardas obligatorias

- **Solo commits locales no pusheados.** Antes de habilitar el rebase, verificar contra el
  upstream: si alguno de los commits del rango ya está en `origin/<branch>`, **avisar fuerte**
  (mismo tono que force-push) y requerir confirmación extra; idealmente acotar el rango por
  defecto a `@{upstream}..HEAD`.
- **Confirmación con preview** antes de ejecutar: la UI muestra exactamente qué va a pasar
  (lista final de commits, cuáles se combinan, cuáles se dropean) y pide OK explícito.
- **Red de seguridad:** antes de ejecutar, crear un tag/ref de respaldo (p.ej.
  `git tag gitcron/pre-rebase/<timestamp>` o guardar el SHA de HEAD) para poder revertir.
  Mostrarle a Ale cómo deshacer si algo sale mal.
- **Conflictos durante el rebase:** si el rebase para por conflicto, integrarse con el
  conflict resolver YA existente (no inventar uno nuevo) y permitir continuar/abortar. Abortar
  debe dejar el repo exactamente como estaba (de ahí el ref de respaldo).

## Plan de tandas

1. **TANDA 0 — Diseño + spike.** Definir tipos del plan, el contrato IPC, y **decidir el
   mecanismo de ejecución** (sequence-editor no interactivo vs. secuencia de primitivas) con
   un spike chico que demuestre un reorder simple de 2 commits en un repo de prueba. Definir
   la estrategia de respaldo/abort. **CHECKPOINT 0 — mostrá el spike y la decisión. No sigas
   sin OK.** (Este checkpoint es el más importante de toda la fase.)
2. **TANDA 1 — Módulo puro + tests.** `lib/rebase-plan.ts`: validación del plan + tests
   Vitest sobre casos (squash en primera fila → inválido, drop de todos → inválido, reorder
   válido, reword, fixup encadenado). CHECKPOINT.
3. **TANDA 2 — Handler de ejecución.** `git:interactive-rebase(repoPath, plan)` con respaldo
   previo, ejecución del plan, manejo de conflicto (engancha al resolver existente) y abort
   que restaura. Probar en repo de prueba: reorder, squash, drop, reword, y un caso con
   conflicto. CHECKPOINT.
4. **TANDA 3 — UI.** Vista de rebase interactivo: lista de commits del rango con drag-to-reorder
   (motion/react, patrón de RepoTabs), selector de acción por fila, edición de mensaje para
   reword/squash, preview + confirmación, aviso si hay commits pusheados. i18n 3 idiomas.
   CHECKPOINT (QA visual — Ale prueba reorder/squash/drop/reword y un abort).

## Qué NO hacer

- No ejecutar rebase sin confirmación con preview y sin ref de respaldo.
- No reescribir commits ya pusheados sin el aviso fuerte + confirmación extra.
- No inventar un conflict resolver nuevo: usar el existente.
- No tocar el grafo (geometría), el Temporal Agent, ni `electron/db`.
- No tocar `git:squash`/`git:amend`/`git:cherry-pick` existentes (solo inspirarte).
- No tocar README/CHANGELOG.
- Ante cualquier estado de rebase ambiguo (`.git/rebase-merge` colgado, etc.): parar y
  reportar, no forzar `--skip`/`--abort` sin discutirlo.

## Cierre
Reporte en `docs/reports/F4_REPORT.md`: mecanismo elegido y por qué, casos probados
(incluido abort y conflicto), estrategia de respaldo, métricas. STOP para OK visual de Ale.
