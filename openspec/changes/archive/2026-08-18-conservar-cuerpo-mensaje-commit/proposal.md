## Why

Aunque el modelo de lenguaje local redacta correctamente asunto y cuerpo tras el change `cuerpo-mensaje-commit-ia`, la función `normalizeSubject` en `electron/ai/commit-message/local-provider.ts:282` descartaba deliberadamente todas las líneas posteriores a la primera con contenido, impidiendo que el cuerpo redactado llegara al campo de mensaje de commit. Adicionalmente, se requiere poder copiar el resultado generado (`log.content`) directamente desde el panel de redacción con IA.

## What Changes

- Se actualiza `normalizeSubject` en `electron/ai/commit-message/local-provider.ts` para conservar el cuerpo explicativo completo con la línea en blanco de separación requerida por Git, preservando el descarte de cercados de bloques de código (```), la limpieza de comillas del asunto y el comportamiento unilínea intacto cuando no hay cuerpo.
- Se añade un control de copiado sobre la sección de resultado (`log.content`) en `components/pipeline/CommitDraftLog.tsx` con confirmación visual transitoria.
- Se incorporan las claves de traducción correspondientes en `lib/i18n.ts` para español, inglés y chino (ES, EN, ZH).
- Queda fuera de alcance modificar el `SYSTEM_PROMPT`, alterar el presupuesto de tokens (`DEFAULT_MAX_TOKENS`), o modificar la lógica de persistencia de Git.

## Capabilities

### New Capabilities
- `commit-draft-body-preservation`: Preservación integral del cuerpo del mensaje de commit redactado por la IA local en el transporte al campo de staging y control de copiado del resultado en el panel de redacción.

### Modified Capabilities

## Impact

- Código afectado: `electron/ai/commit-message/local-provider.ts`, `components/pipeline/CommitDraftLog.tsx`, `components/pipeline/OpenSpecDashboard.module.css` y `lib/i18n.ts`.
- Pruebas afectadas: `electron/__tests__/commit-message-local-provider.test.ts` y `components/pipeline/__tests__/commit-draft-log.test.tsx`.
- Sin dependencias adicionales ni cambios en APIs externas.
