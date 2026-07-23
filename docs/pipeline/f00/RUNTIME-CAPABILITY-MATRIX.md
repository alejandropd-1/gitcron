# F00 — Matriz de capacidades por runtime/proveedor

Snapshot local: `2026-07-23`. No es catálogo permanente; cada adapter negocia capabilities.

Leyenda: `V` verified, `I` inferred, `U` unknown, `PF` pending fixture, `NA` no aplica.
`V interfaz / PF efecto` significa que el flag/protocolo existe pero no se probó la operación.

## Identidad instalada

| Runtime/proveedor | Versión/evidencia | Rol en Pipeline |
|---|---|---|
| Hermes | `0.19.0 (2026.7.20)`, upstream `d9165d7a`, local `146f4ed0` | Orquestador opcional + runtime observable. |
| Claude Code | `2.1.206` | Runtime directo/builder; JSON/stream-JSON. |
| Codex CLI/Desktop | CLI `0.143.0`; esta ejecución Desktop directa | Runtime directo, auditor o builder. |
| Antigravity `agy` | `1.1.5` | Scout; sólo print final estructuralmente comprobado. |
| OpenCode | `1.18.3` | Runtime directo; JSON, ACP y server. |
| Z.ai | Credencial `Z.AI Coding Plan` listada por OpenCode | Provider/familia vía OpenCode; no runtime standalone. |
| LM Studio | CLI commit `9902c3a`; server `127.0.0.1:1234` | Provider local; no agente/orquestador por sí solo. |

## Observación y métricas

| Fuente | Eventos estructurados | Reasoning | Tools | Usage/tokens | Costo | Contexto | Modelo |
|---|---|---|---|---|---|---|---|
| Hermes | `I/PF` JSON-RPC/WS; ACP check V | `I/PF` | `I/PF` | `V interfaz / PF fixture` (`--usage-file`) | `PF`; semántica billing | `I/PF` | `V` override `-m`; efectivo PF |
| Claude | `V` JSON/stream-JSON + fixture result | `PF`; no asumir literal | `I/PF`; la corrida usó tools pero el fixture retenido no conserva sus eventos | `V` fixture runtime | `V` runtime-reportado, billing unknown | `V` fixture modelUsage | `V` solicitado/efectivo separados |
| Codex | `V interfaz / PF fixture` JSONL/app-server | `PF` | `I/PF` | `PF` | `U/PF` | `U/PF` | `V` select; efectivo PF |
| `agy` | `U`; sólo final text V | `U` | `U/PF` | `U` | `U` | `U` | `V` catálogo/select; efectivo PF |
| OpenCode | `V interfaz / PF fixture` JSON/ACP | `I/PF` (`--thinking`) | `I/PF` | `I/PF` (`stats`) | `I/PF` | `U/PF` | `V` select; efectivo PF |
| Z.ai vía OpenCode | `V` stream OpenCode real [O5] | `PF` | `V` read tools observadas [O5] | `V` eventos de step [O5]; dedupe total pendiente | `V` runtime reportó 0 [O5], billing del plan no inspeccionado | `PF` | requested `zai-coding-plan/glm-5.2`; efectivo inferido, reported null [O5] |
| LM Studio | `V` HTTP/JSON | `NA` como servidor | `NA` ejecución; modelo declara tool-use V | `V` respuesta local (652 tokens) | `V local_unpriced` | `V` max/current en `lms ps` | `V` loaded model |

## Sesión y control

| Fuente | Resume | Pause | Interrupt | Kill | Credencial/provider auth | Auth del conector/transporte | Schema stability |
|---|---|---|---|---|---|---|---|
| Hermes | `V interfaz / PF efecto` [H2] | `I/PF` | `I/PF` | `I/PF` | `U`; no se inspeccionó configuración | `V` auth obligatoria para public bind [H2]; token loopback `PF` | `PF`, negociar versión |
| Claude | `V interfaz / PF efecto` [C1] | `U` | `U/PF` | `U` | Runtime operativo `V`; mecanismo exacto `U` | `U/PF` | `I`, capturar por versión |
| Codex | `V interfaz / PF efecto` [X1] | `U` | `U/PF` | `U` | Sesión actual operativa `V`; mecanismo exacto `U` | App-server WS auth anunciado `V interfaz / PF efecto` [X2] | `I`, app-server genera schema |
| `agy` | `V interfaz / PF efecto` [A1] | `U` | `U` | `U` | `U` | `U/PF` | `U`; no parsear prosa |
| OpenCode | `V interfaz / PF efecto` [O1] | `U/PF` | `U/PF` | `U/PF` | Labels presentes `V` [O2]; mecanismo `U` | `U/PF` | `I`, JSON/ACP por versión |
| Z.ai vía OpenCode | Hereda sesión OpenCode | `NA` provider | `NA` provider | `NA` provider | Credential label `V` [O2] | Hereda OpenCode: `U/PF` | Hereda adapter OpenCode + provider metadata |
| LM Studio | `NA` agente | `NA` | `NA` | `NA` (load/unload no es kill de agente) | `U`; no se inspeccionó configuración | Loopback activo `V` [L2]; auth nativa `U/PF`, requiere wrapper | OpenAI-compatible, versión exacta `PF` |

## Evidencia de comandos

| Ref | Comando | Exit | Hecho sustentado |
|---|---|---:|---|
| H1 | `hermes --version` | 0 | versión exacta y build local. |
| H2 | `hermes serve --help` | 0 | gateway JSON-RPC/WebSocket, host/port y auth pública. |
| H3 | `hermes acp --check` | 0 | ACP operativo. |
| C1 | `claude --version` / `claude --help` | 0 | formatos, permisos, model/budget/resume. |
| C2 | planner Claude read-only | 0 | result JSON, modelo efectivo, usage/duración/costo reportado. |
| X1 | `codex --version` / `codex exec --help` | 0 | JSONL, output schema, resume y model select. |
| X2 | `codex app-server --help` | 0 | stdio/unix/ws, auth WS y generación de schemas. |
| A1 | `agy --version` / `agy --help` / `agy models` | 0 | versión, print/plan/sandbox/model catalog. |
| O1 | `opencode --version` / `opencode run --help` | 0 | JSON, thinking, session, model select. |
| O2 | `opencode providers list` | 0 | credenciales LMStudio y Z.AI Coding Plan, sin secretos. |
| O3 | `opencode models zai` | 1 | `zai` no es el provider id. |
| O4 | `opencode models zai-coding-plan` | 0 | seis IDs de modelo disponibles. |
| O5 | `opencode run --format json -m zai-coding-plan/glm-5.2 ...` | 0 | review real, read tools, tokens/step y costo runtime-reportado 0. |
| L1 | `lms --version` / `lms ps --json` | 0 | modelo loaded, contexto, estado, tool-use metadata. |
| L2 | `lms server status` | 0 | servidor activo en puerto 1234. |
| L3 | POST local `/v1/chat/completions` | 0 | modelo/usage real; salida útil vacía por budget de reasoning. |

## Limitaciones que bloquean afirmaciones más fuertes

- No se ejecutaron controles destructivos o de proceso.
- No se leyó ninguna configuración/credencial ni `.env`; auth detallada permanece unknown.
- No se capturó una sesión Hermes companion ni eventos directos Codex/`agy`; OpenCode sólo tiene
  fixture retenido para la corrida Z.ai [O5].
- La salida Claude reportó USD, pero no prueba un cargo adicional facturado.
- La corrida pidió `zai-coding-plan/glm-5.2`; el stream no incluyó un campo de modelo reportado,
  por lo que el efectivo se infiere de la selección exitosa y queda pendiente de confirmación explícita.
