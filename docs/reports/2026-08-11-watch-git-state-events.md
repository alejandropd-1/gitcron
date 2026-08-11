# Reporte — `watch-git-state-events` (2026-08-11)

Cambio: que GitCron se entere de los cambios de estado de Git por **evento** del filesystem, no sólo
sondeando; y, con eso en pie, espaciar el latido de respaldo y volverlo adaptativo. Ejecutor: IA.
Auditoría: contra el código, no contra este reporte.

## 1. Qué se cambió, archivo por archivo

- **`electron/ipc/watchers.ts`** — el cambio de fondo. Se quitó el patrón `/(^|[/\\])\.git([/\\]|$)/`
  que ignoraba `.git/` entero y se reemplazó por una **lista blanca** exportada:
  `isGitStateRel(rel)` (pura, sobre el camino relativo a `.git/`) y `createRepoIgnoreFilter(gitDir)`
  (el filtro `ignored` de chokidar). Quedan observados `index`, `HEAD`, `MERGE_HEAD`, `rebase-merge/`,
  `rebase-apply/` y `refs/heads/`; `objects/`, `logs/`, `*.lock` y el resto de `.git/` siguen podados.
  El atravesar `refs`→`refs/heads` (y podar `refs/remotes`, `refs/tags`) es deliberado: sin eso
  chokidar no desciende. El agrupado de 250 ms y `awaitWriteFinish` quedan intactos. La regla vive en
  funciones exportadas para que pruebas y medición usen exactamente la misma que producción.
- **`electron/ipc/git-ops.ts`** — la guardia. Nuevo handler `git:index-signature` que devuelve
  `{mtimeMs, size, ino}` de `.git/index` (o `null`). Resuelve el directorio git **sin spawnear** git
  (helper `resolveGitDir`: si `<repo>/.git` es directorio, directo; si es archivo —worktree— lee su
  `gitdir:`), para que la guardia cueste un `stat` y no un proceso.
- **`electron/preload.ts`** + **`types/electron.d.ts`** — binding y tipo de `gitIndexSignature`.
- **`hooks/use-repo-loader.ts`** — guardia y cadencia.
  - `refreshStatusIfChanged(path, {force})`: pide la firma del index y **sólo saltea** la lectura
    completa si no cambió. Ante ambigüedad (primera vez, sin firma, o `force`) lee. La usa sólo el
    latido; el camino disparado por un evento sigue por `refreshStatus` (un evento ya prueba un cambio,
    y así los mocks de las pruebas existentes no necesitan el binding nuevo).
  - Latido (antes `setInterval` fijo de 2.000 ms): ahora **un único** `setInterval` de 2 s con
    cadencia efectiva adaptativa por skip-logic. `lastActivityRef` se actualiza con cualquier evento
    de fs o commit. Constantes declaradas con su fundamento (ver §3).
- **`openspec/changes/watch-git-state-events/design.md`** — decisión de la guardia argumentada con la
  medición y su interacción con el hallazgo EPERM (sección «Decisión: `stat` de `.git/index`»).
- **`tasks.md`** — casillas marcadas (6.6 queda para Ale).
- **Tests**: `electron/__tests__/watchers.test.ts` (+5: regla whitelist vía funciones exportadas, y
  ráfaga agrupada en un solo `repo:fs-change`) y `hooks/__tests__/use-repo-watch.test.ts` (+2: guardia
  saltea/fuerza/lee-a-pesar-de-todo, y cadencia quieto≈10 s vs activo≈2 s).

## 2. Mediciones, antes y después (con el comando que las produjo)

**2.1 Costo de `git status --porcelain`** — `node status-timing.mjs` (30 corridas, `hrtime`):
mediana **74 ms**, mínimo **41,8 ms**, p90 122 ms, máximo 283 ms. La referencia previa era mediana 42 ms;
el **mínimo coincide** con esa figura, así que la diferencia es **carga de máquina**, no otra cosa. Se
reportan las dos cifras juntas: el costo del latido **empeora justo cuando la máquina ya está sufriendo**,
que es el peor momento. A un disparo cada 2 s: ≈76 s CPU/h en reposo (42 ms), ≈133 s CPU/h bajo carga (74 ms).

**2.2 Costo de la guardia** — `node stat-cost.mjs` (1000 `statSync` sobre `.git/index`):
mediana **16 µs**, p99 23 µs. Frente al `git status` (42–74 ms) es **2.600×–4.600×** más barato; aun con
el round-trip IPC (~1 ms), **~50×** más barato.

**2.3 Eventos por segundo en `.git/` (la incógnita del cambio)** — `node count-events.cjs --watch gitstate`.
chokidar **real** sobre un **clon local** de gitCronos (mismo `.git`, 22,2 MB, 1104 archivos; clonado a
un temp para no mutar la rama de trabajo), réplica exacta del agrupado de 250 ms:

| operación | eventos crudos `.git/` | /seg | sobreviven 250 ms | errores |
|---|---|---|---|---|
| checkout (1109 arch., ~0,9 s) | 2 | 2,4 | **1** | 0 |
| rebase (5 commits rehechos, ~1 s) | 3 | 3,2 | **1** | 0 |
| `git add` (preparar un archivo) | 1 | 34,7 | 1 | 0 |
| merge con conflicto | 1 | 6,2 | 1 | 0 |
| escribir en `.git/objects/` | **0** | 0 | **0** | 0 |

Conclusión: **no hay tormenta**. La hipótesis del diseño queda confirmada con margen; el agrupado de
250 ms colapsa la ráfaga a **una** emisión. **No hizo falta tocar la ventana de agrupado.**

**2.4 El hallazgo que pesa más — EPERM del observador del árbol** (no estaba en el diagnóstico
original). `node count-events.cjs --watch worktree` durante un checkout: el observador del **árbol de
trabajo** genera ~350 eventos crudos (363/seg) pero con **~1.000 `EPERM: operation not permitted,
watch`** (handles de `fs.watch` que se rompen en la reescritura masiva), y con `awaitWriteFinish`
(producción) en una corrida **cero** emisiones agrupadas. Es decir: **hoy, durante una operación
masiva, el observador del árbol se rompe y la app depende del latido para enterarse**. Hasta ahora eso
era una afirmación; acá es evidencia. Consecuencia directa sobre la cadencia: el escalón quieto no
puede tapar ese caso (ver §3). Es **preexistente** y **queda fuera de alcance** (no se arregla acá);
merece su propio change.

## 3. Números de la cadencia adaptativa y por qué esos

Un único `setInterval` de 2 s (la prueba `use-repo-watch` afirma que hay exactamente uno; sigue
habiendo uno). Constantes en `use-repo-loader.ts`:

- `HEARTBEAT_TICK_MS = 2000` — granularidad fija del timer (igual que antes).
- `HEARTBEAT_ACTIVE_WINDOW_MS = 8000` — tras cualquier evento, 8 s en escalón activo.
- `HEARTBEAT_ACTIVE_FULL_EVERY = 3` — en activo, lectura completa cada 3.ᵉʳ tick (≈6 s); los demás ticks
  pasan por la guardia (stat ≈16 µs). Acota la staleness de un evento que chokidar pierda a 6 s.
- `HEARTBEAT_QUIET_READ_EVERY = 5` — en quieto, una lectura completa cada 5.ᵒ tick (≈10 s), **forzada**
  (sin guardia) para no dejar pasar un cambio que ni el index ni chokidar denunciaron.

Fundamento: en reposo quieto, el latido pasa de 30 lecturas/min a 6 → ~**5× menos CPU** (≈76→15 s CPU/h
en reposo; ≈133→27 s/h bajo carga). El escalón quieto se acota a 10 s a propósito: justo después de un
checkout es cuando chokidar sufre la tormenta EPERM y el latido más falta hace (§2.4); un evento
cualquiera devuelve al escalón activo, donde los 8 s cubren la operación y su rebote inmediato. La
guardia refuerza —no debilita— el respaldo en ese caso: durante un checkout el `index` **sí** cambia, así
que la guardia fuerza la relectura independientemente de chokidar.

## 4. Comprobación con operaciones reales desde una terminal

Realizada con el harness de la §2.3 (chokidar real, git real, clon real): `git add`, `git checkout`
(ida y vuelta a la raíz, 1109 archivos) y un **merge que deja conflicto** producen todos un evento en
`.git/` que el agrupado colapsa a uno. Escribir en `.git/objects/` produce **cero** eventos (2.4). La
cadena hasta la vista (evento → `repo:fs-change` → `refreshStatus` → `git status`) está cubierta por
pruebas (5.1–5.5) y por la prueba existente «rereads once per filesystem change».

**Lo que no se hizo en esta tanda:** la observación a ojo de la **vista** actualizando dentro de la app
Electron abierta (tareas **2.5** y **6.6**, ambas de Ale). No se pudo conducir
la GUI en esta sesión. La capa de eventos quedó probada con evidencia real en Windows; confirmar que la
vista refleja el cambio sin esperar al latido es la verificación humana de Ale (2.5 / 6.6). Por eso la
2.3 original quedó partida: 2.3 (la mitad «evento», tildada) y 2.5 (la mitad «vista», sin tildar).

## 5. Salida real de los comandos de cierre

- `pnpm exec tsc --noEmit` → **0 errores** (TSC_EXIT=0).
- `pnpm exec vitest run --maxWorkers=2` → **134 archivos / 1048 pruebas, todo verde** (137,9 s). Base
  134/1041 → **+7 pruebas, +0 archivos** (watchers +5, use-repo-watch +2). Sin flakes en esta corrida.
- `pnpm exec eslint` sobre los 6 archivos tocados → limpio (ESLINT_EXIT=0).
- `npx openspec validate watch-git-state-events --strict` → **'Change is valid'** (OPENSPEC_EXIT=0).

## 6. Qué no se hizo y qué quedó pendiente

- No se hizo la verificación a ojo de la vista en la app abierta (6.6, de Ale).
- No se arregló el EPERM del observador del árbol: preexistente, fuera de alcance, declarado acá para
  quien decida abrirle change.
- No se eliminó el latido (invariante del diseño; la §2.4 es la prueba dura de por qué no).
- No se agregaron dependencias (chokidar ya estaba). No se hicieron commits ni merge ni nada en Git.

## 7. Hallazgos de paso (no tocados)

- El observador del árbol con `awaitWriteFinish` se ciega durante la reescritura masiva (§2.4). No es de
  este change, pero es lo más importante que dejó la medición.
- `refreshStatus` resuelve el git-dir con `g.revparse(...)` (un spawn de git por llamada); la guardia lo
  evita con `resolveGitDir`. Migrar `git:status` a la misma resolución sería una microoptimización
  menor, fuera de alcance.

## 8. Archivos sin confirmar (uno por uno)

1. `electron/ipc/watchers.ts`
2. `electron/ipc/git-ops.ts`
3. `electron/preload.ts`
4. `types/electron.d.ts`
5. `hooks/use-repo-loader.ts`
6. `electron/__tests__/watchers.test.ts`
7. `hooks/__tests__/use-repo-watch.test.ts`
8. `openspec/changes/watch-git-state-events/design.md`
9. `openspec/changes/watch-git-state-events/tasks.md`
10. `docs/reports/2026-08-11-watch-git-state-events.md` (este reporte)

Los scripts y el clon de medición viven fuera del repo (`%USERPROFILE%\.zcode\tmp\gitcron-measure\` y un
clon en `%TEMP%`); no generan archivos sin confirmar. **Nada está commiteado.**
