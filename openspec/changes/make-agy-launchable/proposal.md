## Why

Antigravity (`agy`) hoy está registrado en el hub con `launchable: false`: su adaptador sólo hace `discover` (corre `agy --version`) y su `events()` es un no-op. No implementa `start()`, así que nunca puede ejecutar una tarea. El binario `agy` 1.1.5 está instalado y dentro del baseline, pero no hay forma de arrancarlo desde el botón "Continuar".

Para que Antigravity sea un runtime que ejecute tareas, hay que implementar el ciclo de vida completo: spawn del proceso `agy` con la instrucción, drenado de su salida como eventos de lifecycle, y corte limpio en `shutdown`.

## What Changes

- El adaptador `agy` implementa `start()`: spawnea `agy` con la instrucción de la tarea, crea la sesión y devuelve su identidad.
- `events()` deja de ser no-op: drena stdout/stderr del proceso y emite eventos de lifecycle (`runtime.process.started`, salida de texto cruda, `runtime.process.completed`/`failed`).
- `shutdown()` mata el proceso (vía AbortController, coherente con el resto de adaptadores).
- El descriptor declara `session.start` como `available` y el hub lo marca `launchable: true`.
- La UI comunica la limitación honesta: agy no tiene JSON stream, así que la observación es **gruesa** (inicio, texto final, fin) — no hay deltas de razonamiento ni tool calls estructurados.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-runtime-adapters`: agy pasa de wrapper de lifecycle (sólo discover) a runtime lanzable con `start()`/`events()`/`shutdown()` que ejecutan el proceso `agy` y emiten su salida como eventos de lifecycle, con observación gruesa declarada.

## Impact

**Producción:** `electron/pipeline/runtime-adapters/agy-adapter.ts` (implementar `start`/`events`/`shutdown`, descriptor), `electron/pipeline/runtime/runtime-session-hub.ts` (`launchable: true` para agy).

**Sin tocar:** el runner de proceso (ya soporta spawn/drenado/kill), contratos IPC, UI (el selector ya renderiza runtime lanzables).

**Dependencias:** ninguna.

**Riesgo:** medio. Es implementar un adaptador de proceso. Mitigación: el `RuntimeProcessRunner` ya hace spawn/drenado/kill con timeouts y abort; se reutiliza. La observación gruesa es honesta y se declara en el descriptor.
