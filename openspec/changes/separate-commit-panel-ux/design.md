## Context

El panel "Preparar el commit del cambio" vive hoy en `OpenSpecDashboard.tsx:768-824`, fuera del switch de pestañas y arriba del tab Trabajo. Usa la misma clase CSS (`archiveConfirm`) que el panel de archivado, con el que comparte contenedor. La lista `own` no tiene checkboxes (entra siempre), la lista `foreign` sí (estado `extraFiles`, línea 198). Tras preparar, `stageFiles` refresca `modifiedFiles` pero los archivos quedan en el array marcados `staged: true`, así que la lista no desaparece sola.

El sistema de pestañas es un `centerTab: 'work' | 'activity' | 'artifacts'` (línea 83) con tres botones (663-667) y un switch ternario (826-925). Los paneles de archivado (728-764) y commit (768-824) están fuera del switch, siempre arriba.

## Goals / Non-Goals

**Goals:**
- Separar el commit del trabajo/archivado en su propia pestaña.
- Permitir sumar todos los archivos ajenos a la vez.
- Que tras preparar la lista deje paso a un resumen con el conteo.
- Excluir los archivos ya staged de la derivación, para no ofrecerlos dos veces.

**Non-Goals:**
- No se mueve el archivado: sigue en la fila de acciones.
- No se toca `lib/change-commit-scope.ts`: el filtro de staged va en el dashboard para no acoplar la derivación pura al flag de Git.
- No se toca `StagingPanel` ni el store: confirmar sigue siendo de la vista principal.
- No es el rediseño grande fases → acciones (retirar `lifecycle()`/`LIFECYCLE_TOTAL`).

## Decisions

### Tab 'Commit' aparte, archivar se queda

`CenterTab` gana `'commit'`. Se agrega un cuarto botón de tab y una rama nueva en el switch. El bloque 768-824 se mueve adentro de esa rama y deja de renderizarse arriba siempre. El panel de archivado (728-764) **no se mueve**: sigue fuera del switch, en la fila de acciones. La separación visual la da el tab, no un reordenamiento del archivado.

**Alternativa descartada:** mover también el archivado adentro del tab Commit. Mezclaría dos decisiones que conviene tener separadas (preparar el commit de un cambio vs. archivarlo). El QA pidió justamente separar commit de archivar.

### Select-all reutiliza `extraFiles`

Un control al lado del título "No se le pueden atribuir (N)" alterna entre sumar todos los `foreign` a `extraFiles` y vaciarlo. La lógica: si `foreign.every(f => extraFiles.includes(f))` y `foreign.length > 0` → vaciar; si no → `[...foreign]`. Reutiliza el estado existente; no agrega otro. Dos textos i18n (`selectAll`/`deselectAll`) según el estado actual.

**Alternativa descartada:** un estado `allSelected` aparte que el botón toggle. Duplica la fuente de verdad: `extraFiles` ya sabe cuántos están seleccionados. Derivar el label del propio `extraFiles` es menos propenso a desincronía.

### Filtrar staged en el dashboard, no en la derivación

`OpenSpecDashboard.tsx:325-331` cambia el input de `deriveChangeCommitScope`: en vez de `modifiedFiles.map(f => f.path)`, pasa `modifiedFiles.filter(f => !f.staged).map(f => f.path)`. Así, al preparar, el refresh marca staged y la lista se vacía sola. El filtro vive en el dashboard porque `change-commit-scope.ts` es una derivación pura sobre paths, y acoplarla al flag `staged` (que viene de Git) le agrega una dependencia semántica que hoy no tiene.

**Alternativa descartada:** filtrar dentro de `deriveChangeCommitScope`. La haría depender de `GitFile` en vez de `string[]`, y rompería sus 14 tests que pasan paths crudos. El dashboard ya sabe qué significa `staged`; la derivación, no.

### Conteo con `lastPreparedCount`

Nuevo estado `lastPreparedCount: number | null`. `prepareCommit` lo setea a `files.length` tras éxito. Cuando `commitScope.own.length === 0 && commitScope.foreign.length === 0 && lastPreparedCount !== null`, el tab Commit muestra el resumen "N archivos enviados a commit" en vez de la lista. El estado se resetea a `null` cuando cambia el change seleccionado o cuando vuelven a aparecer archivos no-staged (es decir, cuando la lista deja de estar vacía por haber nuevos cambios). Esto cubre tanto el "ya preparé todo" como el "preparé y después modifiqué más".

**Alternativa descartada:** sólo filtrar staged, sin conteo. La lista quedaría vacía sin decir por qué — el QA pidió explícitamente que diga "cantidad de archivos enviados a commit". El conteo resuelve la ambigüedad entre "no hay nada que preparar" y "preparaste todo".

## Risks / Trade-offs

- **[Riesgo] El `extraFiles` no se limpia al preparar.** Tras preparar, los archivos quedan en `extraFiles` aunque ya estén staged. → **Mitigación:** al filtrar staged en el input, los `foreign` stagingados dejan de aparecer en la lista, así que `extraFiles` puede tener entries huérfanas pero no se ofrecen para preparar dos veces. Se limpian naturalmente al cambiar de change (no es necesario, pero podría agregarse un reset en `selectChange` si se ve ruido).
- **[Riesgo] El conteo `lastPreparedCount` se invalida mal.** → **Mitigación:** se resetea en dos casos claros (cambio de change, lista no-vacía de nuevo). Si se quiere ser más fino, se puede comparar contra los staged reales, pero eso acopla el render a un cálculo extra. Empezamos con los dos resets.
- **[Riesgo] Un cuarto botón de tab aprieta la fila en ventanas angostas.** → **Mitigación:** el `tabsRow` ya hace `flex-wrap: wrap` (CSS 427), así que en ventanas angostas los tabs pasan a una segunda línea sin romperse. No se necesita CSS nuevo.

## Migration Plan

Sin migración: es un cambio de UI. La derivación y el store no cambian de contrato. Verificación: tests extendidos del dashboard + `openspec validate separate-commit-panel-ux --strict`.

## Open Questions

Ninguna. El rediseño grande (fases → acciones) es otro change.
