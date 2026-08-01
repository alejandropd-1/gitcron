## Context

El defecto tiene dos capas independientes y hay que tocar las dos. Arreglar una sola deja el síntoma
visible.

**Capa 1 — el normalizador.** `claude-normalizer.ts:91` deriva `success: record.is_error === false`.
El CLI de Claude devuelve `is_error: false`, exit 0 y `num_turns: 0` para un slash command
inexistente, con el motivo únicamente dentro de `result`. La condición es verdadera y el run se
declara exitoso.

**Capa 2 — el cierre de la sesión.** `runtime-session-hub.ts:290` inicializa
`outcome = 'completed'` y sólo lo baja a `'failed'` ante `runtime.process.failed` o una excepción
del stream. **Nunca lee `run.completed.success`.** Ese `outcome` es el que llega a
`RuntimeProjectionBuilder.close()`, que emite la entrada de actividad `session.completed`, traducida
en `lib/i18n.ts:301` como *"Sesión finalizada correctamente"*.

De ahí sale el efecto observado: aunque la capa 1 se corrija, la actividad mostraría
`run.completed · error` y a continuación *"Sesión finalizada correctamente"* en el mismo registro.

Un hallazgo lateral de la capa 2: hoy un run de Claude con `is_error: true` ya emite
`success: false`, y aun así la sesión cierra `completed` si el proceso no falla. O sea el defecto de
la capa 2 es más amplio que el caso que lo destapó, y este change lo cubre entero.

## Goals / Non-Goals

**Goals:**

- Que una sesión que el runtime rechazó no se registre ni se muestre como exitosa.
- Que el motivo real del rechazo quede en la evidencia, no sólo el hecho de que falló.
- Que el desenlace persistido de la sesión coincida con lo que dice su propia actividad.

**Non-Goals:**

- Hacer que `/opsx:apply` funcione con Claude. Requiere comandos en `.claude/commands/` y acceso a
  shell, que `claude-adapter.ts` excluye deliberadamente. Es decisión de Ale, y no se toca acá.
- Tocar `pipeline-next-action.ts`. Ya distingue `failed` de tarea estancada; con el desenlace
  correcto elige la rama correcta sin cambios.
- Limpiar filas ya existentes en `pipeline_runtime_session`. Borrar de la DB requiere autorización
  explícita de Ale, y las sesiones viejas son registro histórico de lo que se observó entonces.

## Decisions

**Detección acotada al prefijo, no heurística general.** La condición es `num_turns === 0` **y**
`result` que empieza con `Unknown command:`.

La alternativa considerada era tratar cualquier `num_turns: 0` como fracaso. Se descartó: un run
legítimo puede terminar en cero turnos (por ejemplo una interrupción inmediata) y declararlo fallido
sería el mismo error de hoy con el signo invertido — afirmar sin evidencia. El prefijo es el dato que
efectivamente distingue el rechazo, y viene textual del runtime.

El costo es conocido y aceptado: si Claude cambia el texto del rechazo, la detección deja de
disparar y el defecto vuelve. Queda registrado en Risks.

**El motivo viaja en dos eventos y se cita en uno.** `run.completed` lleva `success: false` y el
motivo; además se emite `runtime.error` con el mismo texto, para que quede en la evidencia
persistida del stream y no sólo en el evento que decide el desenlace.

Lo que se muestra sale del primero: `textForEvent` describe `runtime.error` por su `kind` — cae en
el `default` y no despliega el `message`—, mientras que `run.completed` ya arma una línea con
partes. El motivo se agrega ahí. La alternativa era hacer que `runtime.error` mostrara su mensaje,
y se descartó porque cambia también cómo se ve el error de Codex, que es otro caso y otro change.

**El hub observa `success`, sin caso especial por runtime.** `drain()` pasa a marcar `failed` ante
cualquier `run.completed` con `success: false`, venga del runtime que venga. La alternativa era
detectar el caso sólo para Claude en el hub, y se descartó porque pondría conocimiento de un runtime
específico en la capa que justamente existe para no tenerlo: el normalizador ya tradujo el dialecto,
el hub sólo lee el contrato.

Efecto sobre los demás adaptadores: `codex-normalizer.ts:27` emite `success: true` siempre, así que
no cambia. Ningún otro normalizador emite el evento hoy.

**La interrupción conserva precedencia.** `close()` ya recibe `record.stopRequested ? 'interrupted'
: outcome`. Se mantiene: una sesión que el usuario detuvo se describe por eso, no por el run que
alcanzó a fallar antes.

## Risks / Trade-offs

- **El texto del rechazo es un contrato de facto con el CLI de Claude.** Si cambia, la detección deja
  de disparar → la cobertura queda anclada al fixture sanitizado, y el fallo reaparecería como el
  defecto conocido de hoy, no como uno nuevo. Se documenta en el propio código, junto a la condición.
- **El cambio en `drain()` alcanza a todos los runtimes.** → Es intencional y está acotado por el
  hecho de que sólo dos normalizadores emiten el evento y uno de ellos siempre declara éxito. La
  suite del hub cubre ambas ramas.
- **Sesiones históricas ya persistidas siguen diciendo `completed`.** → No se reescriben: son el
  registro de lo que se observó en su momento. El handoff documenta cuáles fueron.
