## 1. Criterio Único de Inclusión y Filtrado de Modelos

- [x] 1.1 En `types/commit-message-ai.ts`, definir `isDraftableModel` y `filterDraftableModels` con criterio positivo exclusivo (`kind === 'llm'`).
- [x] 1.2 En `components/pipeline/OpenSpecDashboard.tsx`, unificar los tres puntos de filtrado usando `filterDraftableModels`.
- [x] 1.3 Corregir fixtures en `components/pipeline/__tests__/pipeline-commit-ai-panel.test.tsx` y `electron/__tests__/commit-message-local-provider.test.ts` con `type: 'embedding'` y `kind: 'embedding'`.
- [x] 1.4 Agregar pruebas unitarias para `isDraftableModel` / `filterDraftableModels` (`embedding`, `llm`, `vlm`) y realizar la prueba de sabotaje.

## 2. Tratamiento Accionable de Error HTTP 400

- [x] 2.1 En `lib/i18n.ts`, agregar la clave `pipeline.openspec.prepare.aiAdviceNotChatModel` en ES, EN y ZH.
- [x] 2.2 En `lib/stream-error-advice.ts`, incorporar el patrón para capturar errores HTTP 400 y modelos no aptos para redacción.
- [x] 2.3 En `lib/__tests__/stream-error-advice.test.ts`, agregar pruebas unitarias para el reconocimiento de error 400.

## 3. Consolidación del Aviso de Discrepancia de Rama

- [x] 3.1 En `components/pipeline/OpenSpecDashboard.tsx`, trasladar `ChangeBranchNotice` al interior de `noticesList` dentro de `noticesGroup` y actualizar `hasAnyNotice`.
- [x] 3.2 En `components/pipeline/__tests__/pipeline-change-branch-notice.test.tsx`, verificar que el aviso de rama se renderice dentro del contenedor de avisos y no suelto.

## 4. Validaciones Obligatorias

- [x] 4.1 Ejecutar las 6 validaciones obligatorias (`tsc`, `pnpm test` en dos pasadas, `openspec validate --strict` y `git diff --check`).
