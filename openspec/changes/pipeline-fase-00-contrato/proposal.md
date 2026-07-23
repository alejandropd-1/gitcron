## Why

GitCron necesita observar de forma confiable qué hacen agentes y modelos sobre cada repositorio, tanto en corridas directas como en corridas coordinadas por Hermes. Antes de implementar adaptadores o controles, F00 debe convertir la documentación existente y las interfaces instaladas en un contrato versionado que separe evidencia, inferencias y datos desconocidos.

## What Changes

- Propone `Pipeline Contract v1` para correlacionar repositorio, change, task, run, sesión, agente, runtime, proveedor y modelo sin obligar a que toda actividad pase por Hermes.
- Define envelopes de eventos, procedencia, métricas, estados degradados y decisiones humanas con semántica explícita para `unknown`.
- Documenta una matriz capacidad × runtime/proveedor respaldada por comandos, código, productores locales o fixtures; Z.ai se modela como proveedor accesible mediante OpenCode, no como CLI independiente comprobada.
- Define fixtures sanitizados y procedimientos de captura para runtimes y para `gates.jsonl`, `delegations.jsonl` y `visual-diff-heights.jsonl`.
- Registra un ADR de transporte y seguridad que compara Hermes companion JSON-RPC/WebSocket, ACP, procesos CLI estructurados y filesystem/hooks como degradación.
- Establece autenticación main-only, scoping per-repo/session, negociación de versión/capabilities, reconexión, backpressure, ownership de procesos, comandos allowlisted y redacción.
- Mantiene F00 exclusivamente documental: no agrega dependencias ni implementa IPC, adaptadores, persistencia o UI de producto.
- Propaga la agnosticidad al grafo de entrega: F03 directo depende de F01, mientras el adaptador
  Hermes F02 es opcional/paralelo y no bloquea el core.
- Incorpora gobernanza determinística sin dependencias (`AGENTS.md`, constitución, perfil y gate)
  como prerrequisito de cualquier escritura de producto F01.

## Capabilities

### New Capabilities

- `pipeline-identity-contract`: Identidad y correlación estables para repo/change/task/run/session/agent, incluyendo orquestación directa o externa y modelo solicitado/efectivo/reportado.
- `pipeline-event-contract`: Envelope versionado, catálogo de eventos, procedencia, orden, deduplicación, redacción y estados unknown/degraded.
- `pipeline-decision-contract`: Solicitudes y resoluciones humanas con evidencia, riesgo, opciones, precondiciones y separación entre ack y efecto.
- `pipeline-runtime-capabilities`: Matriz de observación, métricas, modelos y controles por runtime/proveedor con nivel de evidencia y degradación honesta.
- `pipeline-telemetry-fixtures`: Schemas y fixtures sanitizados para runtimes y telemetría JSONL local, incluyendo variantes y corrupción tolerable.
- `pipeline-connection-security`: Transporte, autenticación, scoping, versionado, reconexión, backpressure, ownership y auditoría de comandos.

### Modified Capabilities

Ninguna. Es el primer change OpenSpec del repositorio y no existen specs base previas.

## Impact

- Afecta documentación F00, artefactos OpenSpec, integraciones generadas y el kit de gobernanza
  previo a F01; no modifica código de producto.
- Documenta superficies futuras de `electron/main`, preload, SQLite, runtime adapters y evidencia del repo, sin modificar código de producto.
- Corrige dentro del track las referencias obsoletas a `C:\www\gitCronos`; el proyecto real es `C:\www\gitcron`.
- F01 permanece fuera de alcance y no puede comenzar hasta el QA y cierre humano de F00.
