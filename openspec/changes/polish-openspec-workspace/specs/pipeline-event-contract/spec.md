## REMOVED Requirements

### Requirement: Ingesta incremental de productores locales
**Reason**: describía la lectura de gates, delegaciones y alturas visuales del kit multi-agente retirado. Pipeline ya no ingiere esos productores, y con ellos desapareció el mecanismo de cursor que esta cláusula gobernaba.

## MODIFIED Requirements

### Requirement: Eventos semánticos conservan procedencia
Los eventos derivados SHALL enlazar la evidencia Git/OpenSpec/filesystem que justifica la transición y SHALL separar observación de inferencia.

#### Scenario: Cambio archivado
- **WHEN** un cambio aparece bajo `openspec/changes/archive` y no estaba antes
- **THEN** Pipeline emite `change.archived` referenciando la evidencia de OpenSpec, sin inferir la causa ausente

#### Scenario: Tarea completada
- **WHEN** una casilla de `tasks.md` pasa a marcada entre dos lecturas
- **THEN** Pipeline emite `task.completed` referenciando archivo y línea

## ADDED Requirements

### Requirement: Narrativa entregada por mensaje, no por fragmento
Los deltas de mensaje de un runtime SHALL entregarse a la vista coalescidos en una entrada por mensaje. Un mensaje SHALL NOT presentarse partido en varias entradas por el solo hecho de haber llegado en fragmentos.

#### Scenario: Mensaje recibido en varios deltas
- **WHEN** un runtime emite un mensaje en cinco deltas consecutivos del mismo agente
- **THEN** la actividad muestra una entrada con el texto completo, no cinco fragmentos

#### Scenario: Deltas interrumpidos por otro evento
- **WHEN** entre dos deltas del mismo agente llega un evento de otra clase
- **THEN** la acumulación se cierra antes de ese evento y el orden observado se conserva

#### Scenario: Deltas de agentes distintos
- **WHEN** dos agentes emiten deltas intercalados
- **THEN** cada agente acumula por separado y ninguna entrada mezcla texto de ambos

#### Scenario: Sesión ya persistida con fragmentos
- **WHEN** se carga una sesión guardada antes de que la acumulación existiera, con un mensaje partido en varias entradas
- **THEN** las entradas de narrativa consecutivas del mismo agente se unen al cargarlas, sin exigir volver a ejecutar la sesión
