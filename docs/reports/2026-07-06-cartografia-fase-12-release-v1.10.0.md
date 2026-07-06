# Fase 12 - Limpieza y release v1.10.0

Branch: `cartografia/fase-12-release`

## Alcance

Fase de cierre del track Cartografia. No se agregaron features y no se tocaron flujos de Git. Los cambios se limitaron a:

- limpieza de codigo muerto confirmada con Fallow + CodeGraph dentro del area Cartografia,
- documentacion de release,
- bump de version a `1.10.0`,
- limpieza de claves i18n huerfanas del area carto.

No se creo tag, no se publico release y no se mergeo a `main`.

## Limpieza ejecutada

### Borrados o cambios aplicados

- `components/cartography/CartoRelationsPanel.tsx`
  - Accion: archivo eliminado.
  - Fallow: unused file.
  - `codegraph_impact CartoRelationsPanel`: solo impactaba a `CartoRelationsPanel` y al propio archivo.
  - `rg`: sin consumidores de codigo; solo quedaban menciones historicas en docs/reportes.

- `electron/carto/graph-engine.ts`
  - Accion: `disposeGraph` dejo de exportarse y quedo como funcion interna.
  - Fallow: unused export.
  - `codegraph_impact disposeGraph`: impactaba a `disposeGraph`, `closeAllGraphs` y el propio archivo.
  - Decision: no se borro la funcion porque `closeAllGraphs` la usa internamente.

- `lib/carto-panorama.ts`
  - Accion: eliminado `roleColor`.
  - Fallow: unused export.
  - `codegraph_impact roleColor`: solo impactaba al simbolo y al propio archivo.
  - `rg`: sin llamadas.

### i18n

Se eliminaron claves huerfanas ES/EN/ZH que pertenecian al panel textual legado o a placeholders no usados:

- `cartography.graph.relations`
- `cartography.graph.selectFile`
- `cartography.graph.notReady`
- `cartography.graph.notCode`
- `cartography.graph.imports`
- `cartography.graph.usedBy`
- `cartography.detail.symbols`
- `cartography.detail.explainHint`
- `cartography.ai.modelPlaceholderOnline`
- `cartography.ai.offHint`
- `cartography.ai.noFileHint`

Verificacion: `rg` no encontro referencias restantes a esas claves.

## Hallazgos Fallow fuera del area carto

No se tocaron por scope:

- Dead exports fuera del area permitida:
  - `hooks/use-panel-layout.ts`: `GRAPH_COLUMN_DEFAULTS`, `GRAPH_COLUMN_LIMITS`
  - `components/RepoSidebarParts.tsx`: `SidebarItem`
  - `lib/agent-stats.ts`: `getLatestDecision`
- Dead type export fuera del area permitida:
  - `types/temporal-agent.ts`: `SpeculativeDialogue`
- Duplicate exports:
  - `lib/rebase-plan.ts` <-> `types/electron.d.ts`: `RebaseAction`, `RebasePlanItem`
- Duplicacion fuera del area carto:
  - `hooks/use-carto-layout.ts` <-> `hooks/use-panel-layout.ts` aparece como clone group, pero `hooks/` no estaba dentro de los paths editables del brief.
  - Otros clone groups en `CommitGraph`, `ChronometricGraph`, tests, `electron/ipc/git-sync.ts`, `electron/ipc/git-ops.ts` y hooks de acciones Git.
- Complejidad heredada:
  - Fallow mantiene 333 funciones por encima de umbral, encabezadas por `ChronometricGraph`, `app/page.tsx`, `SettingsPanel` y `RepoSidebar`.

## Documentacion y version

- `CHANGELOG.md`: agregada entrada `[v1.10.0] - 2026-07-06` con el cierre del track Cartografia: vista unica, tarjetas por rol, expansion on-demand, "Explicame esto", "Preguntar a la IA" con citas, Panorama integrado, grounding CodeGraph/filesystem, providers OpenRouter/LM Studio y cache SQLite.
- `README.md`: actualizado a `v1.10.0` en badge, version actual e instaladores; agregada seccion de features de Cartografia como una vista unica integrada.
- `package.json`: version `1.9.1` -> `1.10.0`.

## Checks

- `npx.cmd tsc --noEmit`: OK.
- `pnpm test`: OK, 31 archivos y 238 tests pasados.
- `npx.cmd fallow`: exit code 1 por deuda heredada fuera de scope.
  - Dead files: 0.0% (0 de 165).
  - Dead exports: 1.1% (5 de 447), ninguno dentro del area Cartografia.
  - Duplicacion: 2.434 lineas (5.6%) en 50 archivos.
  - Complejidad: 333 sobre umbral.
  - Maintainability: 90.2 (good).

## Criterios de aceptacion

- Cero dead exports en el area carto segun Fallow: cumplido.
- `CHANGELOG.md`, `README.md` y `package.json` coherentes en `v1.10.0`: cumplido.
- Cero cambios de comportamiento: cumplido por alcance; solo limpieza de codigo muerto/export publico no usado, docs, version e i18n huerfano.
- `tsc` y `pnpm test` verdes: cumplido.
- Sin tag, sin release, sin merge: cumplido.
