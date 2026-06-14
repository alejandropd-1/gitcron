# F2 — Reporte de avance

## TANDA 0 — Diseño + tipos

Estado: completada. STOP para OK antes de TANDA 1.

### Cambios realizados

- Agregado `lib/hunk-patch.ts` con el modelo puro para diffs parseados:
  - `FileDiff`: paths `a/`/`b/`, headers de archivo, flags de binario/nuevo/borrado/renombrado, modos y hunks.
  - `Hunk`: indice estable, header `@@`, offsets y conteos old/new, seccion opcional y lineas.
  - `DiffLine`: indice estable, tipo (`context`/`add`/`remove`/`no-newline`), prefijo, raw/content y numeros old/new.
  - `ApplyHunkOptions`: `reverse` + `cached` para stage, unstage y discard futuros.
- Extendido `types/electron.d.ts` con el contrato IPC futuro:
  - `gitDiffHunks(repoPath, filePath, staged?) -> GitResult<FileDiff>`
  - `gitApplyHunk(repoPath, filePath, hunkPatch, options) -> GitResult`

### Integracion planificada

- `DiffViewer.tsx` mantiene su parseo local actual hasta TANDA 3 para no romper usos existentes.
- En TANDA 3, solo el diff de working tree/staged seleccionado deberia habilitar controles por hunk.
- PR diff, commit diff y file diff historico deben seguir usando `DiffViewer` sin acciones de staging.
- `ConflictResolver.tsx` queda intacto; solo se toma como referencia visual para controles densos por bloque.
- `git:stage`, `git:unstage`, `git:stage-batch`, `git:unstage-batch` y `git:diff` quedan intactos.

### Casos borde a testear en TANDA 1

- Modificacion simple de un hunk.
- Archivo con multiples hunks y seleccion de uno intermedio.
- Archivo nuevo (`--- /dev/null`).
- Archivo borrado (`+++ /dev/null`).
- Marcador `\ No newline at end of file`.
- CRLF preservado al parsear/reconstruir.
- Paths con espacios o caracteres que requieren headers correctos.
- Rename con headers `rename from` / `rename to`.
- Diff binario sin hunks.
- Diff sintetico de untracked como el que hoy produce `git:diff`.

### QA

- `npx.cmd tsc --noEmit`: 0 errores.
- `pnpm test`: 15 archivos, 122 tests verdes.
- `pnpm exec fallow`: falla solo por baseline conocido.
  - Dead code: 2 exports + 1 type.
  - Duplicacion: 8 clone groups.
  - Health: 270 sobre umbral.
  - MI: 90.1 (good).
  - LOC reportado: 30,739.
- `git status --short`: muestra cambios de esta tanda en `types/electron.d.ts` y `lib/hunk-patch.ts`; tambien hay briefs `docs/briefs/F2-F6` ya staged/no propios.
- `git diff --stat`: `types/electron.d.ts | 8 ++++++++` (el archivo nuevo `lib/hunk-patch.ts` esta untracked y no aparece en ese comando).

### No tocado

- No handlers IPC.
- No preload.
- No UI.
- No i18n.
- No README/CHANGELOG.
- No grafo, Temporal Agent, Electron DB ni ConflictResolver.

## TANDA 1 — Modulo puro + tests

Estado: completada. STOP para OK antes de TANDA 2.

### Cambios realizados

- Implementado `parseUnifiedDiff(raw)` en `lib/hunk-patch.ts`.
  - Parsea headers de archivo (`diff --git`, `index`, modos, `---`, `+++`, rename, binario).
  - Devuelve hunks con indice estable, rangos old/new y lineas tipadas.
  - Calcula numeros old/new por linea.
  - Normaliza transporte CRLF/CR a LF para operar sobre formato patch estable.
  - Si recibe un diff multi-archivo accidental, toma solo el primer archivo para no mezclar hunks.
- Implementado `buildHunkPatch(fileDiff, hunkIndex)`.
  - Reconstruye un patch de un solo hunk con headers de archivo completos.
  - Preserva el marker `\ No newline at end of file`.
  - Rechaza indices inexistentes y diffs binarios sin hunk textual.
- Agregada suite `lib/__tests__/hunk-patch.test.ts`.

### Fixtures cubiertos

- Modificacion simple.
- Diff multi-hunk, construyendo patch solo del hunk seleccionado.
- Archivo nuevo (`--- /dev/null`).
- Archivo borrado (`+++ /dev/null`).
- Marker `\ No newline at end of file`.
- Diff con transporte CRLF.
- Paths con espacios.
- Diff binario sin hunks.

### QA

- `npx.cmd tsc --noEmit`: 0 errores.
- `pnpm test`: 16 archivos, 130 tests verdes.
- `pnpm exec fallow`: falla solo por baseline conocido.
  - Dead code: 2 exports + 1 type.
  - Duplicacion: 8 clone groups.
  - Health: 270 sobre umbral.
  - MI: 90.2 (good).
  - LOC reportado: 31,162.
- `git status --short`: cambios de F2 en `types/electron.d.ts`, `lib/hunk-patch.ts`, `lib/__tests__/hunk-patch.test.ts`, `docs/reports/F2_REPORT.md`; tambien hay briefs `docs/briefs/F2-F6` staged/no propios.
- `git diff --stat`: `types/electron.d.ts | 8 ++++++++`. Los archivos nuevos de esta tanda estan untracked y por eso no aparecen en ese comando.

### No tocado

- No handlers IPC.
- No preload.
- No UI.
- No i18n.
- No README/CHANGELOG.
- No grafo, Temporal Agent, Electron DB ni ConflictResolver.
- No seleccion por linea; queda para TANDA 4 opcional.

## TANDA 2 — Handlers IPC

Estado: completada. STOP para OK antes de TANDA 3.

### Cambios realizados

- Agregado handler `git:diff-hunks` en `electron/ipc/git-ops.ts`.
  - Valida `repoPath + filePath` con `resolveRepoRelativePath`.
  - Usa `git diff --cached -- <file>` para diffs staged.
  - Usa `git diff HEAD -- <file>` para diffs unstaged/tracked, preservando el comportamiento actual de `git:diff`.
  - Mantiene soporte para untracked con diff sintetico equivalente al handler viejo.
  - Devuelve `FileDiff` parseado por `parseUnifiedDiff`.
- Agregado handler `git:apply-hunk`.
  - Valida path traversal.
  - Verifica que el patch toque exactamente el archivo pedido.
  - Exige patch de un solo hunk.
  - Aplica por archivo temporal con `git apply`, `--cached` para stage/unstage y `-R` para reverse/unstage/discard.
  - No usa `--reject`, `--3way`, ni flujo interactivo.
- Expuestos `gitDiffHunks` y `gitApplyHunk` en `electron/preload.ts`.
- `git:stage`, `git:unstage`, `git:stage-batch`, `git:unstage-batch` y `git:diff` quedaron intactos.

### Prueba de round-trip

- Agregado `lib/__tests__/git-hunks-ipc.test.ts`.
- El test registra los handlers reales con `ipcMain` mockeado y ejecuta Git real en un repo temporal:
  - crea un archivo con dos hunks separados;
  - obtiene hunks por `git:diff-hunks`;
  - stagea solo el primer hunk con `git:apply-hunk`;
  - des-stagea ese hunk;
  - descarta solo ese hunk del working tree;
  - verifica que el segundo hunk siga modificado.

### QA

- `npx.cmd tsc --noEmit`: 0 errores.
- `pnpm test`: 17 archivos, 131 tests verdes.
- `pnpm exec fallow`: falla solo por baseline conocido.
  - Dead code: 2 exports + 1 type.
  - Duplicacion: 8 clone groups.
  - Health: 252 sobre umbral.
  - MI: 90.2 (good).
  - LOC reportado: 31,359.
- `git status --short`: cambios de F2 en `electron/ipc/git-ops.ts`, `electron/preload.ts`, `types/electron.d.ts`, `lib/hunk-patch.ts`, `lib/__tests__/hunk-patch.test.ts`, `lib/__tests__/git-hunks-ipc.test.ts`, `docs/reports/F2_REPORT.md`; tambien hay briefs `docs/briefs/F2-F6` staged/no propios.
- `git diff --stat`: `electron/ipc/git-ops.ts | 89 +`, `electron/preload.ts | 4 +`, `types/electron.d.ts | 8 +`. Los archivos nuevos no aparecen por estar untracked.

### No tocado

- No UI.
- No i18n.
- No README/CHANGELOG.
- No grafo, Temporal Agent, Electron DB ni ConflictResolver.
- No seleccion por linea; queda para TANDA 4 opcional.

## TANDA 3 — UI por hunk

Estado: completada. STOP para OK antes de TANDA 4 opcional o cierre.

### Cambios realizados

- Agregados controles opcionales por hunk en `components/DiffViewer.tsx`.
  - En hunks unstaged: boton para stagear hunk y boton destructivo para descartar hunk.
  - En hunks staged: boton para unstagear hunk.
  - Los controles son props opcionales, asi que PR diff y diffs historicos siguen sin acciones de staging.
  - El hunk en ejecucion muestra spinner y bloquea acciones concurrentes.
- Cableado `components/RepoContentViews.tsx` con `DangerConfirmDialog` para confirmar descarte de hunk.
  - El descarte no se ejecuta directo desde el boton.
  - Archivos conflictuados no muestran acciones por hunk; `ConflictResolver` queda intacto.
- Extendidos `components/RepoMainView.tsx` y `app/page.tsx`.
  - Se distingue `fileDiffMode` entre working tree y commit diff.
  - Los handlers reconstruyen el patch desde `parseUnifiedDiff + buildHunkPatch`.
  - `stage` aplica con `{ cached: true }`.
  - `unstage` aplica con `{ cached: true, reverse: true }`.
  - `discard` aplica con `{ reverse: true }`.
  - Luego se refresca status y se recarga el diff seleccionado.
- Agregadas claves i18n ES/EN/ZH en `lib/i18n.ts` para acciones de hunk, confirmacion destructiva, error de aplicacion y tooltip de word-wrap.

### QA

- `npx.cmd tsc --noEmit`: 0 errores.
- `pnpm test`: 17 archivos, 131 tests verdes.
- `pnpm exec fallow`: falla por baseline conocido y reporta complejidad de UI nueva.
  - Dead code: 2 exports + 1 type.
  - Duplicacion: 8 clone groups.
  - Health: 254 sobre umbral.
  - MI: 90.2 (good).
  - LOC reportado: 31,570.
- QA local de frontend:
  - Dev server Next levantado en `http://localhost:3001`.
  - `Invoke-WebRequest http://localhost:3001`: HTTP 200.
  - Browser integrado no pudo inicializar por sandbox (`CreateProcessAsUserW failed: 5`); se deja constancia como limitacion de QA visual.
  - Dev server cerrado y logs temporales eliminados.
- `git status --short`: cambios F2 en `app/page.tsx`, `components/DiffViewer.tsx`, `components/RepoContentViews.tsx`, `components/RepoMainView.tsx`, `electron/ipc/git-ops.ts`, `electron/preload.ts`, `lib/i18n.ts`, `types/electron.d.ts`, archivos nuevos de tests/modulo/reporte; tambien hay briefs `docs/briefs/F2-F6` staged/no propios.
- `git diff --stat`: 8 archivos tracked modificados, 321 inserciones y 9 borrados.

### No tocado

- No README/CHANGELOG.
- No grafo, Temporal Agent, Electron DB ni ConflictResolver.
- No handlers existentes de stage/unstage/diff, salvo los handlers nuevos de TANDA 2.
- No seleccion por linea; queda para TANDA 4 opcional solo con OK explicito.

## TANDA 4 — Seleccion por linea

Estado: completada. STOP de cierre de F2.

### Cambios realizados

- Extendido `buildHunkPatch(fileDiff, hunkIndex, { selectedLines })` en `lib/hunk-patch.ts`.
  - Sin `selectedLines`, conserva el comportamiento exacto de patch de hunk completo.
  - Con `selectedLines`, genera un patch parcial de un solo hunk y recomputa los conteos del header `@@`.
  - Las remociones no seleccionadas pasan a contexto para que la linea permanezca.
  - Las adiciones no seleccionadas se omiten para que no entren al index/working tree.
  - Los bloques de cambios `-- ++` se procesan por pares para preservar orden en modificaciones parciales.
  - Si se pide un patch parcial sin lineas cambiadas seleccionadas, falla explicitamente.
- Agregados checkboxes por linea en `components/DiffViewer.tsx`.
  - Solo aparecen en diffs con acciones de hunk habilitadas.
  - Solo son seleccionables las lineas `+` y `-`; contexto y markers no-newline no son accionables.
  - El contador del hunk muestra cuantas lineas estan seleccionadas.
  - Si no hay seleccion, los botones siguen aplicando el hunk completo como en TANDA 3.
  - Si hay seleccion, stage/unstage/discard pasan los indices seleccionados.
- Actualizados `components/RepoContentViews.tsx`, `components/RepoMainView.tsx` y `app/page.tsx`.
  - El descarte destructivo conserva confirmacion y ahora recuerda tambien las lineas seleccionadas.
  - Los handlers de app pasan `selectedLines` a `buildHunkPatch`.
- Agregadas claves i18n ES/EN/ZH para seleccionar/deseleccionar lineas, contador y acciones sobre seleccion.

### Fixtures y pruebas agregadas

- `lib/__tests__/hunk-patch.test.ts`
  - Patch parcial de una modificacion dentro de un bloque con dos remociones y dos adiciones.
  - Patch parcial de una insercion, omitiendo adiciones no seleccionadas.
  - Rechazo explicito cuando no hay lineas cambiadas seleccionadas.
- `lib/__tests__/git-hunks-ipc.test.ts`
  - Git real + IPC real: stagear solo una linea adicionada de un hunk con dos adiciones; la otra queda unstaged.

### QA

- `npx.cmd tsc --noEmit`: 0 errores.
- `pnpm test`: 17 archivos, 135 tests verdes.
- `pnpm exec fallow`: falla por baseline conocido y complejidad UI.
  - Dead code: 2 exports + 1 type.
  - Duplicacion: 8 clone groups.
  - Health: 255 sobre umbral.
  - MI: 90.2 (good).
  - LOC reportado: 31,884.
- QA local de frontend:
  - Dev server Next levantado en `http://localhost:3001`.
  - `Invoke-WebRequest http://localhost:3001`: HTTP 200.
  - Browser integrado siguio bloqueado por sandbox (`CreateProcessAsUserW failed: 5`).
  - Dev server cerrado y logs temporales eliminados.
- `git status --short`: cambios F2 en `app/page.tsx`, `components/DiffViewer.tsx`, `components/RepoContentViews.tsx`, `components/RepoMainView.tsx`, `electron/ipc/git-ops.ts`, `electron/preload.ts`, `lib/i18n.ts`, `types/electron.d.ts`, archivos nuevos de tests/modulo/reporte; tambien hay briefs `docs/briefs/F2-F6` staged/no propios.
- `git diff --stat`: 8 archivos tracked modificados, 420 inserciones y 18 borrados. Los archivos nuevos no aparecen por estar untracked.

### Pendientes / limites conocidos

- No se hizo QA visual interactiva por bloqueo del Browser integrado en el sandbox.
- La seleccion por linea opera sobre indices de lineas `+`/`-`; las lineas de contexto no son seleccionables.
- No se uso `--reject`, `--3way` ni `git add -p`.

### Ajuste post-QA visual

- Caso reportado por Ale: seleccionar solo el lado rojo de una modificacion en `package.json` y usar discard de lineas seleccionadas producia `patch failed`.
- Causa: el patch parcial permitia partir una modificacion emparejada `-old/+new` y Git no podia aplicar ese medio reemplazo en reverse.
- Fix: en bloques de reemplazo, seleccionar cualquiera de los dos lados incluye ambos lados del par en el patch parcial.
- Test agregado: reproduce `@types/react` en `package.json`, seleccionando solo la linea removida y verificando que el patch incluya el par completo.
- QA del fix:
  - `pnpm test lib/__tests__/hunk-patch.test.ts`: 12 tests verdes.
  - `pnpm test lib/__tests__/git-hunks-ipc.test.ts`: 2 tests verdes.
  - `npx.cmd tsc --noEmit`: 0 errores.
  - `pnpm test`: 17 archivos, 136 tests verdes.

### No tocado

- No README/CHANGELOG.
- No grafo, Temporal Agent, Electron DB ni ConflictResolver.
- No cambios al comportamiento de staging por archivo entero.
