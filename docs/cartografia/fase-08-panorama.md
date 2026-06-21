# Fase 8 ⭐ — "Panorama / Recorrido": la capa de comprensión que faltaba

> Fase 8 de Cartografía · plan completo en `00-indice.md`. Es la capa semántica/narrativa ARRIBA del grafo técnico (inspirada en los "recorridos guiados" y la UI-por-persona de Understand-Anything): que te enseñe cómo encaja todo, no que te impresione con la complejidad. Cierra con `tsc` + `pnpm test` + `fallow` + reporte + push de la branch + STOP (no merge).

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42 + Zustand 5 +
TS 5.9, simple-git + Octokit). Ya existen (en main): Explorador, grounding CodeGraph, proveedor
de IA local/online, panel "Explicame esto", ventanita de preguntas y la lente Grafo semántico
(Columnas + Nodos). PROBLEMA detectado en QA: la entrada sigue siendo bottom-up — la app tira
todos los nodos/relaciones y el usuario (no-experto) tiene que armar el sentido solo, divagando
nodo por nodo. FALTA la capa de arriba: una orientación top-down en lenguaje claro ANTES de lo
técnico. Eso es esta fase.

INVARIANTES (no romper): lo determinista (grupos, conteos, archivos clave por centralidad,
flechas a nivel grupo) se calcula SIN IA y SIN red; la parte de IA (resumen del proyecto +
recorrido guiado) es opt-in y SIEMPRE cacheada por repo (cero re-gasto si la estructura no
cambió); reusás CartoNodeDetail y la capa de proveedor existente (NO duplicar); la vista consume
solo el contrato normalizado; strings por lib/i18n.ts (ES/EN/ZH); estética TCARS con tokens --carto-.

Reconocimiento primero (leé esto ANTES de tocar nada):
- components/cartography/CartographyView.tsx → el selector de LENTES y cuál es la lente por defecto.
- lib/carto-roles.ts → la clasificación por rol (agrupación de los bloques).
- lib/carto-types.ts + electron/carto/graph-engine.ts → el contrato CartoGraph y graphSnapshot/nodeContext (nodos + relaciones reales).
- electron/ai/carto/explain-node.ts + prompts.ts → el patrón de prompt grounded Y el patrón de CACHE a reusar para el resumen/recorrido.
- components/cartography/CartoNodeDetail → el panel de detalle a reusar en el drill-down.
- electron/db/ del Temporal Agent → patrón de persistencia/cache por repo_path.
- Referencia: docs/00_FUENTE_DE_VERDAD.md y docs/01_INVARIANTES.md.

Branch y entrega:
- Antes de empezar, creá una branch desde main: `cartografia/fase-08-panorama`.
- Commits en esa branch.
- Al cerrar (tsc + tests + fallow + reporte): pusheá la branch y PARÁ. NO mergees a main.
- El merge a main lo hace Alejandro tras su QA visual y OK.

Tareas:
1. Lente "Panorama" y volvela la ENTRADA POR DEFECTO al abrir Cartografía (Explorador y Grafo
   quedan como drill-down, accesibles desde LENTES).
2. Resumen del proyecto (IA, castellano, CACHEADO): una frase de "qué es" + un párrafo corto.
   Grounded en el mapa de grupos (no en código crudo). Cache keyed por repo_path + hash de
   estructura; botón refrescar; reusá la disciplina de cache de explain-node.
3. Bloques por grupo (DETERMINISTA, sin IA): un bloque por rol (maqueta/UI, estilos, base de
   datos, crítico, lógica, config…) con nombre, conteo, una línea de descripción (plantilla fija
   por rol) y sus 3-5 ARCHIVOS CLAVE (ranking por grado/centralidad en el grafo, no todos).
4. Flechas a nivel grupo (DETERMINISTA): agregá las relaciones archivo→archivo a grupo→grupo y
   mostrá las principales (top-K) como flechas entre bloques. Un puñado, NO las 8000+.
5. Recorrido guiado (IA, CACHEADO): 2-3 "flujos típicos" narrados en castellano (ej. "cuando
   hacés un pull, pasa esto…"). Grounded en el mapa de grupos + archivos clave + sus relaciones
   (no código crudo). Cacheado por repo.
6. Profundidad progresiva: click en un grupo → despliega sus archivos; click en un archivo →
   abrí CartoNodeDetail (reusar); las relaciones técnicas (IMPORTA A / ES USADO POR / IMPACTO)
   van COLAPSADAS bajo "ver detalles técnicos".
7. Toggle Simple / Técnico (persona-adaptive), preferencia persistida: Simple (default) muestra
   Panorama con lo técnico colapsado; Técnico muestra relaciones/símbolos/nodos como hoy.
8. Strings i18n ES/EN/ZH (nombres de roles, descripciones, labels del recorrido, toggle).

Aceptación: al abrir Cartografía aparece Panorama por defecto, con párrafo de "qué es" + bloques
de grupo (descripción + archivos clave) + flechas a nivel grupo + recorrido de 2-3 flujos; click
en grupo despliega archivos, click en archivo abre el detalle con lo técnico colapsado; el toggle
Simple/Técnico funciona y persiste; el resumen y el recorrido se cachean por repo y no re-llaman
si no cambió la estructura; lo determinista se construye sin red ni IA; funciona local y online.

Al terminar: tsc + pnpm test + fallow audit + reporte en docs/reports/ + push de la branch + STOP
para QA visual. No mergees.
```
