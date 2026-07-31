# Reporte — fix-pipeline-refresh-cost

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `fix-pipeline-refresh-cost`

## Qué problema resolvía

Con la solapa Pipeline abierta, guardar cualquier archivo del repositorio disparaba una lectura
completa de evidencia en el proceso main. Esa lectura invocaba `openspec validate --strict` como
subproceso **por cada change activo, en secuencia**, aunque ninguna vista consuma la validación
de un change que no sea el seleccionado.

Medición previa en este repositorio (Windows, `cmd.exe → node → openspec` por invocación):

| Escenario | Medido |
|---|---|
| Un `openspec validate --strict` | 2,4 s (frío) · ~1,5 s (cálido) |
| Los 4 changes activos, en secuencia | 8,84 s |
| Los 5 changes activos, en secuencia | 7,45 s (cálido) |

A eso se sumaban dos problemas de concurrencia y correctitud:

- Sin control de concurrencia: con debounce de watcher de 250 ms y lecturas de segundos, guardados
  seguidos apilaban lecturas superpuestas, cada una con su tanda de subprocesos.
- El refresco disparado por el watcher llamaba a `refresh(repoPath)` sin `selectedChangeId`, así
  que el snapshot emitido revertía a la selección automática por branch, pisando en cada guardado
  la selección manual que introdujo `fix-openspec-artifacts-selection`.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `electron/pipeline/repo-evidence-reader.ts` | La validación por CLI corre sólo para el change seleccionado (misma guarda que ya usaba `artifacts`). Los no seleccionados quedan en `validation: 'unknown'` sin subproceso. |
| `electron/ipc/pipeline.ts` | Coalescing de lecturas en vuelo por `repoPath` + selección; la suscripción recuerda la última selección informada; el notificador del watcher la usa y agenda una única relectura si llegan notificaciones durante un vuelo. |
| `electron/__tests__/pipeline-ipc.test.ts` | +5 casos: coalescing, no compartir entre selecciones distintas, selección conservada en el push del watcher, un solo rerun por vuelo, limpieza de la selección recordada al desuscribirse. |
| `electron/__tests__/pipeline-refresh-cost.test.ts` | Nuevo. +3 casos sobre el alcance de la validación. |

## Qué NO se tocó

- La barra de pasos (`lifecycle()` en `OpenSpecDashboard.tsx`), que sigue prendiendo `explore` por
  existir la carpeta del change y `propose` por existir `proposal.md`. Es un change propio.
- El botón de archivado y el trato de sesiones persistidas. Change propio (ver más abajo).
- El contrato IPC: `pipeline:get-snapshot`, `pipeline:subscribe` y `pipeline:unsubscribe`
  conservan firma y forma de respuesta.
- El renderer, el esquema de SQLite, i18n, y los tres changes de runtimes pendientes.
- No se agregaron dependencias.

## Resultado real de las comprobaciones

Corridas, no declaradas:

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** (exit 0, sin salida) |
| `pnpm test` | **557 passed / 77 archivos**, 0 failed |
| `pnpm exec eslint` sobre los 4 archivos tocados | **limpio** (exit 0) |
| `openspec validate fix-pipeline-refresh-cost --strict` | **válido** |

Antes de esta tanda la suite daba 549. Los 8 nuevos son los de este change (3 del reader + 5 de IPC).

**Nota sobre la suite:** en la corrida de auditoría previa, `lib/__tests__/git-hunks-ipc.test.ts`
falló con `EBUSY: resource busy or locked, rmdir` en su `afterEach`. Corrido aislado pasa (6/6) y
en la corrida de cierre pasó dentro de la suite completa. Es un flake de Windows —`fs.rmSync` del
temp dir compitiendo con un handle de git todavía abierto—, no una regresión de este change. Queda
anotado: la suite no es determinística en ese punto y merece su propio arreglo.

## Medición posterior

`RepoEvidenceReader.read()` contra este repositorio, con **5 changes activos**:

```
read() = 1597 ms | activos=5 | seleccionado=fix-openspec-artifacts-selection | validados=1
```

Comparado contra los 7,45 s que cuestan las 5 validaciones secuenciales del camino anterior, es
**~4,7× más rápido**. Más importante que el factor: el costo dejó de escalar con la cantidad de
changes activos. Antes cada change nuevo sumaba ~1,5–2,4 s a **cada** guardado de archivo; ahora
la validación es una sola, constante.

## Pendiente conocido, fuera de este change

La sesión persistida en `pipeline_runtime_session` con `outcome: 'completed'` apuntando a la tarea
`6.6` de `fix-openspec-artifacts-selection` deja ese change trabado: `derivePipelineNextAction`
la lee como `stalled` (la tarea no está tildada) y devuelve `session-retry` de forma permanente,
sin llegar nunca a `ready-to-archive`. La tarea 6.6 es de handoff humano y ningún runtime la va a
tildar.

Borrar la fila destraba el caso puntual, pero **no** el defecto: cualquier sesión que cierre sobre
una tarea que no se tilda vuelve a producirlo. El arreglo real es el change de archivado explícito,
que debe contemplar que un change completo se pueda archivar aunque existan sesiones persistidas.
