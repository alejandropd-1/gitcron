## Context

La preparación del commit vive hoy dentro del cambio seleccionado. `deriveChangeCommitScope`
(`lib/change-commit-scope.ts:132`) recibe un `changeId` de referencia y reparte lo modificado entre
`own` —lo que le pertenece— y `foreign` —todo lo demás—, y el panel que la consume se renderiza
dentro de la rama `selectedChange ? (…)` de `OpenSpecDashboard.tsx:723`. El resultado es que el
alcance de un commit depende de qué cambio esté seleccionado en una lista lateral, cuando el commit
en realidad describe el estado del árbol.

La restricción que ordena todo lo demás es que preparar y confirmar son acciones distintas y
permanecen separadas: preparar es reversible, confirmar queda en la historia. Ese límite ya está
verificado por `components/pipeline/__tests__/pipeline-prepare-commit.test.tsx:173` («no llama a
ninguna API que confirme»), y no cambia de nivel junto con lo demás: sigue valiendo igual.

La segunda restricción es que la superficie tiene que funcionar cuando no hay ningún cambio activo.
Es el caso que motiva el trabajo —restos de archivado sobre un repositorio sin changes— y también el
caso normal de un repositorio que todavía no archivó nada.

## Goals / Non-Goals

**Goals:**

Que todo lo modificado del repositorio se pueda ver y preparar desde una sola superficie, agrupado
por procedencia, sin depender de qué cambio esté seleccionado ni de que haya alguno. Que el mensaje
sugerido describa el conjunto que efectivamente se envía. Que la derivación siga siendo pura y
probable con tablas de entrada y salida, como hoy.

**Non-Goals:**

Confirmar el commit desde esta superficie: sigue siendo del flujo de commit existente, y la prueba
que lo verifica se mantiene. Tampoco entra la pantalla de inicio de Pipeline, ni el reemplazo del
ciclo de vida fijo por el grafo de OpenSpec, ni los dos defectos de UI pendientes. No se toca la
lógica de Git: se sigue usando `stageFiles` con la lista explícita de archivos, nunca un directorio.

## Decisions

**La superficie es un panel central propio, no un desplegable ni una sección fija del encabezado.**
El bloque de estado del árbol (`styles.repoHealth`, línea 595) se vuelve accionable y abre un panel
que ocupa el centro, al mismo nivel jerárquico que un cambio activo o un archivado. Se descartó el
desplegable anclado al encabezado porque con veinte archivos modificados —el caso que motivó subir
las acciones arriba en el change anterior— queda apretado o necesita un scroll propio dentro de un
flotante, que es peor que el scroll de un panel. Se descartó la sección fija en el encabezado porque
le come alto permanente al panel incluso cuando no hay nada que confirmar, lo que contradice la
estética densa de la invariante 11. El panel central cuesta más código que las dos alternativas; se
elige igual porque es el único que se sostiene con el repositorio vacío de cambios, que es
justamente el estado que hoy no tiene puerta de entrada.

**La derivación pierde la categoría privilegiada y agrupa por procedencia.** `deriveChangeCommitScope`
deja de recibir un `changeId` de referencia. La función pasa a clasificar cada archivo modificado en
un grupo —artefactos del cambio `<id>`, restos de archivado, código sin atribuir— y devuelve los
grupos, sin `own` ni `foreign`. Se descartó conservar `own` pasando el cambio seleccionado como
referencia opcional: habría preservado la compatibilidad de la firma, pero deja entrar de nuevo la
selección de la lista lateral en el cálculo del alcance, que es exactamente el defecto que este
cambio corrige. Se descartó también agrupar en el componente y dejar la función como está, porque
la clasificación es la parte que conviene probar con tablas y no dentro de un render.

**Nada entra por defecto: todo se elige.** Hoy `own` viaja preparado sin tildar y `foreign` requiere
elección. Sin cambio de referencia no hay criterio para privilegiar un grupo, así que la elección es
explícita para todos, con el control de «sumar todos» operando por grupo además de sobre el total.
Se descartó preseleccionar el grupo del cambio que estuviera seleccionado en la lista lateral: sería
la misma dependencia de la selección disfrazada de conveniencia, y produce un commit distinto según
dónde estuviera el foco, que es el modo de fallo silencioso que la propuesta describe.

**El mensaje se deriva del conjunto elegido, no del cambio.** `suggestCommitMessage` deja de recibir
un `changeId` y recibe la selección. Cuando todos los archivos elegidos pertenecen a un solo cambio,
la descripción sigue siendo ese identificador, que es lo más informativo disponible. Cuando abarcan
más de uno, o ninguno, se cae al alcance derivado por directorio con `deriveScope`, que no cambia de
comportamiento, y si tampoco hay alcance común el mensaje queda con el tipo solo. El tipo sigue
siendo `chore` por el mismo motivo de antes: el diff no distingue una corrección de una función
nueva, y afirmarlo sería inventar. Se descartó concatenar los identificadores de varios cambios en
la descripción porque produce mensajes largos e ilegibles en cuanto son tres.

**La pestaña Commit se elimina, no se deja como atajo.** Sostener las dos superficies daría dos
caminos a la misma acción con alcances distintos —uno atado al cambio, otro al repositorio—, que es
la clase de ambigüedad que la guía ya prohíbe para el botón de archivar duplicado. `CenterTab` pierde
el valor `'commit'` y el bloque de render se va entero.

## Risks / Trade-offs

**Un panel que muestra todo lo modificado invita a preparar de más, y un commit que mezcla dos
trabajos es difícil de revertir.** → Los grupos por procedencia son precisamente la mitigación: la
pertenencia de cada archivo queda declarada al lado del archivo, y nada entra sin tildarse. El
mensaje sugerido, al derivarse del conjunto elegido, deja de nombrar un cambio en cuanto la
selección abarca más de uno, así que la mezcla se ve antes de confirmar en vez de después.

**Eliminar la pestaña Commit rompe la superficie que Ale acaba de validar visualmente.** → Es
consecuencia aceptada y declarada en la propuesta, no un descubrimiento. Se mitiga conservando en el
panel nuevo los dos ajustes de UX que se commitearon en `40c2382`: las acciones arriba a la derecha
compartiendo fila con el título, y el área clickeable de cada control. Repetir ese trabajo en el
panel nuevo es parte del alcance, no un extra.

**La firma de `deriveChangeCommitScope` cambia y tiene pruebas que dependen de ella.** →
`lib/__tests__/change-commit-scope.test.ts` se reescribe contra la forma nueva en la misma tanda, no
después. `components/pipeline/__tests__/pipeline-commit-tab.test.tsx` cubre una pestaña que deja de
existir y se reemplaza por su equivalente sobre el panel de repositorio; `pipeline-prepare-commit.test.tsx`
se conserva, incluido el caso que verifica que no se confirma, porque esa garantía no cambia.

**Las cadenas de `pipeline.openspec.prepare.*` hablan del cambio y dejarían de ser ciertas.** → Se
revisan una por una en ES, EN y ZH, según la invariante 8. El riesgo real no es que falte una
traducción sino que quede una que diga «del cambio» sobre una superficie que ya no lo es; por eso la
revisión es de contenido y no sólo de completitud.

**No se midió que esto reduzca pasos ni tiempo.** → No se afirma que lo haga. Lo que se afirma es
verificable: hoy existe un estado —restos de archivado sin ningún cambio activo— sin superficie de
preparación, y después no.

## Open Questions

Ninguna que bloquee. La ubicación de la superficie quedó decidida y el resto de las decisiones se
resuelven contra las líneas citadas. Queda para validación visual de Ale, ya sobre la implementación,
si el panel debe abrirse solo al detectar el árbol sucio después de archivar o siempre a pedido; se
implementa a pedido, que es lo reversible, y se ajusta si la revisión visual dice otra cosa.
