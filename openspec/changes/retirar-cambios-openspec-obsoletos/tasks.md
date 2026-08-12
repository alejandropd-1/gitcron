# Tasks — retirar-cambios-openspec-obsoletos

## 1. Tipos compartidos y discriminante de cierre

- [ ] 1.1 Verificar que el cambio sigue activo (`openspec list --json` lo lista) antes de implementar; si no, parar.
- [ ] 1.2 En `types/pipeline/index.ts`, sumar a `OpenSpecArchivedChangeEvidence` un campo `closure: 'completed' | 'retired'` (con default `completed` en ausencia de `retirement.md`) y los datos del retiro leídos del frontmatter: `disposition`, `replacementChange`, `implementationState`, `retiredAt`.
- [ ] 1.3 Definir los tipos de dominio del retiro en un archivo de tipos del renderer (p. ej. junto a `pipeline-view-state.ts`): `RetirementDisposition = 'superseded' | 'no-longer-needed' | 'duplicate' | 'invalidated' | 'abandoned'`, `ImplementationState = 'none' | 'partial' | 'unknown'`, y el payload del plan/ejecución.

## 2. Wrapper del CLI

- [ ] 2.1 En `electron/pipeline/openspec-cli.ts`, agregar `retireOpenSpecChangeWithCli(repoPath, changeId)` que ejecute `['archive', changeId, '--yes', '--skip-specs']` reutilizando el patrón de `archiveOpenSpecChangeWithCli` (`CLI` por plataforma, `CHANGE_ID_PATTERN` antes del proceso, env de telemetría desactivada, parseo stderr→stdout→message, truncado a 4000) y devuelva `{ ok, error }`.
- [ ] 2.2 Exportar `composeRetireInstruction(changeId)` que devuelva `openspec archive ${changeId} --yes --skip-specs` (espejo de `composeArchiveInstruction` en `pipeline-next-action.ts`).

## 3. Registro canónico `retirement.md`

- [ ] 3.1 Crear un módulo `electron/pipeline/retirement-record.ts` con `writeRetirementRecord(changeDir, input)` que escriba `retirement.md` con YAML frontmatter (`schemaVersion: "1.0"`, `closureKind: retired`, `disposition`, `retiredAt` ISO-8601, `replacementChange`, `specSync: skipped`, `implementationState`, `completedTasks`, `totalTasks`, `sourceBranch`, `sourceHead`, `confirmedBy: human`) seguido del Markdown (motivo, explicación, consecuencias, reemplazo, declaración de specs no aplicadas, estado de implementación parcial, comando ejecutado).
- [ ] 3.2 Crear `readRetirementRecord(changeDir)` que parsea el frontmatter de forma tolerante (campos ausentes → `unknown`/`null`) y devuelva `null` si el archivo no existe.
- [ ] 3.3 Validar que la explicación libre y el replacement no se interpolan en ningún argumento del CLI; sólo se escriben en el archivo (cobertura de la invariante en tests de la sección 9).

## 4. IPC y preload

- [ ] 4.1 En `electron/ipc/`, crear `pipeline-retire.ts` con `registerPipelineRetireHandlers(...)` y dos canales: `pipeline:retire-plan` (valida, resuelve `canonicalPath`, devuelve el plan sin escribir) y `pipeline:retire-change` (escribe `retirement.md`, ejecuta el wrapper, relee evidencia, verifica las cuatro condiciones del filesystem, emite `repo:fs-change`). Usar el mismo DI que `pipeline-archive.ts`.
- [ ] 4.2 En `pipeline:retire-plan`, validar el motivo categórico, el replacement (slug válido, ≠ cambio actual, existe, no cíclico) cuando es `superseded`, la longitud de la explicación y el estado de implementación; rechazar todo lo demás.
- [ ] 4.3 Tras ejecutar, verificar: el cambio dejó `openspec/changes/`, apareció en `openspec/changes/archive/`, `retirement.md` viajó con él, y `openspec/specs/` no fue modificado por el archivado. Declarar éxito sólo si las cuatro se cumplen.
- [ ] 4.4 En `electron/preload.ts`, exponer `pipelineRetirePlan(repoPath, changeId)` y `pipelineRetireChange(repoPath, payload)` espejo de los de archivado; registrar los handlers en el bootstrap de `electron/main.ts`.

## 5. Lector de evidencia

- [ ] 5.1 En `electron/pipeline/repo-evidence-reader.ts`, al construir el item archivado seleccionado, leer `retirement.md` y poblar `closure` (`'retired'` si existe, `'completed'` si no) más los campos del retiro; los items no seleccionados siguen transportando sólo lo mínimo.
- [ ] 5.2 Asegurar que el contador de completados del snapshot (usado por el panel y la pantalla de entrada) excluya los `closure === 'retired'`, manteniendo una sola lista histórica con el discriminante.

## 6. Guía de próxima acción

- [ ] 6.1 En `components/pipeline/pipeline-next-action.ts`, sumar `{ kind: 'start-retire'; changeId: string }` a `PipelineActionIntent` y `composeRetireInstruction`.
- [ ] 6.2 Agregar `deriveRetireAvailability(change, archived)` que habilite retirar cuando `validation === 'passed'` y el cambio no esté archivado (no exige tareas completas), con su `reasonKey`.

## 7. UI

- [ ] 7.1 En `components/pipeline/OpenSpecDashboard.tsx`, agregar la acción secundaria «Retirar cambio…» junto a «Archivar cambio», con su handler `start-retire` que pide el plan y abre el modal de confirmación (paralelo al de archivado, fuera del scroll).
- [ ] 7.2 El modal pide motivo categórico, replacement (sólo si `superseded`, validado en vivo), explicación obligatoria y estado de implementación; muestra el comando exacto, los archivos que se crearán/moverán, las delta specs que no se sincronizarán y el recordatorio de no-commit.
- [ ] 7.3 Mostrar el badge «Retirado» distinto de «Completado»/«Archivado» en la lista histórica y en el detalle; mostrar motivo, fecha, estado de implementación, «Specs no consolidadas» y enlace al replacement, todos leídos del `retirement.md` (vía el snapshot).
- [ ] 7.4 Tras retirar, actualizar la atribución de archivos y ofrecer el circuito normal de «Preparar commit»; no crear commit automáticamente.

## 8. Mensaje de commit sugerido

- [ ] 8.1 En `lib/change-commit-scope.ts:suggestCommitMessage`, anteponer `retired ` (en vez de `archived `) cuando el conjunto es un cambio retirado, y nombrar el replacement cuando lo hay (p. ej. `chore(openspec): retirar <id> reemplazado por <replacement>`); conservar `archived ` para archivados y vacío para varios cambios.

## 9. i18n

- [ ] 9.1 Crear el bloque `pipeline.openspec.retire.*` en `lib/i18n.ts` (acción, ayuda, título de confirmación, campos, advertencias por estado de implementación, badge, done/failed, etc.) completo en ES (fuente), EN y ZH.
- [ ] 9.2 Verificar con un script de cobertura (o grep) que toda key nueva de retire existe en los tres idiomas.

## 10. Tests

- [ ] 10.1 Unitario del wrapper: mockear `execFile` como en `pipeline-openspec-cli-status.test.ts` y afirmar que los argumentos son `['archive', id, '--yes', '--skip-specs']` y que un slug inválido no toca el proceso.
- [ ] 10.2 Unitario de `retirement-record.ts`: escritura/lectura del frontmatter, parseo tolerante, y que la explicación/replacement nunca aparecen como argumentos.
- [ ] 10.3 IPC: seguindo `pipeline-archive-ipc.test.ts`, cubrir plan (anuncia `openspec archive <id> --yes --skip-specs` sin escribir), slug/repo inválido, fallo del CLI sin éxito falso, reemplazo inválido/cíclico bloquea, cambio ya archivado, cambio inexistente, y fixture bloquea escritura.
- [ ] 10.4 Integración: repo OpenSpec temporal (con `fs.mkdtemp` como `pipeline-archived-artifacts.test.ts`) con una delta spec deliberadamente contradictoria; retirar y comprobar que el cambio pasa a `archive/`, que `retirement.md` viajó y que la spec canónica quedó byte-igual.
- [ ] 10.5 UI: siguiendo `pipeline-change-archival.test.tsx`, cubrir habilitación con validación aprobada y tareas pendientes, bloqueo con validación fallida y con fixture, confirmación muestra el comando exacto sin ejecutar, retira por CLI al confirmar y relee, no declara retiro si el CLI falla, el badge «Retirado» aparece y el contador de completados no aumenta, e históricos sin `retirement.md` siguen como completados.
- [ ] 10.6 Commit scope: en `change-commit-scope.test.ts`, casos para `retired ` con y sin replacement, `archived ` intacto, y vacío para varios cambios; y una prueba de regresión de que el archivado normal sigue usando `openspec archive <id> --yes`.
- [ ] 10.7 Windows: cubrir (o documentar con el test del wrapper) que los argumentos siguen siendo literales/validados con `shell: true`.

## 11. Cierre

- [ ] 11.1 `pnpm exec tsc --noEmit` en cero sobre los archivos tocados.
- [ ] 11.2 `pnpm test` en verde (correr más de una vez por el flake conocido de repos Git reales).
- [ ] 11.3 `openspec validate retirar-cambios-openspec-obsoletos --strict` válido.
- [ ] 11.4 Auditoría humana del cambio (Ale): confirma el alcance, las decisiones de `design.md` —en especial Q1 (si retirar acepta cambios que no validan)— y el resultado de la validación. La marca Ale.
