## Why

GitCron hoy sólo ofrece tres runtimes lanzables (claude, codex, agy). Pero el adaptador de OpenCode **ya existe y está completo** (`opencode-acp-adapter.ts`, ~520 líneas con handshake ACP, `session/new`, `events.stream`, `telemetry`). Quedó fuera del hub porque su factory pide un `executable` explícito, y el `AdapterEntry` del hub sólo pasa `repoPath`. Z.ai funciona a través de OpenCode (no hay binario `zai` directo), por lo que registrar OpenCode suma Z.ai como runtime de ejecución de tareas.

El bloqueo es de cableado, no de implementación: hay que pasar el ejecutable al factory y registrar el entry.

## What Changes

- El `AdapterEntry` del hub puede resolver y pasar un `executable` al factory del adaptador (hoy sólo pasa `repoPath`).
- Se registra OpenCode en `ADAPTERS` con `runtime: 'opencode'`, `executable: 'opencode'`, `launchable: true`.
- OpenCode aparece en el selector de runtime como lanzable, junto a Claude y Codex.
- Las capabilities de OpenCode (negociadas por ACP real) viajan al renderer como `evidenceStatus` informativo.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-runtime-adapters`: el contrato del factory admite un `executable` resuelto por el hub; OpenCode se registra como runtime lanzable con sus capabilities ACP.

## Impact

**Producción:** `electron/pipeline/runtime/runtime-session-hub.ts` (tipo `AdapterEntry`, array `ADAPTERS`).

**Sin tocar:** el adaptador ACP (ya existe y funciona), contratos IPC, lógica de Git, UI (el selector ya renderiza cualquier runtime del hub).

**Dependencias:** ninguna. El binario `opencode` se resuelve vía PATH como `claude`/`codex`.

**Riesgo:** bajo. El adaptador está probado; el cambio es de registro y cableado del ejecutable.
