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

### Requirement: Orden de implementación guiado por evidencia
El camino core SHALL implementar primero las fuentes directas con fixtures verificados. El adaptador
Hermes SHALL ser opcional y su bloqueo SHALL NOT impedir F03 ni fases core posteriores.

#### Scenario: Companion Hermes sin handshake seguro
- **WHEN** F02 no puede negociar un contrato autenticado/versionado
- **THEN** F02 queda bloqueada y F03 continúa desde F01 con adaptadores directos
