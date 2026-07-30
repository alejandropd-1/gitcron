## MODIFIED Requirements

### Requirement: LM Studio como runtime que ejecuta tareas
LM Studio SHALL registrarse como runtime lanzable con identidad `'lmstudio'`, distinta de su rol de proveedor observado. El adaptador agente SHALL reutilizar el discovery, catálogo y health del adaptador proveedor existente, y añadir el loop agente con tool calling para ejecutar tareas sobre el working tree. Sólo los modelos con `trained_for_tool_use: true` SHALL ofrecerse para ejecución.

#### Scenario: Modelo local ejecuta una tarea
- **WHEN** se selecciona un modelo local con tool-use y se inicia una sesión
- **THEN** el loop agente ejecuta la tarea, los tools editan el repo validados, y la sesión emite eventos de lifecycle

#### Scenario: Modelo sin tool-use
- **WHEN** el catálogo lista un modelo con `trained_for_tool_use: false`
- **THEN** el modelo se lista pero no se ofrece para ejecución de tareas

#### Scenario: Selector de modelo y contexto
- **WHEN** el runtime LM Studio está disponible
- **THEN** la UI permite elegir el modelo concreto y muestra su ventana de contexto
