# Pipeline runtime adapters

## Purpose

Definir el contrato común de los adaptadores de runtime (`RuntimeAdapter`) que observan
ejecuciones de runtimes directos y proveedores locales sin requerir Hermes como gateway
obligatorio, con degradación explícita por runtime y conformance parametrizada.
## Requirements
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

### Requirement: Adaptadores sin citas a fixtures retirados
Los adaptadores SHALL NOT citar `evidenceRefs` que apunten a archivos retirados del repositorio. Una capability cuyo único respaldo era un fixture retirado SHALL declararse `pending_fixture` y SHALL seguir siendo lanzable. La detección de versión instalada SHALL continuar para reportar `runtimeVersion`, pero SHALL NOT decidir lanzabilidad ni `evidenceStatus`.

#### Scenario: Adaptador de runtime estructurado tras el retiro
- **WHEN** el adaptador detecta un runtime instalado cuya versión ya no tiene fixture
- **THEN** reporta la versión instalada, declara sus capabilities `pending_fixture` y el runtime es lanzable

#### Scenario: Adaptador sin stream estructurado
- **WHEN** un adaptador (p. ej. `agy`) no expone stream estructurado
- **THEN** se declara no lanzable por diseño, se lista con su motivo, y no se le exige fixture

