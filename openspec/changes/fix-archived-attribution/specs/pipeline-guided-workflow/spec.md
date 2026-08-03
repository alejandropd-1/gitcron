## MODIFIED Requirements

### Requirement: El alcance se deriva, no se declara
Los archivos del cambio SHALL derivarse de su identificador y del estado de Git, sin depender de que
ningún artefacto los enumere. Los archivos modificados que no pertenecen al cambio SHALL mostrarse
como tales, y SHALL NOT prepararse salvo elección explícita. Los restos de un archivado —`openspec/changes/archive/…`
y `openspec/specs/…`— SHALL tratarse como ajenos al cambio activo y SHALL NOT caer en su alcance por
defecto, porque pertenecen al commit del archivado, no al trabajo en curso.

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
