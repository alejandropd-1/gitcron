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
