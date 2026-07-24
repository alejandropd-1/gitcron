# Pipeline F03 — CHECKPOINT 3 · Antigravity (`agy`)

Fecha: `2026-07-24`
Orquestador/builder: `Antigravity / direct`
Estado: `VERIFICADO` (Adaptador wrapper de proceso `agy 1.1.5` implementado con degradación honesta y conformance VERDE)

## Aclaración importante sobre el alcance de "wrapper"

> **`wrapper` describe la OBSERVABILIDAD, no la capacidad de Antigravity.** Como agente, `agy` es un par
> completo de Claude Code, Codex y OpenCode: ejecuta prompts no interactivos (`--print`), elige modelo
> (`--model`), nivel de razonamiento (`--effort`), modo de ejecución (`--mode plan|accept-edits`), corre en
> sandbox (`--sandbox`), suma directorios al workspace (`--add-dir`), retoma conversaciones por ID
> (`--conversation`), y trae subcomandos `agents`, `models` y `plugin`.
>
> Lo único que **no** tiene es una salida legible por máquina: no existe `--json`, `--output-format` ni
> `--stream`; `--print` emite prosa. Por eso GitCron no puede observar sus pasos internos, no porque haga menos.

## Resultado del relevamiento

Se auditó `agy` (baseline `1.1.5`):

| Superficie | Estructura | Decisión F03 |
|---|---|---|
| `agy --version` | Texto simple | Probe de versión verificado contra la baseline. |
| `agy --print` / CLI | Terminal / ANSI | No parsear mediante regex sobre prosa. Se modela como wrapper lifecycle-only. |
| Stream JSONL | Sin flag en 1.1.5/1.1.6 | Eventos y métricas permanecen `unknown` o `pending_fixture`. |
| `agy --remote-control` | Sin documentar en `--help` | **No explorado.** Si expone protocolo estructurado, `agy` dejaría de ser wrapper ciego. Anotado en ROADMAP. |

## Deriva de versión detectada (auditoría 2026-07-24)

La máquina del operador tiene **`agy 1.1.6`**, no la `1.1.5` que fija el adaptador. El comportamiento es el
correcto por diseño — `discover()` degrada a `pending_fixture` y no afirma la baseline — pero conviene
revalidar la baseline contra 1.1.6 antes de cerrar la fase.

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
