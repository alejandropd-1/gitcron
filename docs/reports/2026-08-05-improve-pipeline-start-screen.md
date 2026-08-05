# La pantalla de inicio deja de contradecirse

**Change:** `improve-pipeline-start-screen` · **Fecha:** 2026-08-05 · **Tareas:** 17/18 (falta la validación visual de Ale)

## El defecto, que fue mío

`add-pipeline-start-screen` retiró la cadena de descartes que elegía un cambio por orden de lista. No
tocó `derivePipelineNextAction`, cuya rama 6 devuelve `no-active-change` —«No hay ningún cambio activo
en este repositorio»— cuando `selectedChange` es `null`. Esa condición sólo significaba «repositorio
vacío» mientras siempre hubiera un cambio elegido por descarte; al retirarlo pasó a significar «nadie
eligió», que es el estado normal de la pantalla de entrada.

Resultado observado por Ale: una pantalla que lista cuatro cambios en curso y debajo afirma que no hay
ninguno.

Se corrigió en la derivación y no en el render. `PipelineNextActionInput` suma `hasActiveChanges` —un
booleano, no la lista, para que la función no empiece a decidir sobre ella— y aparece el estado
`no-change-selected`, que ofrece los mismos dos caminos pero declara lo que corresponde. `no-active-change`
se conserva para el repositorio realmente sin cambios. Taparlo en el componente habría dejado la
afirmación falsa lista para reaparecer en cualquier otro consumidor.

## Lo demás

La guía subió al principio de la pantalla. Renderizada al final quedaba empujada fuera de vista por la
lista de cambios, y es la acción que la pantalla existe para ofrecer. Va primero siempre: una posición
que cambia según el contenido obliga a buscarla.

Cada cambio en curso se despliega para ver sus tareas pendientes, plegado por defecto y sin listar las
hechas. Saber que van cinco de seis no dice cuál es la sexta, que es con lo que se decide. Plegado
porque con cuatro cambios de veintiocho tareas esta pantalla sería una lista de tareas.

Los archivados se pueden ver todos. La barra lateral cortaba en `slice(0, 8)` sin control para ver el
resto, así que con treinta y siete archivados veintinueve no eran alcanzables desde ninguna parte. El
bloque de cerrados pasó de una cuenta a una lista desplegable completa, desde la que se abre cualquiera.
La barra lateral queda como está: es acceso rápido a lo reciente, y hacerla crecer con treinta y siete
elementos en una columna angosta dejaría dos lugares compitiendo por la misma lista.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **98 archivos / 710 tests, verde en dos corridas**. Lint
limpio. `openspec validate improve-pipeline-start-screen --strict` válido.

Vale registrar una corrida intermedia que **no** fue verde y no era regresión: tres fallos con
`EBUSY: resource busy or locked` al borrar directorios temporales en `git-hunks-ipc`, que es uno de los
archivos que el handoff nombra como flake conocido de los que crean repositorios Git reales. Antes de
eso hubo además una corrida que reportó 88 archivos en vez de 98 sin declarar fallos: fue parcial, y se
descartó repitiendo. Ninguna de las dos se tomó como resultado.

Los casos existentes de `pipeline-next-action.test.ts` pasaron sin editarse, que era la señal de que el
campo nuevo no cambió ningún otro estado.
