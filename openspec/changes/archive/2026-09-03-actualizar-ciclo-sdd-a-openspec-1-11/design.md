## Context

GitCron integraba un subconjunto de comandos de OpenSpec compatible con la versión 1.5.0. Al actualizar el entorno y el motor local a la versión 1.11.0, se evidenció que las capacidades nativas añadidas por la herramienta (contrato estructurado `--json`, deltas de especificación `--diff`, pre-verificación de archivado y resolución declarativa de instrucciones) superan y simplifican el código ad-hoc implementado en GitCron.

Ver `proposal.md` para la motivación y el alcance general.

## Goals / Non-Goals

**Goals:**
- Consumir el contrato estructurado nativo de OpenSpec 1.11 (`instructions --json`, `show --diff`) en lugar de componer texto procedural manual.
- Garantizar total transparencia en los formularios del ciclo SDD: ningún control ejecuta escrituras en Git sin declararlo en su rótulo.
- Validar la consistencia de los deltas de requisitos (`MODIFIED` vs `ADDED`) y la completitud de tareas antes de solicitar el archivado de un cambio.
- Declarar la versión objetivo del ciclo (`1.11.0`) e informar cuando la versión instalada en el sistema huésped la supere.
- Auditar y declarar minuciosamente la cobertura de las 55 tareas de `gestionar-ciclo-openspec-desde-gitcron`.

**Non-Goals:**
- No reimplementar ni alterar la suite de runtimes y adaptadores existentes.
- No mutar el diseño estructural de la vista de SDD (perteneciente a `remaquetar-cuerpo-de-sdd`).
- No acoplar operaciones de Git mutante (como commit automático) al archivado de cambios.

## Decisions

### 1. Composición de instrucciones de propuesta y exploración (Decisión 2.1 y 2.4 - Opción a)
- **Decisión:** `submitPropose` y `submitExplore` componen la instrucción directamente a partir de los campos del formulario sin consultar previamente a `openspec instructions`.
- **Motivo:** Al momento de proponer un nuevo change o explorar una idea, el directorio `openspec/changes/<slug>` aún no existe en el sistema de archivos. El subcomando `openspec instructions proposal --change <slug>` exige obligatoriamente `--change` y falla con severidad `error: "Change 'x' not found"` si se invoca sobre un cambio no creado. La creación de la estructura y de los artefactos iniciales es responsabilidad del prompt/skill del agente ejecutor.
- **Consecuencia:** Se elimina el estado muerto `engineError` en el flujo de nuevo cambio y se documenta la decisión en código y `tasks.md`.

### 2. Transparencia en la creación de ramas Git (Decisión 4.2)
- **Decisión:** Se corrige el rótulo del botón de acción principal para indicar «Crear rama y elegir runtime» cuando `withBranch` está marcado, y «Elegir runtime» cuando está desmarcado.
- **Alternativas descartadas:**
  - *Diálogo modal de confirmación:* La casilla `withBranch` ya es la decisión explícita y visible del usuario; un modal agregaría pasos redundantes.
  - *Mover la creación al lanzamiento del agente:* Al pasar a la pantalla del lanzador para elegir runtime, el repositorio ya debe estar parado en la rama de trabajo para garantizar coherencia en el entorno y en la vista previa de la instrucción.

### 3. Validación de deltas y preflight de archivado (Decisión 3.2 - Opción b)
- **Decisión:** La comprobación de integridad previa al archivado se realiza mediante `validateChangeDeltaRequirements` (en `openspec-delta-validator.ts`), integrada directamente en el planificador y ejecutor de archivado (`pipeline-archive.ts`).
- **Motivo:** `openspec validate --archived` valida la totalidad de los cambios ya archivados en el repositorio, pero no pre-valida el cambio activo individual antes de ejecutar `openspec archive`. GitCron intercepta los requisitos `MODIFIED` inválidos (que no existen en `openspec/specs/`) y las tareas pendientes `[ ]` en `tasks.md` antes de invocar el proceso CLI, evitando errores tardíos de consolidación. Se elimina el canal IPC desconectado de `validate-archived` para no mantener código muerto.

---

## Declaración de cobertura de `gestionar-ciclo-openspec-desde-gitcron` (Tarea 7.6)

Auditoría de las **55 tareas** que `gestionar-ciclo-openspec-desde-gitcron` tenía al momento de
escribirla, secciones 1 a 10, contrastadas con lo que OpenSpec 1.11.0 y este change resuelven.

Dos aclaraciones sobre su alcance, para que se sepa qué se puede podar con esto y qué no:

- **El detalle no es parejo.** 26 tareas tienen veredicto individual (secciones 1, 2, 3, 3b, 4 y 5);
  las otras 29 van declaradas por rangos —«6.1 a 6.5», «8.1 a 8.4», «9.2 a 9.5»—. La sección 10
  (10.1 a 10.5) queda sin veredicto: son procedimientos de cierre y se resuelven al ejecutarla.
- **El change creció después.** A raíz de esta misma declaración se le agregaron cuatro tareas que
  ninguna herramienta cubre: la sección 3c (el recorrido de artefactos tal como lo devuelve
  `openspec instructions --json`) y la tarea 6.7 (ofrecer la actualización del motor con el patrón
  del actualizador propio de GitCron). Hoy son 59, y esas cuatro no están auditadas acá porque son,
  precisamente, el resultado de esta auditoría.


### Sección 1. Corrección del estado de integración (Tareas 1.1 a 1.3)
- **1.1** [CUBIERTA por GitCron]: Derivación de `integrationState` basada en `installedWorkflowsByTarget` y `targets` de `electron/pipeline/openspec-evidence.ts`.
- **1.2** [CUBIERTA por GitCron]: Cubierto con pruebas de sabotaje en `electron/__tests__/pipeline-openspec-evidence.test.ts`.
- **1.3** [CUBIERTA por GitCron]: Verificación en `OpenSpecEngineCard.tsx` para no reportar «Al día» con targets sin configurar.

### Sección 2. Autoría de tareas en el proceso principal (Tareas 2.1 a 2.5)
- **2.1** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Funciones puras `addTaskLine`, `editTaskText`, `moveTaskLine`, `removeTaskLine` en `task-checkbox.ts`. OpenSpec CLI no expone mutadores granulares de líneas de tareas individuales en `tasks.md`.
- **2.2** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Extensión de `composeTaskLogEntry` para registrar tipo de operación y autoría (humana vs agente) en GitCron.
- **2.3** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Pruebas unitarias de mutación y preservación de formato en `task-checkbox.ts`.
- **2.4** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Canales IPC `pipeline:tasks:*` para manipular tareas en el proceso principal.
- **2.5** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Pruebas de contención, validación de ruta autorizada y slug en canales de tareas.

### Sección 3. Escritura de artefactos en el proceso principal (Tareas 3.1 a 3.6)
- **3.1** [CUBIERTA por OpenSpec 1.11.0]: `openspec instructions <artefacto> --change <slug> --json` entrega de forma nativa `resolvedOutputPath`, `instruction`, `template`, `context`, `dependencies` y `unlocks`. Resuelto en `openspec-cli.ts` (`instructionsOpenSpecWithCli`).
- **3.2** [Simplificada por OpenSpec 1.11.0 - queda para gestionar-ciclo]: Canal de escritura de artefactos en `pipeline-specs.ts`, simplificado al usar el `resolvedOutputPath` que entrega el CLI en lugar de calcular rutas ad-hoc.
- **3.3** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Registro local en GitCron de auditoría de escritura de artefactos.
- **3.4** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Pruebas de seguridad contra path traversal en escritura de artefactos.
- **3.5** [CUBIERTA por OpenSpec 1.11.0]: La revisión de alcance multiartefacto está provista nativamente por el workflow `/opsx-update-change` (o subcomando equivalente) de OpenSpec, eliminando la necesidad de un motor complejo de reconciliación en GitCron.
- **3.6** [CUBIERTA conceptualmente por OpenSpec]: Criterio metodológico de bifurcación de change vs actualización de alcance documentado en prompts y esquemas.

### Sección 3b. Diagnóstico del motor (Tareas 3b.1 a 3b.4)
- **3b.1** [CUBIERTA por OpenSpec 1.11.0]: `openspec status --json` y `openspec validate --json` entregan el grafo estructurado de dependencias y estados de artefactos.
- **3b.2** [CUBIERTA por OpenSpec 1.11.0]: El campo `context` y `contextFiles` en `openspec instructions --json` entrega el contexto resuelto.
- **3b.3** [CUBIERTA por GitCron]: Integrado en `OpenSpecEngineCard.tsx` e `i18n.ts` respetando la clasificación y severidad del motor.
- **3b.4** [CUBIERTA por GitCron]: Pruebas unitarias en `electron/__tests__/pipeline-openspec-engine.test.ts` y tests de componentes.

### Sección 4. Sincronización de specs (Tareas 4.1 a 4.3)
- **4.1** [CUBIERTA por OpenSpec 1.11.0]: `openspec show <change> --diff` entrega de forma directa y determinista las modificaciones a `openspec/specs/` (`ADDED`, `MODIFIED`, `REMOVED`), sin requerir diffs artesanales de markdown.
- **4.2** [CUBIERTA por OpenSpec 1.11.0]: Sincronización y consolidación de deltas de specs delegada a `/opsx-sync-specs` o `openspec archive`.
- **4.3** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Pruebas de integración para la vista previa y confirmación de sincronización.

### Sección 5. Motivo al archivar (Tareas 5.1 a 5.3)
- **5.1** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: El comando `openspec archive <slug> --yes` no admite argumento de motivo. GitCron debe persistirlo en su histórico local si se desea registrar.
- **5.2** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Pruebas del registro de motivo en el backend de GitCron.
- **5.3** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Manejo de error de sistema de archivos `EPERM` en Windows ante procesos bloqueantes (servidores MCP/indexadores), advertido y documentado en el plan de archivado.

### Sección 6. Instalación del motor (Tareas 6.1 a 6.6)
- **6.1** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Resolución del gestor de paquetes (npm, pnpm, yarn, bun) con canonicalización de ruta en `electron/pipeline/`.
- **6.2** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Ejecución no interactiva de instalación local en el repositorio con captura de salida.
- **6.3** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Ejecución no interactiva de instalación global con reporte de rutas y comando ejecutado.
- **6.4** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Recálculo del estado del motor en disco tras cambios mediante `pipelineOpenSpec.getEngineStatus`.
- **6.5** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Pruebas de contención y autorización de llamadas al gestor de paquetes.
- **6.6** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Verificación manual sobre la aplicación empaquetada e instalada por Alejandro.

### Sección 7. Perfil de workflows (Tareas 7.1 a 7.5)
- **7.1** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Lectura de `openspec config list` en `readOpenSpecGlobalConfigWithCli` y canal `pipeline:openspec:global-config`.
- **7.2** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Canal IPC de activación y desactivación dinámica de un workflow individual.
- **7.3** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Pruebas de desactivación de acciones según configuración de workflows.
- **7.4** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Detección de desfase de versión vs workflows no soportados implementada en `lib/openspec-version.ts` y tarjeta del motor.
- **7.5** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Declaración de versión de ciclo objetivo (`OPENSPEC_CYCLE_TARGET_VERSION = '1.11.0'`) y detección de versión instalada por delante (`isInstalledAheadOfCycle`).

### Sección 8. Interfaz: tareas y artefactos (Tareas 8.1 a 8.7)
- **8.1** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Componente visual de lista interactiva de tareas con alta, edición y borrado.
- **8.2** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Vista de editor directo del archivo `tasks.md`.
- **8.3** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Función detectora en `lib/` de tareas mal formadas.
- **8.4** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Señalización visual de líneas de tareas mal formadas en las vistas.
- **8.5** [CUBIERTA en gran parte por OpenSpec 1.11.0 / Git]: Visualización de deltas de especificación resuelta nativamente por `openspec show <change> --diff` en `PipelineDetails.tsx`. La revisión granular por bloque en diffs de código queda en el componente de diff de Git.
- **8.6** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Revisión interactiva de propuestas de agentes bloque por bloque en la interfaz.
- **8.7** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Pruebas de componente para aceptación parcial o descarte de propuestas.

### Sección 9. Interfaz: motor, sync, archivado y jerarquía (Tareas 9.1 a 9.8)
- **9.1** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: `OpenSpecEngineCard.tsx` prioriza el estado en una línea y muestra la versión objetivo del ciclo (`v1.11.0`) antes del diagnóstico.
- **9.2** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Separación visual en la UI de acciones de instalación local y global.
- **9.3** [NO cubierta por CLI OpenSpec - queda para gestionar-ciclo]: Diálogo de confirmación con comando literal para instalación global.
- **9.4** [CUBIERTA parcialmente por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Preflight de archivado con advertencia de tareas sin completar y requisitos `MODIFIED` inexistentes; el campo de motivo queda para `gestionar-ciclo`.
- **9.5** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Controles bloqueados deshabilitados con su motivo visible al lado (en `PipelineNextStepGuide` y plan de archivado).
- **9.6** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Visualización literal del comando ejecutable en el cuadro de archivado (`openspec archive <id> --yes`).
- **9.7** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Claves i18n completas en ES, EN y ZH para las acciones y errores de ciclo en `lib/i18n.ts`.
- **9.8** [CUBIERTA por GitCron en actualizar-ciclo-sdd-a-openspec-1-11]: Pruebas de paridad y cobertura en los tres idiomas en `pipeline-i18n.test.ts` y tests asociados.

### Sección 10. Cierre y validación (Tareas 10.1 a 10.5)
- **10.1** [NO cubierta por CLI OpenSpec - procedimiento propio de GitCron]: Verificación de tipado estricto con `pnpm exec tsc --noEmit` en cero.
- **10.2** [NO cubierta por CLI OpenSpec - procedimiento propio de GitCron]: Ejecución de la suite completa de pruebas con `pnpm test` en verde en dos pasadas consecutivas.
- **10.3** [CUBIERTA por OpenSpec CLI]: Validación estricta del change con `openspec validate gestionar-ciclo-openspec-desde-gitcron --strict`.
- **10.4** [NO cubierta por CLI OpenSpec - procedimiento propio de GitCron]: Comprobación de higiene de Git con `git diff --check` y verificación de rama con `git status --short --branch`.
- **10.5** [NO cubierta por CLI OpenSpec - verificación humana]: Revisión visual y funcional en la aplicación en vivo por Alejandro.

---

## Risks / Trade-offs

- **[Riesgo] Locks de archivo en Windows (`EPERM` en `openspec archive`)** → *Mitigación:* Informar con claridad cuando el sistema operativo bloquee el renombrado de directorios debido a procesos externos (como vigilantes de servidores MCP).
- **[Riesgo] Inconsistencia en requisitos `MODIFIED` en deltas** → *Mitigación:* Preflight estricto con `validateChangeDeltaRequirements` antes de delegar en el CLI de OpenSpec.
