# Pipeline event contract

## Purpose

Definir el envelope, orden, degradación y métricas de los eventos normalizados de Pipeline.
## Requirements
### Requirement: Envelope versionado y trazable
Todo evento normalizado SHALL incluir schema version, IDs de fuente/evento, timestamps emitido/observado, identidad, kind, payload, procedencia, nivel de evidencia, referencias y versión de redacción.

#### Scenario: Timestamp de fuente ausente
- **WHEN** una fuente no informa hora de emisión
- **THEN** `emittedAt` queda `null`, `observedAt` conserva la observación local y la UI no presenta precisión inventada

### Requirement: Orden y deduplicación acotados
Pipeline SHALL declarar el scope de secuencia y deduplicar por instancia de fuente e ID de evento. SHALL NOT prometer orden global cuando la fuente no lo ofrece.

#### Scenario: Reconnect repite eventos
- **WHEN** una reconexión reentrega eventos ya observados
- **THEN** el reducer descarta duplicados sin sumar usage dos veces y conserva evidencia de la reconexión

### Requirement: Unknown y degraded explícitos
Datos ausentes, incompatibles o sin fixture SHALL representarse como `unknown`, `blocked` o `pending_fixture`; SHALL NOT convertirse en cero, false, verde o low risk.

#### Scenario: Runtime sin reasoning emitido
- **WHEN** el runtime sólo entrega acciones y resultado final
- **THEN** Pipeline marca reasoning como no disponible y puede construir una bitácora derivada claramente etiquetada

### Requirement: Métricas tipadas y atribuibles
Cada métrica SHALL identificar una subdimensión tipada, unidad, clasificación, evidence status/refs y scope de dedupe. Estimaciones SHALL incluir fórmula, pricing source y fecha; sin ellos SHALL quedar unknown.

#### Scenario: Costo bajo suscripción sin billing
- **WHEN** un runtime informa USD pero no existe evidencia de cargo facturado
- **THEN** Pipeline lo conserva como runtime-reported con semántica de billing unknown y no como costo real

### Requirement: Eventos semánticos conservan procedencia
Los eventos derivados SHALL enlazar la evidencia Git/OpenSpec/filesystem que justifica la transición y SHALL separar observación de inferencia.

#### Scenario: Cambio archivado
- **WHEN** un cambio aparece bajo `openspec/changes/archive` y no estaba antes
- **THEN** Pipeline emite `change.archived` referenciando la evidencia de OpenSpec, sin inferir la causa ausente

#### Scenario: Tarea completada
- **WHEN** una casilla de `tasks.md` pasa a marcada entre dos lecturas
- **THEN** Pipeline emite `task.completed` referenciando archivo y línea

### Requirement: Streams de runtime incrementales y acotados
F03 SHALL decodificar UTF-8 y JSON/JSONL incrementalmente con límites de línea, bytes y eventos, y SHALL emitir diagnósticos explícitos ante truncado, overflow o schema incompatible.

#### Scenario: JSONL dividido entre chunks
- **WHEN** un objeto JSON llega repartido entre varios chunks
- **THEN** el adapter retiene el parcial hasta completarlo sin emitir un evento inválido

#### Scenario: Stream supera el límite
- **WHEN** stdout o stderr exceden el máximo configurado
- **THEN** el adapter detiene la captura de forma controlada, conserva el evento terminal y registra degradación

### Requirement: Telemetría de runtime con procedencia por campo
Usage, costo, contexto, modelo y reasoning SHALL conservar classification, evidence status, refs y dedupe scope; un campo ausente SHALL permanecer nullable y desconocido.

#### Scenario: Costo reportado cero bajo suscripción
- **WHEN** OpenCode informa costo `0` pero no hay evidencia de billing
- **THEN** Pipeline conserva el cero como runtime-reported con billing desconocido y no como cargo real

#### Scenario: Tool sin reasoning
- **WHEN** un stream informa tool calls pero no reasoning explícito
- **THEN** Pipeline no fabrica un evento `reasoning.delta`

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

