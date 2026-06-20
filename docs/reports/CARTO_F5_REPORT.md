# Reporte de Fase — Cartografía F5 ⭐: Panel "Explicame esto" (click → castellano, grounded, cacheado)

Branch: `cartografia/fase-05-explicar-nodo` (desde `main`). **No mergeada** — queda
pendiente del QA visual y OK de Alejandro.

Primera **superficie estrella**: hacés click en un símbolo de un archivo y la IA lo
explica en lenguaje humano, para alguien no experto. La explicación se construye **SOLO**
con contexto real y recortado (el código del nodo + sus callers, callees e impacto del
grafo CodeGraph), nunca el repo entero. Es **opt-in**, se **cachea por contenido** (no
re-llama al modelo si el nodo no cambió) y funciona **local u online**. Con la IA apagada,
el panel muestra igual la estructura.

---

## 1. Flujo de la feature (de punta a punta)

1. En el Explorador seleccionás un archivo → el panel inferior (`CartoRelationsPanel`)
   ahora lista además sus **Símbolos** (funciones, clases, métodos…).
2. Click en un símbolo → se abre el **panel de detalle** (`CartoNodeDetail`).
3. El detalle pide `cartoAi.explainNode(repoPath, nodeId, lang)`. En **main**:
   - se arma el **contexto mínimo** del nodo desde el grafo (`graphNodeContext`),
   - se consulta la **caché por contenido**; si hay hit, se devuelve sin tocar el modelo,
   - si no, se dispara el proveedor activo (LM Studio local u OpenRouter online) con un
     **prompt no técnico** y se **persiste** el resultado.
4. El panel muestra **ruta + explicación + impacto** (+ callers/callees), con badge de
   `caché` cuando la respuesta vino guardada.

---

## 2. Cambios realizados y qué NO se tocó

### Contexto mínimo del nodo (main, solo lectura)
- **`electron/carto/graph-engine.ts`**:
  - `graphNodeContext(repoPath, nodeId)` (NUEVO, async) — arma el contrato `CartoNodeContext`:
    código del nodo vía `cg.getCode` **recortado** (tope 160 líneas / 6000 chars), `callers`
    y `callees` (cap 12 c/u) reducidos a `{name, kind, filePath}`, `impact` (radio profundidad 3),
    y un `contentHash` = `sha256(qualifiedName + signature + source)`. `getCode` envuelto en
    try/catch: si el archivo no se puede leer, degrada a sin-código (la explicación sigue
    desde relaciones).
  - `graphFileSymbols(repoPath, filePath)` (NUEVO) — símbolos del archivo (excluye `file` e
    `import`), ordenados por línea, para el selector de nodos.
- **`lib/carto-from-codegraph.ts`** — sin cambios de lógica; sólo se reusa `toCartoNode`
  (ya exportado).

### Tipos del contrato
- **`types/carto-ai.ts`** — `CartoAIContext` gana grounding a nivel **símbolo** (`source`,
  `callers[]`, `callees[]`). Nuevos: `CartoAIRelated`, `CartoNodeContext`,
  `CartoExplainNodeResult`.

### Prompt no técnico (main, función pura)
- **`electron/ai/carto/prompts.ts`** — `buildExplainPrompts` reescrito: nuevo `EXPLAIN_SYSTEM`
  (misma **regla de oro** de grounding, audiencia **no experta**), `renderContext` ahora
  también vuelca callers/callees, y el `user` adjunta el código recortado y pide los ejes en
  prosa: **qué hace · a qué le pide datos/qué consume · "si tocás esto se afecta…" · "suele
  cambiar junto con…"**. `buildAskPrompts` (Q&A libre) intacto.

### Orquestación con caché (main)
- **`electron/ai/carto/explain-node.ts`** (NUEVO) — `explainNode`: contexto → **caché por
  contenido** → proveedor → persistencia. Devuelve **siempre** la estructura; si la IA está
  apagada no llama al modelo, y si falla (servidor caído / sin key) reporta `aiError` sin
  tirar la estructura. Calcula `promptChars` (tamaño del contexto enviado, para verificación).

### Caché (reusa la disciplina del Temporal Agent)
- **`electron/db/schema.ts`** — `LATEST_SCHEMA_VERSION` 1→**2**; migración v2 con tabla
  `carto_explanation` STRICT + índice **único** `(repo_path, node_path, content_hash, lang)`.
- **`electron/db/carto-cache.ts`** (NUEVO) — `getCartoExplanation` / `upsertCartoExplanation`
  (misma DB SQLite, mismos tipos de fila planos). El upsert **poda** versiones viejas del mismo
  nodo+idioma: la caché guarda sólo la explicación del contenido vigente.

### IPC / preload / tipos
- **`electron/ipc/carto-graph.ts`** — canal `carto:graph-file-symbols`.
- **`electron/ipc/carto-ai.ts`** — canal `carto:ai-explain-node` (no lanza por fallos del
  modelo; los reporta en el resultado).
- **`electron/preload.ts`** + **`types/electron.d.ts`** — `cartoGraph.fileSymbols` y
  `cartoAi.explainNode`. Las API keys **siguen sin cruzar** este límite.

### Renderer (estética TCARS)
- **`components/cartography/CartoNodeDetail.tsx`** (NUEVO) — panel de detalle: cabecera
  (volver + nombre + kind), ruta, bloque de explicación (spinner / texto + proveedor + badge
  `caché` / aviso "IA apagada" / error), e impacto + callers/callees. Tokens `--carto-*`.
- **`components/cartography/CartoRelationsPanel.tsx`** — suma la sección **Símbolos**
  clickeable (`onSelectNode`) y fetchea `fileSymbols` junto a `fileRelations`.
- **`components/cartography/CartographyView.tsx`** — estado `selectedNode`; la caja inferior
  alterna **detalle ↔ relaciones**; se limpia al cambiar de archivo o de repo.

### i18n
- **`lib/i18n.ts`** — 10 claves `cartography.detail.*` en **ES/EN/ZH** (símbolos, volver,
  explicando, cargando, error, IA apagada, caché, "lo llaman/usan", "llama/usa a", hint).

### Qué NO se tocó
- Lógica de Git (cero escrituras nuevas). Temporal Agent, predicciones, materialización,
  grafo cronométrico, conflict resolver, stash, GitHub auth: intactos.
- **CSP / SECURITY.md**: sin dominios nuevos (se reusa la capa de proveedor de F4).
- Baseline Electron (contextIsolation/sandbox/etc.). `node:sqlite` con prefijo `node:`.
- README/CHANGELOG (fuera de scope de fase de código).

---

## 3. Verificación de aceptación

| Criterio | Estado |
|---|---|
| Click en un nodo → explicación en castellano | ✅ prompt fuerza ES rioplatense + audiencia no técnica |
| Con su impacto | ✅ panel muestra radio de impacto + callers/callees |
| **Contexto enviado es chico** (verificable) | ✅ código recortado (160 líneas/6000 chars), callers/callees cap 12; `explainNode` devuelve `promptChars` (típico ~1–4 KB, nunca el repo) |
| Se cachea, no re-llama si no cambió | ✅ clave `repo_path + node_path + content_hash + lang`; test de poda/hit/miss |
| Funciona local y online | ✅ orquestador usa `getCartoProvider` (LM Studio / OpenRouter) |
| Con IA apagada, muestra datos estructurales | ✅ `explainNode` devuelve contexto sin llamar al modelo; panel muestra ruta + impacto + relaciones |

> **Por qué el contexto es chico:** sólo se manda el código del propio nodo (recortado) y
> los nombres+rutas de hasta 12 callers/12 callees + un resumen de impacto. Nada de cuerpos
> de funciones vecinas, nada de archivos enteros, nunca el repo.

---

## 4. Métricas de cierre

- **`npx tsc --noEmit`**: **0 errores**.
- **`pnpm test` (vitest)**: **27 archivos · 226 tests verdes**. Nuevos: `carto-cache.test.ts`
  (6) y 5 casos sumados a `prompts.test.ts` (source/callers/callees + tono no técnico + ejes).
- **`pnpm exec fallow`**: maintainability **90.3 (good)**. Ningún hit nuevo en archivos de
  esta fase; los targets listados son hotspots preexistentes (`use-repo-loader`, `app/page.tsx`,
  `ChronometricGraph`, etc.). Única nota sobre lo nuevo: sugerencia de cobertura para
  `CartoNodeDetail` (componente React; el proyecto no testea componentes).

---

## 5. Notas para el QA visual

- Requiere un repo **indexado** (estado del grafo `ready`) y la IA **activada** en
  Ajustes → Cartografía para ver la explicación. Con la IA apagada, el panel debe mostrar
  igual ruta + impacto + relaciones y el aviso "IA desactivada".
- Local: LM Studio en `localhost:1234` con un modelo cargado. El primer explain de un nodo
  llama al modelo; el segundo (sin editar el nodo) debe traer el badge **caché** al instante.
- Editar el cuerpo del símbolo (tras re-sync del watch) cambia el `content_hash` → la próxima
  explicación se regenera (no usa la caché vieja).
