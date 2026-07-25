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

### Requirement: Ingesta incremental de productores locales
Pipeline SHALL ingerir gates, delegaciones y alturas visuales incrementalmente, conservando cursor, identidad de archivo, última línea parcial y diagnósticos de truncado o reemplazo.

#### Scenario: Última línea parcial
- **WHEN** un productor todavía no escribió el newline final de una entrada JSONL
- **THEN** Pipeline retiene esos bytes como pendientes y no emite una línea inválida

#### Scenario: Archivo truncado
- **WHEN** el tamaño observado queda por debajo del cursor anterior
- **THEN** Pipeline reinicia la lectura de forma controlada, deduplica eventos y registra la discontinuidad

### Requirement: Eventos semánticos conservan procedencia
Los eventos derivados por F01 SHALL enlazar la evidencia Git/OpenSpec/filesystem que justifica la transición y SHALL separar observación de inferencia.

#### Scenario: Gate cambia de resultado
- **WHEN** dos registros estructurados confirman resultados diferentes del mismo gate
- **THEN** Pipeline emite `gate.changed` con referencias a ambos estados sin inferir la causa ausente

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
