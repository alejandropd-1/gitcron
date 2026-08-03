## Context

El panel deriva su noción de progreso de un modelo propio (`lifecycle()` + `LIFECYCLE_TOTAL = 5`), no del grafo real de OpenSpec. La verificación con grep confirma que `openspec status` no se invoca en ningún punto de `electron/`, `lib/` o `components/`. El comando devuelve el grafo: cada artefacto con `status` en `{blocked, ready, done}` y `missingDeps` cuando está bloqueado, más `applyRequires` (la lista de artefactos que `apply` exige) e `isComplete`.

La tubería existente tiene tres puntos de cableado canónicos, documentados por la investigación:

1. **Wrapper del CLI** en `electron/pipeline/openspec-cli.ts` — ya centraliza `archive` y `validate` en un solo lugar ("existía duplicado en tres lugares y en los tres estaba roto en Windows", reza el header). Resuelve el binario con `CLI = { command: 'openspec.cmd', shell: true }` en Windows y `{ command: 'openspec', shell: false }` en demás, y valida `changeId` con `CHANGE_ID_PATTERN` antes de tocar un proceso.
2. **Lector de evidencia** `RepoEvidenceReader.read` — arma el snapshot leyendo filesystem, con una dep inyectada `validateOpenSpecChange` que se invoca **sólo para el change seleccionado** por costo (~2,4 s por spawn en Windows; el watcher refresca en cada guardado). `artifacts` sigue el mismo criterio.
3. **Snapshot** — el renderer recibe `PipelineState` (que extiende `PipelineEvidence`); cada `OpenSpecChangeEvidence` se espeja como `OpenSpecChangeSummary`. No hay canal IPC dedicado para consultas puntuales: todo viaja en el snapshot, releído por el watcher.

## Goals / Non-Goals

**Goals:**
- Que el grafo de artefactos llegue al renderer dentro del snapshot, para el cambio seleccionado.
- Respetar las tres convenciones existentes (wrapper único, dep inyectada, campo opcional en el snapshot).
- Que el campo sea opcional para no romper snapshots SQLite viejos.

**Non-Goals:**
- No se consume el grafo en `derivePipelineNextAction`, `lifecycle()` ni en la barra de fases. Ese es el change siguiente (rediseño visual). Acá sólo se cablea el dato.
- No se agrega canal IPC nuevo ni surface de UI.
- No se cambia el origen de `validation`: sigue viniendo de `openspec validate --strict` (distinto comando, distinto propósito: dice si el change valida, no su grafo).

## Decisions

### Wrapper único en `openspec-cli.ts`

`statusOpenSpecChangeWithCli(repoPath, changeId)` reutiliza `CLI`, `execFileAsync`, `CHANGE_ID_PATTERN` y el env de telemetría. Invoca `['status', changeId, '--json']` con `timeout: 15_000` (mismo que `validate`) y parsea `JSON.parse(stdout)`. Mapea el JSON del CLI al tipo propio: el campo `status` del CLI se renombra a `state` (evita colisión con el nombre del wrapper y aclara que es el estado del nodo del grafo). En fallo de ejecución devuelve `{ available: false, artifacts: [], applyRequires: [], isComplete: false }` sin lanzar —mismo principio que `validate → 'unknown'`: no poder ejecutar el CLI no es saber que el grafo está vacío.

**Alternativa descartada:** propagar la excepción y dejar que el reader la capture. Pierde la distinción entre "el CLI no está" y "el change no tiene grafo", y obliga al reader a un try/catch extra. El wrapper ya sabe distinguir, como lo hace `validate`.

### Dep inyectada, sólo para el seleccionado

`RepoEvidenceReaderDependencies` gana `statusOpenSpecChange?`. En el loop por change activo se invoca bajo el mismo guard `isSelected` que ya cobija a `validate` y `artifacts`. Si la dep no está o devuelve `{ available: false }`, el campo queda `null`. El default del constructor la cablea a `statusOpenSpecChangeWithCli`.

**Alternativa descartada:** invocar para todos los cambios en paralelo con `Promise.all`. Multiplica el costo del spawn por la cantidad de cambios activos y el watcher refresca en cada guardado; hoy ya hay tres cambios activos y serían ~7 s por refresco para alimentar un campo que ningún consumidor lee en los no seleccionados.

### Campo opcional en el snapshot, sin canal nuevo

`OpenSpecChangeEvidence` gana `status?: OpenSpecChangeStatus | null` (opcional para no romper snapshots SQLite antiguos). El renderer lo espeja en `OpenSpecChangeSummary`. El grafo viaja en el snapshot existente (`pipeline:get-snapshot` / `pipeline:snapshot-updated`), releído por el watcher: no hay round-trip nuevo.

**Alternativa descartada:** canal IPC `pipeline:get-status` consultado on-demand desde el renderer. Suma un round-trip y obliga al renderer a gestionar un cargando/error aparte. El snapshot ya es el canal de evidencia; agregar otro fragmenta la fuente.

## Risks / Trade-offs

- **[Riesgo] Latencia del spawn del CLI en el loop del watcher.** → **Mitigación:** se invoca sólo para el change seleccionado (mismo criterio que `validate`), en paralelo con las demás lecturas del loop (`Promise.all` existente). El test de costo extiende la red que ya fija esto para `validateOpenSpecChange`.
- **[Riesgo] El JSON del CLI cambie de forma entre versiones.** → **Mitigación:** el mapeo es defensivo: campos ausentes se toleran (`missingDeps ?? []`, `applyRequires ?? []`); un `id` o `status` que no matchea se descarta. El tipo `OpenSpecArtifactState` sólo admite los tres valores conocidos; cualquier otro cae a un artefacto omitido, no a un crash.
- **[Riesgo] Snapshot SQLite viejo sin el campo `status`.** → **Mitigación:** el campo es opcional en `OpenSpecChangeEvidence`. El reducer y el renderer ya toleran campos opcionales (`openSpecChanges?` lo es por la misma razón).

## Migration Plan

Sin migración: el campo es opcional y aditivo. Los snapshots persistidos sin `status` siguen cargando (el campo ausente se lee como `undefined`, equivalente a `null`). Verificación: `pnpm exec vitest run` sobre los tests nuevos y los existentes de reader/costo, más `openspec validate consume-openspec-status --strict`.

## Open Questions

Ninguna. El consumo del grafo (en `derivePipelineNextAction` y la barra) es del change siguiente y se planea por separado.
