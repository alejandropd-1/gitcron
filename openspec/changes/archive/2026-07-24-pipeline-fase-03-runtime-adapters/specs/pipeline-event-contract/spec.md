## ADDED Requirements

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
