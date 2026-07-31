# Tasks — add-explicit-change-archival

## 1. Disponibilidad de archivado como función pura

- [x] 1.1 Agregar `deriveArchiveAvailability(change, archived)` en `pipeline-next-action.ts`, devolviendo `{ available, reasonKey, pendingTasks }`
- [x] 1.2 Validación aprobada ⇒ `available: true`, sin importar tareas pendientes ni sesiones persistidas
- [x] 1.3 Validación `failed` o `unknown` ⇒ `available: false` con el motivo declarado
- [x] 1.4 Cambio archivado o sin cambio seleccionado ⇒ no se ofrece
- [x] 1.5 Tests de la función pura, un caso por fila de la tabla de decisión

## 2. Control de archivado en el workspace

- [x] 2.1 Renderizar el control junto al cambio seleccionado, usando el intent `start-archive` existente
- [x] 2.2 Etiqueta que declara las tareas pendientes cuando las hay
- [x] 2.3 Estado deshabilitado con motivo visible cuando la validación no está aprobada
- [x] 2.4 Respetar `fixtureActive`: en vista previa el control no ejecuta nada

## 3. El lanzador arranca hacia el destino confirmado

- [x] 3.1 Guardar el destino (`taskId`) junto a la instrucción al confirmar una acción, en vez de re-derivarlo de `nextTask`
- [x] 3.2 `PipelineRuntimeLauncher` recibe ese `taskId` y la etiqueta correspondiente
- [x] 3.3 Test: archivar con tareas pendientes arranca sin tarea asociada y con etiqueta de archivado
- [x] 3.4 Test: continuar una tarea arranca con esa tarea y con etiqueta de continuación

## 4. i18n

- [x] 4.1 Strings nuevas en español
- [x] 4.2 Mismas strings en inglés
- [x] 4.3 Mismas strings en chino
- [x] 4.4 Verificar que no queda ninguna string de UI hardcodeada

## 5. Archivar de verdad (ampliación tras QA)

- [x] 5.1 `archiveOpenSpecChangeWithCli(repoPath, changeId)` en `openspec-cli.ts`, con argumentos fijos y el slug ya validado
- [x] 5.2 Devolver el motivo real del CLI cuando falla, sin normalizarlo a un éxito
- [x] 5.3 Canal IPC `pipeline:archive-change` en su propio módulo, para no meter una escritura en el módulo de snapshot declarado read-only
- [x] 5.4 Exponerlo en `preload.ts` y en `types/electron.d.ts`
- [x] 5.5 Registrar el handler en `main.ts`
- [x] 5.6 El control de archivado pide confirmación mostrando el comando exacto, y recién ahí ejecuta
- [x] 5.7 Al archivar con éxito, releer la evidencia para que el cambio figure archivado
- [x] 5.8 Mostrar el error real del CLI cuando falla
- [x] 5.9 `composeArchiveInstruction` devuelve el comando real en vez del slash command inexistente
- [x] 5.10 Bloquear la ejecución con `fixtureActive`
- [x] 5.11 i18n de las strings nuevas en ES, EN y ZH
- [x] 5.12 Tests del wrapper del CLI, del canal IPC y del flujo de confirmación
- [x] 5.13 Declarar el archivado exitoso nombrando el cambio: al desaparecer de la lista activa, sin aviso la única señal del éxito era una desaparición

## 5b. Que la app avise lo que hace (segunda pasada de QA)

- [x] 5b.1 Mover la confirmación de archivado fuera del área con scroll, pegada a la fila de acciones
- [x] 5b.2 Indicador de progreso visible mientras el CLI archiva
- [x] 5b.3 `PipelineWorkspace` conserva el snapshot vigente mientras revalida, en vez de caer al estado de carga
- [x] 5b.4 Declarar la actualización en curso sin tapar el contenido
- [x] 5b.5 El estado de carga queda sólo para cuando no hay snapshot previo
- [x] 5b.6 i18n de las strings nuevas en ES, EN y ZH
- [x] 5b.7 Test: el aviso de archivado sobrevive al refresco posterior
- [x] 5b.8 Test: con snapshot previo se revalida sin blanquear; sin snapshot previo sí se muestra carga

## 6. Cierre

Se reinician al ampliarse el alcance: las corridas anteriores no cubren el trabajo nuevo.

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test` en verde
- [x] 6.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 6.4 `openspec validate add-explicit-change-archival --strict` válido
- [x] 6.5 Reporte en `docs/reports/` actualizado con la ampliación
- [ ] 6.6 Frenar antes de staging y entregar a Ale
