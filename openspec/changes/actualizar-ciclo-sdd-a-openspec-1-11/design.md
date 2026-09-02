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
- **Consecuencia:** Se elimina el estado muerto `engineError` en el flujo de nuevo cambio y se desmarcan las tareas 2.1 y 2.4 de `tasks.md`.

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

A continuación se detalla la auditoría tarea por tarea de las 55 tareas del cambio `gestionar-ciclo-openspec-desde-gitcron` (secciones 1 a 10), contrastadas con lo que OpenSpec 1.11.0 y este change resuelven:

### Sección 1. Corrección del estado de integración (Tareas 1.1 a 1.3)
- **1.1** [Cubierta por GitCron]: Resuelto. La derivación del estado de integración evalúa `installedWorkflowsByTarget` y `targets` en `.agents`.
- **1.2** [Cubierta por GitCron]: Resuelto. Cubierto con pruebas en `electron/__tests__/pipeline-openspec-evidence.test.ts`.
- **1.3** [Cubierta por GitCron]: Resuelto. La tarjeta `OpenSpecEngineCard.tsx` no reporta «Al día» si un target del esquema no está configurado.

### Sección 2. Autoría de tareas en el proceso principal (Tareas 2.1 a 2.5)
- **2.1** [NO cubierta por CLI OpenSpec]: OpenSpec CLI no expone mutadores granulares de líneas de tareas individuales en `tasks.md`. Requiere implementación propia en `task-checkbox.ts`.
- **2.2** [NO cubierta por CLI OpenSpec]: Requiere `composeTaskLogEntry` en GitCron para auditoría de autoría humana/agente.
- **2.3** [NO cubierta por CLI OpenSpec]: Pruebas unitarias de mutación y preservación de formato en `task-checkbox.ts`.
- **2.4** [NO cubierta por CLI OpenSpec]: Canales IPC `pipeline:tasks:*` para manipulación de tareas.
- **2.5** [NO cubierta por CLI OpenSpec]: Pruebas de contención y autorización de rutas en canales IPC de tareas.

### Sección 3. Escritura de artefactos en el proceso principal (Tareas 3.1 a 3.6)
- **3.1** [CUBIERTA por OpenSpec 1.11.0]: `openspec instructions <artefacto> --change <slug> --json` entrega de forma nativa `resolvedOutputPath`, `instruction`, `template`, `rules`, `context`, `dependencies` y `unlocks`. Resuelto en `openspec-cli.ts` (`readOpenSpecInstructionsWithCli`).
- **3.2** [Simplificada]: El canal de escritura de artefactos se apoya en el `resolvedOutputPath` provisto por el CLI en lugar de calcular rutas ad-hoc.
- **3.3** [NO cubierta por CLI OpenSpec]: Registro local de auditoría de escritura de artefactos en GitCron.
- **3.4** [NO cubierta por CLI OpenSpec]: Pruebas de seguridad contra path traversal en escritura de artefactos.
- **3.5** [CUBIERTA por OpenSpec 1.11.0]: La revisión de alcance multiartefacto está provista nativamente por el workflow `/opsx-update-change` (o subcomando equivalente) de OpenSpec, eliminando la necesidad de un motor complejo de reconciliación en GitCron.
- **3.6** [CUBIERTA conceptualmente por OpenSpec]: Criterio metodológico de bifurcación de change vs actualización de alcance ya integrado en prompts y esquemas.

### Sección 3b. Diagnóstico del motor (Tareas 3b.1 a 3b.4)
- **3b.1** [CUBIERTA por OpenSpec 1.11.0]: `openspec status --json` y `openspec validate --json` entregan el grafo estructurado de dependencias y estados de artefactos.
- **3b.2** [CUBIERTA por OpenSpec 1.11.0]: El campo `context` y `contextFiles` en `openspec instructions --json` entrega el contexto resuelto.
- **3b.3** [CUBIERTA en GitCron]: Integrado en `OpenSpecEngineCard.tsx` e `i18n.ts` respetando la clasificación y severidad del motor.
- **3b.4** [CUBIERTA en GitCron]: Pruebas unitarias en `electron/__tests__/pipeline-openspec-group3.test.ts` y tests de componentes.

### Sección 4. Sincronización de specs (Tareas 4.1 a 4.3)
- **4.1** [CUBIERTA por OpenSpec 1.11.0]: `openspec show <change> --diff` entrega de forma directa y determinista las modificaciones a `openspec/specs/` (`ADDED`, `MODIFIED`, `REMOVED`), sin requerir diffs artesanales de markdown.
- **4.2** [CUBIERTA por OpenSpec 1.11.0]: Sincronización de deltas de specs delegada a `/opsx-sync-specs` o `openspec archive`.
- **4.3** [NO cubierta por CLI OpenSpec]: Pruebas de integración para la vista previa y confirmación de sincronización.

### Sección 5. Motivo al archivar (Tareas 5.1 a 5.3)
- **5.1** [NO cubierta por CLI OpenSpec]: El comando `openspec archive <slug> --yes` no admite argumento de motivo. GitCron debe persistirlo en su histórico local si se desea registrar.
- **5.2** [NO cubierta por CLI OpenSpec]: Pruebas del registro de motivo en el backend de GitCron.
- **5.3** [NO cubierta por CLI OpenSpec]: Manejo de error de sistema de archivos `EPERM` en Windows ante procesos bloqueantes (servidores MCP/indexadores). Debe ser detectado por GitCron para informar que se trata de un lock del filesystem y no de una falla de OpenSpec.

### Sección 6. Instalación del motor (Tareas 6.1 a 6.6)
- **6.1 a 6.5** [NO cubiertas por CLI OpenSpec]: Resolución del gestor de paquetes del sistema (npm, pnpm, yarn, bun), ejecución no interactiva de instalación global y local, recálculo de estado y suite de pruebas de contención. Corresponden a la administración del host en GitCron.
- **6.6** [NO cubierta por CLI OpenSpec]: Verificación manual en aplicación empaquetada.

### Sección 7. Perfil de workflows (Tareas 7.1 a 7.5)
- **7.1** [CUBIERTA en GitCron]: Lectura de `openspec config list` implementada en `readOpenSpecGlobalConfigWithCli` y canal `pipeline:openspec:global-config`.
- **7.2 a 7.5** [CUBIERTA parcialmente]: Detección de versión compatible vs adelantada implementada en `lib/openspec-version.ts` y `OpenSpecEngineCard.tsx`. La activación/desactivación dinámica de workflows particulares queda para la configuración del perfil.

### Sección 8. Interfaz: tareas y artefactos (Tareas 8.1 a 8.7)
- **8.1 a 8.4** [NO cubiertas por CLI OpenSpec]: Construcción de componentes visuales de listas interactivas de tareas, edición directa de archivo, detector de tareas mal formadas (`lib/`) e indicadores visuales.
- **8.5 a 8.7** [CUBIERTA en gran parte por `show --diff`]: La visualización de deltas de especificación la resuelve `openspec show --diff` en `PipelineDetails.tsx`. La revisión granular por bloque en diffs de código queda en el componente de diff de Git.

### Sección 9. Interfaz: motor, sync, archivado y jerarquía (Tareas 9.1 a 9.8)
- **9.1** [CUBIERTA en GitCron]: `OpenSpecEngineCard.tsx` ya prioriza el estado de una línea y las acciones accionables sobre el diagnóstico extendido.
- **9.2 a 9.5** [Parcialmente cubiertas]: Las alertas de requisitos `MODIFIED` no existentes y tareas incompletas ya se muestran en `OpenSpecDashboard.tsx`. Falta desglosar los botones de instalación y sincronización en la UI.
- **9.6** [NO cubierta por CLI OpenSpec]: Mecanismo de interfaz para copiar/ejecutar el comando literal `openspec archive <id> --yes`.
- **9.7 y 9.8** [CUBIERTA para lo implementado]: Claves completas en ES, EN y ZH con pruebas en `pipeline-i18n.test.ts`.

### Sección 10. Cierre y validación (Tareas 10.1 a 10.5)
- **10.1 a 10.5**: Procedimientos de verificación y auditoría final.

---

## Risks / Trade-offs

- **[Riesgo] Locks de archivo en Windows (`EPERM` en `openspec archive`)** → *Mitigación:* Informar con claridad cuando el sistema operativo bloquee el renombrado de directorios debido a procesos externos (como vigilantes de servidores MCP).
- **[Riesgo] Inconsistencia en requisitos `MODIFIED` en deltas** → *Mitigación:* Preflight estricto con `validateChangeDeltaRequirements` antes de delegar en el CLI de OpenSpec.
