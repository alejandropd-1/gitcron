# Fase 6 ⭐ — Ventanita de preguntas (Q&A scoped al repo activo)

> Fase 6 de Cartografía · plan completo en `00-indice.md`. Segunda superficie estrella · cierra el núcleo de comprensión. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual.

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42 +
Zustand 5 + TS 5.9, simple-git + Octokit). Ya existen andamiaje, Explorador, grounding
CodeGraph, proveedor de IA y el panel "Explicame esto". Ahora la SEGUNDA superficie estrella:
una ventanita donde escribís una pregunta libre sobre el repo y la IA responde, scoped al
repo de la solapa activa.

INVARIANTES (no romper): el contexto se RECUPERA, no se vuelca — para cada pregunta traé solo
los nodos relevantes (búsqueda por símbolo/nombre + vecinos por relación de CodeGraph), NUNCA el
repo entero; per-repo (la pregunta va contra el índice del repo activo, keyed por repo_path); IA
opt-in; strings i18n.

Reconocimiento primero (leé esto ANTES de tocar nada):
- lib/carto-types.ts + el adapter de CodeGraph → cómo recuperar los nodos relevantes.
- La capa de proveedor (fase 4) + el panel de la fase 5 → reutilizar el pipeline de IA.
- lib/git-store.ts / RepoState → cómo saber cuál es el repo activo (per-tab).
- components/cartography/ → dónde montar la caja de preguntas.
- Referencia: docs/01_INVARIANTES.md.

Tareas:
1. Caja de preguntas en la vista, scoped al repo activo. Cambiar de solapa (GitCron → OdontoPro)
   cambia automáticamente el repo consultado, porque el índice es per-repo.
2. Pipeline de respuesta: de la pregunta, recuperá los nodos relevantes del contrato (símbolos +
   vecinos por relación), armá un contexto chico y mandalo al proveedor con un prompt que responda
   en castellano y cite qué archivos miró.
3. Mostrá la respuesta + los archivos/nodos usados (clickeables para abrir el detalle). Historial
   corto de la conversación dentro de la sesión.
4. Strings i18n. Corre con proveedor local u online.

Nota: la recuperación de esta fase es ESTRUCTURAL (relaciones/nombres). La recuperación difusa por
significado (embeddings / vector DB) es una fase posterior opcional, para preguntas por concepto que
no se resuelven por nombre.

Aceptación: una pregunta sobre el repo activo ("¿qué pasa cuando hago un pull?") devuelve respuesta
en castellano basada en archivos reales del repo, citándolos; cambiar de solapa cambia el repo
consultado; el contexto enviado es chico; funciona local y online.

Al terminar: `tsc --noEmit` + `pnpm test` + reporte escrito + STOP para QA visual. Cierra el núcleo
de comprensión; al pasar tu QA, se redactan las fases 7+ (grafo visual, persistencia, vectores, meta).
```
