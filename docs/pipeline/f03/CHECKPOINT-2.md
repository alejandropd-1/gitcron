# Pipeline F03 — CHECKPOINT 2 · OpenCode/Z.ai (transporte pendiente)

Fecha: `2026-07-24`
Orquestador/builder: `Codex Desktop / Codex / direct`
Estado: `PENDIENTE` (handshake verificado; sesión pendiente)

## Resultado del relevamiento

Se revalidó OpenCode `1.18.3` sin ejecutar una inferencia nueva. La versión instalada ofrece:

| Superficie | Estructura | Entrada | Decisión F03 |
|---|---|---|---|
| `opencode run --format json` | eventos JSON | mensaje posicional en argv | No usar para instrucciones arbitrarias. |
| `opencode acp` | ACP por stdin/stdout NDJSON | protocolo estructurado | Elegido; handshake v1 verificado, sesión/eventos pendientes. |
| `opencode serve` | HTTP | API de servidor | No auto-iniciar; faltan contrato de auth, ownership y lifecycle. |

## Evidencia reutilizada

`docs/pipeline/f00/fixtures/opencode-zai-review.sanitized.json` confirma una ejecución real directa
de OpenCode `1.18.3` con provider `Z.AI Coding Plan`, modelo solicitado
`zai-coding-plan/glm-5.2`, tools observadas, duración, usage por categoría y costo `0`
runtime-reportado. Ese cero no se interpreta como cargo de billing ni como plan gratuito.

El fixture es deliberadamente un resumen: no conserva los eventos JSON crudos ni sus shapes. Por
eso sustenta telemetría y separación provider/model, pero no un parser concreto de stream.

## Handshake ACP capturado

El fixture `fixtures/opencode-1.18.3-acp-initialize.sanitized.json` conserva la negociación real:

- protocolo acordado: ACP `1`;
- agent: `OpenCode` `1.18.3`;
- capabilities: load, resume/list/fork/close, imagen, contexto embebido y MCP HTTP/SSE;
- auth: se conservaron sólo cantidad y nombres de campos, nunca valores;
- stderr: `0` bytes;
- sesión/inferencia: no creadas;
- cleanup: proceso owned cerrado y cero procesos ACP o temporales remanentes.

## Veto de evidencia y seguridad

- `events.stream` se corrigió de `verified` a `pending_fixture` en la matriz.
- `initialize` ACP v1 se capturó sin `session/new`, prompt ni inferencia; confirmó OpenCode `1.18.3`
  y las capabilities anunciadas.
- No se deduce el schema desde prosa, documentación genérica ni una versión distinta.
- No se implementa `start` sobre `opencode run`: el prompt quedaría visible en argv.
- ACP se abrió sólo para `initialize` y se cerró; no se abrió HTTP, no se consultaron sesiones
  históricas y no hubo llamada a Z.ai.
- No se agregó dependencia, configuración, secreto, IPC, renderer, UI ni CSS.

## Implementación y validación parcial

- Adapter ACP main-only de discovery/health, con versión y protocolo ligados al fixture.
- `start`, `resume` y parser de `session/update` permanecen ausentes y `pending_fixture`.
- 2 archivos focalizados, 10 tests: verde.
- `pnpm exec tsc --noEmit`: exit 0.
- Un primer intento inline fue bloqueado antes de crear proceso; el harness versionado fue exitoso.

## Próximo desbloqueo propuesto

Capturar por separado `session/new` en un repo temporal y, después, una única interacción sintética
ACP para congelar `session/update`. Ninguno de esos efectos queda autorizado por este checkpoint.
