## 1. Base verificada

- [x] 1.1 Confirmar rama, `tsc --noEmit` en cero y `pnpm test` en verde antes de editar, y registrar el conteo de pruebas de partida
- [x] 1.2 Listar los consumidores reales de `gates`, `delegations`, `visualDiffs` y `hermesConnected` con CodeGraph o búsqueda, separando producción de pruebas

## 2. UI

- [x] 2.1 Retirar `GateHistory.tsx` y `AuditorFindings.tsx` junto con sus usos en `PipelineDetails.tsx`
- [x] 2.2 Retirar de `PipelineEmptyState.tsx` toda mención a Hermes como fuente ausente
- [x] 2.3 Recortar `pipeline-details.test.ts` a lo que siga existiendo, sin borrar cobertura viva

## 3. Adaptador y vista

- [x] 3.1 Retirar `gates`, `delegations`, `visualDiffs` y `hermesConnected` de `pipeline-adapter.ts`
- [x] 3.2 Retirar los mismos campos de `pipeline-view-state.ts` y de `PipelineSnapshot`
- [x] 3.3 Actualizar `__fixtures__/pipeline-fixtures.ts` para que la vista previa no declare fuentes retiradas
- [x] 3.4 Recortar `pipeline-adapter.test.ts` y `pipeline-view-state.test.ts`

## 4. Reducción y eventos

- [x] 4.1 Retirar la fusión de gates, delegaciones y diffs visuales de `reducer.ts`
- [x] 4.2 Retirar el evento derivado `gate.changed` y su referencia a `docs/ai/logs/gates.jsonl`
- [x] 4.3 Recortar `reducer.test.ts`

## 5. Lectura de evidencia

- [x] 5.1 Retirar de `repo-evidence-reader.ts` la lectura de `docs/ai/logs/` y los campos derivados
- [x] 5.2 Verificar que un repositorio que todavía tenga esos archivos en disco no produzca ningún campo, según el escenario de la spec
- [x] 5.3 Recortar `pipeline-repo-evidence-reader.test.ts` conservando los casos de OpenSpec y Git

## 6. Parsers y tipos

- [x] 6.1 Retirar `normalizeGate`, `normalizeDelegation` y `normalizeVisualDiff` de `parsers.ts`
- [x] 6.2 Retirar `GateRecord`, `DelegationRecord` y `VisualDiffRecord` de `types/pipeline/`
- [x] 6.3 Recortar `parsers.test.ts`
- [x] 6.4 Confirmar con `tsc` que no queda ningún consumidor huérfano

## 7. i18n

- [x] 7.1 Retirar las cadenas de gates, delegaciones, diff visual, auditoría y Hermes en ES, EN y ZH
- [x] 7.2 Confirmar con la prueba de paridad de i18n que los tres idiomas quedan alineados

## 8. Cierre

- [x] 8.1 `pnpm exec tsc --noEmit` en cero
- [x] 8.2 `pnpm test` en verde, con la diferencia de conteo justificada por lo retirado y no por cobertura perdida
- [x] 8.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 8.4 `openspec validate remove-scaffold-evidence-layer --strict` válido
- [x] 8.5 Reporte en `docs/reports/` con lo tocado, lo no tocado y el detalle del conteo de pruebas
- [ ] 8.6 Frenar antes de staging y commit, y entregar a Ale
