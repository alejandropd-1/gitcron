# Reporte — reduce-idle-rerenders

**Cambio:** `reduce-idle-rerenders` (OpenSpec, rama `change/reduce-idle-rerenders`).
**Fecha:** 2026-08-11.
**Base de comparación:** 131 archivos / 1024 pruebas, `tsc` en 0.

## 1. Qué cambié, archivo por archivo

### `lib/git-store.ts` — punto (b), el store no notifica sin delta

- **Líneas 247-289 (nuevas):** helper `gitFilesIguales(a, b)` que compara dos arrays de `GitFile` por contenido, campo por campo, tratando ausencia y `undefined` como iguales para los opcionales.
- **Líneas 258-268 (nuevas):** constante `GIT_FILE_CAMPOS_COMPARADOS` tipada como `Record<keyof Required<GitFile>, true>`. Es el blindaje: si `GitFile` gana un campo, `tsc --noEmit` falla aquí y nadie puede olvidar compararlo. Convierte una regresión silenciosa (UI desactualizada) en error de compilación.
- **Líneas 310-320 (nuevas):** helper `repoPatchHasDelta(repo, patch)` que devuelve `false` si ningún campo del patch difiere. `modifiedFiles` va por contenido (`gitFilesIguales`); todo lo demás por `Object.is`.
- **Líneas 326-341 (reescribo `updateActiveRepo`):** patrón validate-before-set. Leo el estado con `get()`, valido delta con `repoPatchHasDelta`; si no hay, **no llamo a `set`** y salgo. Si hay, llamo a `set` con el array reconstruido. Antes era `set((state) => { ... return {}; })`, que notificaba igual.
- **Líneas 343-358 (reescribo `updateRepoByPath`):** mismo patrón que `updateActiveRepo`, aplicado al caso del latido.

**Por qué:** el latido de `use-repo-loader.ts:719` llama a `refreshStatus` cada 2 s, que termina en `updateRepoByPath(target, { modifiedFiles, mergeInProgress, rebaseInProgress })`. El `modifiedFiles` siempre es un array nuevo del IPC de Electron, así que la comparación por referencia siempre veía delta y el store notificaba en cada latido aunque el árbol no hubiera cambiado. El cortocircuito evita el `set` cuando no hay delta real, y así no se notifica.

**Hallazgo durante la implementación (reportado antes de cambiar el rumbo):** el primer diseño afirmaba que devolver `{}` desde el updater silenciaba la notificación porque Zustand comparaba el estado resultante. **Es falso:** Zustand notifica siempre que se llama a `set`, aunque el updater devuelva `{}` o el mismo estado por referencia (verificado en réplica con `createStore`). La única forma de no notificar es no llamar a `set`. El test del store cazó el error al implementar.

### `app/page.tsx` — punto (c), selectores en la raíz

- **Líneas 102-135 (reescribo el destructure):** reemplazo `const { openRepos, activeRepoIdx, ... } = useGitStore();` (suscripción entera) por 32 lecturas por selector, una por campo que la raíz usa. Sigue la convención que ya existía más abajo para `language`, `fontSize` y `theme`.

**Por qué:** la raíz es el ancestro de toda la aplicación. Sin selector, cualquier `set` del store la re-renderizaba, y con ella la app entera. Con selectores, sólo se re-renderiza cuando cambia un campo que lee.

### `components/pipeline/OpenSpecDashboard.tsx` — punto (d), comentario falso y memoización real

- **Líneas 531-544 (borradas):** el bloque huérfano de comentarios que justificaba no memoizar invocando un React Compiler inexistente. Verificado: sin `babel-plugin-react-compiler` ni `reactCompiler` en `package.json` ni `next.config.ts`. El bloque era más grande que las tres líneas falsas (incluía un JSDoc y una nota explicativa que quedaron colgados cuando se insertó entre medias el bloque de la IA); se borró entero y se reubicó junto a su declaración.
- **Líneas 605-621 (nuevas, `branchAttribution`):** antes era una IIFE que devolvía `{ changeId, source: 'branch' } | null` — objeto literal nuevo en cada render. Como dependencia de `commitScope`, lo invalidaba siempre. Ahora es `useMemo` sobre `[currentBranch]` (`currentBranch` es string, estable).
- **Líneas 623-644 (nuevas, `commitScope` + comentarios reubicados):** `commitScope` ahora es `useMemo` sobre `[modifiedFiles, branchAttribution]`. Las invalidaciones son sólo las genuinas: cuando cambian los archivos modificados o la rama real. El JSDoc que describe `commitScope` y la nota sobre `.filter((file) => !file.staged)` se reubicaron aquí, sin la parte falsa.

**Por qué:** `deriveRepoCommitScope` recorre el array, construye un `Set`, un `Map` y los ordena — varias asignaciones. Con `modifiedFiles` cambiando de referencia en cada `set` del store (antes de b), se recalculaba en cada latido. La memoización evita recalcular en re-renders por otras causas (selección, hover, apertura de panel).

### `lib/__tests__/git-store-no-idle-notify.test.ts` (nuevo) — protege (b)

10 tests: patch sin delta sobre `updateRepoByPath` (0 notifs), 10 llamadas consecutivas sin delta (0 notifs, baseline era 10), patch con delta (1 notif), `modifiedFiles` con ref nueva y mismo contenido (0 notifs — el caso del latido), ruta inexistente (0 notifs), lo mismo para `updateActiveRepo`, y dos tests de regresión: archivo que pasa a `conflicted: true` sin cambiar `path/status/staged` (1 notif), y renombrado que cambia `oldPath` (1 notif). Estos últimos protegen la condición de los cinco campos.

### `components/pipeline/__tests__/pipeline-commit-scope-memo.test.tsx` (nuevo) — protege (d)

3 tests: re-render con misma rama y mismos `modifiedFiles` no recalcula `deriveRepoCommitScope` (espía el módulo, cuenta llamadas); `modifiedFiles` cambia → recalcula; rama cambia → recalcula.

### Artefactos del change

`openspec/changes/reduce-idle-rerenders/`: `proposal.md`, `specs/idle-render-isolation/spec.md`, `design.md`, `tasks.md`.

## 2. Mediciones antes y después

### (b) Notificaciones del store — método directo, réplica mínima con `createStore` + contador de suscriptor

| Caso | Antes | Después |
|---|---|---|
| Patch sin delta (10 llamadas) | 10 notifs | **0** |
| `modifiedFiles` ref nueva, mismo contenido (10 llamadas) — **el caso del latido** | 10 notifs | **0** |
| Patch con delta (1 llamada) | 1 notif | 1 notif |

Método: `createStore` de `zustand/vanilla`, un suscriptor con contador, dos casos (sin delta / con delta). Corrido antes de tocar `git-store.ts` y después con el patrón corregido. Reproducible. El segundo caso es el crítico: era el que el primer diseño no cubría porque comparaba `modifiedFiles` por referencia.

### (a) Costo del latido intacto — método directo, cronometrado en este repo

`git status --porcelain`, 20 corridas desde Node con `process.hrtime.bigint()` descartando warmup: mediana **42 ms** (min 33, max 66). A un latido cada 2 s con ventana enfocada: **~76 s de CPU por hora** (~1,3 min/h), sin contar el spawn del proceso en Windows ni el IPC del Electron main. Esta tanda no lo toca; queda como pendiente conocido.

### Costo del comparador por contenido — método directo, benchmark

`filesEqual` (comparación de los 5 campos), 100 000 iteraciones en Node: `N=0` → 18 ns, `N=5` → 46 ns, `N=20` → 121 ns, `N=50` → 261 ns, `N=100` → 475 ns por llamada. A un latido cada 2 s, comparar 100 archivos cuesta 475 ns — **88 000 veces más barato** que los 42 ms del `git status` que ya paga el latido.

### (c) Re-renders de la raíz — medición indirecta declarada

**No pude medir re-renders de la raíz directamente.** No hay tests de `app/page.tsx` en el repo (ningún `app/__tests__/`), y montarla en jsdom exigiría mockear `window.api`, `useShortcuts`, `useGitActions`, `useRepoLoader`, el store completo y sus dependencias de Electron/Next — un costo desproporcionado. **Lo infiero de las notificaciones del store (b)**: por construcción, sin notificación del store no hay re-render del suscriptor. La cadena es latido → `updateRepoByPath` → `set` (que ya no ocurre sin delta) → notificación (que ya no ocurre) → re-render de la raíz (que ya no ocurre). El test (b) prueba el primer eslabón ausente.

### (d) Memoización real — método directo, test

El test `pipeline-commit-scope-memo.test.tsx` prueba directamente que `deriveRepoCommitScope` no se recalcula en un re-render sin cambios. Es medición directa (no inferida): se monta el componente real, se espía la función, se cuenta.

### Lo que no se midió

El impacto en CPU total de la máquina, que es lo que Ale reportó. Se mide la causa inmediata (notificaciones y re-renders ociosos) y el costo del latido intacto, no el síntoma global. La relación causal es directa, pero la cifra de "cuánto baja el uso de CPU" queda fuera del alcance de la medición y se declara así.

## 3. Salida real de los cuatro comandos de cierre

### `pnpm exec tsc --noEmit`
```
EXIT 0  (sin salida — en cero)
```

### `pnpm exec vitest run --maxWorkers=2`
```
Test Files  133 passed (133)
     Tests  1037 passed (1037)
  Duration  121.22s
EXIT 0
```
Usé `--maxWorkers=2` como indica el prompt. Sin flakes en esta corrida. Base 131 archivos / 1024 pruebas → **133 / 1037** (+2 archivos, +13 tests, sin tests actualizados ni aflojados).

### `pnpm exec eslint app/page.tsx components/pipeline/OpenSpecDashboard.tsx lib/git-store.ts components/pipeline/__tests__/pipeline-commit-scope-memo.test.tsx lib/__tests__/git-store-no-idle-notify.test.ts`
```
C:\www\gitCronos\app\page.tsx
  257:6  warning  React Hook useEffect has missing dependencies: 'activeRepoIdx' and 'openRepos'.
  925:6  warning  React Hook useEffect has a missing dependency: 'loadConflictFile'.

✖ 2 problems (0 errors, 2 warnings)
EXIT 0
```
Los dos warnings son **preexistentes en `main`** (verificado con `git stash` + eslint: en la versión original aparecen en líneas 232 y 900; mi cambio los desplazó a 257 y 925 al añadir los selectores arriba). Mi cambio no los introdujo. No los toqué — sería refactor de paso.

### `npx openspec validate reduce-idle-rerenders --strict`
```
Change 'reduce-idle-rerenders' is valid
EXIT 0
```

## 4. Decisiones y sus motivos

### (a) El latido — decisión: no se toca

El temporizador queda intacto: mismo intervalo (2 s), misma condición (`visible && hasFocus()`), misma llamada a `refreshStatus(target)`. La ganancia de rendimiento viene de (b), no de espaciar el intervalo. **Motivo:** el latido es la red de seguridad para eventos de filesystem que Windows, editores y guardados atómicos pierden. Espaciarlo o hacerlo adaptativo introduce una ventana donde un evento perdido tarda más en verse — degrada la cobertura. El silencio del `set` logra la ganancia sin tocar la latencia de detección.

**Caso que deja de cubrir: ninguno.** La lectura de `git status` cada 2 s sigue ocurriendo con la misma frecuencia. Lo único que desaparece es el `set` redundante del store, que no es cobertura sino ruido.

**Lo que queda sin resolver:** GitCron sigue lanzando un proceso `git status` cada 2 s mientras la ventana esté enfocada. Medido: ~76 s de CPU por hora (sin contar spawn ni IPC). Si el uso de CPU global sigue siendo alto después de este cambio, éste es el siguiente lugar a mirar. La decisión de espaciar o hacerlo adaptativo le corresponde a Ale.

### (d) La memoización — decisión: sí, con dependencias correctas

`useMemo` con deps `[modifiedFiles, branchAttribution]`, donde `branchAttribution` se memoiza primero sobre `[currentBranch]`. **Motivo verdadero:** `deriveRepoCommitScope` no es trivial (`.map` + `Set` + `Map` + `.sort`), y `modifiedFiles` cambia de referencia en cada `set` del store. La memoización evita recalcular en re-renders por selección, hover o apertura de panel — no por el latido (que ya está silenciado por b), sino por las causas genuinas que siguen existiendo.

**Trampa detectada antes de implementar (corrección de la revisión):** la primera versión proponía deps `[modifiedFiles, branchAttribution]` con `branchAttribution` como IIFE — inválida, porque la IIFE devolvía un objeto nuevo en cada render y invalidaba el memo. Corregido memoizando `branchAttribution` primero.

## 5. Qué NO hice y qué quedó pendiente

- **No ejecuté `git add`, `commit`, `push`, `merge`, `tag` ni `release`.** Ninguno. Creé la rama `change/reduce-idle-rerenders` (informada). Los cambios quedan sin confirmar.
- **No instalé React Compiler ni ninguna dependencia.** Si se quiere a futuro, es decisión de Ale.
- **No toqué el costo del latido intacto** (a): `git status` cada 2 s sigue corriendo. Pendiente conocido, medido y declarado arriba.
- **No partitioné las suscripciones de los hijos** de `app/page.tsx`: sería refactor fuera de alcance.
- **No toqué los dos warnings preexistentes** de eslint en `app/page.tsx`: son de antes de esta tanda.

## 6. Encontrado de paso (no tocado)

- Los campos `commits`, `branches`, `remoteBranches` y `currentDiff` también son referencias nuevas del IPC en cada llamada, pero llegan por acción de la persona o por un evento real de filesystem — no cada 2 segundos. No reciben comparación por contenido en esta tanda. Si alguno llegara a moverse en un latido futuro, hay que decidir si merece su propia excepción (declarado en el comentario de `repoPatchHasDelta`).
- `updateActiveRepo` y `updateRepoByPath` comparten lógica estructuralmente idéntica (validar delta, reconstruir array, recalcular legacy). No los unifiqué: sería refactor fuera de alcance, y la duplicación es legible tal como está.

## 7. Lista exacta de archivos sin confirmar

**Modificados:**
1. `app/page.tsx`
2. `components/pipeline/OpenSpecDashboard.tsx`
3. `lib/git-store.ts`

**Nuevos (sin seguimiento):**
4. `lib/__tests__/git-store-no-idle-notify.test.ts`
5. `components/pipeline/__tests__/pipeline-commit-scope-memo.test.tsx`
6. `openspec/changes/reduce-idle-rerenders/.openspec.yaml`
7. `openspec/changes/reduce-idle-rerenders/proposal.md`
8. `openspec/changes/reduce-idle-rerenders/specs/idle-render-isolation/spec.md`
9. `openspec/changes/reduce-idle-rerenders/design.md`
10. `openspec/changes/reduce-idle-rerenders/tasks.md`

**Reporte (este archivo):**
11. `docs/reports/2026-08-11-reduce-idle-rerenders.md`
