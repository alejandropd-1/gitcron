## Why

Pipeline abre adentro de un cambio que nadie eligió. En `components/pipeline/OpenSpecDashboard.tsx:254`
el identificador seleccionado se resuelve con una cadena de descartes —`selection` del usuario, si no
`openSpec.selectedChangeId`, si no `activeChanges[0]`, si no `archivedChanges[0]`— de modo que sin
haber tocado nada el panel entra al primero de la lista y muestra sus tareas como si fueran el asunto
del momento. La única pantalla que no es un cambio es `styles.noActiveChange` (línea 1210), y sólo
aparece cuando el repositorio no tiene ningún cambio ni archivado: es el estado más raro, no el de
entrada.

El costo se ve en repositorios que no son éste. En `C:\www\odontoPau` hay dos cambios activos, cero
archivados y cero especificaciones, con 83% de las tareas hechas. El encabezado cuenta tres ceros y
un porcentaje, el panel entra al primer cambio, y la lectura que queda es la de un repositorio vacío
—cuando en realidad está casi terminado—. Un repositorio que todavía no archivó nada es un caso
normal: es el estado de cualquier proyecto antes de su primer archivado, y hoy se comunica como si
faltara algo.

## What Changes

Pipeline pasa a abrir en una pantalla de entrada del repositorio, y entrar a un cambio pasa a ser una
elección. Mientras no se haya elegido ninguno, el centro muestra el panorama: cuántos cambios están
en curso con su avance de tareas, qué quedó pendiente, qué se archivó y cuántas especificaciones hay,
más el acceso a abrir un OpenSpec nuevo que hoy sólo existe dentro de `noActiveChange`.

La cadena de descartes deja de elegir por su cuenta. `openSpec.selectedChangeId` —que el backend
deriva de la rama cuando puede— deja de entrar al cambio en silencio y pasa a mostrarse en la pantalla
de entrada como lo que es: una correspondencia observada entre la rama y un cambio, señalada para que
la persona decida si entra. Los descartes `activeChanges[0]` y `archivedChanges[0]` se retiran: elegir
el primero de una lista no es información, es azar de ordenamiento.

Un repositorio sin nada archivado deja de leerse como vacío. La pantalla declara el estado que tiene
en vez de mostrar ceros sin contexto: con cambios en curso y ningún archivado, lo que corresponde
decir es que todavía no se archivó nada, no presentar un cero al lado de otros.

Queda **fuera de alcance**, explícitamente: reemplazar la barra de ciclo de vida fija por el grafo de
OpenSpec, que es un trabajo propio y necesita validación visual aparte; la preparación del commit, que
ya subió al nivel del repositorio en `raise-commit-to-repo-level` y se alcanza desde el encabezado; el
ancho de los paneles de artefactos; y el filtro por cambio de la columna ACTIVIDAD. Tampoco cambia
nada del backend: la pantalla se arma con lo que el snapshot ya transporta, sin lecturas nuevas del
CLI ni de Git.

No se promete que esto acelere ninguna tarea, porque no se midió. Lo verificable contra las líneas
citadas es que hoy el panel entra a un cambio que nadie eligió, y que después de este cambio no lo
hace.

## Capabilities

### New Capabilities

Ninguna. La navegación del panel y lo que declara sobre el estado del repositorio ya pertenecen a
`pipeline-guided-workflow`; abrir una capacidad nueva para la pantalla de entrada partiría en dos la
misma conversación sobre cómo se recorre OpenSpec desde la aplicación.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que el panel abra en una pantalla de
  repositorio y que entrar a un cambio sea una elección explícita, incluida la lectura de un
  repositorio sin nada archivado. La correspondencia entre rama y cambio que hoy selecciona en
  silencio pasa a declararse sin navegar.

## Impact

En el renderer, `components/pipeline/OpenSpecDashboard.tsx` cambia la resolución de `selectedId` para
que sin elección explícita no haya cambio seleccionado, y suma la pantalla de entrada en el centro
junto a las ramas que ya existen —preparación del commit, cambio activo, archivado—. La sección
`noActiveChange` se absorbe: dejar dos pantallas de repositorio distintas según haya o no cambios
daría dos lecturas del mismo estado.

En pruebas, `components/pipeline/__tests__/pipeline-selection-sync.test.tsx` cubre la sincronización
de la selección y se revisa contra el comportamiento nuevo; se suma cobertura del caso odontoPau
—cambios activos, cero archivados, cero especificaciones— que hoy no está representado en ningún
fixture. En i18n, las claves de la pantalla nueva se escriben en ES, EN y ZH.

No se agregan dependencias. No se tocan invariantes de seguridad: la pantalla se arma con el snapshot
que ya viaja al renderer.
