## ADDED Requirements

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
