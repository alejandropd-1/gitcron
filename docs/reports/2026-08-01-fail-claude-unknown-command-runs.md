# Reporte — `fail-claude-unknown-command-runs`

**Fecha:** 2026-08-01 · **Base:** `main` en `1e85492`

Punto **A** del handoff `docs/reports/2026-08-01-handoff-pipeline.md`: el adaptador que declaraba
éxito de una sesión que no hizo nada.

## Qué se tocó

El defecto tenía **dos capas**, no una. El handoff señalaba la primera; la segunda apareció al leer
el código y hacía que arreglar sólo la primera dejara el síntoma visible.

**Capa 1 — el normalizador.** `claude-normalizer.ts` derivaba `success: record.is_error === false`.
El CLI de Claude devuelve `is_error: false`, exit 0 y `num_turns: 0` para un slash command
inexistente, con el motivo únicamente dentro de `result`. Ahora un `result` con cero turnos cuyo
texto empieza con `Unknown command:` produce `run.completed` con `success: false` y el motivo
textual, más un `runtime.error` con el mismo texto.

**Capa 2 — el cierre de la sesión.** `runtime-session-hub.ts` inicializaba `outcome = 'completed'` y
sólo lo bajaba a `'failed'` ante `runtime.process.failed` o una excepción del stream: **nunca leía
`run.completed.success`**. Ese `outcome` es el que emite la entrada `session.completed`, traducida
como *"Sesión finalizada correctamente"*. Ahora un `run.completed` con `success: false` cierra la
sesión como `failed`, venga del runtime que venga.

Efecto lateral verificado de la capa 2: un run de Claude con `is_error: true` ya emitía
`success: false` y **también** cerraba la sesión como `completed` si el proceso no fallaba. El
defecto era más amplio que el caso que lo destapó; queda cubierto.

**Visibilidad.** `runtime.error` cae en el `default` de `textForEvent` y se describe por su `kind`,
sin desplegar el `message`. Por eso el motivo se cita en la línea de `run.completed`, que es donde se
lee el desenlace: `run.completed · error · Unknown command: /opsx:apply`.

Archivos:

- `electron/pipeline/runtime-adapters/claude-normalizer.ts`
- `electron/pipeline/runtime/runtime-session-hub.ts`
- `electron/pipeline/runtime/runtime-projection.ts`
- `electron/__tests__/runtime-normalizers.test.ts`
- `electron/__tests__/runtime-session-hub.test.ts`

## Qué NO se tocó

- **`/opsx:apply` sigue sin funcionar con Claude.** Los comandos `opsx` viven en `.agent/workflows/`
  y `.opencode/commands/`, no en `.claude/commands/`; y `apply`/`archive` necesitan shell, que
  `claude-adapter.ts` excluye a propósito. Es el punto **B** del handoff y es decisión de Ale. Este
  change hace que el fallo se declare, no que el comando exista.
- `pipeline-next-action.ts` — ya distinguía `failed` de tarea estancada. Con el desenlace correcto
  elige la rama correcta sin cambios.
- `lib/i18n.ts` — `session.failed` ya existía en ES/EN/ZH.
- Las filas ya persistidas en `pipeline_runtime_session`. Son el registro de lo que se observó
  entonces, y borrarlas requiere autorización explícita de Ale.
- El texto del `runtime.error` en la actividad, que mostraría también el `[REDACTED]` de Codex: otro
  caso, otro change.
- El flake de la suite (punto **C**), la cola de Git (**D**), los runtimes (**E**) y la divergencia
  de `CHANGE_ID_PATTERN` (**F**).

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec eslint <archivos tocados>` | limpio, sin salida |
| `pnpm exec tsc --noEmit` | 0 errores |
| `pnpm test` (corrida 1) | 84 archivos · 613 tests · verde · 40,0 s |
| `pnpm test` (corrida 2) | 84 archivos · 613 tests · verde |
| `pnpm test` (corrida 3) | 84 archivos · 613 tests · verde |
| `openspec validate fail-claude-unknown-command-runs --strict` | válido |

**Sobre el flake:** tres corridas completas dieron verde y no se reprodujo el `Test timed out in
5000ms` de `git-hunks-ipc`, `branch-delete-ipc`, `git-ops-worktree-submodule` ni `git-sync-ipc`. Eso
**no lo resuelve ni lo mide**: el handoff lo reporta como 3 fallos en ~10 corridas, así que tres
verdes seguidos son consistentes con que siga ahí. El punto **C** sigue abierto y sin evidencia en
ninguna dirección sobre si la cola de `serialize-git-operations` lo empeoró.

## Cobertura agregada

- Normalizador: cero turnos con `Unknown command:` → `success: false` con motivo y `eventId` únicos.
- Normalizador: run con turnos y sin error → `success: true`, sin cambio de comportamiento.
- Normalizador: cero turnos con otro motivo → no inventa un fallo.
- Hub: `run.completed` fallido con proceso exitoso → sesión `failed` y actividad `session.failed`.
- Hub: sesión detenida por el usuario → `interrupted`, con precedencia sobre el run fallido.

## Pendiente

La tarea de firma `4.7 Archivado confirmado por Ale desde la aplicación` queda **sin marcar**. La
marca el botón de archivar de la aplicación, y sólo esa.
