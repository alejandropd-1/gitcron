# Fix real — Estilos (y demás no-code) ausentes del Grafo/Panorama

> El hotfix anterior (`hotfix-clasificador-estilos`) confirmó que el regex ya reconoce SCSS y solo sumó tests. El "ESTILOS · 0" NO era la clasificación: es que los archivos de estilo nunca llegan a ser nodos. Este es el arreglo de verdad. Plan general en `00-indice.md`. Cierra con `tsc` + `pnpm test` + `fallow` + reporte + push de la branch + STOP (no merge).

```
Trabajás en GitCron (Next.js 15 + React 19 + Electron 42 + Zustand 5 + TS 5.9). La lente Grafo
muestra "ESTILOS · 0 archivos" (y el grupo "Estilos" de Panorama queda vacío) en repos que sí
tienen estilos. CAUSA RAÍZ ya diagnosticada: en `electron/carto/graph-engine.ts`, `graphSnapshot`
arma los file-nodes SOLO desde `cg.getFiles()` — el índice de CodeGraph, que parsea código
(TS/TSX/JS) y NO CSS/SCSS/MD/etc. Por eso el Explorador lista ~338 archivos (camina el filesystem)
pero el Grafo solo ve ~162 (los que CodeGraph indexa). Los estilos (y otros no-code) nunca se
clasifican porque nunca son nodos. El regex de `classifyCartoRole` ya está bien; NO lo toques.

INVARIANTES (no romper): no tocás lógica de Git; cero red; `classifyCartoRole` sigue pura e
intacta; per-repo; la vista consume solo el contrato normalizado; el tope de nodos del tablero
"Nodos" (rendimiento de React Flow) se mantiene; strings i18n si agregás alguno (ES/EN/ZH).

Reconocimiento primero (leé esto ANTES de tocar nada):
- electron/carto/graph-engine.ts → `graphSnapshot` (de dónde salen los file-nodes hoy: `cg.getFiles()`) y `toFileCartoNode`.
- La fuente del árbol del Explorador (el fs walk, `carto:scan-tree`) → la lista COMPLETA de archivos del repo a unir.
- lib/carto-roles.ts → el clasificador (ya correcto, referencia).
- lib/carto-panorama.ts → cómo Panorama agrupa/cuenta por rol desde el contrato.
- components/cartography/CartoPanoramaLens.tsx y la vista "Columnas" del Grafo → de qué lista de nodos toman los conteos (¿el set completo o el capado?).
- Referencia: docs/00_FUENTE_DE_VERDAD.md y docs/01_INVARIANTES.md.

Branch y entrega:
- Antes de empezar, creá una branch desde main: `cartografia/fix-estilos-en-snapshot`.
- Commits en esa branch.
- Al cerrar (tsc + tests + fallow + reporte): pusheá la branch y PARÁ. NO mergees a main.
- El merge lo hace Alejandro tras su QA.

Tareas:
1. En `graphSnapshot`, armá los file-nodes desde la UNIÓN de (a) el fs walk del Explorador
   (todos los archivos del repo) y (b) `cg.getFiles()`. Dedup por ruta. Los archivos que CodeGraph
   no parsea (CSS/SCSS/MD/JSON/imágenes…) entran como file-nodes SIN relaciones — está perfecto,
   se clasifican y listan igual. Las relaciones de los archivos de código siguen saliendo de CodeGraph.
2. CLAVE: asegurate de que las vistas por rol —"Columnas" del Grafo y los grupos/conteos de Panorama—
   clasifiquen y cuenten el set COMPLETO de archivos, no el subconjunto capado para render. El tope
   `SEMANTIC_GRAPH_NODE_CAP` es solo para dibujar el tablero "Nodos" (los no-code tienen grado 0 y si
   no, se los come el cap). El agrupado por rol debe ver todos.
3. Excluí ruido obvio si hace falta (node_modules, .git, dist/build, lockfiles ya van a "config").
4. Tests: en un set de rutas que incluya `app/globals.css` y un `styles/x.scss`, el snapshot debe
   producirlos como nodos rol `styles`; y el conteo por rol debe incluirlos.

Aceptación: en un repo con estilos, la columna ESTILOS de Grafo (Columnas) y el grupo "Estilos" de
Panorama listan los archivos reales (.css/.scss); los conteos por grupo reflejan TODOS los archivos
del repo, no solo los ~162 de CodeGraph; el tablero "Nodos" sigue capado para rendimiento; tests verdes.

Al terminar: tsc + pnpm test + fallow audit + reporte en docs/reports/ + push de la branch + STOP
para QA visual. No mergees.
```
