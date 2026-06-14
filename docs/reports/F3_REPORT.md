# F3 — Reporte de avance

## TANDA 0 — Diseño + tipos

Estado: completada. STOP para OK antes de TANDA 1.

### Cambios realizados

- Agregados tipos de contrato en `types/electron.d.ts`:
  - `FileHistoryEntry extends CommitData`, con `filePath` para mantener trazabilidad de la vista.
  - `BlameLine`, con linea, contenido, commit, autor, fecha, resumen, datos de rename previo e indicador `isUncommitted`.
- Agregado contrato IPC futuro:
  - `gitFileHistory(repoPath, filePath, limit?) -> GitResult<FileHistoryEntry[]>`
  - `gitBlame(repoPath, filePath, rev?) -> GitResult<BlameLine[]>`

### Diseño de integración

- `git:file-history` vivira en `electron/ipc/git-ops.ts`.
  - Usara `git log --follow --format=... -- <file>`.
  - Devolvera shape compatible con `HistoryView`, para reusar el render cronologico sin reimplementar lista.
  - Validara `repoPath + filePath` con `resolveRepoRelativePath`.
- La UI de historial de archivo se montara como modo central dentro de `RepoMainView` / `RepoContentViews`.
  - Entrada desde `FileContextMenu` en `components/ContextMenus.tsx`.
  - Click en commit del historial llamara al flujo existente `gitDiffAtCommit(repoPath, filePath, hash)` para mostrar el diff de ese archivo en ese commit.
  - No toca `HistoryView` salvo props minimas si hacen falta para textos/i18n.
- `lib/blame-parse.ts` se agregara recien en TANDA 2.
  - Parseara `git blame --line-porcelain` fuera del handler y fuera de React.
  - El handler `git:blame` solo ejecutara Git, validara path y delegara parsing.
- La UI de blame se montara como vista central alternativa.
  - Columna izquierda densa con hash corto, autor y edad relativa.
  - Color por antiguedad con paleta GitCron.
  - Click en linea seleccionara/abrira detalle del commit sin modificar geometria de grafo.

### Casos borde planificados

- File history:
  - Archivo con commits multiples.
  - Archivo renombrado, usando `--follow`.
  - Limite explicito y limite default.
  - Path con espacios.
  - Archivo sin historial o eliminado.
- Blame parser:
  - Archivo de una sola linea.
  - Lineas sin newline final.
  - Lineas consecutivas del mismo commit/autor.
  - Lineas uncommitted con hash `0000000...`.
  - Metadata `previous` por rename/copy.
  - Summary faltante o metadata repetida por bloque porcelain.

### No tocado

- No handlers IPC implementados.
- No preload.
- No UI.
- No i18n.
- No README/CHANGELOG.
- No grafo, Temporal Agent ni Electron DB.
- No escrituras de Git.

## TANDA 1 — File history read-only

Estado: completada. STOP para OK antes de TANDA 2.

### Cambios realizados

- Implementado `git:file-history` en `electron/ipc/git-ops.ts`.
  - Ejecuta `git -c core.quotePath=false log --follow --max-count=N --date-order --pretty=format:... -- <file>`.
  - Valida el path con `resolveRepoRelativePath`.
  - Limita `limit` a rango seguro `1..500`, default `100`.
  - Devuelve `FileHistoryEntry[]` compatible con la shape de commits.
- Expuesto `gitFileHistory` en `electron/preload.ts`.
- Agregada entrada de menu contextual de archivo:
  - `components/ContextMenus.tsx`
  - `components/RepoOverlayLayer.tsx`
- Agregada vista central `FileHistoryView` en `components/RepoContentViews.tsx`.
  - Reutiliza `HistoryView`.
  - Header con volver, path y badge de historial.
- Integrado el flujo en `app/page.tsx` y `components/RepoMainView.tsx`.
  - Click en commit del historial abre `gitDiffAtCommit(repoPath, filePath, hash)` para ese archivo.
  - Cambio de repo, apertura de diff, PR o cierre limpian estado de historial.
- Agregadas claves i18n ES/EN/ZH:
  - `fileMenu.history`
  - `fileHistory.title`
  - `fileHistory.back`
  - `fileHistory.loadError`
- Agregados tests IPC en `lib/__tests__/git-hunks-ipc.test.ts`.
  - Historial con archivo renombrado via `--follow`.
  - Verificacion de no modificacion del worktree.
  - Bloqueo de path traversal.

### No tocado

- No staging/unstaging/discard nuevos.
- No cambios en geometria de graph.
- No Temporal Agent.
- No Electron DB.
- No README/CHANGELOG.
