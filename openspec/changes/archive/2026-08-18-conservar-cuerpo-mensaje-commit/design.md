## Context

Tras habilitar la generación de asunto y cuerpo en el prompt del sistema, se observó que al campo de commit sólo llegaba la primera línea del mensaje generado. La causa directa radica en `normalizeSubject` (`electron/ai/commit-message/local-provider.ts:282`), que mediante `.find((part) => part.length > 0 && !part.startsWith('```'))` extraía únicamente la primera línea con texto y descartaba todo el resto.

Adicionalmente, en `components/pipeline/CommitDraftLog.tsx` se incorporó recientemente el copiado del razonamiento (`log.reasoning`), pero el resultado final redactado (`log.content`) carecía de un control análogo de copiado rápido desde el panel.

## Goals / Non-Goals

**Goals:**
- Modificar `normalizeSubject` en `electron/ai/commit-message/local-provider.ts` para que conserve el mensaje completo: asunto limpio, línea en blanco de separación y cuerpo en prosa.
- Preservar la eliminación de bloques de código Markdown (```) y comillas del asunto.
- Garantizar que una respuesta de una sola línea retorne exactamente el asunto limpio sin saltos extra.
- Incorporar un control de copiado accesible para `log.content` en `components/pipeline/CommitDraftLog.tsx` con confirmación temporal de 2 segundos.
- Agregar claves i18n para el copiado del resultado en español, inglés y chino en `lib/i18n.ts`.

**Non-Goals:**
- No alterar `SYSTEM_PROMPT` ni el presupuesto `DEFAULT_MAX_TOKENS`.
- No alterar los contratos IPC ni agregar dependencias.

## Decisions

- **Decisión 1: Algoritmo de normalización en `normalizeSubject`**:
  - *Elección*:
    1. Dividir la cadena en líneas y filtrar líneas de cercado (`part.trim().startsWith('```')`).
    2. Identificar el índice de la primera línea no vacía como asunto y remover sus comillas envolventes (`^["'`]+|["'`]+$`).
    3. Si no hay línea no vacía o el asunto queda vacío, retornar `null`.
    4. Extraer las líneas posteriores al asunto. Si no existen o están vacías, retornar únicamente el asunto (comportamiento unilínea).
    5. Si existen líneas posteriores con contenido, recortar líneas en blanco iniciales/finales del cuerpo y concatenar: `subject + '\n\n' + bodyLines.join('\n')`.
  - *Justificación*: Asegura la separación canónica de Git (asunto + línea en blanco + cuerpo) incluso si el modelo omitió la línea en blanco entre el asunto y el primer párrafo, a la vez que preserva el comportamiento 100% idéntico para respuestas de una sola línea.

- **Decisión 2: Control de copiado de resultado en `CommitDraftLog.tsx`**:
  - *Elección*: Añadir un botón `.draftLogCopyBtn` dentro del encabezado `.draftLogAnswerHeader` que copia `log.content` con estado reactivo `copiedContent` y timeout de 2.000 ms.
  - *Justificación*: Mantiene consistencia visual y de interacción con el botón existente de razonamiento.

## Risks / Trade-offs

- [Riesgo: Un modelo produce saltos de línea irregulares en Windows/Unix] → Mitigación: Normalizar la división de líneas con `/\r?\n/` y reconstruir con `\n`.
