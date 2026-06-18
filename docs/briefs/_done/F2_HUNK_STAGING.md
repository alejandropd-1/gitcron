# F2 — Staging por hunk / línea (brief para el agente ejecutor)

> **Leé primero:** `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`. Trabajá por
> TANDAS y PARÁ en cada checkpoint. Este brief es el alcance completo; nada fuera de él.
> Esta fase **toca lógica de Git nueva** (escritura del index vía patches) — leé la
> invariante #6: la escritura nueva está autorizada acá, con las salvaguardas que se indican.

## Por qué esta feature

Es la **brecha #1** contra GitKraken/SourceTree. Hoy GitCron stagea/unstagea/descarta por
**archivo entero**. F2 agrega granularidad: stagear un hunk sí y otro no del mismo archivo,
y (fase interna 2) líneas sueltas. Es lo que más cambia el día a día de un commit prolijo.

## Estado de partida (verificado)

- El working tree y los diffs ya existen: handlers `git:status`, `git:diff`, `git:stage`,
  `git:unstage`, `git:stage-batch`, `git:unstage-batch`, `git:read-file`,
  `git:resolve-conflict-file` (este último ya escribe archivos resueltos y los stagea —
  patrón de referencia de "escritura segura validada").
- UI: `StagingPanel.tsx` (lista de archivos unstaged/staged con `StagingFileRow`),
  `DiffViewer.tsx` (visor de diff unificado). `ConflictResolver.tsx` ya hace edición por
  bloques dentro del DiffViewer — **mirá su patrón antes de diseñar el de hunks**.
- NO existe ningún handler de patch/apply. Hay que crearlo.

## Arquitectura objetivo

### Backend (electron)
Nuevos handlers en `electron/ipc/git-ops.ts` (registrados igual que los hermanos):
- `git:diff-hunks(repoPath, filePath, staged: boolean)` → devuelve el diff del archivo
  **parseado en hunks** (cada hunk con su header `@@ -a,b +c,d @@`, sus líneas con prefijo
  +/-/espacio, e índices estables). Solo lectura (`git diff` / `git diff --cached`).
- `git:apply-hunk(repoPath, filePath, hunkPatch: string, { reverse, cached })` → aplica un
  patch de un solo hunk al index vía `git apply --cached` (stage) o `git apply --cached -R`
  (unstage) o `git apply -R` sobre el working tree (discard de hunk).

**El parseo y la reconstrucción del patch van en un módulo puro testeable:**
`lib/hunk-patch.ts` (NO embebido en el handler ni en el componente), con tests Vitest.
Funciones sugeridas: `parseUnifiedDiff(raw)` → `FileDiff{ hunks: Hunk[] }`;
`buildHunkPatch(fileDiff, hunkIndex, { selectedLines? })` → string de patch válido (header
de archivo `diff --git` + `---`/`+++` + el hunk, con conteos `@@` recomputados si hay
selección parcial de líneas). Esta matemática de offsets es el corazón de F2 y la parte que
más se rompe: aislada y testeada se debuggea sin pelear con React ni con Electron.

> Razón del módulo puro: generar un patch que `git apply` acepte es puro string-surgery con
> aritmética de líneas. Un solo `@@` mal contado y el apply falla entero. Testealo con
> fixtures de diffs reales (incluido: archivo nuevo, archivo borrado, hunk al final sin
> newline `\ No newline at end of file`, CRLF).

### Frontend
- En `DiffViewer.tsx` (o un sub-componente nuevo `HunkStagingView.tsx` si DiffViewer queda
  grande): por cada hunk, un control **Stage hunk / Unstage hunk / Discard hunk**, con el
  mismo lenguaje visual que ya usa `ConflictResolver` para sus bloques. Estética GitCron
  (densa, glass sobrio); strings nuevas por i18n en los 3 idiomas.
- Discard de hunk = destructivo → confirmación vía `DangerConfirmDialog.tsx` (ya existe),
  como el discard por archivo actual.
- Tras aplicar, refrescar el diff del archivo (re-llamar `git:diff-hunks`) y el status
  global, igual que hacen las acciones de staging actuales. No recargar todo el repo.

## Plan de tandas

1. **TANDA 0 — Diseño + tipos.** Definir `FileDiff`/`Hunk`/`DiffLine` en
   `lib/hunk-patch.ts` (solo tipos + firmas), el contrato IPC en `types/electron.d.ts`
   (sin implementar), y mapear cómo se integra en DiffViewer sin romper su uso actual
   (unificado, conflict resolver, PR diff, file diff). **CHECKPOINT 0:** mostrá el diseño
   y los casos borde que vas a testear. No sigas sin OK.
2. **TANDA 1 — Módulo puro + tests.** `parseUnifiedDiff` + `buildHunkPatch` con suite Vitest
   verde sobre fixtures (mínimo: mod simple, multi-hunk, archivo nuevo, borrado, sin newline
   final, CRLF). Cero UI todavía. CHECKPOINT.
3. **TANDA 2 — Handlers IPC.** `git:diff-hunks` + `git:apply-hunk` usando el módulo puro,
   expuestos en preload + tipos. Probar el round-trip stage→unstage→discard de un hunk por
   IPC (script o test de integración liviano). Confirmá que ningún flujo de staging por
   archivo existente cambió. CHECKPOINT.
4. **TANDA 3 — UI de hunks.** Controles stage/unstage/discard por hunk en el DiffViewer,
   i18n 3 idiomas, confirmación de discard, refresh post-acción. CHECKPOINT (QA visual).
5. **TANDA 4 (opcional, solo con OK) — selección por línea.** Checkboxes por línea dentro
   del hunk → `buildHunkPatch` con `selectedLines`. Es la parte más frágil; va sola, al
   final, y solo si la TANDA 3 quedó sólida.

## Qué NO hacer

- No tocar `git:resolve-conflict-file` ni el ConflictResolver (solo inspirarte en su patrón).
- No cambiar el comportamiento del staging por archivo entero (sigue disponible tal cual).
- No usar `git add -p` interactivo por stdin (frágil, dependiente de TTY) — generá el patch
  y aplicalo con `git apply --cached`. Es determinístico y testeable.
- No tocar el grafo, el Temporal Agent, ni `electron/db`.
- No tocar README/CHANGELOG (pasada de docs al cierre, la indica Ale).
- Ante cualquier patch que `git apply` rechace en un caso real: **parar y reportar el
  fixture**, no forzar con flags como `--reject` o `--3way` sin discutirlo.

## Cierre
Reporte en `docs/reports/F2_REPORT.md`: tandas hechas, fixtures cubiertos, handlers nuevos,
métricas (tsc 0, tests, Fallow delta), casos borde pendientes. STOP para OK visual de Ale.
