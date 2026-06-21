# Reporte de Fase — Cartografía F6 ⭐: Ventanita de preguntas (pregunta libre → respuesta grounded, scoped al repo activo)

Branch: `cartografia/fase-06-ventanita-preguntas` (desde `main`). **No mergeada** —
queda pendiente del QA visual y OK de Alejandro.

Segunda **superficie estrella**: escribís una pregunta libre sobre el repo activo
("¿qué pasa cuando hago un pull?") y la IA responde en castellano **citando archivos
reales**. La clave: el contexto se **RECUPERA, no se vuelca**. Para cada pregunta, main
busca los símbolos relevantes **por nombre** + sus **vecinos por relación** del grafo
CodeGraph, arma un contexto **chico** y lo manda al proveedor. La recuperación es
**ESTRUCTURAL** (nombres/relaciones); la difusa por significado (embeddings) queda para
una fase posterior. Es **per-repo** (cambiar de solapa cambia el índice consultado),
**opt-in** y funciona **local u online**.

---

## 1. Flujo de la feature (de punta a punta)

1. En la vista de Cartografía, con la IA activa, la columna derecha (`CartoAskBox`)
   muestra la caja de preguntas, **scoped al repo activo** (`repoPath` de la solapa).
2. Escribís una pregunta libre → `cartoAi.askRepo(repoPath, question, lang)`. En **main**
   (`askRepo`):
   - **Recuperación** (`graphRetrieve`): de la pregunta se extraen los **términos**
     buscables (`extractQueryTerms`, descarta palabras vacías ES/EN), se buscan **semillas**
     por nombre (`searchNodes`), y se suman sus **vecinos** inmediatos (callers/callees).
     Todo **acotado** por topes `RETRIEVE_*`.
   - **Prompt**: se arma un contexto chico (`buildAskPrompts` con el bloque `retrieved`:
     símbolos + relaciones reales) y se dispara el proveedor activo (LM Studio / OpenRouter).
3. La respuesta vuelve con la **prosa** + los **nodos usados** + los **archivos citados**
   + `promptChars` (tamaño del contexto, para verificar el recorte).
4. El panel muestra la respuesta y, debajo, los **nodos citados clickeables** → abren el
   **panel de detalle** (`CartoNodeDetail`) de ese símbolo. Historial corto de la
   conversación dentro de la sesión.

---

## 2. Cambios realizados y qué NO se tocó

### Recuperación estructural (lib pura, testeable)
- **`lib/carto-retrieval.ts`** (NUEVO) — `extractQueryTerms(question)`: tokeniza,
  normaliza acentos (`\p{Diacritic}`), descarta **palabras vacías** ES/EN y tokens cortos,
  deduplica preservando orden y acota a 8 términos. Pura, sin I/O. Ej.: `"¿Qué pasa cuando
  hago un pull?"` → `['pull']`.

### Motor del grafo (main, solo lectura)
- **`electron/carto/graph-engine.ts`**:
  - `graphRetrieve(repoPath, question)` (NUEVO) — orquesta la recuperación: semillas por
    término (`retrieveSeeds`) + vecinos por relación (`retrieveNeighbors`). Devuelve
    `{ nodes, relations }`. `null` si el índice no está `ready`.
  - Helpers `retrieveSeeds` / `retrieveNeighbors` / `relationVerb` + topes `RETRIEVE_*`
    (`PER_TERM 5`, `SEED_CAP 6`, `NEIGHBORS_PER_SEED 4`, `NODE_CAP 24`, `RELATION_CAP 30`).
    Excluye nodos `file`/`import` como semilla; dedup de nodos y aristas.

### Tipos del contrato
- **`types/carto-ai.ts`** — `CartoAIContext` gana el bloque opcional **`retrieved`**
  (`symbols[]` + `relations[]`): grounding recuperado por la pregunta. Nuevo **`CartoAskResult`**
  (`answer` + `usedNodes` + `usedFiles` + `promptChars`).

### Prompt (main, función pura)
- **`electron/ai/carto/prompts.ts`** — `buildAskPrompts` extendido: renderiza el bloque
  `retrieved` (símbolos + relaciones reales) como **fuente principal de anclaje** y pide
  **citar los archivos** mirados. Sin contexto recuperado, no agrega el pedido de citas.
  `renderRetrieved` (NUEVO, helper). `buildExplainPrompts` intacto.

### Orquestación (main)
- **`electron/ai/carto/ask-repo.ts`** (NUEVO) — `askRepo(repoPath, question, lang)`:
  recupera → arma contexto → dispara el proveedor activo → devuelve respuesta + nodos/archivos
  usados + `promptChars`. Lanza con mensaje claro si la IA está apagada o el índice no está
  listo (el IPC lo traduce). **Sin caché** (las preguntas libres son únicas; cachear es fase
  posterior).

### IPC / preload / tipos
- **`electron/ipc/carto-ai.ts`** — canal **`carto:ai-ask-repo`**. El canal previo
  `carto:ai-ask` se mantiene (no se borra; `provider.ask` lo reusa `askRepo`).
- **`electron/preload.ts`** + **`types/electron.d.ts`** — `cartoAi.askRepo`. Las API keys
  **siguen sin cruzar** este límite.

### Renderer (estética TCARS)
- **`components/cartography/CartoAskBox.tsx`** — reescrito: ahora consume `askRepo`
  (recuperación **desde la pregunta**, ya no anclada al archivo seleccionado). Muestra la
  respuesta + los **nodos citados clickeables** (`onSelectNode` → abre el detalle) + el
  proveedor + el tamaño de contexto. Limpia el hilo al **cambiar de repo** (la conversación
  es del repo activo). Si la recuperación no encontró nada, lo dice ("sin coincidencias").
- **`components/cartography/CartographyView.tsx`** — pasa `onSelectNode={setSelectedNode}`
  al ask box (y deja de pasarle `selectedFile`: la pregunta ya no depende del archivo).

### i18n
- **`lib/i18n.ts`** — 4 claves nuevas `cartography.ai.*` en **ES/EN/ZH** (`repoHint`,
  `basedOn`, `noMatches`, `contextChars`). `noFileHint` queda (sin uso, no se borra).

### Qué NO se tocó
- Lógica de Git (cero escrituras nuevas). Temporal Agent, predicciones, materialización,
  grafo cronométrico, conflict resolver, stash, GitHub auth: intactos.
- **CSP / SECURITY.md**: sin dominios nuevos (se reusa la capa de proveedor de F4).
- Baseline Electron (contextIsolation/sandbox/etc.). `node:sqlite` con prefijo `node:`.
- README/CHANGELOG (fuera de scope de fase de código).
- El panel de detalle (`CartoNodeDetail`), el explorador y el grounding por archivo (F5):
  intactos — esta fase suma una superficie nueva, no toca las previas.

---

## 3. Verificación de aceptación

| Criterio | Estado |
|---|---|
| Pregunta sobre el repo activo → respuesta en castellano | ✅ prompt fuerza ES rioplatense; `lang` del store |
| Basada en archivos reales del repo, citándolos | ✅ contexto `retrieved` = símbolos+relaciones reales del grafo; prompt pide citar; UI muestra los nodos/archivos usados |
| Cambiar de solapa cambia el repo consultado | ✅ `askRepo` usa el `repoPath` activo; el índice es per-repo; el hilo se limpia al cambiar de repo |
| **El contexto enviado es chico** | ✅ topes `RETRIEVE_*` (≤6 semillas, ≤4 vecinos c/u, ≤24 nodos, ≤30 relaciones); sin código de cuerpos; `askRepo` devuelve `promptChars` (típico ~0.5–3 KB, nunca el repo) |
| Funciona local y online | ✅ `getCartoProvider` (LM Studio / OpenRouter), mismo pipeline que F4/F5 |

> **Por qué el contexto es chico:** sólo viajan los **nombres + tipos + rutas + firma** de
> hasta 24 símbolos relevantes y hasta 30 aristas legibles. Nada de cuerpos de funciones,
> nada de archivos enteros, nunca el repo. La recuperación trae sólo lo que toca la pregunta.

---

## 4. Métricas de cierre

- **`npx tsc --noEmit`**: **0 errores**.
- **`pnpm test` (vitest)**: **28 archivos · 236 tests verdes**. Nuevos: `carto-retrieval.test.ts`
  (8 casos de extracción de términos, incluye el caso de aceptación `pull`) + 2 casos sumados a
  `prompts.test.ts` (render del bloque `retrieved` + pedido de citas).
- **`pnpm exec fallow` / `audit`**: **verdict pass**. **0** dead-code / dupes / complejidad
  **introducidos** por esta fase (`check_changed` sobre 13 archivos: 0 issues). Maintainability
  global **90.3 (good)**. `graphRetrieve` se descompuso en helpers para no introducir un hotspot
  de complejidad. Los targets que lista fallow son hotspots preexistentes (`use-repo-loader`,
  `app/page.tsx`, etc.), no de esta fase.

---

## 5. Notas para el QA visual

- Requiere un repo **indexado** (estado del grafo `ready`) y la IA **activada** en
  Ajustes → Cartografía para ver respuestas. Con el índice aún indexando, `askRepo` avisa
  claro ("el índice todavía no está listo").
- Caso de aceptación: preguntá **"¿qué pasa cuando hago un pull?"** → la respuesta debe
  nombrar archivos reales del repo (p. ej. el handler de pull) y aparecer abajo como **chips
  clickeables**; clickear uno abre el panel de detalle de ese símbolo.
- Cambiá de solapa (GitCron → otro repo) y preguntá lo mismo: la respuesta debe basarse en el
  **otro** repo, y el hilo de conversación debe **resetearse** al cambiar de repo.
- Local: LM Studio en `localhost:1234` con un modelo cargado. Online: key de OpenRouter del
  Temporal Agent. La pregunta y el contexto (símbolos+rutas) se envían al proveedor elegido —
  en online, eso sale a un tercero (igual que F4/F5).
- Verificación del recorte: el pie de cada respuesta muestra `… · N car. de contexto` (N chico).
