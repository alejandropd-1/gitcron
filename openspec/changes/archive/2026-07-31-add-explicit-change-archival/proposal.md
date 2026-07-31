## Why

Un change completo no se puede archivar desde la aplicación. No es un caso raro: **es lo que pasa
con todos**, y es una contradicción del método consigo mismo.

La convención de `tasks.md` de este repositorio termina cada change con una tarea de handoff
humano —"frenar antes de staging y entregar a Ale"—. Ningún runtime la va a tildar, por
definición. Y `derivePipelineNextAction` sólo ofrece archivar cuando **ninguna** tarea queda
pendiente, así que esa última casilla abierta bloquea el archivo para siempre.

Encima se suma un segundo cerrojo: una sesión persistida que cerró apuntando a esa tarea deja el
estado clavado en `session-retry`, que tampoco tiene salida hacia el archivo. Es el caso que hoy
tiene trabado a `fix-openspec-artifacts-selection` y que ya se había visto en
`retire-f03-runtime-gate`: no fue mala suerte dos veces, es el comportamiento normal del sistema.

Archivar es una decisión humana. La aplicación tiene que ofrecerla y decir qué queda pendiente,
no esconderla hasta que se cumpla una condición que su propia convención de trabajo impide.

## What Changes

- Se agrega un control explícito de archivado sobre el cambio seleccionado, disponible siempre que
  la validación esté aprobada, **independientemente de tareas pendientes o sesiones persistidas**.
- El control declara qué queda pendiente en lugar de ocultarlo: con tareas sin tildar informa
  cuántas son, para que archivar sea una decisión tomada con el dato a la vista.
- Con validación no aprobada el control SIGUE deshabilitado, y declara el motivo. Esa parte de la
  regla vigente no se relaja: no se archiva algo que no validó.
- El lanzador de runtime arranca con el destino de la acción que lo abrió, en lugar de volver a
  derivarlo de la próxima tarea pendiente. Hoy archivar con tareas pendientes arrancaría una
  sesión atada a una tarea, que es justo lo que genera la sesión fantasma del párrafo anterior.
- La derivación del siguiente paso NO se toca: sigue diciendo honestamente qué falta. Lo que se
  agrega es una salida, no una mentira más optimista.

## Ampliación de alcance (2026-07-31, tras QA de Ale)

El QA visual destapó que **archivar no archivaba**, y la causa no era el control nuevo.

Al confirmar el archivado, la sesión de Claude terminaba en 7 ms declarando éxito. Verificado
ejecutando el CLI directamente:

```json
{"subtype":"success","is_error":false,"duration_ms":18,"duration_api_ms":0,"num_turns":0,
 "result":"Unknown command: /opsx:archive","total_cost_usd":0}
```

`/opsx:archive` no existe para Claude: el repo define esos comandos en `.agent/workflows/` y
`.opencode/commands/`, y Claude Code los lee de `.claude/commands/`, que no los tiene. Y aunque
existieran, archivar requiere correr `openspec archive`, es decir una shell, y el adaptador de
Claude excluye `Bash` deliberadamente y con buen motivo.

Sin esto, este change entrega un botón que promete algo que no ocurre. Se amplía en lugar de abrirse
otro change porque el trabajo está incompleto sin ello, no porque sea una idea nueva.

**Lo que se agrega:** archivar se ejecuta desde el proceso principal invocando el CLI de OpenSpec,
con confirmación humana explícita y sin sesión de agente. Archivar es una operación determinística y
acotada; no hay razón para que la decida un modelo, y así no se toca la exclusión de `Bash`.

**Lo que NO se agrega:** los comandos `opsx` para Claude ni una shell para los runtimes. Eso afecta
también a `apply` y es una decisión de seguridad propia, con su propio change.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: el archivado deja de depender de que no queden tareas pendientes y
  pasa a ser un control explícito con la validación como única condición; además, el arranque de
  un runtime respeta el destino de la acción que lo abrió.

## Impact

- `components/pipeline/pipeline-next-action.ts` — nueva función pura de disponibilidad de archivo.
- `components/pipeline/OpenSpecDashboard.tsx` — control de archivado y destino del lanzador.
- `lib/i18n.ts` — strings nuevas en ES, EN y ZH.
- Tests de derivación y de dashboard.
- Sin dependencias nuevas. Sin cambios en Electron main, IPC ni SQLite.
- Fuera de alcance: la barra de pasos (change propio) y el borrado de sesiones persistidas ya
  existentes, que es una operación de datos y no de producto.
