## MODIFIED Requirements

### Requirement: Preparar el commit sin confirmarlo
La guía SHALL poder dejar preparado el commit del cambio —archivos listos y mensaje sugerido
escrito— y SHALL NOT ejecutar el commit ni ninguna operación que publique. Confirmar SHALL seguir
siendo una acción explícita en el flujo de commit existente.

La preparación SHALL vivir en su propia pestaña, separada de la lista de tareas y del panel de
archivado: mezclarlas en una misma superficie confunde dos decisiones que conviene tomar por
separado. Los archivos ajenos al cambio que la persona puede elegir sumar SHALL poder sumarse todos
a la vez o de a uno. Tras preparar con éxito, la lista SHALL reemplazarse por un resumen que declare
cuántos archivos se enviaron, en vez de seguir mostrándolos como pendientes.

El fundamento es que preparar y confirmar son decisiones distintas: una es reversible y la otra
queda en la historia. Fusionarlas fue lo que obligó a inventar un manifiesto declarado para saber
qué entraba, y a marcar una casilla para registrar que alguien había mirado. Separar la pestaña del
commit de la del trabajo deja cada decisión en su momento, y el resumen tras preparar quita la duda
de si la acción tuvo efecto.

#### Scenario: Cambio con archivos sin confirmar
- **WHEN** se pide preparar el commit de un cambio que tiene archivos suyos modificados
- **THEN** esos archivos quedan preparados y el mensaje sugerido queda escrito, sin que se ejecute
  ningún commit

#### Scenario: Nada que preparar
- **WHEN** el cambio no tiene archivos modificados
- **THEN** la preparación no se ofrece, y no se prepara ni se escribe nada

#### Scenario: Sumar todos los archivos ajenos a la vez
- **WHEN** hay archivos que no se le pueden atribuir al cambio y se elige sumarlos todos
- **THEN** todos ellos entran en la preparación sin tener que tildarlos uno por uno, y se puede
  deshacer esa elección con el mismo control

#### Scenario: Resumen tras preparar
- **WHEN** la preparación tiene éxito y ya no quedan archivos del cambio por preparar
- **THEN** la lista se reemplaza por un texto que declara cuántos archivos se enviaron a commit, en
  vez de seguir mostrándolos como pendientes

### Requirement: El alcance se deriva, no se declara
Los archivos del cambio SHALL derivarse de su identificador y del estado de Git, sin depender de que
ningún artefacto los enumere. Los archivos modificados que no pertenecen al cambio SHALL mostrarse
como tales, y SHALL NOT prepararse salvo elección explícita. Los restos de un archivado —`openspec/changes/archive/…`
y `openspec/specs/…`— SHALL tratarse como ajenos al cambio activo y SHALL NOT caer en su alcance por
defecto, porque pertenecen al commit del archivado, no al trabajo en curso. Los archivos que ya están
staged SHALL quedar fuera de la preparación, porque ya fueron enviados y ofrecerlos de nuevo los
prepararía dos veces sin sentido.

El fundamento es que un alcance declarado de antemano sólo vale si alguien lo escribió y lo mantuvo
al día; derivarlo del estado real no puede quedar desactualizado. Mostrar lo que queda fuera importa
porque una omisión es el modo de fallo más silencioso, y atribuir los restos de un archivado al
cambio activo mezcla dos confirmaciones distintas en una sola sin que la persona lo pida.

#### Scenario: Varios cambios en curso
- **WHEN** el árbol tiene archivos de más de un cambio modificados a la vez
- **THEN** se preparan los del cambio seleccionado y los demás se listan como que quedan fuera

#### Scenario: Archivo ajeno elegido a mano
- **WHEN** se elige incluir un archivo que no pertenece al cambio
- **THEN** ese archivo se prepara junto con los del cambio

#### Scenario: Restos de un archivado sin confirmar
- **WHEN** el árbol tiene archivos de un archivado reciente sin commitear y se selecciona otro cambio activo
- **THEN** esos restos se listan como que quedan fuera y no entran en el alcance del cambio activo por defecto

#### Scenario: Archivos ya preparados no se ofrecen dos veces
- **WHEN** un archivo del cambio ya está staged de una preparación anterior
- **THEN** no aparece entre los que se ofrecen para preparar de nuevo
