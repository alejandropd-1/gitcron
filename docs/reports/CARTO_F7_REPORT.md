# Cartografia F7 - Grafo semantico

Fecha: 2026-06-20
Branch: `cartografia/fase-07-grafo-semantico`

## Resumen

Se agrego la segunda lente de Cartografia: `Grafo`, con un tablero visual basado en `@xyflow/react`.
La lente consume una foto normalizada `CartoGraph` expuesta por `cartoGraph.snapshot(repoPath)`, sin leer
datos crudos del motor en el renderer y sin red para construir el grafo.

## Cambios principales

- `CartographyView` ahora permite alternar entre `Explorador` y `Grafo`.
- Nueva lente `SemanticGraphLens`:
  - nodos flotantes de archivo;
  - tablero cuadriculado;
  - pan/zoom con React Flow;
  - aristas reales de dependencias del contrato;
  - leyenda por rol;
  - recorte defensivo de aristas visibles.
- Nuevo contrato `CartoGraph` en `lib/carto-types.ts`.
- Nuevo endpoint IPC de solo lectura `carto:graph-snapshot`.
- `graphSnapshot()` produce nodos de archivo normalizados y relaciones reales desde CodeGraph.
- Los nodos de archivo usan IDs normalizados `file:*`; `graphNodeContext()` los resuelve a contexto de archivo para reutilizar el mismo `CartoNodeDetail`.
- Nueva funcion pura `classifyCartoRole()` en `lib/carto-roles.ts`, con tests.
- i18n ES/EN/ZH para lente, roles, estados y metricas.
- Skin TCARS para React Flow y tokens `--color-carto-role-*`.
- Se agrego `@xyflow/react`.
- Se amplio a `20_000ms` el timeout del test de submodulos: en Windows el caso completo tarda ~6.5s y fallaba por el limite previo de 5s, sin cambio de logica Git.

## Roles heuristicos

La clasificacion actual es determinista y extensible:

- `ui`: `components/`, `app/*.tsx`, componentes TSX.
- `styles`: CSS/modulos/tokens/globals.
- `database`: `db/`, migrations, SQL, persistencia/store.
- `critical`: Electron main/preload, IPC, rutas Git y hooks Git.
- `logic`: `lib/`, `hooks/`, `types/` no criticos.
- `config`: package/tsconfig/Next/Tailwind/PostCSS/ESLint/Vitest/tsup/Fallow.
- `other`: fallback.

El refinamiento con IA o curaduria manual queda fuera de esta fase.

## Invariantes revisadas

- No se toco logica de Git.
- La construccion del grafo no usa red.
- El renderer consume solo `CartoGraph` normalizado.
- El click de nodo reusa `CartoNodeDetail` y `explainNode`.
- Strings nuevos estan en `lib/i18n.ts` en ES/EN/ZH.
- La estetica usa tokens `--color-carto-*`.
- No se modificaron `README.md` ni `CHANGELOG.md`.

## Validacion

```powershell
npx.cmd tsc --noEmit
# OK

pnpm test
# OK: 29 files, 243 tests

pnpm exec fallow
# Auditoria ejecutada; exit 1 por baseline de calidad existente.
```

Fallow final:

- 161 files analyzed.
- Dead files: 0.0%.
- Dead exports: 1.6% (`7 of 432`).
- Dead-code: 6 exports + 1 type + 1 duplicate pair.
- Duplication: 10 clone groups, 2,332 duplicated LOC (5.5%).
- Health: 334 functions above threshold.
- Maintainability: 90.3 (good).
- Primer target sugerido: `hooks/use-repo-loader.ts`.

## Notas

- Queda sin tocar el archivo no trackeado preexistente `docs/cartografia/fase-07-grafo-semantico.md`.
- La QA visual queda para Alejandro antes de mergear a `main`.

## Addendum - optimizacion visual de Grafo

Pedido posterior de QA visual: la vista de nodos era correcta pero quedaba amuchada y lenta al
mover/zoomear por exceso de nodos y lineas simultaneas.

Cambios aplicados:

- La lente `Grafo` ahora tiene dos modos elegibles por el usuario:
  - `Columnas`: vista por barrios/categorias, pensada como default para no expertos.
  - `Nodos`: vista de tablero similar a la original, pero optimizada.
- `Columnas` agrupa archivos por rol en columnas horizontales estables, con contadores `usa` y
  `lo usan`.
- En `Columnas`, al seleccionar un archivo se destaca:
  - el foco;
  - los archivos que usa;
  - los archivos que lo usan;
  - el resto queda atenuado.
- En `Nodos`, las aristas globales ya no se dibujan por defecto. Solo se muestran relaciones del
  nodo seleccionado, con tope defensivo.
- En `Nodos` se activo `onlyRenderVisibleElements`, `snapToGrid`, `selectNodesOnDrag={false}` y
  `nodeClickDistance={5}` para reducir trabajo durante pan/zoom.
- El minimapa se oculta cuando hay mas de 120 nodos visibles.
- Se bajo el peso visual de edges removiendo el drop-shadow global.
- Strings nuevos agregados a ES/EN/ZH.

Validacion posterior:

```powershell
npx.cmd tsc --noEmit
# OK

pnpm test
# OK: 29 files, 243 tests

pnpm exec fallow
# Auditoria ejecutada; exit 1 por baseline de calidad existente.
```

Fallow posterior:

- 161 files analyzed.
- Dead files: 0.0%.
- Dead exports: 1.6% (`7 of 432`).
- Dead-code: 6 exports + 1 type + 1 duplicate pair.
- Duplication: 10 clone groups, 2,355 duplicated LOC (5.5%).
- Health: 336 functions above threshold.
- Maintainability: 90.3 (good).

Nota de deuda: `SemanticGraphLens` quedo como candidato futuro a particion interna si la lente sigue
creciendo, pero la optimizacion evita el principal costo visual: renderizar cientos de aristas
permanentes.

## Addendum - foco real en modo Nodos

Pedido posterior de QA visual: aunque se seleccionara un archivo como `app/page.tsx`, el modo `Nodos`
seguia mostrando todos los nodos del repo, por lo que el tablero continuaba ilegible.

Cambios aplicados:

- `Nodos` ya no renderiza todos los archivos del contrato.
- Sin seleccion, `Nodos` muestra solo un resumen acotado: hasta 8 archivos relevantes por rol.
- Con seleccion, `Nodos` dibuja un subgrafo de foco:
  - nodo seleccionado al centro;
  - archivos que lo usan a la izquierda;
  - archivos que usa a la derecha;
  - maximo de 30 vecinos visibles y 90 relaciones visibles;
  - indicador de vecinos ocultos cuando el foco se recorta.
- Las posiciones del foco se distribuyen en columnas cortas para evitar que `fitView` aleje todo el
  tablero y vuelva a hacerlo ilegible.
- `Columnas` queda sin recorte: sigue siendo la vista completa por categorias.
- Strings nuevos agregados a ES/EN/ZH.

Validacion posterior:

```powershell
npx.cmd tsc --noEmit
# OK

pnpm exec vitest run lib/__tests__/carto-roles.test.ts
# OK: 7 tests

pnpm test
# OK: 29 files, 243 tests

pnpm exec fallow
# Auditoria ejecutada; exit 1 por baseline de calidad existente.
```

Fallow posterior:

- 161 files analyzed.
- Dead files: 0.0%.
- Dead exports: 1.6% (`7 of 432`).
- Dead-code: 6 exports + 1 type + 1 duplicate pair.
- Duplication: 10 clone groups, 2,355 duplicated LOC (5.5%).
- Health: 338 functions above threshold.
- Maintainability: 90.3 (good).
