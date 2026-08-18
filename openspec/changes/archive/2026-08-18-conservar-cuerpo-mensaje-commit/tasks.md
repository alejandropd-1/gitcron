## 1. Normalización de Asunto y Cuerpo en Backend

- [x] 1.1 En `electron/ai/commit-message/local-provider.ts`, actualizar `normalizeSubject` para preservar el cuerpo explicativo completo con separación de línea en blanco, eliminando cercados de código y comillas del asunto, manteniendo el caso de una línea.
- [x] 1.2 En `electron/__tests__/commit-message-local-provider.test.ts`, actualizar y añadir pruebas para `normalizeSubject` (asunto + cuerpo, unilínea, cercado Markdown con cuerpo, vacío/cercado nulo, comillas en asunto + cuerpo) y ejecutar la prueba de sabotaje.

## 2. Control de Copiado de Resultado e Internacionalización

- [x] 2.1 En `lib/i18n.ts`, agregar las claves `pipeline.openspec.prepare.aiLogResultCopy` y `pipeline.openspec.prepare.aiLogResultCopied` en los diccionarios de español (`es`), inglés (`en`) y chino (`zh`).
- [x] 2.2 En `components/pipeline/OpenSpecDashboard.module.css`, definir `.draftLogAnswerHeader` para alinear el título y el botón de copiado.
- [x] 2.3 En `components/pipeline/CommitDraftLog.tsx`, agregar el botón de copiado de resultado sobre `log.content` con estado reactivo y confirmación visual.

## 3. Pruebas y Validaciones

- [x] 3.1 En `components/pipeline/__tests__/commit-draft-log.test.tsx`, agregar pruebas para el botón de copiado de resultado y verificar presencia de claves en los tres idiomas.
- [x] 3.2 Ejecutar las 6 validaciones obligatorias (`tsc`, `pnpm test` en dos pasadas, `openspec validate --strict` y `git diff --check`).
