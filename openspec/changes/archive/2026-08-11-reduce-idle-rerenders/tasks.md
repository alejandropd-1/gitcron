# Tasks — reduce-idle-rerenders

## 1. (b) El store no notifica sin delta

- [x] 1.1 En `lib/git-store.ts`, agregar `repoPatchHasDelta(repo, patch)` que compara campo por campo: `Object.is` para todo, **salvo `modifiedFiles`**, que se compara por contenido vía `gitFilesIguales` — porque el IPC de `gitStatus` siempre devuelve un array nuevo aunque el contenido sea idéntico, y ése es el campo que el latido mueve cada 2 s. Los **cinco** campos de `GitFile` (`path`, `status`, `staged`, `oldPath`, `conflicted`) se comparan, blindados por una constante `Record<keyof Required<GitFile>, true>` que hace fallar `tsc` si alguien agrega un campo sin compararlo.
- [x] 1.2 En `updateRepoByPath`, validar con `get()` antes de llamar a `set`: si `repoIdx === -1` o `!repoPatchHasDelta(existing, patch)`, **no llamar a `set`** y salir. Zustand notifica siempre que se invoca `set`, aunque el updater devuelva `{}` o el mismo estado por referencia (verificado en réplica con `createStore`); la única forma de no notificar es no llamarlo.
- [x] 1.3 Mismo patrón en `updateActiveRepo`: validar con `get()` antes de `set`, salir sin llamar a `set` si no hay delta.
- [x] 1.4 Verificar que el cortocircuito no rompe `setModifiedFiles` (línea 388, delega en `updateActiveRepo`) ni los demás setters que delegan — corren `pnpm exec vitest run lib/__tests__` y aislan cualquier fallo antes de tocarlo.

## 2. (c) Selectores en la raíz

- [x] 2.1 En `app/page.tsx:102-113`, reemplazar el destructure `const { openRepos, activeRepoIdx, … } = useGitStore();` por lecturas por selector: una por cada campo que la raíz usa en su render (`openRepos`, `activeRepoIdx`, `currentBranch`, `branches`, `remoteBranches`, `commits`, `modifiedFiles`, etc.). Para los setters, usar selectores estables o `useGitStore.getState()` en el punto de uso.
- [x] 2.2 Verificar que ningún hijo recibe una prop cuyo valor cambió de identidad sin necesidad — correr `pnpm exec tsc --noEmit` y `pnpm exec vitest run` para detectar regresiones.

## 3. (d) Comentario falso y memoización real

- [x] 3.1 En `components/pipeline/OpenSpecDashboard.tsx`, reubicar el bloque huérfano 531-544 junto a la declaración de `commitScope:623`, borrando sólo la parte falsa (539-541, la justificación del React Compiler). Las otras dos partes (JSDoc 531-538 y nota 543-544) se mueven con su declaración.
- [x] 3.2 Memoizar `branchAttribution` con `useMemo` sobre `[currentBranch]` — hoy es una IIFE que devuelve un objeto literal nuevo por render, lo que invalidaría cualquier memo downstream. Resultado: `branchAttribution = useMemo(() => {…}, [currentBranch])`.
- [x] 3.3 Memoizar `commitScope` con `useMemo` sobre `[modifiedFiles, branchAttribution]` — ahora `branchAttribution` es estable, así que las invalidaciones son sólo las genuinas.
- [x] 3.4 Verificar que la memoización es real: escribir un test que monte `OpenSpecDashboard` con la misma rama y afirme que dos renders no recalculan `commitScope` (p. ej. espiando `deriveRepoCommitScope`).

## 4. Tests

- [x] 4.1 Agregar `lib/__tests__/git-store-no-idle-notify.test.ts` con: patch sin delta sobre `updateRepoByPath` → 0 notificaciones (también tras 10 llamadas; el baseline era 10/10); `modifiedFiles` con ref nueva y mismo contenido → 0 notificaciones (el caso del latido); patch con delta → 1 notificación. Mismo par para `updateActiveRepo`. Más dos tests de regresión que protegen el blindaje de los cinco campos: un archivo que pasa a `conflicted: true` sin cambiar `path/status/staged` → 1 notificación; un renombrado que cambia `oldPath` → 1 notificación.
- [x] 4.2 Verificar `hooks/__tests__/use-repo-watch.test.ts:90-99` sigue pasando: el latido sigue creando exactamente un timer y una suscripción — no se eliminó nada.
- [x] 4.3 Aislar cualquier test que falle tras (b) o (c); si afirmaba el defecto (array nuevo por call, re-render incondicional), actualizarlo con antes/después/por qué; si falla por timeout/EBUSY, es flake conocido y no se toca.

## 5. Mediciones

- [x] 5.1 Correr la réplica mínima del store (`zustand/vanilla` + contador) después de (b) y registrar notificaciones: esperado 0/10 sin delta, 1/1 con delta. Comparar contra baseline 10/10 y 1/1.
- [x] 5.2 Intentar medir re-renders de la raíz `app/page.tsx` en jsdom; si no se puede montar por mocks de Electron/Next, declararlo en el reporte como medición indirecta inferida de (b).
- [x] 5.3 Registrar el costo del latido intacto (a): `git status --porcelain` en este repo, mediana ya medida 42 ms → ~76 s CPU/h con ventana enfocada. Declarar como pendiente conocido.

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero.
- [x] 6.2 `pnpm exec vitest run --maxWorkers=2` en verde (declarar flakes si los hay, con el nombre del archivo).
- [x] 6.3 `pnpm exec eslint` sólo sobre los archivos tocados, limpio.
- [x] 6.4 `npx openspec validate reduce-idle-rerenders --strict` válido.
- [x] 6.5 Escribir `docs/reports/` con: cambios archivo por archivo, mediciones antes/después, salida real de los cuatro comandos, decisiones (a) y (d), qué no se hizo, lo encontrado de paso, lista exacta de archivos sin confirmar.
