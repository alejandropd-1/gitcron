# Reporte — add-explicit-change-archival

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `add-explicit-change-archival`

## Qué problema resolvía

Un change completo no se podía archivar desde la aplicación. No era un caso raro: **era lo que
pasaba con todos**.

La convención de `tasks.md` de este repositorio cierra cada change con una tarea de handoff humano
("frenar antes de staging y entregar a Ale"). Ningún runtime la tilda, por definición. Y
`derivePipelineNextAction` sólo llegaba a `ready-to-archive` (rama 9) cuando **ninguna** tarea
quedaba pendiente, así que la rama 7 (`task-pending`) disparaba siempre y la 9 era inalcanzable.

Encima, una sesión persistida que hubiera cerrado apuntando a esa tarea deja el estado clavado en
`session-retry` (rama 4), que tampoco tenía salida hacia el archivo. Verificado en la base real:
la fila de `pipeline_runtime_session` con `outcome: 'completed'` y `task_id: '6.6'` es la que hoy
tiene trabado a `fix-openspec-artifacts-selection`, y el mismo patrón ya se había visto en
`retire-f03-runtime-gate`. No fue mala suerte dos veces: era el comportamiento normal del sistema.

**Segundo defecto, encontrado al implementar:** `PipelineRuntimeLauncher` recibía
`taskId={nextTask ? label(nextTask) : null}` y `startLabelKey={nextTask ? apply : archive}`, es
decir re-derivaba su destino de la evidencia en lugar de seguir la acción confirmada. Mientras
archivar sólo existía sin tareas pendientes, coincidía por casualidad. Habilitar el archivado con
pendientes lo habría roto: la sesión de archivado habría arrancado atada a la tarea pendiente y se
habría registrado como un intento sobre ella, **generando exactamente la sesión fantasma que este
change viene a destrabar**.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `components/pipeline/pipeline-next-action.ts` | Nueva función pura `deriveArchiveAvailability(change, archived)` → `{ available, reasonKey, pendingTasks }`. |
| `components/pipeline/OpenSpecDashboard.tsx` | Control de archivado explícito en la fila de acciones; el destino del lanzador (`taskId`) viaja con la instrucción en lugar de re-derivarse. |
| `components/pipeline/OpenSpecDashboard.module.css` | La fila de pestañas + acciones envuelve en vez de solaparse (ver "Regresión visual" más abajo). |
| `lib/i18n.ts` | 5 strings nuevas × 3 idiomas (ES, EN, ZH). |
| `electron/pipeline/openspec-cli.ts` | `archiveOpenSpecChangeWithCli`: archiva por CLI y devuelve el motivo real del fallo (ampliación). |
| `electron/ipc/pipeline-archive.ts` | Nuevo. Canal `pipeline:archive-change`, separado del módulo read-only porque escribe (ampliación). |
| `electron/main.ts`, `electron/preload.ts`, `types/electron.d.ts` | Registro y exposición del canal (ampliación). |
| `components/pipeline/__tests__/pipeline-next-action.test.ts` | +6 casos de la función pura, más las aserciones de instrucción actualizadas al comando real. |
| `components/pipeline/__tests__/pipeline-change-archival.test.tsx` | Nuevo. +8 casos de DOM: disponibilidad, confirmación previa, ejecución por CLI, error real y bloqueo por fixture. |
| `electron/__tests__/pipeline-archive-ipc.test.ts` | Nuevo. +5 casos del canal: ruta canónica, motivo del CLI y rechazo de slugs peligrosos. |

**Reglas de decisión que quedaron:**

- Validación aprobada es la **única** condición del archivado.
- Tareas pendientes **no** bloquean, pero se declaran: la etiqueta dice cuántas quedan.
- Una sesión persistida **no** bloquea: es historia, no un permiso.
- Sin validación aprobada el control sigue deshabilitado y dice por qué (`failed` vs `unknown`).
- Un cambio ya archivado no ofrece el control.

## Qué NO se tocó

- `derivePipelineNextAction` conserva su comportamiento: sigue diciendo honestamente qué falta. Lo
  que se agregó es una salida, no una sugerencia más optimista.
- La barra de pasos del ciclo de vida (`lifecycle()`), que sigue prendiendo `explore` por existir
  la carpeta del change. Es un change propio.
- No se agregó tildado de tareas desde la UI.
- No se borran ni caducan sesiones persistidas: es una operación de datos, no de producto.
- Electron main, IPC, esquema de SQLite: intactos. Sin dependencias nuevas.

## Alternativas descartadas

- **Archivado como acción secundaria de las ramas 4 y 7.** En la rama 4 el slot secundario ya lo
  ocupa "ver actividad", que es información que no se puede sacar. Habría hecho falta un tercer
  slot, y `PipelineNextAction` declara que la secundaria existe "sólo cuando hay una alternativa
  real, nunca relleno". Archivar no es un "siguiente paso": es un permiso. Va aparte.
- **Detectar tareas de handoff humano por su texto y no contarlas.** Heurística sobre prosa libre:
  se rompe con cualquier redacción distinta y le miente al contador de progreso.

## Regresión visual introducida y corregida

La primera versión del control agregó un **cuarto** botón a `.tabsRow` y desbordó el renglón. Con
los dos paneles laterales abiertos, `.tabs` tenía `min-width: 0` y se encogía por debajo de su
contenido; sus botones desbordaban su caja y quedaban pintados debajo de las acciones. Efecto en
pantalla: texto duplicado ("Ver últimaactividad") y —lo importante— **clicks que aterrizaban en la
pestaña de abajo en vez del botón de arriba**, así que archivar no llegaba a dispararse.

Corregido en la CSS, no en el recuento de botones: `.tabsRow` ahora envuelve, `.tabs` no se encoge
por debajo de su contenido y `.actions` ocupa el resto del renglón alineado a la derecha. A
cualquier ancho, las acciones bajan a su propia línea antes que solaparse. `.actions` ya traía
`flex-wrap`, así que los botones también envuelven entre sí si el panel es muy angosto.

Detectado por QA visual de Ale, no por los tests: es un defecto de layout y ninguna prueba de DOM
sin motor de render lo habría visto. Queda anotado como límite real de la cobertura.

## Ampliación de alcance: archivar no archivaba

El QA visual destapó un defecto más profundo que el control nuevo. Al confirmar el archivado, la
sesión de Claude cerraba en 7 ms declarando éxito. Verificado ejecutando el CLI directamente:

```json
{"subtype":"success","is_error":false,"duration_ms":18,"duration_api_ms":0,"num_turns":0,
 "result":"Unknown command: /opsx:archive","total_cost_usd":0}
```

Dos bloqueos independientes:

1. **`/opsx:archive` no existe para Claude.** El repo define esos comandos en `.agent/workflows/`
   y `.opencode/commands/`; Claude Code los lee de `.claude/commands/`, que sólo tiene
   `settings.local.json` y `worktrees/`.
2. **Aunque existiera, no podría correrlo.** Archivar requiere `openspec archive`, es decir shell,
   y el adaptador de Claude excluye `Bash` deliberadamente y con buen motivo.

Y lo peor: Claude devuelve `is_error: false` y exit 0 para un comando inexistente, así que el
adaptador lo traducía a sesión `completed` y la app mostraba "Sesión finalizada correctamente".

**Esto reescribe el diagnóstico de la sesión fantasma.** La sesión de la tarea 6.6 corrió en 13 ms:
el mismo caso con `/opsx:apply`. La detección de `stalled` no era el defecto — estaba diciendo la
verdad. Lo que nunca funcionó fueron las sesiones de Claude.

**Solución adoptada:** archivar se ejecuta desde el proceso principal invocando el CLI, con
confirmación humana previa y sin sesión de agente. Archivar es determinístico y acotado; no
necesita un modelo que lo decida, y así no se toca la exclusión de `Bash`.

- `archiveOpenSpecChangeWithCli` en `openspec-cli.ts`, argumentos fijos, slug validado.
- Canal `pipeline:archive-change` en su **propio módulo** (`ipc/pipeline-archive.ts`): el módulo de
  snapshot declara por contrato que no acepta operaciones de escritura, y esto escribe.
- El control muestra el comando exacto (`openspec archive <slug> --yes`) y no ejecuta hasta
  confirmarlo. El éxito se lee del CLI; un fallo muestra el motivo real y el cambio sigue activo.
- `composeArchiveInstruction` devuelve el comando real en lugar del slash command inexistente.

**Segunda pasada de QA:** el archivado funcionó —`fix-openspec-artifacts-selection` quedó en
`openspec/changes/archive/2026-07-31-...` y sus dos requirements se consolidaron en
`pipeline-repo-evidence`, +22 líneas— pero la app no lo declaró. El panel se cerraba, el cambio
salía de la lista activa y la selección saltaba a otro: desde la vista, el éxito era
indistinguible de que no hubiera pasado nada. Se agrega un aviso explícito que nombra el cambio
archivado y vive fuera del bloque del cambio seleccionado, porque si viviera adentro se iría junto
con el cambio que acaba de archivarse.

**Descartado explícitamente:** crear `.claude/commands/opsx/*.md` y habilitar `Bash`. Arreglaría
también `apply`, pero abre la superficie que el adaptador cerró a propósito. Es decisión de Ale y
tiene su propio change.

## Tercera pasada de QA: que la app avise lo que hace

Dos observaciones de Ale, con una causa común.

**"El éxito de que archive es que hace una recarga de la página."** Literal, no una sensación:
`onRefresh` bumpea el token de recarga, cambia la clave de carga y `PipelineWorkspace` caía al
estado `loading`, que **desmonta el dashboard entero**. Con él se iba todo estado efímero —incluido
el aviso de archivado que se había agregado en la pasada anterior—, así que moría antes de poder
leerse. Corregido: con un snapshot vigente se revalida conservando lo que está en pantalla y se
declara con una banda fina superior; el estado de carga queda sólo para cuando no hay nada que
mostrar. Beneficia a todo refresco, no sólo al archivado.

**"Si scrolleo la lista de tareas y le doy a Archivar, no me doy cuenta de que se abrió."** La
confirmación vivía dentro del área con scroll. Se movió **fuera**, pegada a la fila de acciones,
que ya es fija por el mismo motivo ("así el CTA no se va con el scroll"). Ahora aparece a la vista
cualquiera sea la posición de scroll. Se descartó el modal flotante: contradice la estética ya
fijada, donde incluso el conflict resolver vive "dentro del cuerpo central, no modal flotante".

Se agregó además spinner durante el archivado, y dos requirements nuevos al spec que fijan ambas
conductas.

## Divergencia anotada, no corregida acá

`CHANGE_ID_PATTERN` en `openspec-cli.ts` es `/^[a-z0-9][a-z0-9-]*$/`, y su comentario afirma ser el
"mismo contrato que acepta `openspec new change`". No lo es: admite `a--b` y `trailing-`, que el CLI
rechaza al crear. El patrón correcto ya existe en `pipeline-next-action.ts` como
`CHANGE_SLUG_PATTERN`.

Es inocuo para seguridad —lo que importa ahí es que no pasen separadores de comando, comillas,
espacios ni traversal, y eso se cumple y quedó cubierto por tests— y para el archivado también: un
slug así no existe en disco y el CLI falla con su motivo. **No se corrige en este change** porque
`CHANGE_ID_PATTERN` también gobierna la validación y ajustarlo tiene alcance propio. Queda como
follow-up chico.

## Resultado real de las comprobaciones

Corridas, no declaradas:

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** (exit 0, sin salida) |
| `pnpm test` | **579 passed / 80 archivos**, 0 failed |
| `pnpm exec eslint` sobre los 5 archivos tocados | **limpio** (exit 0) |
| `openspec validate add-explicit-change-archival --strict` | **válido** |

Antes de esta tanda la suite daba 557. Los 22 nuevos son los de este change, incluidas ambas ampliaciones.

## Efecto sobre el bloqueo actual

Con este change, `fix-openspec-artifacts-selection` se puede archivar desde la aplicación sin
borrar nada de la base: su validación pasa, y ni la tarea 6.6 sin tildar ni la sesión persistida
sobre ella siguen bloqueando el control. El borrado de esa fila deja de ser necesario para
destrabar el caso; sigue siendo opcional si se la quiere sacar del historial.
