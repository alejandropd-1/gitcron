## MODIFIED Requirements

### Requirement: Antigravity ejecuta sesiones con observación de lifecycle
El adaptador `agy` SHALL implementar `start()` para ejecutar el binario `agy` con la instrucción de la tarea sobre el repositorio. `events()` SHALL emitir el ciclo de vida (`runtime.process.started`, texto de salida cruda, `runtime.process.completed`/`failed`) sin inventar estructura. `shutdown()` SHALL terminar el proceso. La observación SHALL declararse como `degraded` porque `agy` no expone stream estructurado: no se afirman deltas de razonamiento ni tool calls.

#### Scenario: Sesión de agy arranca y termina
- **WHEN** se inicia una sesión con una instrucción
- **THEN** el proceso `agy` se ejecuta, su salida se emite como eventos de lifecycle, y al cerrar se emite `completed` o `failed`

#### Scenario: Salida sin estructura
- **WHEN** agy produce texto humano en stdout/stderr
- **THEN** se emite como narrativa cruda, sin parsearlo como JSON ni afirmar deltas estructurados

#### Scenario: Corte de sesión
- **WHEN** se detiene la sesión
- **THEN** el proceso y sus hijos se terminan limpiamente vía `shutdown`
