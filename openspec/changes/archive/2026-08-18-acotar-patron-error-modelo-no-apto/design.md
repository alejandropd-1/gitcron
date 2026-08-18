## Context

El reconocimiento de errores en `lib/stream-error-advice.ts` traduce errores crudos a mensajes orientativos para el usuario. La regla `aiAdviceNotChatModel` contenía tokens sueltos como `\b400\b` y `embedding` que podían disparar falsos positivos ante mensajes ajenos que contuvieran el número 400 o el término embedding en otros contextos.

## Goals / Non-Goals

**Goals:**
- Ajustar la expresión regular en `PATRONES` (`lib/stream-error-advice.ts`) para asociar 400 a códigos/estados de respuesta y embedding a la incompatibilidad del modelo de chat.
- Garantizar que ante ambigüedad se devuelva `null` para no desviar la atención del error real.
- Incorporar pruebas unitarias positivas y negativas.

**Non-Goals:**
- No alterar `isDraftableModel`, `normalizeSubject` ni `SYSTEM_PROMPT`.

## Decisions

- **Decisión 1: Expresión regular contextual**:
  - `/respondió 400|status(?:\s+code)?[:\s]+400|HTTP\s+400|["']code["']\s*:\s*400|embedding\s+model|model.*embedding|not\s+a\s+chat\s+model|model.*(?:not\s+support|cannot\s+generate)/i`
  - Reemplaza `\b400\b` y `embedding` suelto por frases donde el 400 califica a la respuesta HTTP o al código de estado, y embedding califica al modelo.
