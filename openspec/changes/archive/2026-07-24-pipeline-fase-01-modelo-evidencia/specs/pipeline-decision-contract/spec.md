## ADDED Requirements

### Requirement: Decisiones derivadas sólo desde señales verificables
F01 SHALL normalizar decisiones pendientes desde OpenSpec, auditorías, escaladas y evidencia estructurada, conservando procedencia y dejando riesgo o consecuencias como `unknown` cuando no exista una regla versionada.

#### Scenario: Gate global rojo sin diff
- **WHEN** un gate global falla pero no existe diff confirmado de dependencias ni señal estructurada equivalente
- **THEN** Pipeline no inventa una `dependency-request`

#### Scenario: Auditoría rechazada
- **WHEN** un reporte verificable contiene veredicto `RECHAZADO` y hallazgos accionables
- **THEN** Pipeline crea una decisión enlazada al reporte y conserva los hallazgos sin convertirlos en comandos

### Requirement: Aprobación protegida con scope exacto
Una decisión de aprobación de diff protegido SHALL conservar lista de archivos, digest y alcance exactos; texto ambiguo SHALL NOT habilitar disponibilidad ejecutable.

#### Scenario: Aprobación sin digest
- **WHEN** una fuente sólo dice que un cambio está aprobado pero no identifica archivos y digest
- **THEN** la decisión permanece informativa con opción ejecutable no disponible
