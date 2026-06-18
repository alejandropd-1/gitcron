# Fase C0.4 — Lienzo de nodos (React Flow) + panel de detalle

> Mapea a `GITCRON_CARTOGRAPHY_BRIEF.md` § C0.4. Pegá la caja al agente. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual.

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42
+ Zustand 5 + TS 5.9, simple-git + Octokit). Ya existen: el andamiaje, la lente
Explorador (carto:scan-tree, lib/carto-tree.ts) y las métricas de git
(carto:git-metrics, lib/carto-metrics.ts: churn, último toque, co-change). Ahora
construís el LIENZO DE NODOS, el corazón visual de la vista.

INVARIANTES (no romper): no tocás lógica de Git; cero red; cero IA; todo string
por lib/i18n.ts en ES/EN/ZH; la vista consume SOLO un contrato de datos
normalizado propio, nunca datos crudos del motor.

Tareas:
1. Agregá la dependencia `@xyflow/react` (React Flow). Verificá que conviva con
   Next.js 15 / React 19.
2. Definí en `lib/carto-types.ts` el contrato normalizado: CartoNode, CartoEdge,
   CartoGraph. Documentá cada campo. ESTE es el idioma estable que habla la vista.
3. Creá `lib/carto-from-git.ts`: un ADAPTER que arme un CartoGraph a partir del
   árbol (carto-tree) y las métricas (carto-metrics). Con tests Vitest. Esta es la
   ÚNICA capa que conoce la forma cruda de los datos; la vista no.
4. Creá `components/cartography/GraphLens.tsx` con React Flow: nodos = archivos
   (carpetas como clusters opcional), tamaño/color del nodo = churn, aristas =
   co-change (grosor = frecuencia; limitá a las top-K por frecuencia si el grafo
   se vuelve un plato de fideos ilegible). Layout automático, pan/zoom nativo de
   React Flow.
5. Creá `components/cartography/CartoNode.tsx`: nodo custom con estética TCARS.
6. Creá `components/cartography/NodeDetailPanel.tsx`: al clickear un nodo, mostrá
   ruta, churn, último toque, y la lista "suele cambiar junto con…" (vecinos por
   co-change). Este es el "si tocás esto, ojo con aquello" del Tier 0.
7. Strings nuevos en lib/i18n.ts (ES/EN/ZH).

Aceptación: el grafo dibuja nodos y aristas con datos reales del repo activo;
tamaño/color por churn legibles y aristas de co-change visibles sin saturar;
pan/zoom fluidos; nodos TCARS; click abre el panel con ruta, métricas y vecinos;
el adapter tiene tests y la vista consume solo CartoGraph; es per-repo.

Al terminar: `tsc --noEmit` limpio + `pnpm test` verde, reporte escrito, y PARÁ
para el QA visual de Alejandro.
```
