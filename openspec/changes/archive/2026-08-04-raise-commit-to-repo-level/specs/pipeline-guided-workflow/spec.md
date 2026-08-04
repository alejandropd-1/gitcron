## MODIFIED Requirements

### Requirement: Preparar el commit sin confirmarlo
La aplicación SHALL poder dejar preparado el commit —archivos listos y mensaje sugerido escrito— y
SHALL NOT ejecutar el commit ni ninguna operación que publique. Confirmar SHALL seguir siendo una
acción explícita en el flujo de commit existente.

La preparación SHALL vivir a nivel del repositorio, en su propia superficie, y SHALL NOT depender de
que haya un cambio seleccionado ni de que exista algún cambio activo. La superficie SHALL alcanzarse
desde el estado del árbol que el panel ya declara. Los archivos que la persona elige sumar SHALL
poder sumarse todos a la vez, por grupo o de a uno. Tras preparar con éxito, la lista SHALL
reemplazarse por un resumen que declare cuántos archivos se enviaron, en vez de seguir mostrándolos
como pendientes.

El fundamento es que preparar y confirmar son decisiones distintas: una es reversible y la otra queda
en la historia. Fusionarlas fue lo que obligó a inventar un manifiesto declarado para saber qué
entraba, y a marcar una casilla para registrar que alguien había mirado. El nivel importa por una
razón aparte: el commit describe el estado del árbol, no el de un cambio, y atarlo a la selección
dejaba estados reales sin ninguna superficie desde la cual prepararse —los restos de un archivado
sobre un repositorio sin cambios activos—. El resumen tras preparar quita la duda de si la acción
tuvo efecto.

#### Scenario: Repositorio con archivos sin confirmar
- **WHEN** se pide preparar el commit y hay archivos modificados elegidos
- **THEN** esos archivos quedan preparados y el mensaje sugerido queda escrito, sin que se ejecute
  ningún commit

#### Scenario: Preparación sin ningún cambio activo
- **WHEN** el repositorio no tiene ningún cambio activo pero sí archivos modificados
- **THEN** la superficie de preparación sigue siendo alcanzable y permite preparar esos archivos

#### Scenario: Nada que preparar
- **WHEN** el árbol no tiene archivos modificados sin preparar
- **THEN** la preparación no se ofrece, y no se prepara ni se escribe nada

#### Scenario: Sumar todos los archivos a la vez
- **WHEN** hay archivos modificados y se elige sumarlos todos
- **THEN** todos ellos entran en la preparación sin tener que tildarlos uno por uno, y se puede
  deshacer esa elección con el mismo control

#### Scenario: Resumen tras preparar
- **WHEN** la preparación tiene éxito y ya no quedan archivos por preparar
- **THEN** la lista se reemplaza por un texto que declara cuántos archivos se enviaron a commit, en
  vez de seguir mostrándolos como pendientes

### Requirement: El alcance se deriva, no se declara
Los archivos modificados SHALL agruparse por procedencia derivándola de su ubicación y del estado de
Git, sin depender de que ningún artefacto los enumere. Los grupos SHALL ser los artefactos de cada
cambio activo bajo su identificador, los restos de un archivado —`openspec/changes/archive/…` y
`openspec/specs/…`— y el código sin atribuir. Ningún grupo SHALL entrar en la preparación sin
elección explícita. Los archivos que ya están staged SHALL quedar fuera de la preparación, porque ya
fueron enviados y ofrecerlos de nuevo los prepararía dos veces sin sentido.

El fundamento es que un alcance declarado de antemano sólo vale si alguien lo escribió y lo mantuvo
al día; derivarlo del estado real no puede quedar desactualizado. La procedencia se muestra porque
una omisión es el modo de fallo más silencioso, y porque un commit que mezcla dos trabajos es difícil
de revertir: ver de dónde viene cada archivo es lo que permite decidir antes y no después. Ningún
grupo se privilegia porque, sin un cambio de referencia, privilegiar uno significaría producir un
commit distinto según dónde estuviera el foco de una lista lateral.

#### Scenario: Varios cambios en curso
- **WHEN** el árbol tiene archivos de más de un cambio modificados a la vez
- **THEN** cada uno aparece bajo el identificador del cambio al que pertenece, y ninguno entra en la
  preparación sin elegirse

#### Scenario: Restos de un archivado sin confirmar
- **WHEN** el árbol tiene archivos de un archivado reciente sin commitear
- **THEN** aparecen agrupados como restos de archivado, distinguidos de los artefactos de los cambios
  activos y del código sin atribuir

#### Scenario: Código sin atribuir
- **WHEN** hay archivos modificados que no son artefactos de ningún cambio
- **THEN** aparecen como sin atribuir, y pueden elegirse igual que cualquier otro grupo

#### Scenario: Archivos ya preparados no se ofrecen dos veces
- **WHEN** un archivo ya está staged de una preparación anterior
- **THEN** no aparece entre los que se ofrecen para preparar de nuevo

### Requirement: El mensaje se sugiere y se puede editar
El mensaje SHALL derivarse del conjunto de archivos elegido y SHALL quedar editable antes de
confirmar. La aplicación SHALL NOT tratarlo como definitivo ni impedir su modificación. Cuando todos
los archivos elegidos pertenecen a un mismo cambio, la descripción SHALL ser el identificador de ese
cambio; cuando abarcan más de uno o ninguno, SHALL caer al alcance derivado de la ubicación de los
archivos.

El fundamento es que el tipo de un commit y el motivo del trabajo no son derivables del estado del
repositorio: requieren entender qué se hizo. Un mensaje derivado es un punto de partida útil, y
presentarlo como definitivo afirmaría algo que el dato no respalda. Que la descripción deje de
nombrar un cambio en cuanto la selección abarca más de uno es deliberado: es la señal visible de que
el commit está mezclando trabajos, y llega antes de confirmar.

#### Scenario: Selección de un solo cambio
- **WHEN** se prepara el commit y todos los archivos elegidos pertenecen a un mismo cambio
- **THEN** el mensaje sugerido nombra ese cambio y puede modificarse antes de confirmar

#### Scenario: Selección que abarca varios orígenes
- **WHEN** los archivos elegidos pertenecen a más de un cambio, o a ninguno
- **THEN** el mensaje sugerido no nombra ningún cambio y usa el alcance derivado de la ubicación de
  los archivos

#### Scenario: Mensaje ya escrito por una persona
- **WHEN** el campo de commit ya tiene un mensaje escrito
- **THEN** la sugerencia no lo pisa
