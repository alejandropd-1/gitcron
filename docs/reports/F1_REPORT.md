# F1 — Reporte de cierre: descomposición de `app/page.tsx`

**Branch:** `fallow/test-v4` · **Fecha:** 2026-06-13 · **Estado:** F1 ejecutada (T1, T3, TANDA EXTRA)
+ F1.5 T1 (PR/file diff views); T2 diferida; **meta <1.400 LOC NO alcanzada** (final 1.711, decisión
de Ale de parar — ver addendum). NO mergeado a `main`.

## Resumen ejecutivo

`app/page.tsx`: **2.166 → 1.711 LOC** (−455, −21%). Cero cambio de comportamiento, cero cambio
de i18n. La meta del brief (<1.400) **no se alcanzó**: el resto vive en el view-switcher del
`<main>` central (graph tab clásico + cronométrico), cuya extracción toca área visualmente
sensible (invariante #12) y Ale decidió no abordar en esta fase (ver addendum F1.5).

## Trabajo por tanda

| Tanda | Qué | Archivos | LOC page.tsx |
|---|---|---|---|
| TANDA 0 | Auditoría (CHECKPOINT 0) | — | 2.166 |
| TANDA 1 | 5 modales (New Branch, Create Tag, Merge-needs-checkout, Rename, Force Push) → `RepoActionModals.tsx` + `ModalShell` interno | `app/page.tsx`, `components/RepoActionModals.tsx` | 1.979 |
| TANDA EXTRA | Panel LCAR → `PageWidgets.tsx`; -2 `useState` muertos | `app/page.tsx`, `components/PageWidgets.tsx` | 1.918 |
| TANDA 3 | Repo chooser (openExisting/createRepo/cloneRepo + forcePushConfirm) → `hooks/use-repo-chooser.ts` | `app/page.tsx`, `hooks/use-repo-chooser.ts` (nuevo) | 1.842 |
| TANDA 2 | **DIFERIDA** (decisión CHECKPOINT 0: menor valor, sube prop-threading) | — | — |

### Archivos
- **Creados:** `hooks/use-repo-chooser.ts` (158 LOC).
- **Modificados:** `app/page.tsx` (−324), `components/RepoActionModals.tsx` (+5 componentes + `ModalShell`), `components/PageWidgets.tsx` (+`LcarsDecorPanel`).
- **NO tocados:** `ChronometricGraph.tsx`, `CommitGraph.tsx`, `StagingPanel.tsx`, `electron/`, lógica Git, providers IA, SQLite, i18n keys (no se agregó ninguna: todo el texto extraído ya estaba en `lib/i18n.ts`), `README.md`, `CHANGELOG.md`.

### Decisiones de diseño relevantes
- **`ModalShell` (TANDA 1):** al extraer 5 modales con el mismo scaffold (backdrop + panel glass + click-outside), Fallow detectó +3 grupos de clones. Se introdujo un `ModalShell` interno reutilizado por los 5 → duplicación neutralizada al baseline. Los modales con datos nullable usan locals null-safe para preservar el guard de exit-animation.
- **`use-repo-chooser.ts` (TANDA 3):** el hook **no** llama a `useRepoLoader()` internamente (montaría un segundo watcher `repoWatch`); recibe las funciones del loader por props tipadas y lee `githubToken`/`githubUser`/`setError` del store. Flujo idéntico, incluido el caso "repo ya existe en GitHub" → recuperar clone URL.

## Métricas (gates de cierre, verificados en cada tanda)

| Gate | Baseline (pre-F1) | Final (post-F1) |
|---|---|---|
| `npx tsc --noEmit` | 0 | **0** |
| `pnpm test` | 122/122 (15 files) | **122/122 (15 files)** |
| Fallow dead-code | 4 | **4** (sin cambio) |
| Fallow dupes | 8 | **8** (sin cambio) |
| Fallow health (>threshold) | 259 | **263** (+4) |
| Fallow maintainability | 90.2 (good) | **90.2 (good)** |
| LOC `app/page.tsx` | 2.166 | **1.842** |

- **dead-code 4:** todos pre-existentes en `hooks/use-panel-layout.ts` (`GRAPH_COLUMN_DEFAULTS`, `GRAPH_COLUMN_LIMITS`, `GraphColumnKey` + 1 tipo). **No tocados** (fuera de scope F1). Candidatos de housekeeping.
- **health +4:** por agregar funciones de componente/hook nuevas (pequeñas y limpias) que cruzan un umbral por-función; no es duplicación ni dead code. Maintainability global intacta.

## Discrepancias con `docs/00_FUENTE_DE_VERDAD.md` (para que Ale lo actualice)

1. **"Fallow hoy 0 issues" → FALSO.** Baseline real: dead-code 4, dupes 8, health 259 sobre umbral. F1 mantuvo dead-code/dupes en baseline (no introdujo regresión), pero el doc parte de una premisa incorrecta.
2. **"Tests: 9 archivos, 80 tests" → real 15 archivos, 122 tests.**
3. **Context menus "inline" → ya estaban extraídos.** Los 4 (Commit/Branch/RemoteBranch/File) ya renderizan desde `components/ContextMenus.tsx`; sólo quedaba el `<AnimatePresence>` + wiring inline (TANDA 2, diferida). El doc y el brief los describían como inline.
4. **`page.tsx`: "2.166 LOC, ~63 useState"** → era exacto al inicio; ahora **1.842 LOC, 61 useState** (se eliminaron 2 muertos: `amendCurrentMessage`, `showStashClearConfirm` — este último vive y se usa en `RepoSidebar.tsx`, intacto).
5. **CodeGraph:** durante T1–T3 el repo no estaba indexado (sin `.codegraph/`), así que el análisis de impacto se hizo con Grep/Read (helpers `childPath`/`isPushRejected`/`cloneUrlFromGitHubCreateResult` confirmados de uso exclusivo del chooser). **Al cierre de F1 Ale corrió `codegraph init`**: el índice ya está activo y al día (incluye los símbolos creados en esta fase), disponible para F1.5.

## Pendiente / propuesta (NO ejecutado)

### F1.5 — Extracción del view-switcher central (para alcanzar <1.400)
El `<main>` central de `page.tsx` (~445 LOC) es la masa restante. Conditional view-switcher con:
- Vista PR-diff (header + lista de archivos + `DiffViewer`): ~78 LOC inline.
- Vista file-diff (header + word-wrap toggle + `ConflictResolver` + `DiffViewer`): ~64 LOC inline.
- Wrapper del repo-start (header + `RepoStartPanel`): ~38 LOC inline.
- Orquestación de transiciones (`AnimatePresence` por vista).

**Propuesta:** extraer `RepoMainView` (o `PullRequestDiffView` + `FileDiffView` por separado) →
llevaría `page.tsx` por debajo de 1.400. **Riesgo medio:** toca el render central (adyacente a
invariante #12) → requiere **QA visual explícito de Ale**. Debe ir en su propio brief/fase.

### Otros diferidos
- **TANDA 2** (glue de context menus → `ContextMenus.tsx`): ~89 LOC, ahorro neto ~60, sube prop-threading. Diferida por bajo valor (decisión CHECKPOINT 0).
- **Housekeeping H-dead-code:** 4 issues pre-existentes en `use-panel-layout.ts`.

## Addendum F1.5 (ejecutado parcialmente)

**T1 — vistas de diff → `RepoContentViews.tsx` (hecho).** Se extrajeron `PullRequestDiffView`
(~78 LOC) y `FileDiffView` (~64 LOC) del `<main>` a su contenedor de dominio (junto a
HistoryView/CommitTabView), JSX verbatim, handlers por props. No se tocaron `DiffViewer`,
`ConflictResolver` ni los grafos. De paso se limpió un bloque grande de imports lucide muertos
en `page.tsx` (5 que orfanó esta extracción + ~9 pre-existentes de extracciones anteriores) y
los imports de `DiffViewer`/`ConflictResolver`; quedan `FolderOpen` y `Loader2`.
- **LOC:** 1.842 → **1.711**. tsc 0, tests 122/122, Fallow dupes 8, dead-code 4 (sin cambio).
- Commit: `F1.5 T1: extraigo PR-diff y file-diff views a RepoContentViews.tsx`.

**Resto — PARADO por decisión de Ale.** Llegar a <1.400 requería extraer el **Graph tab**
(clásico + cronométrico, ~192 LOC → ~1.550) o, para cumplir el target, todo el view-switcher
del `<main>` a un `RepoMainView` (~450 LOC → ~1.300). Ambos tocan el área del grafo
(invariante #12, requiere validación visual). Ale optó por **parar en ~1.711** y dejarlo como
deuda futura documentada. Sin tocar el grafo.

**Nota de meta:** el objetivo <1.400 del brief resultó no alcanzable sin tocar el render central;
el resultado entregado (−455 LOC, −21%, cero cambio de comportamiento) es el cierre acordado.

## Cierre
Una fase por vez con OK visual de Ale como compuerta vinculante. **STOP.** No mergear a `main`
hasta el OK de F1/F1.5 y la pasada de docs (README/CHANGELOG) que decide Ale.
