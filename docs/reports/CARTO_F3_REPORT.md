# Reporte de Fase — Cartografía F3: Grounding estructural (CodeGraph embebido)

Branch: `cartografia/fase-03-grounding-codegraph` (desde `main`). **No mergeada** —
queda pendiente del QA visual y OK de Alejandro.

Esta fase suma el **sustrato estructural** que mantiene honesta a la IA: se embebe el
motor **CodeGraph** (`@colbymchenry/codegraph`) en el proceso main para indexar el repo
activo y exponer, por IPC de solo lectura, relaciones reales del código (búsqueda de
símbolos, callers, callees e impact radius). La vista nunca ve la forma cruda del motor:
todo pasa por un contrato normalizado propio y un adapter testeado.

---

## 1. Cambios realizados y qué NO se tocó

### Dependencia y build
- **`@colbymchenry/codegraph` `^1.0.1`** agregado a `dependencies` (vía `pnpm add`).
  Trae un bundle per-plataforma como `optionalDependency` (`@colbymchenry/codegraph-win32-x64`)
  con tree-sitter/WASM y abre `node:sqlite` de forma perezosa.
- **`tsup.config.ts`**: el motor queda **external** (no se bundlea). Resuelve su bundle
  per-plataforma por `require.resolve` en runtime; bundlearlo rompería esa resolución.
  Se ajustó tanto `external` como el regex de `noExternal`.
- **`package.json` → `build.asarUnpack`**: `**/node_modules/@colbymchenry/**`, para que
  el WASM/nativo del motor cargue desde fuera del asar en builds de `electron-builder`.
  (No afecta dev/QA; sólo el empaquetado de release.)
- **`.gitignore`**: se ignoran `.codegraph/` y `.codegraph-gitcron/` (índices locales).

### Proceso main (todo el cómputo vive acá)
- **`electron/carto/graph-engine.ts`** (NUEVO) — manager del ciclo de vida del motor,
  per-repo (`Map<repoPath, …>`):
  - `ensureGraph` abre/indexa en **background** (no bloquea el renderer): `open`+`sync`
    si ya hay índice, `init`+`indexAll` si es la primera vez, con `onProgress`.
  - `cg.watch()` re-sincroniza al editar y notifica al renderer (índice fresco).
  - Queries: `searchGraph`, `graphCallers`, `graphCallees`, `graphImpact`,
    `graphFileRelations` (compuesta para el panel de QA).
  - `closeAllGraphs`/`disposeGraph` para cierre limpio (`unwatch`+`close`).
- **`electron/ipc/carto-graph.ts`** (NUEVO) — bridge IPC de solo lectura. Canales
  `carto:graph-ensure|status|search|callers|callees|impact|file-relations`, todos con la
  forma `{ success, data?, error? }` y errores saneados (`errMsg`). Eventos push:
  `carto:graph-progress` y `carto:graph-updated`.
- **`electron/main.ts`** — registro de `registerCartoGraphHandlers(getMainWindow)` y
  `closeAllGraphs()` en `before-quit`.

### Contrato + adapter (frontera estable, testeable)
- **`lib/carto-types.ts`** (NUEVO) — contrato normalizado: `CartoNode`, `CartoEdge`
  (con `CartoEdgeRelation` import/call/…), `CartoRelatedSymbol`, `CartoSearchHit`,
  `CartoImpact`, `CartoFileRelations`, `CartoGraphStatus`/`Progress`.
- **`lib/carto-from-codegraph.ts`** (NUEVO) — **ADAPTER** puro (import *type-only* del
  motor, se borra en runtime): `edgeRelation`, `toCartoNode`, `adaptRelated`,
  `adaptSearchHits`, `adaptImpact`. Deduplica, acota y normaliza.
- **`lib/__tests__/carto-from-codegraph.test.ts`** (NUEVO) — 13 tests Vitest con
  fixtures de objetos planos.

### Bridge tipado + i18n
- **`electron/preload.ts`** — namespace `cartoGraph` (queries + `onProgress`/`onUpdated`).
- **`types/electron.d.ts`** — tipado completo del bridge contra `lib/carto-types`.
- **`lib/i18n.ts`** — bloque `cartography.graph.*` en **ES/EN/ZH** (relaciones, importa a,
  es usado por, impacto, estados de indexado/error).

### Vista (QA sin grafo visual — tarea 6)
- **`components/cartography/CartoRelationsPanel.tsx`** (NUEVO) — panel textual que, al
  seleccionar un archivo, lista **"importa a / es usado por / impacto"** con datos reales
  del motor. Maneja estados indexando/error/vacío.
- **`components/cartography/ExplorerLens.tsx`** — selección de archivo (resaltado + callback).
- **`components/cartography/CartographyView.tsx`** — `ensure` del índice al entrar/cambiar
  de repo, suscripción a progreso/refresco, split vertical árbol + panel de relaciones.

### Qué NO se tocó
- Lógica de Git (cero cambios de comportamiento; no se agregó ninguna escritura de Git).
- Temporal Agent, vista cronométrica/geometría, conflict resolver, stash, GitHub auth.
- `carto:scan-tree` (Fase 2) intacto; el grounding se suma al lado, no lo reemplaza.
- `README.md` / `CHANGELOG.md` (scope cerrado).

---

## 2. Decisión: dónde vive el índice

**El índice vive en `<repo>/.codegraph-gitcron/` (nombre DEDICADO), per-repo.**

Se evaluó la opción "preferible" del brief —relocalizar a `userData` keyed por
`repo_path`— y se **descartó por límite del SDK**: `CodeGraph.open()/init()` derivan el DB
estrictamente bajo `projectRoot` (`getDatabasePath` → `<root>/<CODEGRAPH_DIR>/codegraph.db`),
y el único override, `CODEGRAPH_DIR`, acepta **sólo un nombre de carpeta** (rechaza rutas con
separadores, absolutas o `..`). Relocalizar a userData exigiría reconstruir el constructor
**privado** del motor a mano (forkearlo), violando "consumir el motor, no forkearlo".

**Por qué un nombre dedicado y no el `.codegraph/` por defecto** (corrección post-QA):
durante el QA visual, `lib/i18n.ts` mostraba `es usado por: 0` pese a estar importado por
decenas de componentes. Causa raíz: el `.codegraph/` por defecto del repo activo lo había
construido el **daemon CodeGraph MCP** (que corre sobre gitCron) y estaba **incompleto**
—5291 aristas vs 7543 en un índice fresco; le faltaban las aristas de imports resueltos—.
Nuestro engine lo reusaba y sólo hacía `sync()` incremental, heredando los gaps; además dos
procesos sobre el mismo SQLite arriesgan "database is locked". Fijar `CODEGRAPH_DIR=.codegraph-gitcron`
le da a GitCron un índice **propio y completo**, aislado de cualquier índice externo de
CodeGraph (CLI o daemon). Verificado: con el dir dedicado, `i18n.ts` → 7 usado-por,
`shared.ts` → 12, `carto-types.ts` → 5.

Detalles:
- El motor reconoce `.codegraph-*` como carpeta de datos suya → la **auto-ignora** al
  indexar y al watch-ear. Está **gitignoreada** (`.gitignore`: `.codegraph-gitcron/`).
- Robustez ante upgrades: al reabrir, si el índice propio quedó viejo (`isIndexStale()`)
  se re-indexa completo; si no, basta un `sync` incremental.
- Es **naturalmente per-repo**: cada repo abierto tiene su propio `.codegraph-gitcron/`.
- Nota de QA: en repos de usuario el dir puede aparecer como untracked. GitCron **no**
  auto-edita el `.gitignore` del usuario (respeta el repo). Filtrarlo de la vista de status
  queda como follow-up.

**Node/`node:sqlite`**: verificado. CodeGraph necesita Node ≥22.5 por `node:sqlite`.
- Electron 42 corre Node 22.x y **ya usa `node:sqlite`** (Temporal Agent, `electron/db/`).
- El sistema/CI corre Node v22.19.0 → los tests Vitest abren `node:sqlite` sin problema.

---

## 3. Aceptación verificada

- **Smoke test del SDK** (Node 22.19, proyecto temporal): `init`+`indexAll` (4 files, 15
  nodes, 18 edges), `getNodesInFile`, `getCallers`/`getCallees` correctos, `getImpactRadius`,
  `getFileDependencies` (importa a) y `getFileDependents` (es usado por) devolviendo las
  relaciones reales esperadas a ojo. `watch` disponible.
- **Cero red**: el motor es 100% local (SQLite); ningún canal abre sockets. CSP intacta.
- **Per-repo**: un motor por `repoPath`, índice propio por repo.
- **Índice fresco**: `cg.watch()` re-sincroniza al editar y emite `carto:graph-updated`.
- **Contrato vía adapter**: la vista nunca ve `Node`/`Edge`/`Subgraph` crudos.

---

## 4. Métricas y delta de calidad

- **`tsc --noEmit`**: **0 errores**.
- **`pnpm test` (Vitest)**: **207 tests / 25 files, todos verdes** (se sumaron 13 tests del
  adapter; antes 194).
- **`pnpm run build:electron`** (tsup): OK. Verificado que `dist/main.js` conserva
  `require("@colbymchenry/codegraph")` external y `node:sqlite`.
- **`pnpm exec fallow`**: maintainability **90.3 (good)**. Los hallazgos above-threshold son
  **todos pre-existentes** (use-repo-loader, app/page.tsx, ChronometricGraph, …). **Ninguno
  de los archivos nuevos** aparece en health targets, dead-code ni dupes → delta limpio.

---

## 5. Superficie IPC nueva (resumen)

| Canal | Entrada | Devuelve (data) |
|---|---|---|
| `carto:graph-ensure` | repoPath | `CartoGraphStatus` (arranca indexado bg) |
| `carto:graph-status` | repoPath | `CartoGraphStatus` |
| `carto:graph-search` | repoPath, query, limit? | `CartoSearchHit[] \| null` |
| `carto:graph-callers` | repoPath, nodeId | `CartoRelatedSymbol[] \| null` |
| `carto:graph-callees` | repoPath, nodeId | `CartoRelatedSymbol[] \| null` |
| `carto:graph-impact` | repoPath, nodeId | `CartoImpact \| null` |
| `carto:graph-file-relations` | repoPath, filePath | `CartoFileRelations \| null` |

Eventos push: `carto:graph-progress { repoPath, status }`, `carto:graph-updated { repoPath }`.
(`null` = índice todavía no `ready`; el renderer muestra "indexando…".)

---

## 6. STOP

Cierre de fase: `tsc` en 0 + 207 tests verdes + fallow con delta limpio + este reporte.
**Se detiene acá para el QA visual de Alejandro.** El merge a `main` lo hace él tras su OK;
la fase 4 sale de `main` ya con ésta mergeada.
