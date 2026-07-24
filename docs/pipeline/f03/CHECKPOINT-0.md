# Pipeline F03 — CHECKPOINT 0

Fecha: `2026-07-24`
Orquestador/builder: `Codex Desktop / Codex / direct`

## Versiones revalidadas sin inferencias

| Runtime | Versión | Exit |
|---|---|---:|
| Claude Code | `2.1.206` | 0 |
| Codex CLI | `0.143.0` | 0 |
| Antigravity (`agy`) | `1.1.5` | 0 |
| OpenCode | `1.18.3` | 0 |
| LM Studio CLI | `9902c3a` | 0 |

## Clasificación de transporte

| Adapter/provider | Clase | Estado en TANDA 0 |
|---|---|---|
| Claude Code | `native-stream` | Fixture resumido de métricas verificado; stream completo pendiente. |
| Codex CLI | `structured-cli` | Interfaz JSONL verificada; fixture pendiente. |
| OpenCode / Z.ai | `structured-cli` | Stream real sanitizado verificado; dedupe/transport a decidir en TANDA 2. |
| `agy` | `wrapper` | Sin stream estructurado comprobado; sólo lifecycle/final opaco. |
| LM Studio | `openai-compatible` | Provider local verificado; no es runtime agente. |

## Límite del checkpoint

TANDA 0 no crea procesos, no llama modelos, no abre sockets y no cambia IPC/SQLite. Las próximas tandas requieren fixtures de runtime autorizados antes de congelar parsers concretos.
