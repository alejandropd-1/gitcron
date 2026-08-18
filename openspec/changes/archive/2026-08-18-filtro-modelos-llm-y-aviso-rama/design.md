## Context

El catálogo nativo de LM Studio (`GET /api/v1/models`) retorna `type: "embedding"` en singular. El componente `OpenSpecDashboard.tsx` filtraba con `model.kind !== 'embeddings'` en tres lugares independientes. Esta divergencia permitía que modelos de embeddings se seleccionaran y provocaran fallos HTTP 400 al solicitar chat completions.

Adicionalmente, el componente `ChangeBranchNotice` se renderizaba de forma suelta debajo del encabezado del cambio activo en la columna central, fuera del contenedor agrupador de AVISOS (`noticesGroup`) que ya aloja los avisos de motor y de herramientas de OpenSpec.

## Goals / Non-Goals

**Goals:**
- Implementar `isDraftableModel` y `filterDraftableModels` en `types/commit-message-ai.ts` como punto único de verdad con criterio positivo (`model.kind === 'llm'`).
- Reemplazar las tres ocurrencias de filtrado en `components/pipeline/OpenSpecDashboard.tsx`.
- Corregir fixtures de pruebas para reflejar el valor real `type: 'embedding'` y `kind: 'embedding'`.
- Traducir errores 400 a una explicación accionable mediante `lib/stream-error-advice.ts` e `i18n.ts`.
- Mover `ChangeBranchNotice` dentro de `noticesList` en `OpenSpecDashboard.tsx`.

**Non-Goals:**
- No alterar `normalizeSubject`, `SYSTEM_PROMPT`, ni presupuestos de tokens.
- No alterar el texto ni la lógica de derivación del aviso de rama.

## Decisions

- **Decisión 1: Lista blanca positiva en `types/commit-message-ai.ts`**:
  - `isDraftableModel(model: LocalModel): boolean => model.kind === 'llm'`.
  - Todo tipo desconocido (e.g. `'vlm'`, `'embedding'`, vacíos) queda automáticamente descartado.
- **Decisión 2: Patrón de error para HTTP 400 en `stream-error-advice.ts`**:
  - Se añade un patrón que captura respuestas 400 o menciones de modelos de embeddings y devuelve la clave `aiAdviceNotChatModel`.
- **Decisión 3: Integración de `ChangeBranchNotice` en `noticesList`**:
  - Se incluye la verificación de discrepancia de rama (`hasBranchMismatchNotice`) en `hasAnyNotice`, renderizando `ChangeBranchNotice` como parte de `noticesList`.

## Risks / Trade-offs

- [Riesgo: Cambios en el formato del catálogo de LM Studio en versiones futuras] → Mitigación: El criterio de lista blanca (`kind === 'llm'`) garantiza que ningún tipo inesperado romperá las llamadas de chat.
