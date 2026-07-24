# Pipeline F03 — CHECKPOINT 4 · LM Studio Provider

Fecha: `2026-07-24`
Orquestador/builder: `Antigravity / direct`
Revisión y corrección: `Claude / auditoría F03`
Estado: `VERIFICADO` (Adaptador proveedor LM Studio OpenAI-compatible sobre HTTP loopback real, con telemetría honesta)

## Resultado del relevamiento

Se verificó el proveedor local LM Studio contra la instancia real del operador:

| Superficie | Estructura | Decisión F03 |
|---|---|---|
| CLI `lms --version` | `CLI commit: <sha>` | Parseado y comparado contra la baseline `9902c3a`. Versión distinta ⇒ `pending_fixture`, nunca `verified`. |
| CLI `lms ps --json` | JSON de modelos **cargados** | Parseado de verdad (no sólo exit code). Se usa como fallback cuando no hay catálogo nativo. |
| HTTP `GET /api/v1/models` | Catálogo nativo | **Fuente preferida.** Trae `max_context_length`, `loaded_instances` y `capabilities.trained_for_tool_use`. |
| HTTP `GET /v1/models` | Lista OpenAI-compatible | Fallback para builds sin `/api/v1`. Sólo da ids ⇒ evidencia baja a `pending_fixture`. |
| HTTP `POST /api/v1/chat` | Bucle agéntico + MCP | **Fuera de alcance de F03.** Existe (probe 400, no 404) pero no se implementa. Ver `docs/02_ROADMAP.md`. |

## Evidencia y Telemetría

- Probe real capturado en `docs/pipeline/f03/fixtures/lmstudio-9902c3a-openai-http.sanitized.json`
  (versión `9902c3a`, `GET /v1/models` → 200 con 12 modelos, `GET /api/v1/models` → 200 con 11 de 12 modelos
  `trained_for_tool_use` y ventanas de hasta 262144 tokens, `lms ps --json` → `[]`, latencias 465 ms y 15 ms).
- `context.max_tokens` se resuelve **por clave de modelo** contra el catálogo: el `max_context_length` es una
  capacidad del modelo, no de la corrida, así que sólo aplica si sabemos qué modelo corrió. Si el modelo es
  desconocido y hay más de una instancia cargada, queda `unknown` en vez de adivinar.
- Usage: `unknown` hasta que se ingiere una respuesta OpenAI-compatible real vía `recordCompletionUsage()`.
  **No se inventan tokens.** Los campos que el proveedor no reporta quedan `null`, no cero.
- **Verificado de punta a punta** con una inferencia local real (2026-07-24, aprobada por Ale, GPU propia,
  sin proveedor pago): `docs/pipeline/f03/fixtures/lmstudio-9902c3a-usage.sanitized.json` guarda el payload
  de cable textual — `prompt_tokens` 18, `completion_tokens` 32, `reasoning_tokens` 32 bajo
  `usage.completion_tokens_details`. El test lee ese fixture directamente: ya no reconstruye el sobre.
- Confirmado que LM Studio **no reporta** tokens de caché: `cache_read` y `cache_write` quedan `null`.
- `context.max_tokens` se resuelve contra el catálogo nativo (262144 observados para el modelo real);
  `lms ps --json` queda como fallback para builds sin `/api/v1`.
- Costo: `0` con clasificación `local_unpriced` — la inferencia local no tiene precio por token.
  `evidenceStatus` es `inferred` mientras no se haya observado una respuesta real, y `verified` recién después.
- `reasoningVisibility` es `summary` cuando el proveedor reporta reasoning tokens; `unavailable` si no.
- Cero dependencias nuevas (HTTP sobre `node:http`), secretos, auth stores, UI, CSS, IPC de control o Hermes obligatorio.

## Corrección aplicada sobre la versión anterior

La primera implementación devolvía `256` tokens de input y `64` de output **hardcodeados**, clasificados
`locally_measured` / `verified`, citando como evidencia un fixture que dice `152/500/497`. Tampoco existía HTTP
alguno pese a declarar `transport: openai-http`, y `discover()` afirmaba la versión `9902c3a` mirando sólo el
exit code. Todo eso fue reemplazado por probes reales y degradación honesta a `unknown`.

## Validación focalizada

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test electron/__tests__/runtime-lmstudio.test.ts`: 11/11 tests verde.
- Suite completa: 59 archivos, 362 tests verde.
- Probe en vivo contra LM Studio real: `discover` → `9902c3a` `verified`; `health` → `healthy` con diagnóstico
  honesto `LM Studio has no model loaded`; `listModels` → 12 modelos reales.
- `pwsh -NoProfile -File scripts/gates.ps1 fast`: VERDE.
