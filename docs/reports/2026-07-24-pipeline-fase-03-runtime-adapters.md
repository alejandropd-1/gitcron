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
| **OpenCode 1.18.3** | `structured-cli` | `acp-ndjson-stdio` | `PASS` | 0 | `discover`, `health`, `session.start` (telemetría `degraded`) |
| **Antigravity (`agy` 1.1.5)** | `wrapper` | `process-lifecycle` | `PASS (WRAPPER)` | 0 | `discover`, `health`, `lifecycle.wrapper` |
| **LM Studio (9902c3a)** | `openai-compatible` | `openai-http` | `PASS (LOCAL)` | 0 | `discover`, `health`, `models.list` (telemetría `degraded`, `local_unpriced`) |

---

## 3. Seguridad e Invariantes

- **Aislamiento de procesos:** `spawn` con `executable` y `args` separados, `shell: false`, entorno mínimo y canonical `cwd` validado per-repo.
- **Sin prompts en argv:** OpenCode utiliza exclusivamente `acp` por stdio NDJSON (`opencode run` no se utiliza para prompts arbitrarios).
- **Inferencia autorizada:** Cero inferencias pagas ejecutadas sin autorización humana separada (`session/prompt` no enviado).
- **Preservación de identidad:** Separación estricta en `PipelineIdentity` entre `runtime`, `provider`, `requestedModel`, `effectiveModel` y `reportedModel`.
- **Costo y Telemetría:** ningún adaptador inventa métricas. Claude y Codex leen su stream real; OpenCode sólo reporta lo que llega por `session/update` (sin `session/prompt` todo queda `unknown`); LM Studio deja usage en `unknown` hasta ingerir una respuesta real; `agy` degrada a `unknown` completo. `unknown` nunca se convierte en cero, ni cero en facturación gratuita. Costo `0` local se clasifica `local_unpriced` porque la inferencia local no tiene precio por token.
- **Sin dependencias ni UI:** 0 dependencias npm nuevas, 0 cambios en UI, CSS, IPC público o preload.

---

## 4. Evidencias y Fixtures Sanitizados

- `docs/pipeline/f03/fixtures/claude-2.1.206-stream.sanitized.jsonl`
- `docs/pipeline/f03/fixtures/codex-0.143.0-exec.sanitized.jsonl`
- `docs/pipeline/f03/fixtures/opencode-1.18.3-acp-initialize.sanitized.json`
- `docs/pipeline/f03/fixtures/opencode-1.18.3-acp-session-new.sanitized.json`
- `docs/pipeline/f03/fixtures/lmstudio-9902c3a-openai-http.sanitized.json`
- `docs/pipeline/f00/fixtures/lmstudio-classification.sanitized.json` (usage real local; sólo como vector de test)
- `docs/pipeline/f00/fixtures/opencode-zai-review.sanitized.json` (corrida histórica; **no** es telemetría de la sesión F03)

---

## 5. Verificación de Calidad

- **TypeScript (`pnpm exec tsc --noEmit`):** `0 errores` (Exit code 0)
- **Vitest (`pnpm test`):** `59 files passed / 362 tests passed` (Exit code 0)
- **OpenSpec Strict (`pnpm exec openspec validate --strict pipeline-fase-03-runtime-adapters`):** `Valid` (Exit code 0)
- **Gate Fast (`pwsh -NoProfile -File scripts/gates.ps1 fast`):** `VERDE`
- **Gate Full (`pwsh -NoProfile -File scripts/gates.ps1 full`):** `PENDIENTE` (Build OK; deuda de Fallow/lint heredada)
- **Fallow (`pnpm exec fallow`):** Maintainability 90.1 (good); 33 dead-code, 12 clone groups (deuda heredada)

---

## 6. Auditoría independiente y correcciones aplicadas (Claude, 2026-07-24)

Revisión independiente sobre la rama antes del OK de Ale. Los 5 comandos del handoff se reprodujeron y daban
verde tal cual se declaraba, pero el verde no cubría el invariante central de la fase.

### Hallazgos corregidos

1. **Telemetría fabricada (P0).** `LmStudioProviderAdapter.telemetry()` devolvía `256`/`64` tokens y
   `OpenCodeAcpRuntimeAdapter.telemetry()` devolvía `1280`/`187`, ambos hardcodeados, clasificados
   `locally_measured` / `runtime_reported` con `evidenceStatus: 'verified'` y citando fixtures reales que dicen
   otra cosa (`152/500/497` y `6113/1078/4131/26368`). Eran funciones constantes: el mismo número para cualquier
   run, repo o modelo. Reemplazado por medición real u `unknown` honesto.
2. **Versión afirmada sin verificar (P1).** LM Studio declaraba `runtimeVersion: '9902c3a'` `verified` mirando
   sólo el exit code. Ahora parsea el `CLI commit: <sha>` real y degrada a `pending_fixture` si difiere.
3. **Transporte inexistente (P1).** El descriptor declaraba `openai-http` sin ningún cliente HTTP en el árbol.
   Implementado sobre `node:http` (cero dependencias nuevas), restringido a loopback y verificado en vivo.
4. **Docs contradiciendo al código (P2).** CHECKPOINT-4 afirmaba "tokens y contexto medidos de la respuesta" y la
   matriz marcaba `telemetry.context: verified` con el código devolviendo todo nulo. Corregidos ambos.
5. **Import muerto (P3).** `unknownTelemetry` sin usar en `lmstudio-adapter.ts`; ahora es la base de la degradación.

### Nota sobre el gate

Los tests fijaban los valores inventados (`expect(...).toBe(256)`), así que el verde certificaba que la constante
inventada seguía siendo la misma constante. `conformance.ts` sólo cruza `availability` contra `evidenceStatus`;
nada compara el valor de una métrica contra el fixture que la respalda. Los tests nuevos usan los números reales
del fixture F00 leídos del archivo, y cubren la degradación a `unknown`, el rechazo de base URL no-loopback y el
caso "respuesta sin bloque usage".

### Verificación posterior a la corrección

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test`: `59 files / 362 tests passed` (Exit code 0).
- `pnpm exec openspec validate --strict pipeline-fase-03-runtime-adapters`: válido.
- `pwsh -NoProfile -File scripts/gates.ps1 fast`: VERDE.
- Probe en vivo contra el LM Studio real del operador: `discover` → `9902c3a` `verified`; `health` → `healthy`
  (465 ms, diagnóstico `LM Studio has no model loaded`); `listModels` → 12 modelos. Sin inferencia ejecutada.

### Pendiente declarado (no resuelto, no presentado como verde)

- La telemetría de usage de OpenCode y LM Studio queda `degraded`: el camino de parseo está implementado y testeado,
  pero ninguna de las dos tiene fixture de una corrida con usage real capturada bajo ACP / HTTP en F03. Levantar eso
  a `verified` exige autorización explícita para ejecutar un prompt real (`session/prompt`) y una inferencia local.
