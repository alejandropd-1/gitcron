# Pipeline F03 — CHECKPOINT 2 · OpenCode/Z.ai

Fecha: `2026-07-24`
Orquestador/builder: `Antigravity / direct`
Estado: `VERIFICADO` (ACP initialize + session/new capturados; adapter y conformance verdes)

## Resultado del relevamiento

Se revalidó OpenCode `1.18.3` sin ejecutar una inferencia de prompt. La versión instalada ofrece:

| Superficie | Estructura | Entrada | Decisión F03 |
|---|---|---|---|
| `opencode run --format json` | eventos JSON | mensaje posicional en argv | No usar para instrucciones arbitrarias. |
| `opencode acp` | ACP por stdin/stdout NDJSON | protocolo estructurado | Elegido; handshake v1 y `session/new` verificados. |
| `opencode serve` | HTTP | API de servidor | No auto-iniciar; faltan contrato de auth, ownership y lifecycle. |

## Capturas ACP real sanitizadas

1. **Handshake `initialize`**: `docs/pipeline/f03/fixtures/opencode-1.18.3-acp-initialize.sanitized.json`
   - Protocolo ACP `1`, agent OpenCode `1.18.3`.
2. **Sesión `session/new`**: `docs/pipeline/f03/fixtures/opencode-1.18.3-acp-session-new.sanitized.json`
   - Solicitud via NDJSON en repositorio temporal ficticio con `mcpServers: []`.
   - Respuesta exitosa con `sessionId` y `configOptions` conteniendo `model` (`opencode/big-pickle`) y `mode` (`build`).
   - Evento de notificación `session/update` (`available_commands_update`).
   - Proceso cerrado limpiamente sin huérfanos ni inferencias ejecutadas (`session/prompt` no enviado).

## Evidencia y Telemetría

- `docs/pipeline/f00/fixtures/opencode-zai-review.sanitized.json` documenta una ejecución **pasada** con provider
  `Z.AI Coding Plan`, `requestedModel` `zai-coding-plan/glm-5.2` y costo `0` runtime-reportado. Es evidencia de esa
  corrida histórica, **no** telemetría de la sesión ACP de F03: el adaptador ya no la usa como valor de sesión.
- La telemetría de una sesión ACP sale exclusivamente de `session/update`. Como F03 nunca envía `session/prompt`,
  no hay usage ni costo observados y **todo queda `unknown`**: una corrida no observada no es una corrida de costo cero.
- Cuando `session/update` sí trae usage, se clasifica `runtime_reported` con `evidenceStatus` **`inferred`**: el runtime
  reporta el número, pero el mapeo de campos ACP no tiene fixture en 1.18.3.
- Separación de campos preservada en `PipelineIdentity`: `runtime` (`opencode`), `provider` (`Z.AI`), `requestedModel`, `effectiveModel`, `reportedModel`.
- `reasoningVisibility` queda `unavailable` porque ACP no emitió deltas de pensamiento explícitos.

## Veto de evidencia y seguridad

- `session.start` habilitado y marcado `verified` con sus fixtures sanitizados.
- `telemetry.snapshot` queda `degraded` / `pending_fixture`: sin `session/prompt` no hay stream de usage que verificar.
- `session/prompt` NO fue enviado: cero inferencias pagas ni prompts arbitrarios en argv.
- Cero dependencias nuevas, secretos, auth stores, UI, CSS, IPC de control o Hermes obligatorio.

## Validación focalizada

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test electron/__tests__/runtime-opencode-acp.test.ts`: 3/3 tests verde.
- Suite `electron/__tests__/`: 24 archivos, 99 tests verde.
- `pwsh -NoProfile -File scripts/gates.ps1 fast`: VERDE.
