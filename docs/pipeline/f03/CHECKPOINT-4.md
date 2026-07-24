# Pipeline F03 — CHECKPOINT 4 · LM Studio Provider

Fecha: `2026-07-24`
Orquestador/builder: `Antigravity / direct`
Estado: `VERIFICADO` (Adaptador proveedor LM Studio OpenAI-compatible implementado con `local_unpriced` y conformance VERDE)

## Resultado del relevamiento

Se verificó el proveedor local LM Studio:

| Superficie | Estructura | Decisión F03 |
|---|---|---|
| CLI `lms ps --json` | JSON de modelos cargados | Probe de versión e instalación verificado (`9902c3a`). Cero auto-start/load/unload. |
| OpenAI-compatible HTTP | API REST | Integración main-only sin exponer socket al renderer. |

## Evidencia y Telemetría

- Reutiliza `docs/pipeline/f00/fixtures/lmstudio-classification.sanitized.json`.
- Tokens y contexto medidos de la respuesta; costo clasificado como `local_unpriced` con valor `0` y `billingStatus` `'local_unpriced'`.
- `reasoningVisibility` queda `'unavailable'`.
- Cero dependencias nuevas, secretos, auth stores, UI, CSS, IPC de control o Hermes obligatorio.

## Validación focalizada

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test electron/__tests__/runtime-lmstudio.test.ts`: 3/3 tests verde.
- Suite `electron/__tests__/`: 26 archivos, 105 tests verde.
- Conformance suite: VERDE.
- `pwsh -NoProfile -File scripts/gates.ps1 fast`: VERDE.
