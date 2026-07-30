## Why

El workspace OpenSpec de Pipeline ya muestra evidencia real (cambios activos, tareas, validación, sesiones), pero no dice qué corresponde hacer a continuación: los CTA actuales asumen que la persona conoce `/opsx:propose`, `/opsx:apply` y `/opsx:archive`, y `Nuevo cambio` salta directo a un textarea con un comando incompleto que no captura objetivo ni nombre del cambio.

Además hay un defecto verificable de seguridad de datos: `PipelineWorkspace` calcula `fixtureActive` y anula `projection`/`runtimeHistory`, pero no lo propaga a `OpenSpecDashboard`, que nunca pasa `blockedByFixture` a `PipelineRuntimeLauncher`. Con `?pipelineFixture=` activo, un CTA construido con datos de vista previa puede iniciar una sesión real contra el repositorio real.

## What Changes

- Se agrega un bloque contextual `Siguiente paso` en el panel central, debajo del encabezado/lifecycle y antes de las pestañas Trabajo/Actividad. Muestra como máximo etiqueta de estado, título corto, una frase de ayuda, una acción primaria, una secundaria sólo si existe alternativa real, y detalles técnicos bajo divulgación progresiva.
- La derivación del estado pasa a ser una función pura y testeable (`derivePipelineNextAction`) en lugar de condicionales repartidos en JSX. Cubre: fixture, sin cambio activo, cambio archivado, tarea pendiente, sesión en curso, decisión pendiente, sesión fallida o interrumpida, validación desconocida, validación fallida, validación aprobada y archivo en curso, con prioridad explícita entre estados superpuestos.
- `Nuevo cambio` deja de emitir `/opsx:propose` pelado y abre un flujo guiado de dos ramas: Propose (objetivo requerido, slug validado y editable, restricciones opcionales) y Explore (una sola descripción). La instrucción generada queda visible sólo bajo `Ver instrucción`.
- `Continuar con X.Y` compone la instrucción de Apply con `changeId` y `taskId` reales, sin exigir que la persona reescriba el prompt.
- Tras cerrar una sesión, el progreso se relee desde `tasks.md`: si no cambió, se informa que la tarea sigue pendiente en lugar de asumir éxito por proceso terminado.
- **Corrección de seguridad**: el estado de fixture se propaga hasta el launcher, de modo que ninguna acción derivada de datos de vista previa pueda iniciar un proceso real.
- El lanzador se reutiliza en modo guiado (mismo discovery, `start` y `stop`); cuando ningún runtime es lanzable, se muestran los `diagnostics` reales del adaptador en lugar de un mensaje informativo sin salida.

Sin cambios de dependencias. Sin cambios en topbar, iconos ni comportamiento de los dos sidebars.

## Capabilities

### New Capabilities
- `pipeline-guided-workflow`: derivación del siguiente paso a partir de evidencia observada, guía contextual en el panel central, flujo guiado Explore/Propose con validación de entrada, continuación de Apply, transiciones Validate/Archive/Retry, y prohibición de acciones ejecutables originadas en datos de vista previa.

### Modified Capabilities
<!-- Ninguna. La lectura de evidencia (pipeline-repo-evidence), el contrato de decisiones
     (pipeline-decision-contract) y la negociación de capabilities de runtime
     (pipeline-runtime-capabilities) se consumen tal como están; sus requisitos no cambian. -->

## Impact

Código afectado (todo dentro del interior de Pipeline):

- `components/pipeline/pipeline-view-state.ts` — función pura de derivación y sus tipos.
- `components/pipeline/OpenSpecDashboard.tsx` — pasa a compositor; cede la máquina de estados.
- `components/pipeline/PipelineWorkspace.tsx` — propaga `fixtureActive` y expone el refresco ya existente (`reloadToken`).
- `components/pipeline/PipelineRuntimeLauncher.tsx` — modo guiado sin duplicar discovery/start/stop.
- Componentes nuevos para la guía y el formulario, más su CSS module.
- `lib/i18n.ts` — strings nuevas en ES, EN y ZH (invariante 8).

No afectado: contrato IPC (`pipelineRuntime.start` ya recibe `repoPath`, `runtime`, `instruction`, `changeId` y `taskId`; el hub ya rechaza `session_already_active`), esquema SQLite, lógica de Git, proceso main, dependencias.

Riesgo principal: la guía puede quedar desincronizada de la evidencia si se deriva de estado local en vez del snapshot; se mitiga con la función pura y una prueba por fila de la matriz de estados.
