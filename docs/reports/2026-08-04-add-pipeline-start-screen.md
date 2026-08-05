# Pantalla de inicio de Pipeline

**Change:** `add-pipeline-start-screen` · **Fecha:** 2026-08-04 · **Tareas:** 20/21 (falta la validación visual de Ale)

## Qué se hizo

Pipeline abre en el estado del repositorio y ya no entra a un cambio que nadie eligió. La cadena de
descartes que resolvía `selectedId` —`selection` → `openSpec.selectedChangeId` → `activeChanges[0]` →
`archivedChanges[0]`— quedó reducida al primer eslabón. Sin elección explícita no hay cambio
seleccionado, y el centro muestra los cambios en curso con su avance, lo cerrado y el acceso a abrir
uno nuevo.

`openSpec.selectedChangeId` dejó de navegar y pasa a señalarse. Cuando el backend deriva de la rama
una correspondencia con un cambio, la tarjeta de ese cambio queda marcada en la pantalla de entrada.
Antes esa información se gastaba en saltar adentro, donde era indistinguible de haber caído ahí por
ser el primero de la lista.

La sección `noActiveChange`, que sólo aparecía en un repositorio sin cambios ni archivados, se absorbió
en la pantalla única. Desde adentro de un cambio se vuelve con un control propio en el encabezado.

## El defecto que corrige, con su evidencia

`OpenSpecDashboard.tsx:254` resolvía el cambio mostrado por descartes, y los dos últimos eslabones
elegían por orden de lista. La única pantalla que no era un cambio aparecía sólo en el estado más
raro —repositorio sin nada—, de modo que el caso normal era entrar al interior de un cambio sin
contexto.

El costo se ve fuera de este repositorio. En `C:\www\odontoPau` hay dos cambios activos, cero
archivados y cero especificaciones, con la mayoría de las tareas hechas: el encabezado contaba tres
ceros y un porcentaje, el panel entraba al primer cambio, y el conjunto se leía como un repositorio
vacío. Ese estado ahora tiene su test —`pipeline-start-screen.test.tsx`, caso "el estado de odontoPau
no se lee como vacío"— que verifica que se declara que todavía no se archivó nada, que el avance real
de cada cambio se muestra, y que el cero de archivados no se presenta como una cifra más.

## Decisión de fondo

Un cero de archivados y un cero de cambios activos significan cosas opuestas: el primero es el estado
normal de cualquier proyecto antes de su primer archivado, el segundo es un repositorio sin trabajo
abierto. Presentarlos como cifras uniformes es lo que hacía leer como vacío un repositorio casi
terminado. La pantalla los distingue con palabras. Es el mismo principio por el que en este proyecto
un valor desconocido no se muestra como cero, aplicado a un cero que sí es cero pero no significa
ausencia.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **97 archivos / 686 tests, verde en dos corridas
seguidas**. El flake conocido de los archivos que crean repositorios Git reales no apareció en
ninguna; eso no significa que esté resuelto. Lint limpio sobre los diez archivos tocados.
`openspec validate add-pipeline-start-screen --strict` válido.

Vale registrar el costo de la tanda: retirar la cadena de descartes rompió **23 tests en seis
archivos**, todos por la misma causa —asumían que el panel entra solo a un cambio—. Ninguno era una
regresión: se les agregó el paso de entrar, que es el recorrido real. `pipeline-selection-sync.test.tsx`
fue el único que cambió de sentido, porque verificaba exactamente el descarte que se retiró; sus casos
se reemplazaron por los contrarios y se conservó el que comprueba que seleccionar no despliega.

## Lo que no se midió y lo que falta

No se midió que esto acelere ninguna tarea, y hay un costo cierto: un paso más para llegar al cambio
en el que se venía trabajando. Se compensa señalando el que corresponde a la rama actual, pero el
saldo en clics no se midió y no se afirma que sea favorable.

Queda pendiente la validación visual de Ale (tarea 5.5): que la pantalla no se lea como una landing
—la invariante 11 es condición de aceptación—, que un repositorio sin archivar se entienda, y si el
orden de los cambios conviene por avance descendente, que es como se implementó, o por última
actividad.
