# Pipeline F03 — CHECKPOINT 3 · Antigravity (`agy`)

Fecha: `2026-07-24`
Orquestador/builder: `Antigravity / direct`
Estado: `VERIFICADO` (Adaptador wrapper de proceso `agy 1.1.5` implementado con degradación honesta y conformance VERDE)

## Resultado del relevamiento

Se auditó `agy 1.1.5`:

| Superficie | Estructura | Decisión F03 |
|---|---|---|
| `agy --version` | Texto simple | Probe de versión verificado (`1.1.5`). |
| `agy --print` / CLI | Terminal / ANSI | No parsear mediante regex sobre prosa. Se modela como wrapper lifecycle-only. |
| Stream JSONL | No disponible en baseline 1.1.5 | Eventos y métricas permanecen `unknown` o `pending_fixture`. |

## Seguridad y Reglas de Integración

- Cero inferencias pagas ejecutadas.
- Cero parsing frágil de prosa o secuencias ANSI.
- `unknown` NUNCA se traduce a cero, false o facturación gratuita.
- `unknownTelemetry` retorna métricas nulas y clasificadas como `unknown`.
- Cero dependencias nuevas, secretos, auth stores, UI, CSS, IPC de control o Hermes obligatorio.

## Validación focalizada

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test electron/__tests__/runtime-agy.test.ts`: 3/3 tests verde.
- Suite `electron/__tests__/`: 25 archivos, 102 tests verde.
- Conformance suite: VERDE.
- `pwsh -NoProfile -File scripts/gates.ps1 fast`: VERDE.
