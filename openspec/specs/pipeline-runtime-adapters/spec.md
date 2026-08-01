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

### Requirement: Éxito declarado sólo con ejecución observada
Un adaptador SHALL NOT declarar `success: true` cuando el runtime no ejecutó ningún turno y reportó
un motivo de rechazo, aunque el proceso haya salido con código 0 y sin marca de error. El evento
`run.completed` SHALL llevar `success: false` en ese caso, y el motivo textual reportado por el
runtime SHALL conservarse en la evidencia en vez de descartarse.

El fundamento es que el código de salida y la marca de error del CLI describen el proceso, no el
trabajo. Un runtime que rechaza la instrucción antes de empezar sale limpio, y tomar eso como éxito
convierte un rechazo en una afirmación falsa que el usuario no tiene forma de contradecir.

#### Scenario: Comando inexistente con salida limpia
- **WHEN** el resultado del runtime informa cero turnos y un motivo que empieza con `Unknown command:`
- **THEN** el adaptador emite `run.completed` con `success: false`, conserva el motivo textual y no
  declara la sesión exitosa

#### Scenario: Ejecución real con turnos
- **WHEN** el resultado del runtime informa al menos un turno y ninguna marca de error
- **THEN** el adaptador emite `run.completed` con `success: true` sin cambios respecto del
  comportamiento previo

#### Scenario: Motivo distinto del rechazo de comando
- **WHEN** el resultado informa cero turnos pero el motivo no corresponde a un comando inexistente
- **THEN** el adaptador no inventa un fallo y conserva la derivación basada en la marca de error del
  runtime

