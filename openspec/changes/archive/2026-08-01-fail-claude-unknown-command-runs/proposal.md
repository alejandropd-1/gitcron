## Why

El adaptador de Claude declara éxito de una sesión que no ejecutó nada. Cuando el CLI recibe un
slash command inexistente devuelve `is_error: false`, exit 0 y `num_turns: 0`, con el motivo real
sólo dentro de `result`:

```json
{"subtype":"success","is_error":false,"duration_ms":18,"duration_api_ms":0,"num_turns":0,
 "result":"Unknown command: /opsx:archive","total_cost_usd":0}
```

Pipeline traduce eso a `run.completed · ok`, la sesión cierra como `completed` y la aplicación
muestra *"Sesión finalizada correctamente"*. Mordió tres veces en la sesión anterior
(`retire-f03-runtime-gate`, `fix-openspec-artifacts-selection`, `pin-archived-header-and-single-scroll`)
y deja una sesión registrada como exitosa apuntando a una tarea que sigue sin tildar. Es el único
defecto conocido que **afirma algo falso**, y cae sobre el camino normal de trabajo.

## What Changes

- El normalizador de Claude deja de derivar el éxito sólo de `is_error`. Un `result` con
  `num_turns: 0` cuyo texto empieza con `Unknown command:` produce `run.completed` con
  `success: false` y el motivo textual, más un `runtime.error` que conserva la procedencia.
- El desenlace de una sesión deja de ser `completed` por omisión. Un `run.completed` con
  `success: false` cierra la sesión como `failed`, igual que hoy lo hace `runtime.process.failed`.
  Sin este segundo punto el cartel mentiroso sobrevive: `drain()` nunca mira `success`.
- La guía pasa a ofrecer el reintento con el motivo real (`session-retry` por fallo) en vez de
  hacerlo por tarea estancada tras un falso éxito. No hay cambio de código en
  `pipeline-next-action.ts`: ya distingue ambos casos.

Fuera de alcance, declarado: **esto no hace que `/opsx:apply` funcione con Claude**. Los comandos
`opsx` no viven en `.claude/commands/` y `apply`/`archive` necesitan shell, que `claude-adapter.ts`
excluye a propósito. Esa es una decisión de Ale pendiente, no técnica, y no se toca acá.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-runtime-adapters`: se agrega el requisito de que un adaptador no declare éxito de un run
  que el runtime no ejecutó, aunque el proceso haya salido con código 0.
- `pipeline-state-replay`: se agrega el requisito de que el desenlace persistido de la sesión respete
  el fracaso declarado por el run, y no dependa sólo del fallo del proceso.

## Impact

- `electron/pipeline/runtime-adapters/claude-normalizer.ts` — derivación de `success` en el `result`.
- `electron/pipeline/runtime/runtime-session-hub.ts` — `drain()` observa `run.completed.success`.
- `electron/pipeline/runtime/runtime-projection.ts` — la línea de `run.completed` cita el motivo.
- `electron/__tests__/runtime-normalizers.test.ts` y `electron/__tests__/runtime-session-hub.test.ts`
  — cobertura de los dos puntos.
- Sin cambios de i18n: `session.failed` ya existe en ES/EN/ZH.
- Sin cambios de dependencias, de CSP ni de superficie de herramientas del adaptador.
