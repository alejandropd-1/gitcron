## 1. La metodología pasa al canal de la herramienta

- [x] 1.1 Escribir `context` en `openspec/config.yaml` con lo que un ejecutor necesita saber: qué es el proyecto, el stack, cómo se cierra una tanda y dónde viven las invariantes de producto
- [x] 1.2 Escribir `rules` por artefacto en `openspec/config.yaml`, con lo que hoy sólo vive en `AGENTS.md` y aplica a cada uno
- [x] 1.3 Verificar que `openspec instructions <artefacto> --change <id> --json` entrega ese contexto y esas reglas, para los cuatro artefactos del schema

## 2. Retirar lo que OpenSpec no define

- [x] 2.1 Quitar `SIGNATURE_TASK_TEXT`, `markSignatureTask` y `parseCommitManifest` de `electron/pipeline/change-commit-manifest.ts`, conservando `deterministicChangePaths` y `archiveCommitPaths`
- [x] 2.2 Dejar `electron/ipc/pipeline-archive.ts` con el archivado y nada más: sin firmar, sin commitear y sin manifiesto
- [x] 2.3 Quitar del panel la lista de archivos incluidos/excluidos y la casilla de confirmar en Git
- [x] 2.4 Retirar las claves de i18n que quedan sin uso, en ES, EN y ZH
- [x] 2.5 Ajustar los tests de `pipeline-commit-manifest` y `pipeline-archive-ipc` a lo que queda

## 3. Documentos sin contradicciones

- [x] 3.1 `AGENTS.md`: quitar la sección de firma y manifiesto, la obligatoriedad del reporte y la excepción de commit al archivar; dejarlo como puerta de entrada que apunta al canal de la herramienta
- [x] 3.2 `docs/01_INVARIANTES.md`: ajustar el punto 14 al cierre que queda y revisar los puntos que hablen de reglas retiradas
- [x] 3.3 `docs/00_FUENTE_DE_VERDAD.md`: corregir las cifras de tests contradictorias, `npx.cmd` por `pnpm exec`, la referencia a `codegraph_context`, y quitar `fallow` de los comandos obligatorios
- [x] 3.4 `docs/00_FUENTE_DE_VERDAD.md`: retirar el vocabulario de fases previo a OpenSpec de la sección de cierre
- [x] 3.5 Verificar que ninguna regla queda escrita en dos lugares a la vez

## 4. Cierre

- [x] 4.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.2 `pnpm exec tsc --noEmit` en cero
- [x] 4.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 4.4 `openspec validate align-method-with-openspec --strict` válido
- [ ] 4.5 Comprobar con la aplicación que archivar un cambio ya no toca Git ni marca casillas
