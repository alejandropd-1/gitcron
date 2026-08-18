## Why

La API real de LM Studio devuelve `type: "embedding"` (singular), mientras que el selector de modelos en `components/pipeline/OpenSpecDashboard.tsx` filtraba mediante una lista negra `model.kind !== 'embeddings'` (plural) duplicada en tres puntos del código. Esto provocaba que modelos de embeddings figuraran en el selector y fallaran con HTTP 400 al solicitar chat completions. Asimismo, el aviso de discrepancia de rama se renderizaba suelto en la columna central en lugar de integrarse al contenedor unificado de AVISOS.

## What Changes

- Se reemplaza la lista negra frágil por un criterio unificado de inclusión (`isDraftableModel` / `filterDraftableModels` en `types/commit-message-ai.ts`) que acepta exclusivamente modelos cuyo tipo sea `'llm'`, descartando por omisión `'embedding'` o cualquier tipo desconocido.
- Se unifican los tres puntos de filtrado en `components/pipeline/OpenSpecDashboard.tsx`.
- Se corrigen las fixtures de pruebas en `components/pipeline/__tests__/pipeline-commit-ai-panel.test.tsx` y `electron/__tests__/commit-message-local-provider.test.ts` para que utilicen los tipos reales de la API (`embedding`).
- Se añade reconocimiento de error HTTP 400 en `lib/stream-error-advice.ts` y mensajes accionables en `lib/i18n.ts` para los tres idiomas (ES, EN, ZH).
- Se traslada `ChangeBranchNotice` al interior del contenedor agrupador de AVISOS (`noticesGroup` / `noticesList`) en `OpenSpecDashboard.tsx`, conservando su condición y texto.

## Capabilities

### New Capabilities
- `model-selection-allowlist`: Filtrado positivo exclusivo de modelos aptos para redacción (`llm`) y diagnóstico accionable de error 400.
- `branch-notice-consolidation`: Integración del aviso de rama dentro del contenedor común de avisos del dashboard.

### Modified Capabilities

## Impact

- Código afectado: `types/commit-message-ai.ts`, `components/pipeline/OpenSpecDashboard.tsx`, `lib/stream-error-advice.ts`, `lib/i18n.ts`, `electron/ai/commit-message/local-provider.ts`.
- Pruebas afectadas: `components/pipeline/__tests__/pipeline-commit-ai-panel.test.tsx`, `components/pipeline/__tests__/pipeline-change-branch-notice.test.tsx`, `electron/__tests__/commit-message-local-provider.test.ts`, `lib/__tests__/stream-error-advice.test.ts`.
