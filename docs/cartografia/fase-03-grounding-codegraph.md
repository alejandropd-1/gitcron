# Fase 3 — Grounding estructural: embeber CodeGraph (relaciones + impacto)

> Fase 3 de Cartografía · plan completo en `00-indice.md`. Es el sustrato que mantiene HONESTA a la IA. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual.

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42 +
Zustand 5 + TS 5.9, simple-git + Octokit). Ya existen el andamiaje (flag
enableCartography, vista top-level, estado per-repo) y la lente Explorador (árbol de
archivos, carto:scan-tree). Ahora sumás el SUSTRATO ESTRUCTURAL que va a alimentar y
verificar las explicaciones con IA: embebés el motor CodeGraph en el proceso main.
Esto es lo que evita que la IA invente relaciones que no existen.

INVARIANTES (no romper): cero red (CodeGraph es 100% local, SQLite); cómputo en el
main, nunca en el renderer; no tocás lógica de Git; la vista consume SOLO un contrato
normalizado propio, nunca la forma cruda de CodeGraph; strings por lib/i18n.ts (ES/EN/ZH).

Reconocimiento primero (leé esto ANTES de tocar nada):
- electron/ipc/ (p. ej. ai, storage) → patrón de handler IPC y dónde vive la infra del main.
- electron/db/ del Temporal Agent → cómo se maneja SQLite en el main (patrón a imitar para el índice).
- lib/carto-types.ts + los adapters / lib/*-projection.ts con tests → patrón de contrato + adapter testeable.
- package.json → versión de Node de Electron y cómo se agregan dependencias.
- Referencia: docs/00_FUENTE_DE_VERDAD.md (sección electron/) y docs/01_INVARIANTES.md.

Branch y entrega:
- Antes de empezar, creá una branch desde main: `cartografia/fase-03-grounding-codegraph`.
- Hacé todos tus commits en esa branch.
- Al cerrar (tsc + tests + reporte): pusheá la branch y PARÁ. NO mergees a main.
- El merge a main lo hace Alejandro tras su QA visual y OK. La fase siguiente sale de main ya con esta mergeada.

Tareas:
1. Agregá `@colbymchenry/codegraph` como dependencia. En el main, abrí e indexá el repo
   activo (`CodeGraph.open(repoPath)` + `indexAll` con onProgress) y exponé por IPC de
   lectura: búsqueda de nodos, callers, callees e impact radius (`getImpactRadius`).
2. Decidí dónde vive el índice: `.codegraph/` gitignoreado, o (preferible) relocalizado
   a userData keyed por repo_path. Documentá la decisión. Verificá que Electron 42 cumpla
   el Node 22.5+ que CodeGraph necesita (`node:sqlite`).
3. Definí/extendé el contrato en `lib/carto-types.ts` (CartoNode; CartoEdge con tipo de
   relación import/call; impacto) y adaptá la salida de CodeGraph en `lib/carto-from-codegraph.ts`
   (ADAPTER, con tests Vitest). La vista nunca ve datos crudos del motor.
4. Mantené el índice fresco con `cg.watch()` (re-sync al editar, sin bloquear el renderer).
5. Tipá el bridge en types/electron.d.ts, exponé en preload, strings i18n.
6. Para que puedas QA esto SIN el grafo visual (que viene después): en el panel del
   Explorador, al seleccionar un archivo mostrá una lista textual de "importa a / es usado
   por / impacto" con los datos reales de CodeGraph.

Aceptación: para un archivo conocido del repo activo, la lista de callers/callees/impacto
es correcta y verificable a ojo; el contrato CartoGraph queda poblado vía el adapter (con
tests); cero red; per-repo; el índice se refresca al editar.

Al terminar: `tsc --noEmit` + `pnpm test` + reporte escrito + STOP para QA visual.
```
