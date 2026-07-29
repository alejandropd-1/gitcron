# Retiro del andamiaje de la capa de evidencia

Fecha: 2026-07-29
Rama: `openspec/remove-scaffold-evidence-layer` (creada desde `codex/openspec-changes-ui` en `0eaa5d6`)
Change: `remove-scaffold-evidence-layer` · `openspec validate --strict` válido · 25/27 tareas

## 1. Qué se retiró

La pestaña Pipeline se construyó para observar el kit multi-agente de `C:\www\scaffold`: Hermes como orquestador, delegaciones a otras IA y un veto determinístico de gates. Ese encuadre quedó sin uso y el workspace pasó a ser un tablero de OpenSpec.

| Campo | Qué describía | Estado |
|---|---|---|
| `hermesConnected` | Conexión con el orquestador | Retirado del contrato |
| `gates` / `GateRecord` | Historial del veto `VERDE`/`ROJO` | Retirado |
| `delegations` / `DelegationRecord` | Qué IA delegó qué tarea, con tokens y costo | Retirado |
| `visualDiffs` / `VisualDiffRecord` | Mediciones de diff visual | Retirado |

Con ellos salieron: `GateHistory.tsx`, `AuditorFindings.tsx`, los estados de vista `no-kit` y `hermes-offline`, los normalizadores `normalizeGate`, `normalizeDelegation` y `normalizeVisualDiff`, el evento derivado `gate.changed`, la lectura de `docs/ai/logs/` y 27 líneas de i18n en los tres idiomas.

La fuente declarada `kit` pasó a ser `openspec`, y se declara cuando hay cambios observados en vez de cuando existen gates o reportes.

## 2. Tres falsos positivos que no se tocaron

La búsqueda textual señalaba consumidores que no lo eran. Verificarlos uno por uno evitó romper cosas vivas:

- **`components/PageWidgets.tsx`** — contenía la palabra inglesa "gates" en un comentario (`show gates the entrance/exit fade`).
- **`control-bus.ts` y `control-bus-types.ts`** — usan `'pause-delegations'`, que es una **acción de control viva**, no el registro de evidencia. `main.ts`, el IPC y el hub dependen de ellas.
- **`types/pipeline/projection.ts`** — mismo caso: `'pause-delegations'` como `PipelineControlAction`.

## 3. Cambio de comportamiento declarado

El workspace **ya no exige la presencia del kit para renderizar**. Antes, `availableSources.includes('kit')` gateaba el estado `ready`, y `kit` se declaraba sólo si había gates o reportes: al retirar los gates, un repositorio sin reportes habría dejado de mostrar la pestaña. Se retiraron las guardas `no-kit` y `hermes-offline`, y el workspace resuelve por sí mismo el caso de no tener cambios activos.

`hasPipelineActivity` pasa a depender de tareas y cambios, no de gates ni delegaciones.

## 4. Qué NO se tocó

`runtime/`, `runtime-adapters/`, `control/`, las sesiones persistidas, el lanzador multi-proveedor, la topbar, los sidebars, los iconos, la lógica de Git y las features vivas de GitCron. Sin dependencias agregadas ni removidas.

**`docs/pipeline/f03` se conserva** porque no es documentación sino evidencia: los adaptadores citan sus fixtures en `evidenceRefs` y `runtime-adapter-conformance.test.ts` lee `runtime-adapter-matrix.json`.

**El mecanismo de cursores JSONL se conserva.** `readJsonl` quedó sin llamadas y se eliminó, pero `PipelineCursorStore` y la tabla `pipeline_cursor` siguen en pie: son genéricos y quitarlos exigiría migrar el esquema SQLite, que el design dejó fuera de alcance. Hoy no tienen ninguna fuente que leer.

## 5. Validación

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errores |
| `pnpm test` | 75 archivos / **541 tests**, todos verdes |
| `pnpm exec eslint` sobre lo tocado | limpio |
| `openspec validate --strict` | válido |

### Conteo de pruebas: 547 → 541

La tarea 8.2 exige justificar la diferencia por lo retirado y no por cobertura perdida. El detalle de las 6:

| Archivo | Delta | Motivo |
|---|---|---|
| `pipeline-details.test.ts` | −1 | Un test cubría sólo hallazgos de auditoría y gates. Se conservó el de procedencia de diffs. |
| `pipeline-view-state.test.ts` | −1 | Dos tests de `no-kit` y `hermes-offline` reemplazados por uno que verifica que se llega a `ready` sólo con Git. |
| `pipeline-adapter.test.ts` | −4 | Seis tests de economía y agentes derivados de delegaciones, reemplazados por dos que afirman lo que ahora es cierto: economía en `unknown` y cero agentes observados desde el repositorio. |

Ningún archivo se borró entero. Donde un test cubría a la vez lo retirado y lo vivo, se recortó.

## 6. Pendiente declarado

Tres hallazgos fuera del alcance de este change, **no corregidos**:

1. **`stations` y `now` no los consume nadie.** El workspace OpenSpec no los usa; quedaron del encuadre anterior. `toStations` ahora devuelve `gatesGreen: false` fijo porque ya no hay evidencia que permita afirmar esa estación.
2. **`snapshot.agents` desde el repositorio es siempre vacío.** Los agentes reales llegan por la sesión de runtime, que es la fuente honesta. `toAgents()` quedó como función constante.
3. **El mecanismo de cursores JSONL no tiene consumidor.** Retirarlo exige migrar el esquema.

Los tres merecen su propio change si se decide seguir limpiando.

## 7. Estado de entrega

Sin `git add`, commit, push ni merge. La rama queda lista para que Ale revise y decida.

**Falta QA visual**: el cambio toca el proceso main (`repo-evidence-reader`), así que requiere reiniciar Electron para verificarse. Lo que hay que confirmar es que el workspace siga renderizando con el cambio activo y que el panel de evidencia detrás de "Ver diff" muestre sólo Propuesta y Diffs.
