# Pulido del workspace OpenSpec

Fecha: 2026-07-29
Rama: `openspec/polish-workspace` (creada desde `main` en `b2672c5`)
Change: `polish-openspec-workspace` · `openspec validate --strict` válido · 25/27 tareas

## 1. Leer los artefactos dentro de la app

Era el punto que más se notaba: el panel izquierdo listaba `proposal.md`, `design.md`, `specs/` y `tasks.md` con su estado, pero el lector abría `proposal.md`, le extraía el intent para el encabezado y **descartaba el contenido**. Sólo quedaba un booleano. La pestaña Propuesta de `PipelineDetails` nunca recibía nada, así que para leer la propia propuesta había que salir de GitCron.

Ahora `OpenSpecChangeEvidence` transporta el markdown de los tres artefactos y el panel los muestra en pestañas con `SafeMarkdown`. No se agregó acceso a disco: el contenido ya se leía, sólo se dejó de tirar.

**Se transporta sólo el cambio seleccionado.** El markdown de todos los cambios activos haría crecer el snapshot sin que nadie lo mire; los demás conservan la señal de existencia.

**No se expuso un IPC de lectura de archivos al renderer**, que era la alternativa. Habría multiplicado la superficie a validar contra escapes de path cuando el lector ya resuelve eso con contención al repositorio.

## 2. Narrativa coalescida

El adaptador pasa `--include-partial-messages`, así que Claude emite el texto en deltas y cada uno se guardaba como una entrada. Un mensaje aparecía partido en cinco fragmentos que empezaban a mitad de palabra.

La acumulación se hizo en `runtime-projection`, no en el adaptador: éste emite la observación cruda y coalescer ahí perdería fidelidad y rompería los fixtures auditados. Los deltas consecutivos del mismo agente se concatenan; cualquier evento de otra clase o un agente distinto cierra la corriente, así el orden observado se conserva.

Como efecto lateral se cerró un agujero: el saneo ahora corre sobre el texto unido, así que un secreto partido entre dos fragmentos tampoco se escapa.

## 3. Campos sin consumidor

`stations` y `now` no los usaba ningún componente: quedaron del encuadre anterior. Se retiraron del snapshot, de `pipeline-domain` y del adaptador, junto con 51 líneas de i18n en los tres idiomas.

`pipeline.now.task` **se conservó**: `LazyDiffViewer` la usa como etiqueta de columna.

También salió `snapshot.proposal`, que quedó sin consumidor al reemplazarlo `artifacts`, y con él los tipos `PipelineProposal`, `AuditorFinding` y `GateHistoryEntry`, huérfanos desde el change anterior.

## 4. Mecanismo de cursores

`PipelineCursorStore`, sus métodos en `pipeline-repository` y la tabla `pipeline_cursor` registraban el avance de lectura de los JSONL del kit retirado. Sin esas fuentes no tenían nada que registrar.

La tabla se elimina en una **migración `version: 6`** con `DROP TABLE IF EXISTS`. No se editó la migración 4: una migración ya distribuida describe el estado de bases que existen, y cambiarla las dejaría en una versión que ningún paso reproduce. Una instalación limpia crea la tabla en la 4 y la elimina en la 6, que es más ruidoso pero correcto.

## 5. Specs coherentes

`pipeline-event-contract` arrastraba del change anterior dos requisitos que el código ya no cumplía: declaraba que Pipeline ingiere gates, delegaciones y alturas visuales, y que emite `gate.changed`. Se retiraron y se agregó la cláusula de narrativa por mensaje.

Una spec que afirma lo que el código no hace es peor que no tenerla.

## 6. Un error propio, corregido

Al retirar los tipos huérfanos, el script se llevó también `hasUsableCostCoverage`, que estaba pegada a `PipelineProposal`: la lógica retrocedía al comentario JSDoc previo y abarcó de más. `tsc` lo marcó de inmediato y la función se restauró desde git con su documentación intacta.

Queda anotado porque es la segunda vez en dos tandas que un borrado por patrón se lleva algo adyacente. Los borrados por bloque conviene verificarlos contra `git diff` antes de seguir, no sólo contra el compilador.

## 7. Validación

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errores |
| `pnpm test` | 76 archivos / **542 tests**, todos verdes |
| `pnpm exec eslint` sobre lo tocado | limpio |
| `openspec validate --strict` | válido |

### Conteo de pruebas: 541 → 542

| Origen | Delta |
|---|---|
| `pipeline-artifact-content.test.ts` (nuevo) | +3 |
| Coalescencia de narrativa en `runtime-projection.test.ts` | +4 |
| Migración que elimina la tabla de cursores en `schema.test.ts` | +1 |
| Tests de `now` y estaciones retirados en `pipeline-adapter.test.ts` | −3 |
| Estaciones y `now` en `pipeline-domain.test.ts` | −1 |
| Persistencia de cursores en `pipeline-repository.test.ts` | −1 |

Ningún archivo se borró entero. Donde un test cubría a la vez lo retirado y lo vivo se recortó, y la honestidad del costo local —que vivía en `now`— se mudó a `economy`, que es donde `costBasis` corresponde.

**El lint completo del repositorio sigue con la deuda anterior** en `ChronometricGraph.tsx` (accesos a refs durante el render). No se tocó: es previo y su geometría requiere validación visual explícita de Ale.

## 8. Estado de entrega

Sin `git add`, commit, push ni merge.

**QA visual pendiente.** El change toca el proceso main, así que requiere reiniciar Electron. Lo que hay que confirmar:

1. Que detrás de `View diff` aparezcan cuatro pestañas —Propuesta, Diseño, Tareas y Archivos— y que las tres primeras muestren el markdown real del change seleccionado.
2. Que un change sin `design.md` declare que no existe, en vez de mostrar un panel vacío.
3. Que en Actividad un mensaje del agente aparezca **entero en una sola entrada**, ya no partido en fragmentos.
4. Que el workspace siga renderizando: se retiraron campos del snapshot.
