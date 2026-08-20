## Why

GitCron muestra el estado de OpenSpec pero casi no lo deja operar. De los seis canales IPC que
existen hoy bajo `pipeline:openspec:*`, ninguno escribe artefactos: son diagnóstico y actualización
del motor. Editar una tarea se limita a marcar y desmarcar una casilla —el propio módulo lo declara
en `electron/pipeline/task-checkbox.ts`: «Sólo cambia el estado. No edita el texto de una tarea»— y
todo lo demás, agregar una tarea, corregir su redacción, sincronizar specs o poner el motor al día,
obliga a salir de la aplicación. La metodología se usa para saber qué está hecho y qué falta, y hoy
la herramienta que debería sostenerla informa sin permitir actuar.

El caso del motor lo muestra entero: la revisión diagnóstica ocupa tres pantallas y termina
ofreciendo un comando para copiar y pegar en una terminal. El change anterior lo dejó así por una
prohibición cuyo fundamento técnico no se sostiene, y que este change corrige más abajo.

A eso se suma un defecto medido y un desorden medido. El defecto: la tarjeta declara la integración
«al día» cuando no lo está. El desorden: la interfaz no tiene sistema de espaciado ni de tipografía,
y se nota.

## What Changes

- **Autoría de tareas.** Agregar, editar el texto, reordenar y borrar tareas de `tasks.md`, además
  del marcado que ya existe. Dos vistas sobre el mismo archivo: lista estructurada y markdown crudo.
  Se permite escribir libremente, porque encabezados y comentarios son válidos en `tasks.md`; GitCron
  advierte únicamente sobre las líneas que aparentan ser una tarea mal formada —empiezan con guion o
  numeración pero el checkbox está roto— porque el CLI declara que una tarea fuera del formato
  `- [ ] X.Y texto` no se trackea.
- **Edición de artefactos.** `proposal.md`, `design.md`, los specs y `tasks.md` se editan a mano o se
  le encargan a la IA. Lo que la IA propone nunca se escribe directo: se presenta como diff donde
  cada bloque se acepta o se rechaza por separado y el resultado se puede corregir antes de guardar.
- **Revisión del alcance en curso.** Cuando el trabajo obliga a corregir lo planificado, la revisión
  alcanza a todos los artefactos afectados y no sólo a la lista de tareas. Se delega al workflow que
  el motor provee para eso, y se declara cuándo la revisión cambia el propósito en lugar de
  precisarlo, caso en que corresponde un cambio nuevo.
- **Diagnóstico del motor a la vista.** La salud de las relaciones del repositorio y el contexto de
  trabajo resuelto —que el motor ya entrega en formato legible por máquina— se presentan en la
  aplicación en lugar de obligar a una terminal.
- **Sincronización de specs.** `openspec sync` con vista previa de qué se fusionaría en los specs
  principales antes de ejecutar.
- **Archivado con motivo.** El archivado ya existe; se le agrega un campo opcional de razón, pensado
  para cuando quedan tareas sin completar, de modo que quien lea el histórico —persona o agente—
  entienda por qué se desestimó.
- **Instalación del motor desde la aplicación.** Dos acciones explícitas: instalarlo local al
  repositorio abierto, o actualizar el global del sistema. **BREAKING** respecto del change anterior:
  deroga el requisito que prohibía ejecutar gestores de paquetes.
- **Perfil de workflows editable.** Leer la configuración del CLI y ofrecer sólo los workflows
  habilitados, con un panel para activarlos o desactivarlos sin ir a la terminal.
- **Corrección del estado de integración.** `integrationState` deja de contar skills sueltos y pasa a
  mirar en qué target están instalados.
- **Jerarquía del panel.** Las acciones y el estado en una línea al frente; el diagnóstico completo
  detrás de un desplegable cerrado por omisión. Se reordena lo existente, no se descarta nada.

Ninguna operación confirma nada en Git. GitCron escribe en el árbol de trabajo y ahí queda, para
revisar con el diff y confirmar con «Preparar commit».

**Fuera de alcance, explícitamente:** borrar un change, porque OpenSpec no expone esa operación y
define el archivado como el cierre formal; toda la escala de tipografía y espaciado, la
accesibilidad y el armazón visual, que viven en el change `unificar-sistema-visual-gitcron` porque
alcanzan a la aplicación entera y no a estas pantallas; y cualquier dependencia nueva de edición o de
diff, porque `components/DiffViewer.tsx` ya resuelve la mecánica por bloque y AGENTS.md exige
aprobación explícita para agregar paquetes.

Este change no depende de que aquél esté terminado: la reorganización de acciones y diagnóstico que
sí entra acá es de disposición, no de escala.

## Capabilities

### New Capabilities
- `openspec-artifact-authoring`: proponer, revisar por bloque y escribir el contenido de los
  artefactos de un change, con la IA o a mano, sin que nada llegue al disco sin confirmación.
- `openspec-engine-installation`: instalar o actualizar el motor de OpenSpec desde la aplicación,
  eligiendo entre el repositorio abierto y el sistema, invocando el gestor de paquetes del sistema.

### Modified Capabilities
- `task-checkbox-editing`: hoy sólo cambia el estado de una casilla. Pasa a cubrir la autoría
  completa de tareas —crear, editar, reordenar, borrar— y el registro se amplía a esas operaciones
  declarando si las hizo una persona o un agente.
- `pipeline-openspec-engine`: deroga la prohibición de ejecutar gestores de paquetes, corrige la
  derivación del estado de integración para que dependa del target y no del conteo de skills, y suma
  la lectura y edición del perfil de workflows.
- `pipeline-guided-workflow`: suma la sincronización de specs con vista previa, el motivo al
  archivar, y reordena el panel para que las acciones precedan al diagnóstico.

## Impact

**Proceso principal.** `electron/ipc/pipeline-tasks.ts` deja de exponer un único canal de marcado
para cubrir la autoría; `electron/pipeline/task-checkbox.ts` suma operaciones al lado de
`toggleTaskCheckbox`, conservando su verificación de `expectedText`, que existe porque con el watcher
andando el archivo puede cambiar entre que se dibuja la pantalla y llega el clic.
`electron/ipc/pipeline-archive.ts` transporta el motivo. `electron/ipc/pipeline-openspec.ts` corrige
el estado de integración y suma la instalación del motor. Se agrega la resolución del gestor de
paquetes del sistema, con la misma estrategia de canonicalización y contención que
`electron/pipeline/openspec-engine.ts` ya aplica al binario de OpenSpec.

**Renderer.** `components/DiffViewer.tsx` gana un modo de propuesta —aplicar y descartar— junto a los
de stage y unstage que ya tiene; su `parseDiff` y su selección de líneas por hunk se reutilizan sin
cambios. `components/pipeline/OpenSpecDashboard.tsx`, `OpenSpecEngineCard.tsx` y
`OpenSpecUpdateReview.tsx` se reordenan según la jerarquía nueva.

**Estilos.** Este change no agrega ni modifica tokens de estilo. Las pantallas que toca adoptan la
escala que define `unificar-sistema-visual-gitcron` si ya está disponible, y si no, conservan los
valores vigentes: la reorganización de acciones y diagnóstico no depende de la escala.

**Contrato con OpenSpec.** Nada del modelo de OpenSpec se replica en GitCron. La lista de workflows,
el conjunto de artefactos, sus dependencias y sus plantillas se derivan en tiempo de ejecución de
`openspec instructions`, `openspec status`, `openspec config`, `openspec schemas`, `openspec
templates`, `openspec doctor` y `openspec context`. El fundamento es verificable: OpenSpec cambió de
un flujo por fases fijas a workflows adaptables por organización entre la versión 1 y la 1.9, y este
repositorio ya pagó el costo de duplicar su método —de dieciséis reglas propias, ocho repetían lo que
el CLI entregaba y se retiraron—.

La superficie que el motor expone hoy —relevada sobre la versión 1.9.0 el 2026-08-19— es más amplia
que la que este change cubre: doce workflows, de los cuales seis integran el conjunto básico
(`propose`, `explore`, `apply`, `update`, `sync`, `archive`) y seis son opcionales (`new`,
`continue`, `ff`, `bulk-archive`, `verify`, `onboard`); y comandos de consulta, esquemas propios por
proyecto, repositorios de especificación independientes registrados en la máquina, y vistas de
trabajo locales. Este change cubre el conjunto básico y el diagnóstico. Lo demás queda declarado como
fuera de alcance, no como inexistente, para que el próximo que lea sepa que existe.

**Dependencia de versión.** `update` no existe en el motor 1.5.0: aparece en el conjunto básico de
versiones posteriores. Las operaciones que este change ofrece se habilitan según lo que el motor
instalado exponga, y las que ese motor no tenga se declaran junto con la versión que las habilitaría.
Es el mismo principio de derivar del CLI en lugar de declarar en el código, aplicado al caso en que
el CLI ofrece menos de lo esperado.

**Riesgo declarado.** Instalar el motor de forma global escribe fuera del repositorio y afecta a
todos los proyectos de la máquina, sin reversión por Git. Por eso la elección entre local y global es
explícita en cada uso y la confirmación enumera qué se va a ejecutar y qué alcanza.
