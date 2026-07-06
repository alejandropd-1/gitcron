# Reporte - Cartografia Fase 10 poda

## Resumen

Se podaron la lente Explorador y el modo Columnas del Grafo. Cartografia queda con dos lentes: Panorama y Grafo. El Grafo ya no tiene selector interno de modos y renderiza solo nodos.

## Cambios

- `components/cartography/SemanticGraphLens.tsx`: eliminado `SemanticViewMode`, estado `viewMode`, toggle Columnas/Nodos, `ColumnsGraph`, `ColumnFileCard` e imports asociados.
- `components/cartography/CartographyView.tsx`: eliminado Explorador del riel de lentes y removido el scan de arbol. Default conservado: Panorama.
- `components/cartography/ExplorerLens.tsx`: eliminado.
- `lib/carto-tree.ts`: eliminado.
- `lib/__tests__/carto-tree.test.ts`: eliminado.
- `electron/ipc/carto.ts`: eliminado el handler del arbol de archivos.
- `electron/preload.ts` y `types/electron.d.ts`: eliminada la exposicion `cartoScanTree`.
- `app/globals.css`: eliminados estilos exclusivos de columnas (`carto-columns-map` y `carto-column-card*`).

## Claves i18n eliminadas

En ES/EN/ZH se eliminaron:

- `cartography.lens.explorer`
- `cartography.scanning`
- `cartography.scanError`
- `cartography.treeEmpty`
- `cartography.treeStats`
- `cartography.truncated`
- `cartography.semantic.view.columns`
- `cartography.semantic.view.nodes`
- `cartography.semantic.selectNodeForLinks`
- `cartography.semantic.filesCount`
- `cartography.semantic.usesCount`
- `cartography.semantic.usedByCount`
- `cartography.semantic.focus`
- `cartography.semantic.usesFocus`
- `cartography.semantic.focusUses`

## No tocado

- Sin cambios en logica de Git (`simple-git`/Octokit).
- Sin cambios en `electron/carto/`, `electron/ai/carto/` ni `electron/db/`.
- Sin cambios de CSP ni secretos.
- Sin merge a `main`.

## Validacion

- Codegraph antes de borrar: `carto-tree` impactaba solo `lib/carto-tree.ts`, `components/cartography/ExplorerLens.tsx`, `electron/ipc/carto.ts` y su test dedicado.
- Busqueda final en codigo fuente (`components`, `electron`, `types`, `lib`, `app`): sin referencias a `ExplorerLens`, `carto-tree`, `cartoScanTree`, `carto:scan-tree`, `CartoTreeNode`, `CartoScanResult`, `cartography.lens.explorer` ni claves del modo Columnas.
- `pnpm exec tsc --noEmit --pretty false`: OK.
- `pnpm test`: OK, 30 archivos de test, 234 tests verdes.

## QA visual

- `pnpm dev` levanto en `http://localhost:3001`.
- Playwright abrio la app y, con un bridge mockeado para suplir el preload de Electron en browser, abrio Cartografia sobre `C:\www\gitCronos`.
- Snapshot de Panorama: riel con solo `Panorama` y `Grafo`; no aparece Explorador.
- Snapshot de Grafo: renderiza nodos y no aparece toggle Columnas/Nodos.
- La consola del smoke browser mostro errores por metodos Git no mockeados del entorno QA (`gitWorktrees`, etc.) despues de montar el repo simulado; no pertenecen a Cartografia ni aparecieron en `tsc`/tests.
