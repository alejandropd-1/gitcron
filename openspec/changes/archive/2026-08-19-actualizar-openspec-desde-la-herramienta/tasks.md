## 1. Rango de versiones y desacoplamiento de estados

- [x] 1.1 En `lib/openspec-version.ts`, ampliar el rango soportado `SUPPORTED_OPENSPEC_VERSIONS` a `{ min: '1.5.0', max: '1.9.0' }` y actualizar los helpers de clasificación de compatibilidad.
- [x] 1.2 En `electron/pipeline/openspec-engine.ts` e IPC de Pipeline, separar el modelo de estado en tres dimensiones independientes: compatibilidad del motor (`versionClass`: `supported`, `too-old`, `too-new`, `absent`), novedad en npm (`freshnessState`: `cli-up-to-date`, `cli-upgrade-available`, `offline`) y vigencia de integración (`integrationState`: `up-to-date`, `outdated`, `divergent`, `conflicted`).
- [x] 1.3 Adaptar la matriz diagnóstica de actualización en `lib/openspec-update-guide.ts` para que un CLI 1.5.0 compatible con integración al día declare `action: 'none'` para el repositorio, exponiendo opcionalmente la guía informativa de actualización del motor a 1.9.0.

## 2. Salvaguardas de seguridad Git y canal IPC de ejecución de `openspec update`

- [x] 2.1 En `electron/pipeline/openspec-runner.ts` o módulo de ejecución de OpenSpec, implementar la función `runOpenSpecUpdate(repoPath, options)` que invoque el binario resuelto con `update`, variables `OPENSPEC_NO_UPDATE_CHECK=1`, telemetría desactivada y captura controlada de salida estándar y errores.
- [x] 2.2 Implementar las validaciones previas de seguridad Git antes de la ejecución: verificar que el repositorio esté autorizado en `authorizedRepoStore`, que el árbol de trabajo no tenga modificaciones sucias ajenas y que no se opere sobre ramas no aisladas con riesgos de sobreescritura.
- [x] 2.3 En `electron/ipc/pipeline-openspec.ts`, registrar el canal `pipeline:openspec:run-update` que valide el plan diagnóstico contra la evidencia viva del repositorio, ejecute la regeneración y devuelva el resultado estructurado (`filesUpdated`, `errors`, `status`).
- [x] 2.4 Manejar el estado `update-incomplete` ante salidas anormales del proceso hijo, capturando el inventario exacto de archivos modificados para ofrecer acciones seguras de reintento o descarte al usuario.

## 3. Interfaz de usuario e i18n

- [x] 3.1 En `lib/i18n.ts`, incorporar las traducciones en ES, EN y ZH para los estados desacoplados («Motor compatible · Versión 1.9.0 disponible en npm», «Integración al día con el motor activo», etc.) y para el flujo de ejecución de actualización.
- [x] 3.2 En `components/pipeline/OpenSpecEngineCard.tsx`, reflejar los estados desacoplados sin avisos alarmistas cuando el motor esté en versión soportada, y mantener el botón «Revisar actualización» como paso previo obligatorio.
- [x] 3.3 En `components/pipeline/OpenSpecUpdateReview.tsx`, agregar el botón de acción principal «Actualizar integración del repositorio» en el pie de la revisión, deshabilitándolo con explicación ante árbol sucio o rama protegida.
- [x] 3.4 En `OpenSpecUpdateReview.tsx`, al completar la actualización con éxito, mostrar el resumen de archivos regenerados y el botón informativo «Preparar commit» para invocar el flujo estándar de staging sin mutar Git automáticamente.
- [x] 3.5 En `OpenSpecUpdateReview.tsx` y `OpenSpecEngineCard.tsx`, mantener y clarificar la guía informativa de actualización del motor host (`npm i -g @fission-ai/openspec@latest`) con botón de copiado, sin invocar gestores de paquetes desde la app.

## 4. Pruebas unitarias y de integración

- [x] 4.1 En `lib/__tests__/openspec-version.test.ts`, verificar la clasificación de versiones para 1.9.0 como `supported`, <1.5.0 como `too-old` y >1.9.0 como `too-new`.
- [x] 4.2 En `lib/__tests__/openspec-update-guide.test.ts`, comprobar la resolución de la matriz diagnóstica bajo los estados desacoplados (CLI 1.5.0 + skills 1.5.0 $\rightarrow$ `none`; CLI 1.9.0 + skills 1.5.0 $\rightarrow$ `update`).
- [x] 4.3 En `electron/__tests__/pipeline-openspec-ipc.test.ts`, verificar el canal `pipeline:openspec:run-update`: autorización estricta de rutas, validación de huellas del plan, rechazo ante árbol sucio y ejecución con entorno limpio.
- [x] 4.4 En `components/pipeline/__tests__/pipeline-openspec-update-review.test.tsx` e integración de dashboard, verificar el flujo completo de 2 pasos (revisar $\rightarrow$ ejecutar), estados de carga, reporte de archivos tocados y botón de preparar commit.
- [x] 4.5 En `components/pipeline/__tests__/pipeline-i18n.test.ts`, verificar la paridad de claves del sub-namespace en ES, EN y ZH.

## 5. Cierre y validación

- [x] 5.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [x] 5.2 `pnpm test` en verde (dos pasadas consecutivas).
- [x] 5.3 `openspec validate actualizar-openspec-desde-la-herramienta --strict` en cero.
- [x] 5.4 Revisión visual y funcional manual por Alejandro. La marca Alejandro.
