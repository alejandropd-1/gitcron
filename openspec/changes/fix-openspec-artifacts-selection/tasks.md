## 1. Base verificada

- [x] 1.1 Confirmar rama, `tsc --noEmit` en cero y `pnpm test` en verde (548)
- [x] 1.2 Confirmar el flujo de evidencia: reader → service → IPC → renderer, y dónde se inyecta `selectedChangeId`

## 2. Selección manual en el backend

- [x] 2.1 `RepoEvidenceReader.read` acepta `selectedChangeId?: string | null` con precedencia sobre `selectPipelineChange`
- [x] 2.2 `pipeline-service.refresh` pasa el `selectedChangeId` al reader
- [x] 2.3 IPC `pipeline:get-snapshot` / `subscribe` aceptan y reenvían `selectedChangeId`
- [x] 2.4 Preload expone `pipelineGetSnapshot(repoPath, selectedChangeId?)`
- [x] 2.5 `types/electron.d.ts` actualizado para el bridge

## 3. Selección manual en el renderer

- [x] 3.1 Estado `manualSelection` en `PipelineWorkspace`; reset al cambiar de repo (patrón render, sin effect)
- [x] 3.2 Reenviar `manualSelection` en load y subscribe
- [x] 3.3 `OpenSpecDashboard` acepta `onSelectChange`; `selectChange` y `openArtifact` lo disparan

## 4. Pestaña dedicada de markdown

- [x] 4.1 `CenterTab` añade `'artifacts'`; `PipelineDetails` se monta en esa pestaña (no al final de Trabajo)
- [x] 4.2 Los intents `view-evidence`/`view-diff` llevan a la pestaña `artifacts`
- [x] 4.3 `openArtifact` lleva a la pestaña `artifacts` con la subpestaña correcta
- [x] 4.4 `showEvidence` retirado (era el estado que colgaba el markdown al final)
- [x] 4.5 i18n `pipeline.openspec.tabs.artifacts` en ES/EN/ZH

## 5. Tests

- [x] 5.1 Prueba: reader transporta contenido del change seleccionado manualmente aunque la rama no coincida
- [x] 5.2 Prueba: sin selección manual, cae a la automática (null cuando hay varios sin match)
- [x] 5.3 Prueba: un selectedChangeId que no existe entre los activos se ignora (fallback)

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test` en verde (549, +1 nuevo)
- [x] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 6.4 `openspec validate fix-openspec-artifacts-selection --strict` válido
- [x] 6.5 Reporte en `docs/reports/`
- [ ] 6.6 Frenar antes de staging y entregar a Ale con la QA visual pendiente
