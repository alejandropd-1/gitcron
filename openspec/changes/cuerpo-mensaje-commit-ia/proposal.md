## Why

La generación asistida de mensajes de commit mediante IA local sólo producía un asunto de una única línea debido a una restricción explícita en `electron/ai/commit-message/prompt.ts:19` (`"Respondés UNA sola línea, nada más"`). Cuando un cambio combina múltiples aspectos —como la introducción de una funcionalidad y una corrección de seguridad en varios módulos—, un asunto aislado de 72 caracteres resulta insuficiente para documentar el impacto y la motivación técnica, ocultando cambios críticos en el historial.

## What Changes

- Se amplía la instrucción del sistema (`SYSTEM_PROMPT`) en `electron/ai/commit-message/prompt.ts` para que solicite tanto un asunto en formato de commits convencionales (máximo 72 caracteres) como un cuerpo conciso en prosa en español, separado por una línea en blanco, que explique qué cambia y por qué sin inventar detalles ausentes en el contexto.
- Se adapta la validación de formato en `isConventionalSubject` para verificar la convención estructural evaluando únicamente la primera línea del mensaje recibido, evitando que respuestas multilínea válidas sean catalogadas erróneamente como `malformed`.
- Se evalúa y ajusta el presupuesto de tokens (`DEFAULT_MAX_TOKENS`) y distribución de contexto en base a mediciones reales de consumo de tokens con cuerpo frente a salidas de una sola línea.
- Queda fuera de alcance modificar los componentes de la interfaz de usuario (el campo de mensaje ya es multilínea), alterar el contrato de transporte o persistencia del commit en `git-ops.ts`, añadir nuevos campos de entrada o incorporar archivos o dependencias adicionales.

## Capabilities

### New Capabilities
- `commit-message-ai-generation`: Generación de mensajes de commit convencionales con asunto y cuerpo explicativo en prosa mediante el motor de IA local, con validación de la primera línea y presupuesto medido.

### Modified Capabilities

## Impact

- Código afectado: `electron/ai/commit-message/prompt.ts` y sus pruebas asociadas en `electron/__tests__/commit-message-prompt.test.ts`.
- APIs e IPC: `electron/ipc/commit-message-ai.ts` mantiene intacto su contrato devolviendo el texto generado completo al renderer.
- UI: El `<textarea>` existente en el panel de staging y en la vista de repositorio recibe y muestra el mensaje multilínea sin cambios estructurales.
- Dependencias: Sin dependencias nuevas ni cambios de arquitectura.
