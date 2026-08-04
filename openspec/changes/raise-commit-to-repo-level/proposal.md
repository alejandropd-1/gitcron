## Why

El commit no es del cambio: es del repositorio. La preparación, sin embargo, está encerrada dentro
de un cambio activo seleccionado, y eso produce un recorrido que no tiene sentido explicar. En
`components/pipeline/OpenSpecDashboard.tsx:723` la rama `selectedChange ? (…)` abre todo el panel
central, y la pestaña de commit se renderiza adentro, en la línea 893; la alternativa de esa
condición es `selectedArchive` (línea 1126). Sin un cambio activo seleccionado la superficie de
preparación no existe. En la línea 359 el alcance se colapsa explícitamente —`selectedChange ? …
: { files: [], own: [], foreign: [], suggestedMessage: null }`— cuando no hay selección.

La consecuencia se ve justo después de archivar. `openspec archive` mueve el cambio al histórico y
consolida especificaciones sin tocar Git, así que el árbol queda con `openspec/changes/archive/…` y
`openspec/specs/…` modificados y sin confirmar. Ese cambio ya no está activo, y `lib/change-commit-scope.ts:151`
clasifica esos restos como `archived`, que en la línea 166 caen en `foreign`. Para confirmarlos hay
que entrar a un cambio activo cualquiera —ajeno al trabajo que se archivó—, abrir su pestaña Commit
y tildar a mano archivos que no le pertenecen. Si no queda ningún cambio activo, no hay dónde
entrar. El estado que hay que confirmar es del repositorio, pero la única puerta para llegar a él es
la de un cambio que no tiene nada que ver.

## What Changes

La preparación del commit sube al nivel del repositorio. Deja de colgar de la selección de un cambio
y pasa a vivir en el encabezado del panel, que es donde ya se declara el estado del árbol y la rama
(`styles.repoHealth`, línea 595). Muestra todo lo modificado agrupado por procedencia: los artefactos
de cada cambio activo bajo su identificador, los restos de archivado, y el código sin atribuir. La
persona elige qué entra y prepara; el mensaje se sugiere sobre el conjunto que realmente se envía.

Desaparece la noción de "propio" frente a "ajeno". Esa distinción existía porque había un cambio de
referencia desde el cual mirar; sin cambio de referencia, todos los grupos son pares y ninguno entra
por defecto. Es el punto que hace que esto no sea mover un panel de lugar: la derivación cambia de
pregunta. Antes respondía "¿qué de esto es del cambio X?"; ahora responde "¿de dónde viene cada cosa
que hay modificada?".

**BREAKING** para la superficie: se elimina la pestaña Commit del panel central, creada pocos changes
atrás. No es una regresión sino el paso siguiente: esa pestaña fue lo que hizo visible que el commit
estaba a un nivel equivocado, y sostener las dos superficies daría dos caminos para la misma acción
con alcances distintos. Ale ya conoce y aceptó esta consecuencia.

Queda **fuera de alcance**, explícitamente: confirmar el commit, que sigue siendo del flujo de commit
existente y nunca de esta superficie —el test que falla si alguien mete el commit acá se mantiene—;
la pantalla de inicio de Pipeline; reemplazar el ciclo de vida fijo por el grafo de OpenSpec; el
ancho de los paneles de artefactos; y el filtro por cambio de la columna ACTIVIDAD. Tampoco cambia
la lógica de Git: se sigue usando `stageFiles` tal como está, sin escrituras nuevas.

No se promete que esto reduzca clics ni tiempo, porque no se midió. Lo que sí se afirma, y es
verificable contra las líneas citadas, es que hoy existe un estado del repositorio —restos de
archivado sin ningún cambio activo— que no tiene ninguna superficie desde la cual prepararse, y que
después de este cambio la tiene.

## Capabilities

### New Capabilities

Ninguna. La preparación del commit ya es una capacidad declarada; lo que cambia es el nivel al que
opera, y eso se expresa modificando sus requisitos en lugar de abrir una capacidad paralela que
diría lo mismo desde otro nivel.

### Modified Capabilities

- `pipeline-guided-workflow`: los tres requisitos que hoy atan la preparación al cambio seleccionado.
  «Preparar el commit sin confirmarlo» exige hoy que la preparación viva en su propia pestaña dentro
  del cambio; pasa a exigir que viva a nivel del repositorio y a prohibir que dependa de que haya un
  cambio seleccionado. «El alcance se deriva, no se declara» deriva hoy del identificador del cambio
  y reparte entre propios y ajenos; pasa a derivar del estado del árbol y a agrupar por procedencia
  sin categoría privilegiada. «El mensaje se sugiere y se puede editar» deriva hoy del identificador
  del cambio; pasa a derivarse del conjunto elegido, que puede abarcar uno, varios o ningún cambio.

## Impact

En el renderer, `components/pipeline/OpenSpecDashboard.tsx` pierde la pestaña `commit` de `CenterTab`
(línea 83) y todo su bloque de render, y gana la superficie de repositorio en el encabezado.
`lib/change-commit-scope.ts` se generaliza: `deriveChangeCommitScope` deja de recibir un
`changeId` de referencia y pasa a agrupar por procedencia, con `suggestCommitMessage` derivando el
alcance del conjunto elegido. `deriveScope` no cambia de comportamiento.

En pruebas, los archivos de `lib/__tests__/` y `components/pipeline/__tests__/` que cubren el alcance
y la pestaña se actualizan al nuevo nivel; el que verifica que preparar no confirma se conserva tal
cual, porque esa garantía no cambia de nivel. En i18n, las claves de `pipeline.openspec.prepare.*`
se revisan en ES, EN y ZH: las que hablan del cambio dejan de ser ciertas a nivel de repositorio.

No se agregan dependencias. No se tocan las invariantes de seguridad: la superficie nueva no recibe
credenciales ni paths sin validar, y sigue operando sobre la lista de modificados que ya viaja al
renderer.
