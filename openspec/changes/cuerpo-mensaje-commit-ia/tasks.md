## 1. Modificación de Prompt y Validación de Mensaje

- [ ] 1.1 En `electron/ai/commit-message/prompt.ts`, extender `SYSTEM_PROMPT` para solicitar asunto convencional (<72 caracteres), línea en blanco y cuerpo explicativo conciso en prosa en español que explique qué cambia y por qué sin inventar ni duplicar listas.
- [ ] 1.2 En `electron/ai/commit-message/prompt.ts`, actualizar `isConventionalSubject` para validar exclusivamente la primera línea del mensaje recibido contra `SUBJECT_SHAPE`, permitiendo mensajes multilínea sin catalogarlos como malformados.
- [ ] 1.3 Revisar el uso de `isConventionalSubject` en `electron/ipc/commit-message-ai.ts:374` confirmando la propagación y entrega íntegra del mensaje multilínea generado.

## 2. Medición de Presupuesto y Calibración de Tokens

- [ ] 2.1 Medir el consumo real de tokens de salida del modelo local con cuerpo frente a salidas de una sola línea sobre un diff real del repositorio.
- [ ] 2.2 Ajustar `DEFAULT_MAX_TOKENS` en `electron/ai/commit-message/prompt.ts` si la evidencia lo requiere, documentando la medición concreta en el comentario de la constante.

## 3. Pruebas Automatizadas y Validación

- [ ] 3.1 En `electron/__tests__/commit-message-prompt.test.ts`, agregar y actualizar tests que verifiquen: aceptación de asunto válido + cuerpo, rechazo de asunto no convencional con/sin cuerpo, soporte de mensaje unilínea intacto, y verificación del contenido del nuevo `SYSTEM_PROMPT`.
- [ ] 3.2 En `electron/__tests__/commit-message-prompt.test.ts`, verificar tests de regresión para `buildUserPrompt` asegurando el orden de bloques y omisión de secciones vacías.
- [ ] 3.3 Ejecutar las validaciones completas del proyecto (`tsc`, `pnpm test` en dos pasadas, `openspec validate --strict` y `git diff --check`).
