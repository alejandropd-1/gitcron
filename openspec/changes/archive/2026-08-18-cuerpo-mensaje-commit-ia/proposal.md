## Why

La generación asistida de mensajes de commit mediante IA local sólo producía un asunto de una única línea debido a una restricción explícita en `electron/ai/commit-message/prompt.ts:19` (`"Respondés UNA sola línea, nada más"`). Cuando un cambio combina múltiples aspectos —como la introducción de una funcionalidad y una corrección de seguridad en varios módulos—, un asunto aislado resulta insuficiente para documentar el impacto y la motivación técnica, ocultando cambios críticos en el historial.

Adicionalmente, el prompt exigía al modelo un `"Máximo 72 caracteres."`. Dado que los modelos de lenguaje trabajan sobre tokens y no pueden contar caracteres de forma fiable, los modelos con capacidad de razonamiento desperdiciaban miles de tokens de razonamiento deletreando letras para verificar el largo. Remover este límite numérico alinea el pedido con el validador en código, que deliberadamente no evalúa el largo en caracteres.

## What Changes

- Se amplía y ajusta la instrucción del sistema (`SYSTEM_PROMPT`) en `electron/ai/commit-message/prompt.ts` para solicitar un asunto convencional conciso y directo al punto (sin exigir conteo de caracteres al modelo), una línea en blanco y un cuerpo breve en prosa en español que explique qué cambia y por qué sin inventar detalles ausentes en el contexto.
- Se adapta la validación de formato en `isConventionalSubject` para verificar la convención estructural evaluando únicamente la primera línea del mensaje recibido, evitando que respuestas multilínea válidas sean catalogadas erróneamente como `malformed`.
- Se evalúa y ajusta el presupuesto de tokens (`DEFAULT_MAX_TOKENS`) en base a mediciones reales de tokens de razonamiento (con y sin cuenta de caracteres) y tokens de salida (con y sin cuerpo).
- Queda fuera de alcance modificar los componentes de la interfaz de usuario (el campo de mensaje ya es multilínea), alterar el contrato de transporte o persistencia del commit en `git-ops.ts`, añadir nuevos campos de entrada o incorporar archivos o dependencias adicionales.

## Capabilities

### New Capabilities
- `commit-message-ai-generation`: Generación de mensajes de commit convencionales con asunto conciso y cuerpo explicativo en prosa mediante el motor de IA local, con validación de la primera línea y presupuesto medido sin forzar conteo de caracteres.

### Modified Capabilities

## Impact

- Código afectado: `electron/ai/commit-message/prompt.ts` y sus pruebas asociadas en `electron/__tests__/commit-message-prompt.test.ts`.
- APIs e IPC: `electron/ipc/commit-message-ai.ts` mantiene intacto su contrato devolviendo el texto generado completo al renderer.
- UI: El `<textarea>` existente en el panel de staging y en la vista de repositorio recibe y muestra el mensaje multilínea sin cambios estructurales.
- Dependencias: Sin dependencias nuevas ni cambios de arquitectura.
