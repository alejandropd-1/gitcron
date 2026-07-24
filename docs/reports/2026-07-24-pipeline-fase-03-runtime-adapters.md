# Pipeline F03 — Reporte de Cierre de Fase (Runtime Adapters)

**Fecha:** 2026-07-24  
**Orquestador/Builder:** Antigravity / direct  
**Branch:** `pipeline/fase-03-runtime-adapters`  
**Estado de la fase:** `Lista para QA`  
**Change OpenSpec:** `pipeline-fase-03-runtime-adapters`  

---

## 1. Resumen Ejecutivo

Fase 03 implementa una capa main-only de adaptadores de runtime (`RuntimeAdapter`) para observar de forma uniforme las ejecuciones de **Claude Code**, **Codex CLI**, **OpenCode / Z.ai**, **Antigravity (`agy`)** y el proveedor local **LM Studio**, sin requerir Hermes como gateway obligatorio y sin inventar telemetría o capacidades no emitidas.

---

## 2. Matriz de Resultados por Runtime

| Runtime / Adapter | Tipo | Transporte | Estado F03 | Exit Code Probas | Capabilities Verificadas |
|---|---|---|---|---:|---|
| **Claude Code 2.1.206** | `native-stream` | `stream-json` | `PASS` | 0 | `discover`, `session.start`, `events.stream`, `telemetry.snapshot`, `reasoning.emitted` |
| **Codex CLI 0.143.0** | `structured-cli` | `exec-jsonl` | `PASS (DEGRADED)` | 0 | `discover`, `session.start`, `events.stream`, `telemetry.usage` |
| **OpenCode 1.18.3** | `structured-cli` | `acp-ndjson-stdio` | `PASS` | 0 | `discover`, `health`, `session.start`, `telemetry.snapshot` |
| **Antigravity (`agy` 1.1.5)** | `wrapper` | `process-lifecycle` | `PASS (WRAPPER)` | 0 | `discover`, `health`, `lifecycle.wrapper` |
| **LM Studio (9902c3a)** | `openai-compatible` | `openai-http` | `PASS (LOCAL)` | 0 | `discover`, `health`, `telemetry.snapshot` (`local_unpriced`) |

---

## 3. Seguridad e Invariantes

- **Aislamiento de procesos:** `spawn` con `executable` y `args` separados, `shell: false`, entorno mínimo y canonical `cwd` validado per-repo.
- **Sin prompts en argv:** OpenCode utiliza exclusivamente `acp` por stdio NDJSON (`opencode run` no se utiliza para prompts arbitrarios).
- **Inferencia autorizada:** Cero inferencias pagas ejecutadas sin autorización humana separada (`session/prompt` no enviado).
- **Preservación de identidad:** Separación estricta en `PipelineIdentity` entre `runtime`, `provider`, `requestedModel`, `effectiveModel` y `reportedModel`.
- **Costo y Telemetría:** Costo 0 reportado preservado como `runtime_reported` / `reported` o `local_unpriced`. `unknown` nunca se convierte en cero o facturación gratuita.
- **Sin dependencias ni UI:** 0 dependencias npm nuevas, 0 cambios en UI, CSS, IPC público o preload.

---

## 4. Evidencias y Fixtures Sanitizados

- `docs/pipeline/f03/fixtures/claude-2.1.206-stream.sanitized.jsonl`
- `docs/pipeline/f03/fixtures/codex-0.143.0-exec.sanitized.jsonl`
- `docs/pipeline/f03/fixtures/opencode-1.18.3-acp-initialize.sanitized.json`
- `docs/pipeline/f03/fixtures/opencode-1.18.3-acp-session-new.sanitized.json`
- `docs/pipeline/f00/fixtures/opencode-zai-review.sanitized.json`
- `docs/pipeline/f00/fixtures/lmstudio-classification.sanitized.json`

---

## 5. Verificación de Calidad

- **TypeScript (`pnpm exec tsc --noEmit`):** `0 errores` (Exit code 0)
- **Vitest (`pnpm test`):** `59 files passed / 353 tests passed` (Exit code 0)
- **OpenSpec Strict (`pnpm exec openspec validate --strict pipeline-fase-03-runtime-adapters`):** `Valid` (Exit code 0)
- **Gate Fast (`pwsh -NoProfile -File scripts/gates.ps1 fast`):** `VERDE`
- **Gate Full (`pwsh -NoProfile -File scripts/gates.ps1 full`):** `PENDIENTE` (Build OK; deuda de Fallow/lint heredada)
- **Fallow (`pnpm exec fallow`):** Maintainability 90.1 (good); 33 dead-code, 12 clone groups (deuda heredada)
