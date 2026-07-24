## ADDED Requirements

### Requirement: Contexto obligatorio para adaptadores directos
Cada sesión directa F03 SHALL conservar `repoId`, `changeId`, `taskId`, `runId`, `attemptId`, `sessionId`, `agentId` y `orchestrationMode`; valores no informados SHALL ser null/unknown según el contrato.

#### Scenario: Codex directo sin Hermes
- **WHEN** GitCron observa o inicia Codex directamente
- **THEN** la identidad usa `runtime: codex`, `orchestrationMode: direct` y no crea una sesión Hermes ficticia

### Requirement: Runtime, provider y modelo separados
Los adaptadores SHALL preservar runtime cliente, proveedor y modelos solicitado/efectivo/reportado como dimensiones distintas.

#### Scenario: Z.ai ejecutado por OpenCode
- **WHEN** OpenCode usa Z.AI Coding Plan
- **THEN** la identidad conserva `runtime: opencode`, provider Z.ai y deja `reportedModel` null si el stream no lo emitió

#### Scenario: LM Studio como backend
- **WHEN** un cliente agente llama al servidor local LM Studio
- **THEN** LM Studio queda como provider y el runtime sigue siendo el cliente que origina la sesión
