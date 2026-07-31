# Design — Archivado explícito de un change

## Context

Hoy el archivado sólo aparece por la rama 9 de `derivePipelineNextAction`, y para llegar ahí hay
que atravesar dos ramas que casi siempre disparan antes:

- **Rama 4 (`session-retry`)**: si existe una proyección cuya `taskId` corresponde a una tarea sin
  tildar, devuelve reintento. Cubre `failed`/`interrupted` —donde tiene todo el sentido— y también
  el cierre "exitoso" sobre tarea pendiente.
- **Rama 7 (`task-pending`)**: si queda cualquier tarea sin tildar, devuelve "continuar con X".

La convención de `tasks.md` de este repositorio cierra cada change con una tarea de handoff humano
("frenar antes de staging y entregar a Ale"). Esa casilla no la tilda ningún runtime. Por lo tanto
la rama 7 dispara siempre, y la rama 9 es inalcanzable en la práctica. La rama 4 agrega un segundo
cerrojo permanente cuando además quedó una sesión persistida apuntando a esa tarea.

Verificado en la base real: la fila de `pipeline_runtime_session` con `outcome: 'completed'` y
`task_id: '6.6'` deja hoy a `fix-openspec-artifacts-selection` clavado en `session-retry`.

**Sobre el CLI:** `openspec archive` valida specs, no checkboxes de `tasks.md` (`--no-validate` y
`--skip-specs` son sus únicas relajaciones). Archivar con tareas sin tildar es una operación que la
herramienta permite, así que ofrecerla no es prometer algo que después falla.

## Goals / Non-Goals

**Goals**

- Que un change validado se pueda archivar desde la aplicación, siempre.
- Que archivar con pendientes muestre qué queda pendiente, no que lo esconda.
- Que una sesión persistida no bloquee de forma permanente ninguna salida.
- Que lo que se ejecuta al confirmar coincida con la acción que se confirmó.

**Non-Goals**

- No se relaja la condición de validación. Un change que no validó no se archiva.
- No se toca `derivePipelineNextAction` en su rol de sugerencia: sigue diciendo qué falta.
- No se agrega tildado de tareas desde la UI. Es otro problema y otro change.
- No se borran ni se caducan sesiones persistidas. Es una operación de datos, no de producto.
- No se toca la barra de pasos del ciclo de vida (change propio).

## Decisions

### 1. El archivado sale del panel de "siguiente paso" y pasa a ser un control propio

`derivePipelineNextAction` responde "¿qué conviene hacer ahora?". El archivado responde otra
pregunta: "¿qué me está permitido hacer?". Meterlo en la primera obliga a elegir entre mentir
(decir que archivar es el siguiente paso cuando quedan tareas) y bloquear (lo de hoy).

Se separan: la derivación sigue igual, y el archivado vive como control explícito junto al cambio
seleccionado, gobernado por una función pura nueva, `deriveArchiveAvailability(change, archived)`,
que devuelve disponibilidad, motivo y cantidad de tareas pendientes.

*Alternativa descartada:* agregar el archivado como acción secundaria en las ramas 4 y 7. En la
rama 4 el slot secundario ya lo ocupa "ver actividad", que es información que no se puede sacar;
habría que introducir un tercer slot y `PipelineNextAction` declara explícitamente que la
secundaria existe "sólo cuando hay una alternativa real, nunca relleno". Ensuciar ese contrato
para meter un control que no es un "siguiente paso" es peor que darle su lugar.

*Alternativa descartada:* detectar tareas de handoff humano por su texto y no contarlas. Es una
heurística sobre prosa libre: se rompe con cualquier redacción distinta y le miente al contador de
progreso. La aplicación no debe adivinar cuál casilla "no cuenta".

### 2. La disponibilidad se declara con su motivo, y el pendiente se muestra

`deriveArchiveAvailability` devuelve `{ available, reasonKey, pendingTasks }`. Con validación
aprobada y tareas pendientes, `available` es `true` y `pendingTasks` alimenta la etiqueta, que dice
cuántas quedan. Con validación no aprobada, `available` es `false` y `reasonKey` explica cuál de
los dos casos es (`failed` o `unknown`), en lugar de un botón gris sin explicación.

Es la misma regla de honestidad que ya rige en el resto del workspace: declarar el estado, no
simplificarlo hacia el lado cómodo.

### 3. El lanzador recibe su destino, no lo re-deriva

`PipelineRuntimeLauncher` hoy recibe `taskId={nextTask ? label(nextTask) : null}` y
`startLabelKey={nextTask ? apply : archive}`. Es decir, re-deriva de la evidencia en vez de seguir
la acción confirmada. Mientras archivar sólo existía sin tareas pendientes, coincidía por
casualidad. En cuanto se puede archivar con pendientes, deja de coincidir: la sesión de archivado
arrancaría atada a la tarea pendiente y quedaría registrada como un intento sobre ella —creando
exactamente la sesión fantasma que motivó este change—.

Se guarda el destino junto a la instrucción cuando se confirma la acción (`{ instruction, taskId }`)
y el lanzador lo usa tal cual. Es la misma razón por la que la instrucción ya se pasa desde la
derivación en lugar de recomponerse: lo mostrado y lo ejecutado no pueden divergir.

## Risks / Trade-offs

- **Se puede archivar un change con trabajo real sin terminar** → Es una decisión humana explícita,
  con la cantidad de pendientes a la vista y con la validación aprobada como condición previa. La
  alternativa vigente —no poder archivar nunca— es peor y ya causó dos bloqueos.
- **La etiqueta con pendientes agrega tres strings a i18n** → Se agregan completas en ES, EN y ZH,
  como exige la invariante 8.
- **Cambiar el origen de `taskId` del lanzador podría alterar el arranque normal de una tarea** →
  Se cubre con tests en los dos sentidos: archivado arranca sin tarea, continuar arranca con la
  tarea de la acción.

## Migration Plan

No hay migración. No cambia el esquema de SQLite ni el contrato IPC. Las sesiones persistidas hoy
siguen existiendo; lo que cambia es que ya no bloquean el archivado.

## Open Questions

Ninguna.
