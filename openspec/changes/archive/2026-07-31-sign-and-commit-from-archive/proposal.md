## Why

OpenSpec no registra en ningún lado la intervención humana. Todos los checkboxes los tilda el
agente, los reportes los escribe el agente, y el archivo guarda la palabra del agente sobre su
propio trabajo. Si un agente mintiera, el artefacto se vería idéntico — que es exactamente lo que
pasó con un handoff que declaró "549 tests en verde" cuando eran 548 y un fallo.

La convención tiene un casillero para eso: la última tarea de cada change, "frenar antes de staging
y entregar a Ale". Pero es estructuralmente intildeable por el agente —tildarla sería afirmar que el
handoff terminó antes de que Ale lo recibiera— así que se archiva sin tildar **siempre**. Verificado
en `openspec/changes/archive/2026-07-31-fix-pipeline-refresh-cost/tasks.md`, congelada en `[ ]`.

El casillero que existe para la firma humana está vacío en todos los changes archivados.

Además, cerrar un change hoy son cuatro pasos manuales fuera de la aplicación: tildar, archivar,
commitear el código, commitear el archivado. GitCron es un cliente de Git; ese trabajo puede vivir
donde ya vive el resto.

## What Changes

- Archivar desde la aplicación **tilda una tarea designada de firma**, cuyo texto declara
  exactamente lo que el click prueba: que Ale confirmó el archivado desde la aplicación. Sólo esa.
  Las demás tareas sin tildar **quedan sin tildar**: si hay pendiente real, el archivo lo dice.
- Archivar produce **dos commits**: el del trabajo y el del archivado, siguiendo la convención ya
  vigente en el repositorio (`chore(openspec): archivar <slug>` existe desde `78e5e25`).
- El alcance del commit del trabajo se declara en un **manifiesto por change**, porque no es
  deducible: el árbol puede tener varios changes en curso a la vez.
- El panel de confirmación muestra, antes de ejecutar: el mensaje, los archivos que entran y
  **los archivos modificados que quedan fuera**. Un manifiesto equivocado se ve antes, no después.
- **Push y merge siguen siendo manuales.** El botón nunca publica nada.
- **BREAKING (de método):** `AGENTS.md` prohíbe hoy ejecutar `git add` y commit sin autorización
  explícita. Se actualiza para declarar que el click de archivado ES esa autorización, por acción,
  con alcance y mensaje a la vista. Sin ese cambio la aplicación contradiría su propio manual.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: el archivado registra la firma humana y confirma el trabajo en Git con
  alcance declarado y visible.

## Impact

- `electron/pipeline/openspec-cli.ts` — tildado de la tarea de firma antes de archivar.
- `electron/ipc/pipeline-archive.ts` — orquestación: firma, commit del trabajo, archivado, commit
  del archivado. Escalonada, para que un fallo no deje el repositorio a mitad de camino sin decirlo.
- `components/pipeline/OpenSpecDashboard.tsx` — el panel muestra alcance y mensaje antes de ejecutar.
- `lib/i18n.ts` — strings nuevas en ES, EN y ZH.
- `AGENTS.md` — la regla de Git.
- Los tres changes activos reciben su manifiesto y su tarea de firma.
- Sin dependencias nuevas: `git:stage-batch` ya acepta una lista explícita de archivos y
  `git:command` ya commitea.
