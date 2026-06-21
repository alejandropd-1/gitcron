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
