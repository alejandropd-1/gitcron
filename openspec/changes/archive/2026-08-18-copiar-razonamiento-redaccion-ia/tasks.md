## 1. Internacionalización y Estilos

- [x] 1.1 En `lib/i18n.ts`, agregar las claves `pipeline.openspec.prepare.aiLogCopy` y `pipeline.openspec.prepare.aiLogCopied` en los diccionarios de español (`es`), inglés (`en`) y chino (`zh`).
- [x] 1.2 En `components/pipeline/OpenSpecDashboard.module.css`, definir las clases de estilo `.draftLogReasoningBox`, `.draftLogReasoningHeader` y `.draftLogCopyBtn` con tokens sobrios y diseño compacto.

## 2. Componente y Lógica de Copiado

- [x] 2.1 En `components/pipeline/CommitDraftLog.tsx`, incorporar el botón de copiado sobre el bloque de razonamiento (`log.reasoning.length > 0`) utilizando `navigator.clipboard.writeText` con manejo de confirmación transitoria (`copied`).

## 3. Pruebas Automatizadas y Validación

- [x] 3.1 Crear o actualizar pruebas unitarias en `components/pipeline/__tests__/commit-draft-log.test.tsx` verificando que con razonamiento se renderiza el botón y copia el texto, sin razonamiento no se renderiza, y las claves i18n existen en los 3 idiomas.
- [x] 3.2 Ejecutar las 6 validaciones obligatorias (`tsc`, `pnpm test` en dos pasadas, `openspec validate --strict` y `git diff --check`).
