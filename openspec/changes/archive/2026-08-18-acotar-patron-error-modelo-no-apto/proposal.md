## Why

En `lib/stream-error-advice.ts:31`, el patrón para identificar fallos por modelos no aptos para redacción incluía términos demasiado amplios (`\b400\b`, `embedding` sueltos) capaces de coincidir con errores ajenos como límites de tiempo de 400 ms o menciones no relacionadas de embeddings, emitiendo un diagnóstico engañoso.

## What Changes

- Se acota el patrón en `lib/stream-error-advice.ts` exigiendo contexto explícito: errores HTTP 400 vinculados a la petición/código de estado, o menciones de embedding ligadas al tipo de modelo o a la incapacidad de generar chat completions.
- Se incorporan casos de prueba negativos para verificar que errores con números 400 contextuales (timeouts, tamaños) o palabras de embeddings ajenas retornen `null`.

## Capabilities

### New Capabilities
- `narrow-chat-model-error-pattern`: Reconocimiento contextual estricto del error 400 y de modelos de embeddings sin falsos positivos.

### Modified Capabilities

## Impact

- Código afectado: `lib/stream-error-advice.ts` y `lib/__tests__/stream-error-advice.test.ts`.
- Sin dependencias ni cambios en componentes o contratos IPC.
