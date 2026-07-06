# Fase 10 — Poda: una sola Cartografía (adiós Explorador y modo columnas)

> Fase 10 de Cartografía. Elimina la lente Explorador y el modo COLUMNAS del Grafo. Solo poda: la fusión Panorama+Grafo es la fase 11. Cierra con `tsc` + `pnpm test` + reporte + push de la branch + STOP (no merge).

```
Trabajás en GitCron (Next.js 15 + React 19 + Electron 42 + Zustand 5 + TS 5.9, simple-git +
Octokit), vista "Cartografía" (components/cartography/). HOY tiene 3 lentes: Panorama, Explorador
(árbol de archivos) y Grafo (con 2 modos internos: COLUMNAS y NODOS). DECISIÓN de producto: el
Explorador y el modo COLUMNAS se ELIMINAN. Queda Panorama + Grafo (solo nodos). Esta fase es
SOLO PODA — no agregues ni rediseñes nada.

BRANCH: cartografia/fase-10-poda desde main. Commits solo ahí. Al final: push y STOP. No merge.

INVARIANTES (no romper — condición de aceptación):
- Cero cambios en lógica de Git (simple-git/Octokit) y cero cambios en el motor Electron de
  Cartografía (electron/carto/, electron/ai/carto/, electron/db/) salvo BORRAR el handler del
  árbol indicado en la Tanda 2.
- Strings de UI via lib/i18n.ts (ES/EN/ZH). Las claves que queden huérfanas por esta poda se
  ELIMINAN en los 3 idiomas.
- Nada de llamadas reales a proveedores de IA en dev ni en tests: el Panorama usa su caché.
- Secretos siguen en el main process con safeStorage. CSP no se toca.
- Usá codegraph_context / codegraph_impact ANTES de grep para confirmar el impacto de cada
  borrado. Si aparece un consumidor inesperado, PARÁ y preguntá.

TANDA 1 — Modo columnas fuera:
- En components/cartography/SemanticGraphLens.tsx: eliminar el type SemanticViewMode, el estado
  viewMode, el toggle COLUMNAS/NODOS y todo el render del modo columnas. El modo nodos queda como
  único render del componente. Limpiar imports muertos (Columns3, etc.).
- CHECKPOINT: mostrame el diff resumido y esperá mi OK antes de seguir.

TANDA 2 — Explorador fuera:
- Confirmar con codegraph_impact que carto-tree solo lo usan ExplorerLens.tsx y el handler IPC.
- Borrar components/cartography/ExplorerLens.tsx y lib/carto-tree.ts.
- En electron/ipc/carto.ts: borrar el handler del árbol de archivos y su exposición en el preload
  y en types/electron.d.ts. NO tocar los demás handlers del archivo.
- Borrar tests que referencien carto-tree y las claves i18n del Explorador (3 idiomas).
- CHECKPOINT: diff resumido + confirmación de que la app levanta y Cartografía abre.

TANDA 3 — Shell y cierre:
- En CartographyView.tsx: el nav LENTES queda con 2 entradas (Panorama, Grafo). Default: Panorama.
- tsc --noEmit en 0 y pnpm test verde.
- Reporte en docs/reports/ (mismo formato que los anteriores): qué se borró, qué claves i18n
  salieron, resultado de tsc/test. Commit + push de la branch. STOP.

CRITERIOS DE ACEPTACIÓN:
- [ ] Cartografía muestra solo Panorama y Grafo; el Grafo no tiene toggle de modos.
- [ ] ExplorerLens, carto-tree y su IPC no existen más; cero referencias colgadas.
- [ ] Sin claves i18n huérfanas de lo borrado, en ES/EN/ZH.
- [ ] Cero cambios en flujos de Git ni en el motor de datos.
- [ ] tsc y pnpm test en verde. Reporte escrito. Branch pusheada sin merge.
```
