## ADDED Requirements

### Requirement: Preparar el commit sin confirmarlo
La guía SHALL poder dejar preparado el commit del cambio —archivos listos y mensaje sugerido
escrito— y SHALL NOT ejecutar el commit ni ninguna operación que publique. Confirmar SHALL seguir
siendo una acción explícita en el flujo de commit existente.

El fundamento es que preparar y confirmar son decisiones distintas: una es reversible y la otra
queda en la historia. Fusionarlas fue lo que obligó a inventar un manifiesto declarado para saber
qué entraba, y a marcar una casilla para registrar que alguien había mirado.

#### Scenario: Cambio con archivos sin confirmar
- **WHEN** se pide preparar el commit de un cambio que tiene archivos suyos modificados
- **THEN** esos archivos quedan preparados y el mensaje sugerido queda escrito, sin que se ejecute
  ningún commit

#### Scenario: Nada que preparar
- **WHEN** el cambio no tiene archivos modificados
- **THEN** la preparación no se ofrece, y no se prepara ni se escribe nada

### Requirement: El alcance se deriva, no se declara
Los archivos del cambio SHALL derivarse de su identificador y del estado de Git, sin depender de que
ningún artefacto los enumere. Los archivos modificados que no pertenecen al cambio SHALL mostrarse
como tales, y SHALL NOT prepararse salvo elección explícita.

El fundamento es que un alcance declarado de antemano sólo vale si alguien lo escribió y lo mantuvo
al día; derivarlo del estado real no puede quedar desactualizado. Mostrar lo que queda fuera importa
porque una omisión es el modo de fallo más silencioso.

#### Scenario: Varios cambios en curso
- **WHEN** el árbol tiene archivos de más de un cambio modificados a la vez
- **THEN** se preparan los del cambio seleccionado y los demás se listan como que quedan fuera

#### Scenario: Archivo ajeno elegido a mano
- **WHEN** se elige incluir un archivo que no pertenece al cambio
- **THEN** ese archivo se prepara junto con los del cambio

### Requirement: El mensaje se sugiere y se puede editar
El mensaje SHALL derivarse del cambio y SHALL quedar editable antes de confirmar. La guía SHALL NOT
tratarlo como definitivo ni impedir su modificación.

El fundamento es que el tipo de un commit y el motivo del trabajo no son derivables del estado del
repositorio: requieren entender qué se hizo. Un mensaje derivado es un punto de partida útil, y
presentarlo como definitivo afirmaría algo que el dato no respalda.

#### Scenario: Mensaje sugerido para un cambio
- **WHEN** se prepara el commit de un cambio
- **THEN** el mensaje sugerido queda escrito en el campo de commit y puede modificarse antes de
  confirmar

#### Scenario: Mensaje ya escrito por una persona
- **WHEN** el campo de commit ya tiene un mensaje escrito
- **THEN** la sugerencia no lo pisa
