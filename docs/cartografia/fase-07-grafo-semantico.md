# Fase 7 — Lente "Grafo semántico" (tablero + nodos por rol + switch)

> Fase 7 de Cartografía · plan completo en `00-indice.md`. Es el grafo visual que demoré de más antes: ahora LEGIBLE (por rol), no spaghetti técnico. Cierra con `tsc` + `pnpm test` + `fallow` + reporte + push de la branch + STOP (no merge).

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42 +
Zustand 5 + TS 5.9, simple-git + Octokit). Ya existen (fases 1-6, en main tras el merge):
andamiaje, lente Explorador, grounding CodeGraph (relaciones + impacto), proveedor de IA
local/online, panel "Explicame esto" (click → explicación en castellano) y la ventanita de
preguntas. Ahora agregás una SEGUNDA LENTE: el "Grafo semántico", un tablero visual que
muestra los archivos como nodos flotantes unidos por líneas, AGRUPADOS Y COLOREADOS POR ROL.
No es el grafo técnico de imports crudo (eso pierde a un no-experto): es un mapa legible de
"qué es qué".

INVARIANTES (no romper): no tocás lógica de Git; cero red para construir el grafo (sale del
contrato/grounding ya existente); la vista consume SOLO el contrato normalizado, nunca datos
crudos del motor; click en un nodo REUSA el panel de explicación existente (no dupliques esa
lógica); strings por lib/i18n.ts (ES/EN/ZH); estética TCARS con tokens --carto-.

Reconocimiento primero (leé esto ANTES de tocar nada):
- components/cartography/CartographyView.tsx + el selector de LENTES → cómo se agrega/conmuta una lente (hoy: "Explorador").
- lib/carto-types.ts + lib/carto-from-codegraph.ts → el contrato CartoGraph (nodos + relaciones) que vas a dibujar.
- electron/carto/graph-engine.ts → de dónde salen nodos/relaciones (ya existe).
- El panel de detalle / "Explicame esto" (explain-node) → para reusar en el click de nodo.
- app/globals.css (bloque --carto-) → tokens; y si existe, lib/canvas-viewport.ts (pan/zoom del grafo cronométrico) por si reusás esa mecánica.
- Referencia: docs/00_FUENTE_DE_VERDAD.md y docs/01_INVARIANTES.md.

Branch y entrega:
- Antes de empezar, creá una branch desde main: `cartografia/fase-07-grafo-semantico`.
- Hacé todos tus commits en esa branch.
- Al cerrar (tsc + tests + fallow + reporte): pusheá la branch y PARÁ. NO mergees a main.
- El merge a main lo hace Alejandro tras su QA visual y OK. La fase siguiente sale de main ya con esta mergeada.

Tareas:
1. Agregá una lente "Grafo" al selector de LENTES de CartographyView, al lado de "Explorador".
   Es un switch: el usuario alterna entre árbol y grafo sobre el MISMO repo/contrato.
2. Asigná un ROL a cada nodo con una función PURA testeable (lib/carto-roles.ts), por heurística
   de ruta/extensión (determinista, sin IA):
   - maqueta/UI: components/, *.tsx que renderizan
   - estilos: *.css, globals, tokens
   - base de datos: db/, *.sql, stores de persistencia
   - funcionalidad crítica: lógica de Git, electron/ipc, proceso main
   - lógica/utilidades: lib/
   - config: archivos de configuración
   Dejá la categorización extensible; el refinamiento con IA y la curaduría del usuario son fases posteriores.
3. Dibujá el tablero: fondo cuadrillé, nodos flotantes coloreados por rol (un color por categoría,
   con leyenda), agrupados/clusterizados por rol, unidos por líneas = relaciones del contrato.
   Pan/zoom. Usá @xyflow/react (React Flow) con nodos custom TCARS; si preferís, reusá la mecánica
   de canvas SVG ya existente — lo que mantenga la estética y el rendimiento.
4. Click en un nodo → abrí el MISMO panel de detalle/"Explicame esto" que ya usa el Explorador
   (reusar, no duplicar).
5. Performance: limitá relaciones visibles (top-K) si el grafo se satura; no debe colgar con repos grandes.
6. Strings i18n (nombres de roles, leyenda, label de la lente) en ES/EN/ZH.

Aceptación: la lente "Grafo" se conmuta con "Explorador"; los nodos se ven flotando en un tablero
cuadrillé, coloreados y agrupados por rol, con leyenda; las líneas reflejan relaciones reales;
click en un nodo abre la explicación existente; pan/zoom fluidos; la función de roles tiene tests;
per-repo; cero red para construir el grafo.

Al terminar: tsc + pnpm test + fallow audit + reporte en docs/reports/ + push de la branch + STOP
para QA visual. No mergees.
```
