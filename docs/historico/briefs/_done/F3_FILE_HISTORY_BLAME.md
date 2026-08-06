# F3 — File history + blame (brief para el agente ejecutor)

> **Leé primero:** `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`. Trabajá por
> TANDAS y PARÁ en cada checkpoint. Esta fase es **solo lectura de Git** (no escribe nada);
> riesgo bajo-medio. Nada fuera de este brief.

## Por qué esta feature

Dos features de inspección que GitKraken/SourceTree tienen y GitCron no: ver el **historial
de un archivo** (todos los commits que lo tocaron) y el **blame** (qué commit/autor escribió
cada línea). Bajo riesgo porque no muta el repo, y reusa infra que ya existe.

## Estado de partida (verificado)

- `git:log` existe pero es el log **general** del repo (no `--follow` por archivo).
- `git:diff-at-commit` y `git:show-files` ya muestran el diff/archivos de un commit.
- UI reusable: `HistoryView` (en `RepoContentViews.tsx`) ya renderiza una lista cronológica
  de commits; `DiffViewer.tsx` para mostrar diffs; los context menus de archivo viven en
  `ContextMenus.tsx`.
- NO existen handlers `git:file-history` ni `git:blame`.

## Arquitectura objetivo

### Backend (electron) — handlers nuevos en `electron/ipc/git-ops.ts`
- `git:file-history(repoPath, filePath, limit?)` → `git log --follow --format=... -- <file>`,
  devolviendo la misma shape de commit que ya consume `HistoryView` (hash, autor, fecha,
  mensaje) para reusar el render. `--follow` para seguir renames.
- `git:blame(repoPath, filePath, rev?)` → `git blame --line-porcelain <file>` parseado a una
  estructura por línea: `{ lineNo, content, commitHash, author, authorTime, summary }`.

**Parseo del porcelain en módulo puro testeable:** `lib/blame-parse.ts` con tests Vitest.
El formato `--line-porcelain` es regular pero verboso (repite metadata por línea, agrupa por
commit); parsealo a un array de `BlameLine[]` con fixtures (incluido: archivo de una sola
línea, líneas sin newline final, commits con el mismo autor consecutivos, líneas uncommitted
`0000000`). Cero parseo en el handler ni en el componente.

### Frontend
- **File history:** entrada en el context menu de archivo (`ContextMenus.tsx`) →
  "Ver historial del archivo". Abre una vista que reusa el render de `HistoryView` filtrada a
  ese archivo; click en un commit muestra el diff de ESE archivo en ESE commit
  (`git:diff-at-commit` ya da eso). Puede vivir como modo de `RepoContentViews.tsx` o un
  panel; elegí lo que menos prop-threading agregue y respetá el layout actual.
- **Blame:** entrada en el context menu de archivo → "Blame". Vista que muestra el contenido
  del archivo con una **columna izquierda** por línea: hash corto + autor + edad relativa,
  coloreada por edad (más reciente = más cálido/saturado, más viejo = más apagado), con la
  paleta GitCron. Click en una línea → salta al commit en el grafo o muestra su detalle.
- Strings nuevas por i18n en los 3 idiomas. Estética densa/glass coherente.

## Plan de tandas

1. **TANDA 0 — Diseño.** Tipos (`FileHistoryEntry`, `BlameLine`), contrato IPC en
   `types/electron.d.ts`, y decisión de dónde montar cada vista sin romper el layout 3
   columnas ni el view-switcher de `RepoMainView.tsx`. **CHECKPOINT 0.** No sigas sin OK.
2. **TANDA 1 — File history.** Handler `git:file-history` + entrada en context menu + vista
   reusando HistoryView + diff por commit del archivo. tsc/tests/fallow. CHECKPOINT (QA visual).
3. **TANDA 2 — Blame: parseo.** `lib/blame-parse.ts` + tests Vitest sobre fixtures. Handler
   `git:blame`. Probar el round-trip por IPC. CHECKPOINT.
4. **TANDA 3 — Blame: UI.** Vista de blame con columna por línea coloreada por edad,
   navegación al commit, i18n 3 idiomas. CHECKPOINT (QA visual).

## Qué NO hacer

- No escribir nada en el repo: F3 es lectura pura. Si algo parece requerir escritura,
  está fuera de scope — parar y preguntar.
- No tocar el grafo cronométrico/clásico (geometría), el Temporal Agent, ni `electron/db`.
- No reimplementar `HistoryView` ni `DiffViewer`: reusarlos.
- No tocar README/CHANGELOG.
- No meter blame "incremental"/streaming en el primer corte: un `git blame` completo del
  archivo alcanza para el caso de uso. Si un archivo gigante lapsa, reportalo, no optimices a ciegas.

## Cierre
Reporte en `docs/reports/F3_REPORT.md`. STOP para OK visual de Ale.
