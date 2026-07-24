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

- `docs/pipeline/f00/fixtures/opencode-zai-review.sanitized.json` confirma ejecución con provider `Z.AI Coding Plan`, `requestedModel` `zai-coding-plan/glm-5.2`, y costo `0` runtime-reportado.
- Ese cero se clasifica como `runtime_reported` / `reported`, no como facturación real ni plan gratuito.
- Separación de campos preservada en `PipelineIdentity`: `runtime` (`opencode`), `provider` (`Z.AI`), `requestedModel`, `effectiveModel`, `reportedModel`.
- `reasoningVisibility` queda `unavailable` porque ACP no emitió deltas de pensamiento explícitos.

## Veto de evidencia y seguridad

- `session.start` y `telemetry.snapshot` habilitados y marcados `verified` con sus fixtures sanitizados.
- `session/prompt` NO fue enviado: cero inferencias pagas ni prompts arbitrarios en argv.
- Cero dependencias nuevas, secretos, auth stores, UI, CSS, IPC de control o Hermes obligatorio.

## Validación focalizada

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test electron/__tests__/runtime-opencode-acp.test.ts`: 3/3 tests verde.
- Suite `electron/__tests__/`: 24 archivos, 99 tests verde.
- `pwsh -NoProfile -File scripts/gates.ps1 fast`: VERDE.
