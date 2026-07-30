## ADDED Requirements

### Requirement: Loop agente sobre inferencia local con tool calling
El adaptador SHALL orquestar un loop: enviar la tarea más una declaración de tools al endpoint OpenAI-compatible local, recibir texto o `tool_calls`, ejecutar los tools solicitados sobre el working tree, devolver sus resultados como mensajes `tool`, y repetir hasta que el modelo afirme fin. Cada iteración SHALL acumular telemetría de tokens desde los `usage` de la respuesta. El loop SHALL tener un máximo de iteraciones y un timeout total.

#### Scenario: Tarea completada en una iteración
- **WHEN** el modelo recibe la tarea y responde con texto de fin sin tool_calls
- **THEN** el loop termina y la sesión se cierra como `completed`

#### Scenario: Tarea que requiere editar un archivo
- **WHEN** el modelo devuelve `tool_calls` con `edit_file`
- **THEN** GitCron ejecuta la edición validando el path contra el repo, devuelve el resultado al modelo y continúa el loop

#### Scenario: Límite de iteraciones alcanzado
- **WHEN** el loop supera el máximo de iteraciones sin fin
- **THEN** la sesión se cierra como `failed` con diagnóstico de límite

### Requirement: Tools acotados y validados
Los tools expuestos al modelo SHALL limitarse a operaciones de archivo de lectura y edición (`read_file`, `edit_file`, `glob`, `grep`) con paths validados contra el repositorio. Shell libre y comandos arbitrarios SHALL NOT exponerse en esta capability.

#### Scenario: Path fuera del repo
- **WHEN** el modelo pide `read_file` con un path fuera del repo
- **THEN** el tool rechaza la operación sin ejecutarla y devuelve el error al modelo

#### Scenario: Edición confirma modificación del repo
- **WHEN** el modelo pide `edit_file`
- **THEN** la edición se aplica sólo si la sesión fue confirmada con `modifiesRepo`
