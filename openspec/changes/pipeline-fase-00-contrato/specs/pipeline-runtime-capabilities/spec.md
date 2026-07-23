## ADDED Requirements

### Requirement: Matriz con procedencia por celda
La matriz SHALL cubrir Hermes, Claude, Codex, `agy`, OpenCode, Z.ai vía OpenCode y LM Studio para observación, reasoning, tools, usage, costo, contexto, selección de modelo, pausa, interrupt, kill, resume, auth y estabilidad de schema. Cada afirmación SHALL tener estado y evidencia.

#### Scenario: Ayuda anuncia una opción sin fixture
- **WHEN** `--help` anuncia una capability pero no existe payload real capturado
- **THEN** la celda se marca inferida o pendiente de fixture, no verificada end-to-end

### Requirement: Runtime y proveedor no se confunden
La matriz SHALL separar runtime/transport de proveedor/model family y SHALL permitir relaciones muchos-a-muchos.

#### Scenario: Z.AI Coding Plan configurado
- **WHEN** OpenCode lista una credencial Z.AI Coding Plan sin exponer su secreto
- **THEN** Z.ai se registra como proveedor accesible por OpenCode y su CLI standalone queda no aplicable, no falsamente ausente

### Requirement: Degradación sin parsing frágil
Un adaptador SHALL usar sólo protocolos o salidas estructuradas versionables. Ausencia de esa superficie SHALL degradar capabilities sin parsear texto humano.

#### Scenario: agy sólo anuncia print final
- **WHEN** `agy` no expone stream JSON estable
- **THEN** Pipeline limita observación a lifecycle grueso y evidencia repo hasta disponer de hook/wrapper probado
