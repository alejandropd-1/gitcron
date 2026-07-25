## ADDED Requirements

### Requirement: Interfaz común con degradación explícita
Cada `RuntimeAdapter` SHALL declarar identidad, transporte, versión y capabilities negociadas, y SHALL implementar sólo los métodos respaldados por esa declaración.

#### Scenario: Runtime sin resume
- **WHEN** un adapter no posee fixture ni método de resume verificable
- **THEN** declara `resume` como `unavailable` o `pending_fixture` y no simula la operación

### Requirement: Sesión vinculada antes de observar
Toda sesión SHALL recibir identidad explícita de repo, change, task, run y attempt antes de emitir eventos; el adapter SHALL NOT inferir el vínculo desde prosa o cwd solamente.

#### Scenario: Falta repoId
- **WHEN** una solicitud de sesión no incluye `repoId`
- **THEN** el adapter rechaza el inicio antes de crear un proceso

### Requirement: Degradación específica por runtime
Claude, Codex y OpenCode SHALL consumir sólo streams estructurados compatibles; `agy` SHALL limitarse a lifecycle/final opaco sin schema; LM Studio SHALL representarse como provider local detrás de un cliente agente.

#### Scenario: agy sin stream estructurado
- **WHEN** la versión instalada sólo ofrece salida final humana
- **THEN** el adapter emite lifecycle medido y marca tools, usage, costo, contexto y reasoning como desconocidos o no disponibles

### Requirement: Conformance parametrizada
Cada adapter SHALL pasar una suite común para identidad, orden, dedupe, parciales UTF-8, error, timeout, cleanup, redacción, métricas desconocidas y coherencia de capabilities.

#### Scenario: Capability sin método
- **WHEN** un fixture declara una capability disponible pero el adapter no implementa su método
- **THEN** la conformance falla
