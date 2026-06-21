# Reporte - Fix estilos en snapshot cartografico

## Resumen

Se corrigio la causa raiz de "ESTILOS - 0 archivos" en Grafo/Panorama: el snapshot ya no construye file-nodes solo desde CodeGraph. Ahora une los archivos reales del filesystem, usando el mismo scanner del Explorador, con los archivos indexados por CodeGraph. Los archivos no parseados por CodeGraph entran como nodos `file` sin relaciones, por lo que se clasifican y se listan igual.

## Cambios

- Se extrajo el scanner de archivos del repo a `electron/carto/repo-files.ts`, compartido por `carto:scan-tree` y `graphSnapshot`.
- `graphSnapshot` ahora es async, une filesystem + CodeGraph por ruta y conserva las relaciones reales desde `cg.getFileDependencies`.
- El contrato `CartoGraph` suma `allNodes` para el set completo; `nodes` sigue capado para el tablero "Nodos".
- `SemanticGraphLens` usa `allNodes` para la vista "Columnas" y mantiene el cap visual del modo "Nodos".
- `buildCartoPanorama` agrupa/cuenta desde `allNodes`, manteniendo links desde relaciones reales.
- Se agregaron tests de snapshot con `app/globals.css` y `styles/x.scss`, incluyendo el caso donde el cap visual no debe afectar el conteo por rol.

## No tocado

- No se modifico `classifyCartoRole`.
- No se toco logica de Git.
- No se agregaron strings i18n.
- No se modificaron `README.md` ni `CHANGELOG.md`, respetando la invariante de fase.
- No se mergeo a `main`.

## Validacion

- `npx.cmd tsc --noEmit`: OK, 0 errores.
- `pnpm test`: OK, 31 archivos de test, 250 tests verdes.
- `pnpm exec vitest run electron/__tests__/carto-graph-snapshot.test.ts lib/__tests__/carto-panorama.test.ts lib/__tests__/carto-tree.test.ts`: OK, 21 tests verdes.
- `pnpm exec fallow`: falla por baseline conocido/preexistente, sin issues nuevos del fix tras privatizar helpers del scanner. Resultado resumido: dead files 0.0%, dead exports 1.3% (6/452), duplicacion 5.5% (10 clone groups), 339 funciones sobre umbral, maintainability 90.2 (good). Fallow recomienda empezar por `use-repo-loader.ts`, fuera de scope de esta fase.

## QA visual pendiente

Abrir un repo con `.css`/`.scss` y validar:

1. En Cartografia -> Grafo -> Columnas, la columna ESTILOS lista archivos reales como `app/globals.css` y `styles/x.scss`.
2. En Cartografia -> Panorama, el grupo "Estilos" muestra el conteo real y lista esos archivos.
3. En Grafo -> Nodos, el tablero sigue acotado para rendimiento.
