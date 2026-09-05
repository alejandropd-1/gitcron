# Tareas

Las fases se envían por separado y entre fase y fase hay revisión visual de Alejandro. **Esta vez se
cumple.** En `remaquetar-cuerpo-de-sdd` la implementación entera vino en una sola tanda, se vio todo
junto y se rechazó todo junto, sin que hubiera un punto intermedio donde frenar.

## 1. Qué se muestra hoy y bajo qué condición

- [x] 1.1 Listar cada superficie del cuerpo del ciclo y declarar, con archivo y línea, bajo qué
  condición aparece hoy. Acotado al cuerpo: no es un inventario del producto.

  ### Superficies del cuerpo del ciclo y condiciones de aparición hoy

  | Superficie / Componente | Archivo y línea | Condición de aparición hoy | Estado / Clasificación |
  | :--- | :--- | :--- | :--- |
  | **Visor de especificación completa** (`SpecificationViewer`) | `components/pipeline/OpenSpecDashboard.tsx:1700-1707` | Si `!prepareOpen && openSpecification !== null` | Ya condicional a selección de spec |
  | **Revisión de actualización de specs** (`OpenSpecUpdateReview`) | `components/pipeline/OpenSpecDashboard.tsx:1708-1723` | Si `!prepareOpen && reviewOpen === true` | Ya condicional a modo revisión |
  | **Área de preparación de commit** (`section.prepareArea`) | `components/pipeline/OpenSpecDashboard.tsx:1724-2154` | Si `prepareOpen === true` | Ya condicional a acción explícita |
  | **Cabecera del cambio activo** (`header.changeHeader`) | `components/pipeline/OpenSpecDashboard.tsx:2160-2247` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** en vista de cambio |
  | ↳ *Fila 1: Botón volver + Identidad* (`.headerIdentity`) | `components/pipeline/OpenSpecDashboard.tsx:2167-2176` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** en vista de cambio |
  | ↳ *Fila 1: Aviso de rama* (`ChangeBranchNotice`) | `components/pipeline/OpenSpecDashboard.tsx:2175` y `ChangeBranchNotice.tsx:41` | Si `state !== null && !state.matches` (discrepancia de rama) | Ya condicional a divergencia real |
  | ↳ *Fila 1: Botón Glosario* (`.glossaryToggleBtn`) | `components/pipeline/OpenSpecDashboard.tsx:2178-2186` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** en vista de cambio |
  | ↳ *Fila 2: Siguiente Paso / CTA* (`.headerMainAction`) | `components/pipeline/OpenSpecDashboard.tsx:2191-2214` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** en vista de cambio |
  | ↳ *Fila 2: Acción secundaria* (`secondaryAction`) | `components/pipeline/OpenSpecDashboard.tsx:2217-2227` | Si `secondaryAction !== null` | Ya condicional a acción derivada |
  | ↳ *Fila 2: Botón Archivar cambio* | `components/pipeline/OpenSpecDashboard.tsx:2228-2241` | Si `selectedArchive === null && primaryAction?.intent.kind !== 'start-archive'` | **Siempre** presente (deshabilitado si no disponible) |
  | ↳ *Fila 2: Botón Ver diff* | `components/pipeline/OpenSpecDashboard.tsx:2242-2244` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** presente (deshabilitado si `!hasDiffEvidence`) |
  | **Confirmación de archivado** (`.archiveConfirm`) | `components/pipeline/OpenSpecDashboard.tsx:2253-2299` | Si `archiveRequest !== null` | Ya condicional a confirmación pedida |
  | **Toast de confirmación de tarea** (`TaskConfirmToast`) | `components/pipeline/OpenSpecDashboard.tsx:2310-2331` | Si `taskToggleRequest !== null` | Ya condicional a clic en tarea |
  | **Área de trabajo del cambio** (`.workArea`) | `components/pipeline/OpenSpecDashboard.tsx:2336-2483` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** en vista de cambio |
  | ↳ *Lanzador de runtime* (`PipelineRuntimeLauncher`) | `components/pipeline/OpenSpecDashboard.tsx:2339-2361` | Si `launchTarget !== null` | Ya condicional a intención de arranque |
  | ↳ *Sección Lista de tareas* (`.taskList`) | `components/pipeline/OpenSpecDashboard.tsx:2364-2442` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** presente en el cuerpo vertical |
  | ↳ *Ficha de detalle / aviso de tarea activa* | `components/pipeline/OpenSpecDashboard.tsx:2400-2436` | Si la tarea es la actual (`current`): `.taskDetail` si `changeSession !== null`, o `.taskNoSession` si `!changeSession` | **Siempre** presente en la tarea actual |
  | ↳ *Sección de Evidencia* (`PipelineDetails`) | `components/pipeline/OpenSpecDashboard.tsx:2445-2457` y `PipelineDetails.tsx:108-171` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** apilada bajo tareas |
  | ↳ *Grafo de artefactos* (`PipelineArtifactGraph`) | `components/pipeline/PipelineDetails.tsx:124-126` y `PipelineArtifactGraph.tsx:22` | Si `shouldShowArtifactGraph(status)` (`status && available && artifacts.length > 0`) | Ya condicional a respuesta CLI |
  | ↳ *Pestañas de artefactos (6 pestañas)* | `components/pipeline/PipelineDetails.tsx:110-117` | Si hay un cambio seleccionado (`selectedChange !== null`) | **Siempre** visibles las 6 pestañas |
  | ↳ *Bloque Actividad* (`details.fullActivity`) | `components/pipeline/OpenSpecDashboard.tsx:2460-2482` | Si hay un cambio seleccionado (`selectedChange !== null`); contenido montado si `activityOpen === true` | **Siempre** al fondo del scroll |
  | **Drawer contextual de Glosario** (`.glossaryDrawer`) | `components/pipeline/OpenSpecDashboard.tsx:2486-2506` | Si `glossaryOpen === true` | Ya condicional a toggle |
  | **Resumen de cambio archivado** (`.completedSummary`) | `components/pipeline/OpenSpecDashboard.tsx:2509-2581` | Si `!selectedChange && selectedArchive !== null` | Ya condicional a selección de archivado |
  | ↳ *Guía de siguiente paso en archivado* | `components/pipeline/OpenSpecDashboard.tsx:2537` | Si hay archivado seleccionado (`selectedArchive !== null`) | **Siempre** en vista de archivado |
  | ↳ *Artefactos de archivado* (`PipelineDetails`) | `components/pipeline/OpenSpecDashboard.tsx:2545-2566` | Si hay archivado seleccionado (`selectedArchive !== null`) | **Siempre** en vista de archivado |
  | ↳ *Formulario de nuevo cambio en archivado* | `components/pipeline/OpenSpecDashboard.tsx:2567-2580` | Si `flowMode === true` | Ya condicional a acción de nuevo cambio |
  | **Pantalla de inicio del repo** (`.startScreen`) | `components/pipeline/OpenSpecDashboard.tsx:2587-2721` | Si no hay selección (`!selectedChange && !selectedArchive && !prepareOpen && !openSpecification && !reviewOpen`) | **Siempre** al abrir sin selección |
  | ↳ *Guía Siguiente Paso en inicio* (`PipelineNextStepGuide`) | `components/pipeline/OpenSpecDashboard.tsx:2594` | En pantalla de inicio (`.startScreen`) | **Siempre, sin condición** |
  | ↳ *Formulario de nuevo cambio inline* (`PipelineNewChangeFlow`) | `components/pipeline/OpenSpecDashboard.tsx:2595-2606` | Si `flowMode === true` | Ya condicional a intent (pero empuja inline) |
  | ↳ *Bloque EN CURSO* (`.startBlock` con lista activa) | `components/pipeline/OpenSpecDashboard.tsx:2608-2675` | En pantalla de inicio (`.startScreen`) | **Siempre, sin condición** |
  | ↳ *Tareas pendientes desplegadas por cambio* | `components/pipeline/OpenSpecDashboard.tsx:2662-2670` | Si `expandedStart[changeId] === true` | Ya condicional a toggle |
  | ↳ *Bloque CERRADOS* (`.startBlock` con lista archivados) | `components/pipeline/OpenSpecDashboard.tsx:2681-2720` | En pantalla de inicio (`.startScreen`) | **Siempre, sin condición** |
  | ↳ *Lista de archivados desplegada* | `components/pipeline/OpenSpecDashboard.tsx:2699-2711` | Si `archivedOpen === true` | Ya condicional a toggle |

- [x] 1.2 Para cada una, declarar qué evidencia observada podría condicionarla —hay sesión, hay
  diffs, hay tareas sin completar, hay artefactos habilitados— y cuál está siempre presente sin
  motivo. Lo medido el 2026-09-04 sobre «Actividad» es el caso de partida, no el único.

  ### Análisis de evidencia observable por superficie

  1. **Actividad (`ActivityFeed` / `details.fullActivity`):**
     - **Evidencia observable que podría condicionarla:** Presencia de una sesión de runtime viva (`runtimeActive === true`) o bitácora persistida observada (`visibleActivity.length > 0`).
     - **Situación hoy:** Está **siempre presente** como bloque colapsable al fondo de la vista de cambio (`OpenSpecDashboard.tsx:2460`).
     - **Diagnóstico:** En este proyecto los ejecutores corren en terminales externas o IDE; la aplicación no registra sesiones internas en reposo, por lo que está vacía el 100% del tiempo. Permanece en el DOM sin motivo.
  2. **Evidencia e Inspección de Artefactos (`PipelineDetails`):**
     - **Evidencia observable que podría condicionarla:** Presencia de artefactos en disco (`proposal.md`, `design.md`, `specs/`, `tasks.md`), existencia de cambios sin confirmar (`snapshot.diffs.length > 0`), o solicitud activa de consulta / auditoría.
     - **Situación hoy:** Está **siempre presente** apilada verticalmente a continuación de las tareas dentro de `.workArea` (`OpenSpecDashboard.tsx:2445`).
     - **Diagnóstico:** Convivir forzosamente en la misma columna hace que las tareas la empujen fuera de pantalla. Cuando la persona está implementando tareas, la evidencia no aporta al foco inmediato y no debería ocupar la vertical principal de trabajo.
  3. **Solapa "Archivos y diffs" (`LazyDiffViewer` dentro de `PipelineDetails`):**
     - **Evidencia observable que podría condicionarla:** `snapshot.diffs && snapshot.diffs.length > 0` o `workingTreeClean === false`.
     - **Situación hoy:** La pestaña y el botón de la cabecera («Ver diff») están **siempre presentes**; el botón se deshabilita si `!hasDiffEvidence`.
     - **Diagnóstico:** Si no hay diffs observados en disco, no hay evidencia que inspeccionar.
  4. **Ficha de detalle de tarea activa (`.taskDetail` vs `.taskNoSession`):**
     - **Evidencia observable que podría condicionarla:** Datos de sesión registrados (`changeSession !== null`) con metadatos reales de agente, fuente y diffs.
     - **Situación hoy:** Si no hay sesión, se renderiza `<p className={styles.taskNoSession}>` ("Todavía no corrió ninguna sesión sobre esta tarea").
     - **Diagnóstico:** Declarar la ausencia de sesión en cada render ocupa espacio visual sin aportar contenido informativo.
  5. **Grafo de artefactos (`PipelineArtifactGraph`):**
     - **Evidencia observable que podría condicionarla:** Estado de avance del ciclo (`openspec status --json`).
     - **Situación hoy:** Se renderiza si `shouldShowArtifactGraph` es verdadero.
     - **Diagnóstico:** Cuando todos los artefactos están completados (`done`) y el cambio está en fase de ejecución de tareas (`apply`), el tren estático de artefactos repitiendo íconos en cada render no aporta al trabajo inmediato de implementar la tarea N.
  6. **Botón "Archivar cambio" en cabecera:**
     - **Evidencia observable que podría condicionarla:** Validación formal aprobada (`archive.available === true`).
     - **Situación hoy:** Está **siempre presente** en la cabecera en estado deshabilitado si la validación no está lista o si quedan tareas.
     - **Diagnóstico:** Muestra permanentemente un control inhabilitado compitiendo en el encabezado.
  7. **Guía "Siguiente paso" en pantalla de inicio (`PipelineNextStepGuide` en `.startScreen`):**
     - **Evidencia observable que podría condicionarla:** Estado general del repositorio (si hay cambios activos o si el repo está limpio).
     - **Situación hoy:** Está **siempre presente**, titulada «Siguiente paso» (`:2594`), aunque no haya un siguiente paso secuencial sino dos caminos de alta («Tengo clara la tarea» y «Quiero definirla mejor»).
  8. **Hallazgo de superficie sin evidencia observable posible — Glosario (`.glossaryDrawer` y pestaña `glossary`):**
     - **Evidencia observable:** **Ninguna.** El glosario contiene definiciones conceptuales y didácticas estáticas del método OpenSpec. No depende del estado de Git, ni de diffs, ni de sesiones, ni de tareas.
     - **Diagnóstico:** No es una superficie del estado del repositorio ni del ciclo de un cambio; es una herramienta de consulta accesoria bajo demanda. Forzarla como pestaña en `PipelineDetails` o como drawer flotante permanente en la cabecera es un artificio sin respaldo en la evidencia del proyecto.

- [x] 1.3 Declarar qué queda del piso que dejó `remaquetar-cuerpo-de-sdd` y sirve bajo esta tesis, y
  qué de lo que hizo hay que deshacer. Su commit está en la rama `change/remaquetar-cuerpo-de-sdd`.
  No se revierte a ciegas: arregló cosas medidas.

  ### Balance del commit `2218586` bajo la tesis del cuerpo condicional

  #### Lo que SIRVE y se conserva como piso firme:
  1. **`.workArea` flexible con scroll propio:** En `OpenSpecDashboard.module.css:479-487`, `.workArea` pasó de `flex: 0 0 auto` a `flex: 1 1 auto; min-height: 0; overflow-y: auto;`. **Sirve:** Permite que el área de tareas se adapte a la altura de la ventana y no quede rígidamente comprimida ni recortada.
  2. **Reglas de composición tipográfica de markdown:** En `app/globals.css:2258-2365` (`.pipeline-markdown`), se eliminó la colisión entre el flex `gap` y los márgenes verticales de los encabezados, estableciendo márgenes inferiores predecibles (`margin-bottom: var(--space-3)`) y jerarquía de escalas y pesos (`h1` 700/lg, `h2` 650/md, `h3` 600/base, `h4` 650/xs mono uppercase, `strong` 700). **Sirve:** Resuelve la base tipográfica para la lectura de documentos extensos.
  3. **Saneamiento de CSS muerto en `app/globals.css`:** Se retiró la regla huérfana `.pipeline-card[data-scrolls]` y se mudaron las clases de evidencia (`.pipeline-details` y `.pipeline-artifact-graph`) al módulo `OpenSpecDashboard.module.css` bajo `.openspecScope`. **Sirve:** Mantiene la hoja global limpia y los estilos encapsulados.
  4. **Aviso de rama compacto:** En `ChangeBranchNotice.tsx:44`, sustitución de la caja pesada `.readiness` por el badge compacto en línea `.branchNoticeBadge`. **Sirve:** Reduce el consumo visual innecesario en la cabecera.
  5. **Semántica de estados con glifos en grafo de artefactos:** En `PipelineArtifactGraph.tsx:50-63`, reemplazo de la palabra "HECHO" repetida cuatro veces por íconos semánticos (`Check`, `Play`, `Lock`) con texto accesible para lectores de pantalla. **Sirve:** Reduce la redundancia visual cumpliendo con «Un dato NO SHALL presentarse dos veces en la misma pantalla».

  #### Lo que HAY QUE DESHACER y su motivo fundamentado:
  1. **La cabecera de dos filas amontonada (`.headerRow1` y `.headerRow2`):**
     - *Qué hizo `2218586`:* Empaquetó en dos filas estrechas el botón volver, el título, el aviso de rama, el botón de glosario, el bloque de Siguiente Paso con su flecha, el botón primario, el micro-copy inline, las acciones accesorias y el botón de archivar (`OpenSpecDashboard.tsx:2160-2247`).
     - *Motivo para deshacer:* Generó la observación 14 («La cabecera no tiene criterio»). Los controles de distinta naturaleza y jerarquía compiten en una franja densa. La cabecera debe desinflarse, mostrando sólo la identidad y navegación inmediata, y derivando las acciones contextuales a controles jerarquizados o al panel lateral flotante cuando correspondan.
  2. **La convivencia vertical obligatoria de Tareas + Evidencia (`PipelineDetails`) + Actividad (`styles.workArea`):**
     - *Qué hizo `2218586`:* Eliminó las solapas superiores y apiló secuencialmente la lista de tareas, el panel de evidencia completo y el bloque colapsable de actividad en una única columna con scroll (`OpenSpecDashboard.tsx:2336-2483`).
     - *Motivo para deshacer:* Causa directa de las observaciones 15, 20 y 21 («Las tareas siguen empujando Evidencia hacia abajo», «La evidencia no puede convivir con las tareas en la misma columna», «ACTIVIDAD quedó al fondo de todo fuera de vista»). Esta disposición fue hija de la premisa rechazada de «mover y agrupar todo lo que ya está». Debe desacoplarse: la evidencia no convive apilada bajo tareas, sino en una superficie propia o alcanzable desde un control junto a las tareas.
  3. **El drawer de glosario y el botón `? Glosario` en cabecera (`.glossaryDrawer`, `.glossaryToggleBtn`):**
     - *Qué hizo `2218586`:* Introdujo un botón `?` en la cabecera y un drawer lateral flotante con textos de marcador de posición (`OpenSpecDashboard.tsx:2178, 2486`).
     - *Motivo para deshacer:* No corresponde a este change construir una superficie de glosario provisional ni cargar la cabecera con accesos a contenido aún no implementado; la didáctica del glosario es responsabilidad exclusiva del change `explicar-el-ciclo-sin-tecnicismos`.
  4. **El despliegue inline de `PipelineNewChangeFlow` en `startScreen`:**
     - *Qué hizo `2218586`:* Mantuvo el montaje del formulario inline entre la guía y la lista «EN CURSO» (`OpenSpecDashboard.tsx:2595-2606`).
     - *Motivo para deshacer:* Al abrirse, el formulario empuja la lista de cambios activos fuera de la pantalla (observaciones 9 y 22), violando directamente el requisito «Un control no desplaza a los demás al cambiar». Debe abrirse en un espacio propio o modal/flotante sin desplazar el contenido del repositorio.

## 2. Las nueve observaciones del rechazo

- [x] 2.1 Confirmar contra el árbol las nueve observaciones de la revisión visual del 2026-09-04,
  anotadas como tarea 1.4 de `remaquetar-cuerpo-de-sdd`, y declarar cuáles resuelve esta tesis y
  cuáles necesitan trabajo aparte. Andar directo a lo que cada una nombra; no barrer el repositorio.

  ### Verificación de las nueve observaciones (14 a 22) contra el árbol actual

  14. **«La cabecera no tiene criterio.»**
      - **Veredicto hoy:** Sigue igual.
      - **Medición hoy:** `components/pipeline/OpenSpecDashboard.tsx:2160-2247` y `OpenSpecDashboard.module.css:337-439`. En `headerRow1` conviven `.backToStart` (`:2168`), el título (`:2171`), `ChangeBranchNotice` (`:2175`) y `.glossaryToggleBtn` (`:2178`). En `headerRow2` conviven `.headerMainActionRow` (`:2192`, con `ArrowRight`, título de siguiente paso, `.primaryAction`, `.nextStepInline` y `.actionMicroCopy`) junto a `.headerAccessoryActions` (`:2216`, con `secondaryAction`, archivar y ver diff).
      - **Resolución con esta tesis:** **La resuelve esta tesis.** La cabecera se limpia de controles amontonados; cada acción y dato accesorio aparece sólo cuando la circunstancia lo trae y en su lugar adecuado (panel lateral flotante o control contextual), sin forzar una doble fila saturada.
  15. **«Las tareas siguen empujando «Evidencia» hacia abajo.»**
      - **Veredicto hoy:** Sigue igual.
      - **Medición hoy:** `components/pipeline/OpenSpecDashboard.tsx:2364-2457`. La lista `.taskList` (`:2369`) y el panel `.evidencePanel` (`:2445`) están montados uno tras otro en el mismo contenedor vertical `.workArea` (`:2336`). Al crecer las tareas, la evidencia se desplaza hacia abajo en el scroll.
      - **Resolución con esta tesis:** **La resuelve esta tesis.** La evidencia deja de convivir en la misma columna apilada bajo tareas; pasa a estar en una superficie propia accesible bajo demanda junto a las tareas.
  16. **«Las solapas de artefactos quedaron con textos largos y siguen sin entenderse.»**
      - **Veredicto hoy:** Sigue igual.
      - **Medición hoy:** `components/pipeline/PipelineDetails.tsx:110-117` y `lib/i18n.ts:672-683`. Los rótulos funcionales dicen: «Porqué y alcance (proposal.md)», «Decisiones técnicas (design.md)», «Requisitos por capacidad (specs/) (1)», «Checklist de ejecución (tasks.md)», «Archivos y diffs git (0)», «Glosario del método».
      - **Resolución con esta tesis:** **Necesita trabajo aparte para las palabras.** Esta tesis resuelve que la superficie de evidencia no esté amontonada en la vertical de trabajo; la redacción clara y sin jerga técnica de cada rótulo corresponde a `explicar-el-ciclo-sin-tecnicismos`.
  17. **«La línea de tiempo de artefactos es mala.»**
      - **Veredicto hoy:** Sigue igual.
      - **Medición hoy:** `components/pipeline/PipelineArtifactGraph.tsx:43-73` y `OpenSpecDashboard.module.css:2698-2750`. Renderiza una lista horizontal `ul.pipeline-artifact-graph` con nodos aislados, sin trazo conector de flujo temporal ni dependencias visuales tipo Cronometric.
      - **Resolución con esta tesis:** **NO es de este change.** La hereda `gestionar-ciclo-openspec-desde-gitcron`, tarea 3c.4.
  18. **«El markdown de las solapas sigue sin formato.»**
      - **Veredicto hoy:** Sigue igual en lo percibido.
      - **Medición hoy:** `app/globals.css:2258-2365` y `components/pipeline/SafeMarkdown.tsx`. A pesar de las reglas CSS agregadas en `2218586`, el texto renderizado en las solapas de artefactos densos (`proposal`, `specs`) sigue percibiéndose plano y sin ritmo suficiente de lectura.
      - **Resolución con esta tesis:** **Es un INCUMPLIMIENTO de requisito consolidado** («El contenido de los artefactos se lee con ritmo»). Requiere ajuste tipográfico y de espaciado real en la superficie donde se leen los artefactos.
  19. **««TAREAS DEL CAMBIO» quedó suelto y no se entiende, y los textos siguen cortándose sin terminar.»**
      - **Veredicto hoy:** Sigue igual.
      - **Medición hoy:** `components/pipeline/OpenSpecDashboard.tsx:2365-2368` (`<h4 className={styles.blockHeader}><ListChecks size={13} /><span>{t('pipeline.openspec.tasks.title')}</span></h4>`) y `OpenSpecDashboard.module.css:498` (`.taskList > li > strong { overflow: hidden; color: var(--color-primary); text-overflow: ellipsis; white-space: nowrap; }`).
      - **Resolución con esta tesis:** **La resuelve esta tesis.** Al convertir el área de tareas en el centro operativo del objetivo del momento, se elimina el título descontextualizado y la regla de elipsis destructiva sobre los textos.
  20. **«La evidencia no puede convivir con las tareas en la misma columna.»**
      - **Veredicto hoy:** Sigue igual.
      - **Medición hoy:** `components/pipeline/OpenSpecDashboard.tsx:2336-2457`. Empaquetadas juntas en `.workArea`.
      - **Resolución con esta tesis:** **La resuelve esta tesis.** Es el principio central: desacoplar la evidencia de la columna de tareas para que esté en su propio espacio alcanzable desde un control.
  21. **««ACTIVIDAD» quedó al fondo de todo, fuera de vista.»**
      - **Veredicto hoy:** Sigue igual.
      - **Medición hoy:** `components/pipeline/OpenSpecDashboard.tsx:2460-2482`. `<details className={cn(styles.centerBlock, styles.fullActivity)}>` ubicado al pie del scroll de `.workArea`.
      - **Resolución con esta tesis:** **La resuelve esta tesis.** Al medirse que está vacía el 100% del tiempo con ejecutores externos, no ocupa espacio fijo en el cuerpo principal; se subordina y sólo aparece cuando hay una sesión viva o se consulta desde el panel lateral.
  22. **«El estado del repositorio mezcla dos cosas.»**
      - **Veredicto hoy:** Sigue igual.
      - **Medición hoy:** `components/pipeline/OpenSpecDashboard.tsx:2587-2721`. En `.startScreen`, la guía se titula «Siguiente paso» (`:2594`) sin nombrar la creación de tarea/cambio, el formulario de nuevo cambio se despliega inline (`:2595`) empujando la lista «EN CURSO» (`:2609`), y no se explicita la diferencia entre «Tengo clara la tarea» y «Quiero definirla mejor».
      - **Resolución con esta tesis:** **La resuelve esta tesis.** El estado del repositorio se enfoca en los cambios en curso; la acción de crear un cambio se desacopla para no empujar la lista y se rotula con precisión.

- [x] 2.2 Declarar cuáles **no** son de este change y quién las hereda: la línea de tiempo de
  artefactos con nodos unidos es la sección 3c de `gestionar-ciclo-openspec-desde-gitcron`, y las
  palabras de los rótulos son de `explicar-el-ciclo-sin-tecnicismos`.

  ### Fronteras y herencia declaradas

  1. **Línea de tiempo de artefactos con nodos unidos (Observación 17):**
     - **Heredero:** Change `gestionar-ciclo-openspec-desde-gitcron`, sección 3c (tarea 3c.4).
     - **Fundamento:** Ese change es el dueño de la infraestructura y visualización operativa del ciclo de vida de OpenSpec, incluyendo dependencias entre artefactos, rutas en disco y trazabilidad de desbloqueos con nodos enlazados tipo grafo.
  2. **Rótulos, vocabulario y explicaciones de los controles (Observaciones 16, 22 parcial):**
     - **Heredero:** Change `explicar-el-ciclo-sin-tecnicismos`.
     - **Fundamento:** Este change (`adaptar-el-cuerpo-de-sdd-al-objetivo`) define **cuándo aparecen y dónde** las superficies y controles según la circunstancia; `explicar-el-ciclo-sin-tecnicismos` define **qué dicen** los textos, cómo se explica cada acción sin jerga técnica de OpenSpec y el contenido didáctico del glosario.

- [x] 2.3 Dos de las observaciones incumplen requisitos que ya están consolidados: el markdown plano
  contra «El contenido de los artefactos se lee con ritmo», y el empuje de una sección sobre otra
  contra «Un control no desplaza a los demás al cambiar». Declararlo como incumplimiento y no como
  pedido nuevo: cambia quién tiene que arreglarlo y con qué urgencia.

  ### Declaración formal de incumplimientos contra especificaciones consolidadas

  No se trata de sugerencias de diseño ni pedidos nuevos: son **incumplimientos de requisitos consolidados** en las especificaciones del sistema que deben corregirse con carácter de defecto:

  1. **Incumplimiento de «El contenido de los artefactos se lee con ritmo»** (`openspec/specs/pipeline-guided-workflow/spec.md:1110-1122`):
     - *Requisito consolidado:* «El texto de los artefactos SHALL presentarse con interlineado y separación entre bloques suficientes para leer un documento largo, y la separación SHALL distinguir un encabezado de un párrafo en vez de tratar todos los bloques por igual.»
     - *Incumplimiento observado:* **Observación 18.** En pantalla, el visor de artefactos (`SafeMarkdown` en `PipelineDetails`) sigue mostrando un markdown plano sin la separación estructural requerida entre párrafos y encabezados en documentos de prosa densa (`proposal.md`, `specs/`).
  2. **Incumplimiento de «Un control no desplaza a los demás al cambiar»** (`openspec/specs/pipeline-guided-workflow/spec.md:1092-1109` y delta del change actual):
     - *Requisito consolidado:* «Ninguna superficie que se abra, se despliegue o cambie de tamaño SHALL desplazar fuera de vista lo que la persona estaba mirando. Una superficie que necesite más lugar del que tiene SHALL ocupar el suyo propio... en vez de empujar a las que tiene debajo.»
     - *Incumplimiento observado:* **Observaciones 15 y 9/22.**
       - Tareas empuja a Evidencia verticalmente fuera de la pantalla en `styles.workArea` a medida que la lista crece.
       - En `styles.startScreen`, abrir el formulario de nuevo cambio (`PipelineNewChangeFlow:2595`) empuja inline la lista «EN CURSO» hacia abajo hasta expulsarla del viewport.
  3. **Incumplimientos adicionales contra `openspec/specs/sdd-body-layout/spec.md` (consolidado el 2026-09-04):**
     - **«La presentación SHALL declarar su jerarquía»** (`sdd-body-layout/spec.md:8-26`): «Un cuerpo de contenido SHALL presentar sus bloques en un orden que corresponda a lo que se va a hacer, y SHALL distinguir por tamaño, peso y posición lo que importa de lo accesorio... las accesorias no compiten con ella».
       * *Incumplimiento:* **Observación 14.** La cabecera en `.headerRow1` y `.headerRow2` (`OpenSpecDashboard.tsx:2160-2247`) reúne identidad, botón volver, glosario, Siguiente Paso, frase inline, acciones accesorias y archivar en una misma franja sin orden jerárquico claro, haciendo competir controles secundarios con el CTA primario.
       * *Incumplimiento:* **Observación 19.** El encabezado «TAREAS DEL CAMBIO» aparece descolgado y aislado de la acción inmediata.
     - **«Un control SHALL verse como lo que es»** (`sdd-body-layout/spec.md:27-39`): «Un control SHALL presentarse con la forma que corresponde a su función. Una solapa SHALL verse como solapa y no como botón...»
       * *Incumplimiento:* **Observación 16.** Las solapas de `PipelineDetails` con rótulos excesivamente largos compiten dimensionalmente como botones de bloque en lugar de solapas integradas de navegación documental.
     - **«Un dato NO SHALL presentarse dos veces en la misma pantalla»** (`sdd-body-layout/spec.md:40-58`): «Cuando un dato ya se declara en la franja de identidad o en el panel lateral, el cuerpo NO SHALL repetirlo.»
       * *Incumplimiento:* **Observación 22.** El rótulo «Siguiente paso» se repite en la pantalla de inicio sin declarar la acción concreta que se ejecuta.

## 3. La disposición condicional

- [x] 3.6 **Antes de decidir dónde va cada cosa, declarar qué no debería estar.** Pregunta de
  Alejandro del 2026-09-04: «chequeá si toda la info que hay hoy es necesaria de mostrar sí o sí, o
  si de hecho quedó deprecada de la versión anterior». Es distinta de la pregunta del grupo 1: allá
  se midió **bajo qué condición aparece** cada superficie; acá se pregunta **si tiene que existir**.
  Ya hay un caso confirmado: el botón «Glosario del método» y su panel, que el intento anterior dejó
  metidos sin contenido detrás y pertenecen a otro change. Buscar los demás: restos de maquetas
  retiradas, datos que ya no se leen, controles que quedaron de una versión previa del ciclo.
  Lo que esté deprecado se retira; lo que siga sirviendo, se condiciona. Distinguir las dos cosas y
  declarar cuál es cuál con su motivo.
  Mirar la referencia antes de dibujar: Alejandro la nombró dos veces, así que no es un ejemplo
  suelto sino el modelo. **La aprueba Alejandro.**

  ### Relevamiento de lo que debe existir vs. lo que quedó deprecado

  #### 1. Lo deprecado que SE RETIRA del cuerpo del ciclo:
  - **Botón y Drawer de «Glosario del método»** (`OpenSpecDashboard.tsx:2178-2186, 2486-2506` y pestaña en `PipelineDetails.tsx:116`):
    * *Motivo:* Introducido en `2218586` sin contenido real (sólo marcadores de posición). No tiene ninguna condición derivada de la evidencia de Git ni de archivos. Su vocabulario y didáctica pertenecen en exclusiva al change `explicar-el-ciclo-sin-tecnicismos`. No es una superficie del ciclo: es una herramienta de consulta bajo demanda y **se retira del cuerpo**.
    * *Responde a:* Tarea 1.2 (hallazgo) y Tarea 2.2.
  - **Bloque «Siguiente paso» (`PipelineNextStepGuide`) en la pantalla de inicio** (`OpenSpecDashboard.tsx:2594`):
    * *Motivo:* En la pantalla de entrada del repositorio no hay una secuencia lineal ni un "siguiente paso" que continuar. Lo que hay es la acción de iniciar un trabajo nuevo. Reutilizar el componente del ciclo en la vista de repositorios confunde el propósito y gasta espacio. **Se retira de `startScreen`**.
    * *Responde a:* Observación 22 («Siguiente paso va aparte y no se entiende como nombre: lo que hace es crear una tarea nueva»).
  - **Bloque colapsable / sección de «Actividad» en el cuerpo central** (`OpenSpecDashboard.tsx:2460-2482`):
    * *Motivo:* Medido en 1.2: en este proyecto los ejecutores se lanzan desde afuera (terminal o IDE); la aplicación no registra sesiones internas en reposo y la superficie permanece vacía el 100% del tiempo. Además, el panel derecho existente de la aplicación (`PipelineInspector`) ya cuenta con la sección desplegable de «Actividad». Mantener un `<details>` o bloque vacío al pie del scroll es un residuo de la maqueta anterior. **Se retira del cuerpo central** (pasa a ser vista condicional intercambiable en el panel lateral cuando hay sesión activa o bitácora).
    * *Responde a:* Observación 21 («ACTIVIDAD quedó al fondo de todo, fuera de vista») y Enmienda a Decisión b del 2026-09-04.
  - **Ficha y línea de aviso de tarea sin sesión (`styles.taskNoSession`)** (`OpenSpecDashboard.tsx:2432-2435`):
    * *Motivo:* Declarado como **Enmienda del 2026-09-04 a la Decisión 1.2 / Observación 5** (ver sección de enmiendas fechadas). La frase «Todavía no corrió ninguna sesión sobre esta tarea» declara una ausencia evidente que ensucia el ritmo visual de la lista de tareas en reposo. Si una tarea no tiene sesión observada, no se renderiza nada. **Se retira**.
    * *Responde a:* Requisito consolidado «El cuerpo muestra lo que sirve al objetivo del momento» (Scenario: Superficie sin nada que aportar no ocupa lugar).
  - **Botón accesorio «Ver diff» fijo en la cabecera** (`OpenSpecDashboard.tsx:2242-2244`):
    * *Motivo:* Aparece siempre en la cabecera como botón secundario compitiendo en tamaño, deshabilitado si no hay diffs. La inspección de diffs corresponde a la evidencia en disco cuando la circunstancia la trae, integrándose al intercambiador lateral cuando hay modificaciones. **Se retira de la cabecera fija**.
    * *Responde a:* Observación 14 («La cabecera no tiene criterio») y Requisito «La presentación SHALL declarar su jerarquía».
  - **Botón «Archivar cambio» fijo en la cabecera** (`OpenSpecDashboard.tsx:2228-2241`):
    * *Motivo:* Aparece fijo y permanente en la cabecera, deshabilitado durante casi todo el ciclo de vida del cambio. Archivar sólo corresponde cuando el cambio está validado y listo. Pasa a la ranura de acciones del panel lateral cuando la validación lo habilite. **Se retira de la cabecera fija**.
    * *Responde a:* Observación 14 y Requisito «Validación y archivo aparecen sólo en su momento».
  - **Bloque «CERRADOS» estático al pie de la pantalla de inicio** (`OpenSpecDashboard.tsx:2681-2720`):
    * *Motivo:* Ocupa espacio vertical permanente en la pantalla de inicio mostrando conteos estáticos. Los cambios archivados ya están accesibles en el navegador lateral. El acceso histórico se traslada a un enlace compacto en la barra/cabecera. **Se retira del flujo vertical central**.
    * *Responde a:* Observación 22 y Tesis de mostrar lo que sirve al momento.
  - **Encabezado redundante «TAREAS DEL CAMBIO» y recorte por elipsis** (`OpenSpecDashboard.tsx:2365-2368`, `OpenSpecDashboard.module.css:498`):
    * *Motivo:* Un título `h4` que declara lo obvio en una pantalla dedicada a ese cambio, y una regla CSS que trunca los textos descriptivos de las tareas. **Se retiran**.
    * *Responde a:* Observación 19 («TAREAS DEL CAMBIO quedó suelto y no se entiende, y los textos siguen cortándose»).
  - **Tren horizontal estático de artefactos dentro de la vista de tareas** (`PipelineArtifactGraph.tsx:43-73`):
    * *Motivo:* Durante la implementación de tareas (`apply`), un tren horizontal estático repitiendo íconos en cada render no aporta al trabajo inmediato de implementar la tarea N. Su visualización temporal con nodos enlazados tipo cronométrica pertenece a la sección 3c de `gestionar-ciclo-openspec-desde-gitcron` y se aloja en la cabecera de la Vista de Artefactos. **Se retira de la vista central de tareas**.
    * *Responde a:* Observación 17 y Tarea 2.2.

  #### 2. Lo que SIGUE SIRVIENDO y SE CONDICIONA a la evidencia:
  - **Área soberana de tareas (`tasks.md`):** Es el cuerpo principal de trabajo en fase de implementación. Se conmuta limpiamente con las otras vistas desde el panel lateral.
  - **Vista de Artefactos y Evidencia (`PipelineDetails`):** Sigue sirviendo, pero **NO convive debajo de las tareas**. Es una vista soberana en el cuerpo central que se intercambia con tareas desde el panel lateral, y en su cabecera superior aloja el espacio reservado para la línea de tiempo de artefactos (3c.4).
  - **Visor de Diffs (`LazyDiffViewer`):** Vista soberana en el cuerpo central seleccionable desde el panel lateral sólo cuando hay diffs observados (`snapshot.diffs.length > 0`).
  - **Lanzador de runtime (`PipelineRuntimeLauncher`):** Aparece inmediatamente bajo la cabecera cuando hay una intención activa de ejecución (`launchTarget !== null`).
  - **Aviso de discrepancia de rama (`ChangeBranchNotice`):** Aparece en la ranura contextual del panel lateral cuando `state.actual !== state.expected`.
  - **Confirmación de archivado (`archiveConfirm`):** Aparece cuando la validación está aprobada y se activa la acción de archivar.
  - **Formulario de nuevo cambio (`PipelineNewChangeFlow`):** Aparece en vista enfocada / modal propio cuando se elige proponer o explorar, sin empujar la lista de cambios.
  - **Lista de cambios activos («EN CURSO»):** Aparece como contenido central de la pantalla de inicio cuando hay cambios en curso.

- [x] 3.1 Proponer la disposición del cuerpo bajo la tesis, sin implementarla, declarando para cada
  superficie la condición por la que aparece y de qué evidencia se deriva. **La aprueba Alejandro.**

  ### Tabla de disposición condicional del cuerpo

  | Superficie / Componente | Dónde vive | Condición de aparición | Evidencia observada que la habilita | Justificación / Observación resuelta |
  | :--- | :--- | :--- | :--- | :--- |
  | **Lista «CAMBIOS EN CURSO»** | Centro de pantalla de inicio (`startScreen`) | Siempre en inicio si existen cambios activos | `activeChanges.length > 0` | Es el panorama real del repositorio al abrir la herramienta (Decisión a). |
  | **Bloque «Empezar un cambio»** | Cabecera / banda superior de pantalla de inicio | Siempre en inicio | Estado del repositorio | Sustituye a la guía confusa «Siguiente paso» (Obs. 22). |
  | **Formulario de nuevo cambio** (`PipelineNewChangeFlow`) | Vista enfocada / modal (sustituye inicio) | Al pulsar «Tengo clara la tarea» o «Quiero definirla mejor» | Intención de usuario (`flowMode === true`) | Ocupa su propio espacio; no empuja «EN CURSO» (Obs. 9 y 22). |
  | **Cabecera del cambio activo** | Franja superior del cambio activo | Siempre en cambio activo | `selectedChange !== null` | Desinflada: sólo navegación (`‹ Repositorio`), nombre del cambio y CTA primario derivado (Obs. 14, 1, 3). |
  | **Acción siguiente (CTA primario)** | Cabecera del cambio (extremo derecho) | Siempre en cambio activo | `derivePipelineNextAction` | Qué corresponde hacer ahora presidiendo la pantalla (Decisión a). |
  | **Área soberana de tareas** (`.taskList`) | Centro del cuerpo (cuando está activa) | Vista por defecto en fase de implementación | `selectedChange.tasks.length > 0` | Centro operativo del momento; se conmuta desde el panel lateral si se inspecciona otra vista (Obs. 10, 19). |
  | **Vista de Artefactos y Evidencia** (`PipelineDetails`) | Centro del cuerpo (cuando está activa) | Al seleccionarse desde el panel lateral (o por defecto en fase propuesta) | Artefactos existentes en disco | Vista soberana con ritmo tipográfico sin convivir apilada con tareas. Aloja en su cabecera el lugar reservado para 3c.4 (Obs. 15, 18, 20). |
  | ↳ *Lugar reservado: Línea de tiempo de artefactos* | Cabecera superior de la Vista de Artefactos | Siempre que se visualicen los artefactos | Artefactos del cambio (herencia 3c.4) | Tren horizontal interactivo (`proposal` → `specs` → `design` → `tasks`) que actúa de selector superior sin remaquetar. |
  | **Vista de Diffs / Código** (`LazyDiffViewer`) | Centro del cuerpo (cuando está activa) | Al seleccionarse desde el panel lateral | `snapshot.diffs.length > 0` | Inspección de cambios sin confirmar a pantalla completa. |
  | **Vista de Actividad / Sesión** (`ActivityFeed`) | Centro del cuerpo (cuando está activa) | Al seleccionarse desde el panel lateral | `runtimeActive === true` o sesión registrada | Lectura de narrativa y bitácora en cuerpo ancho sin estar enterrada en scroll infinito (Obs. 21). |
  | **Lanzador de runtime** (`PipelineRuntimeLauncher`) | Centro del cambio (bajo cabecera) | Al activar una acción de ejecución | `launchTarget !== null` | Aparece transitoriamente donde se va a ejecutar (Decisión a). |
  | **Panel Lateral Intercambiador de Vistas** (Modelo Codex) | Franja lateral derecha de alto completo | Si hay al menos una vista disponible que no se está mirando | Presencia de tareas, artefactos, diffs, o actividad | Pestañas dinámicas: muestra lo que no se está mirando; al clickear, conmuta con el cuerpo (Obs. 14, 21). |
  | ↳ *Ranura 1 (superior): Vista principal alternativa* | Panel lateral (Ranura 1) | Siempre en cambio activo con tareas y artefactos | `tasks` o `artifacts` según cuál esté en el cuerpo | Alterna entre `[ Tareas ]` y `[ Artefactos ]` sin desplazar posiciones. |
  | ↳ *Ranura 2 (media-alta): Evidencia de diffs* | Panel lateral (Ranura 2) | Si hay cambios sin confirmar en disco | `snapshot.diffs.length > 0` | Rótulo: `[ Diffs (N archivos) ]`. Conmuta el visor de diffs al cuerpo. |
  | ↳ *Ranura 3 (media-baja): Runtime / Actividad* | Panel lateral (Ranura 3) | Si hay agente vivo o bitácora reciente | `runtimeActive === true` o logs | Rótulo: `[ Actividad (sesión activa / logs) ]`. Conmuta la bitácora al cuerpo. |
  | ↳ *Ranura 4 (inferior): Entorno y acciones* | Panel lateral (Ranura 4) | Si la rama difiere o la validación está lista | `actual !== expected` o `archive.available` | Señal de rama y botón `[ Archivar cambio ]` contextual. |

- [x] 3.2 La propuesta responde con nombre y apellido a: dónde va la evidencia si no convive con las
  tareas; qué pasa con «Actividad» y si el desplegable del panel derecho ya la cubre; qué muestra el
  estado del repositorio y cómo se llama crear un cambio nuevo, que hoy se llama «Siguiente paso» y
  no dice lo que hace.

  ### Respuestas con nombre y apellido

  1. **Dónde va la evidencia si no convive con las tareas:**
     - **Nombre y apellido:** Pasa a ser una vista soberana propia en el cuerpo central llamada **«Vista de Artefactos y Evidencia»**, gobernada por el **Panel Lateral Intercambiador de Vistas**.
     - **Cómo se llega:** No a través de una pantalla desconectada ("Modo C con botón volver"), sino haciendo clic en la entrada `[ Artefactos (N) ]` del panel lateral. Al hacer clic, Artefactos pasa al cuerpo central ocupando el 100% del área y Tareas pasa al panel lateral.
     - **Lugar reservado integrado:** La vista de Artefactos y Evidencia cuenta con un contenedor superior reservado (`.artifactTimelineSlot`) donde vivirá la **Línea de tiempo de artefactos con nodos unidos** (heredada por `gestionar-ciclo-openspec-desde-gitcron` 3c.4), que funcionará como selector/navegador entre los documentos del cambio.
     - **Efecto:** Tareas y Evidencia dejan de compartir la misma columna vertical. Tareas tiene el 100% de la vertical de trabajo; la evidencia se lee con interlineado y separación tipográfica real (resuelve Observaciones 15, 18 y 20).
  2. **Qué pasa con «Actividad»:**
     - **Nombre y apellido:** **Desaparece por completo del cuerpo vertical amontonado.** No ocupa espacio fijo ni bloque colapsable `<details>` al pie del scroll.
     - **Cobertura y disponibilidad:**
       * En reposo (sin agente corriendo y sin bitácora interna, situación común con ejecutores externos), no se renderiza nada.
       * Si hay una sesión activa de runtime o bitácora reciente, el panel lateral intercambiador activa su Ranura 3: `[ Actividad (agente activo / logs) ]`. Al clickearla, conmuta la bitácora al cuerpo central en formato ancho legible.
       * Además, la bitácora en tiempo real **ya está cubierta de forma canónica por el desplegable «Actividad» del panel derecho (`PipelineInspector`)**, que es la superficie de inspección profunda de la aplicación.
       * Resuelve la Observación 21: la actividad deja de estar enterrada al fondo de un scroll infinito.
  3. **Qué muestra el estado del repositorio y cómo se llama crear un cambio nuevo:**
     - **Nombre y apellido del bloque de creación:** Deja de llamarse «Siguiente paso». Pasa a llamarse **«Empezar un cambio»**.
     - **Qué muestra la pantalla de inicio:**
       * Preside la sección **«CAMBIOS EN CURSO (N)»**, donde cada cambio activo muestra su identificador, avance de tareas completadas y lista desplegable de tareas pendientes.
       * Si no hay cambios en curso, muestra el estado del repositorio en reposo y los dos botones de creación jerarquizados («Tengo clara la tarea» y «Quiero definirla mejor»).
       * El acceso a los cambios archivados se ubica como un enlace compacto en la barra superior (`[ Historial archivado: N cambios ]`), suprimiendo el bloque inferior estático «CERRADOS» que empujaba el contenido (resuelve Observación 22).

- [x] 3.3 Declarar si «Tengo clara la tarea» y «Quiero definirla mejor» siguen siendo dos caminos y
  cómo se distinguen. Medido: son distintos —uno crea el cambio y su rama, el otro no crea nada— y
  hoy se ven iguales. Lo que **dicen** es de `explicar-el-ciclo-sin-tecnicismos`; lo que se decide
  acá es si siguen siendo dos controles y con qué peso.

  ### Declaración sobre los dos caminos de inicio

  1. **Son dos caminos distintos (medición de naturaleza y consecuencias):**
     - **Camino Propose («Tengo clara la tarea»):** Es una operación formal con efectos permanentes en Git y disco. Requiere slug válido, objetivo en lenguaje natural, crea la carpeta en `openspec/changes/<slug>`, y crea y conmuta la rama Git `change/<slug>`.
     - **Camino Explore («Quiero definirla mejor»):** Es una sesión conversacional de exploración. No crea carpetas en `openspec/`, no crea ramas en Git, y opera con `changeId` nulo.
  2. **Decisión de existencia:**
     - **Siguen siendo dos controles**, porque responden a dos estados de intención radicalmente diferentes (aplicar la metodología sobre una tarea definida vs. pensar una idea difusa).
  3. **Decisión de jerarquía y peso relativo:**
     - Hoy se presentan como dos botones equivalentes. Bajo esta propuesta se jerarquizan con pesos diferenciados:
       * **«Tengo clara la tarea» es la Acción Primaria** (`primaryAction`, botón destacado con fondo cian e ícono `Plus` o `Play`), reflejando que proponer un cambio es el flujo principal y estándar de GitCron.
       * **«Quiero definirla mejor» es la Acción Secundaria** (`secondaryAction`, botón de apoyo con borde tenue y fondo transparente), presentándose como una alternativa subordinada para exploración previa.
  4. **Despliegue no invasivo:**
     - Ninguno de los dos se despliega inline empujando la lista de cambios activos. Ambos abren el flujo en una vista enfocada que sustituye temporalmente la pantalla de inicio con botón explícito de cancelación / cierre (resuelve Observación 9 e incumplimiento de spec).

- [x] 3.4 Resolver la forma del panel lateral flotante. Referencia declarada por Alejandro el
  2026-09-04: la interfaz de Codex, donde el panel de entorno va sumando lo que la circunstancia
  trae —los cambios con su conteo, la rama, las fuentes, las acciones disponibles— y lo que no
  corresponde no está. **Decidido el 2026-09-04 por Alejandro, mirando la referencia en dos
  estados distintos:**
  - **No flota por encima del contenido.** Ocupa su propia franja a la derecha y el contenido
    principal ocupa la suya, sin taparse. El motivo: así el panel puede crecer más adelante sin
    pelear con lo que tiene debajo.
    **Corregido el 2026-09-04, tras ver el mecanismo andando: el panel NO es de alto completo.**
    Esto enmienda lo que decía antes esta misma línea, que era un error de transcripción de la
    decisión de Alejandro. El panel **toma la altura de su contenido**: se agranda y se achica según
    lo que haya, como la caja «Entorno» de la referencia. Y cuando tiene poca información, la
    presenta desplegable, del mismo modo que ya lo hace el panel derecho de la aplicación.
  - **Y cuando no tiene nada que mostrar, no existe**, y el contenido se queda con todo el ancho.
    Alejandro lo midió abriendo un chat nuevo en la referencia: sin nada iniciado, el panel no está
    y la maqueta se acopla. Es la tesis de este change aplicada al panel mismo: no se reserva lugar
    «por si acaso».

  **Precisión del 2026-09-04, posterior a la primera propuesta. Alejandro corrigió el modelo y esto
  reemplaza lo que la resolución de abajo declara sobre qué va adentro del panel.** Sus palabras:
  «de las que quedan, habría que pasarlo al menú flotante, para que si clickeás, aparezca la info en
  el cuerpo, reemplazando la vista actual, y que en el menú aparezca la vista que desapareció, como
  si fuesen tabs, pero dinámicos».

  El panel **no es un cajón de lo accesorio: es un intercambiador de vistas.**
  - El cuerpo muestra **una vista por vez**, la que corresponde a lo que se está haciendo.
  - El panel lista **todo lo que está disponible en ese momento y no se está mirando**: las otras
    vistas del ciclo, más lo que la circunstancia traiga.
  - Al elegir una entrada del panel, **esa pasa al cuerpo y la que estaba en el cuerpo pasa al
    panel**. Son pestañas, pero el conjunto no es fijo: cambia con la circunstancia.
  - Si no hay nada disponible además de lo que se está mirando, el panel no existe y el cuerpo se
    queda con todo el ancho.

  Eso cambia qué va adentro. No sólo la rama divergente, los diffs o la sesión viva —que es lo que
  resolvió la primera propuesta— sino **las superficies del ciclo que hoy están apiladas en la misma
  columna**: evidencia, artefactos, actividad. Dejan de convivir con las tareas y pasan a ser
  entradas del panel, a un clic.
  Con este modelo, las cuatro condiciones de aparición que declara la resolución de abajo quedan
  cortas: el panel va a existir siempre que haya al menos otra vista disponible, que es casi
  siempre. Hay que rehacer esa parte.

  Queda por decidir: cómo se rotula cada entrada para que se sepa qué trae sin abrirla, si además se
  puede plegar a mano cuando sí tiene
  contenido —como ya hace el panel derecho de la aplicación—, y cómo entra un ítem nuevo sin que lo
  que ya estaba se mueva de lugar, que es lo que exige el requisito «Un control no desplaza a los
  demás al cambiar».

  ### Resolución arquitectónica del Panel Lateral como Intercambiador de Vistas (Modelo Codex dinámico)

  1. **El principio de intercambio de vistas:**
     - El cuerpo central muestra **una única vista soberana por vez** (el foco del momento: Tareas, Artefactos, Diffs o Actividad).
     - El panel lateral derecho de alto completo lista **todas las demás vistas disponibles que no se están mirando en ese instante**, más las señales contextuales de entorno.
     - Al pulsar cualquier tarjeta o botón del panel lateral:
       * La vista seleccionada **pasa al cuerpo central** de forma inmediata.
       * La vista que estaba en el cuerpo central **pasa al panel lateral**, colocándose en su ranura correspondiente.
     - Consecuencia: se eliminan las pantallas desconectadas con botón volver («Modo C») y el apilamiento vertical destructivo. El cambio de foco es bidireccional y fluido como un juego de pestañas dinámicas.

  2. **Qué entradas tiene en cada momento del ciclo y de qué evidencia sale cada una:**
     - **Entrada «Tareas» (`tasks`):**
       * *Evidencia observada:* Archivo `tasks.md` con tareas definidas en el cambio (`selectedChange.tasks.length > 0`).
       * *Comportamiento:* Es la vista por defecto en el cuerpo durante la fase de implementación (`apply`). Pasa al panel lateral cuando el usuario conmuta al cuerpo la vista de Artefactos, Diffs o Actividad.
     - **Entrada «Artefactos y Evidencia» (`artifacts`):**
       * *Evidencia observada:* Archivos `proposal.md`, `specs/` o `design.md` existentes en disco.
       * *Comportamiento:* Es la vista por defecto en el cuerpo durante la fase de propuesta (`propose`). Pasa al panel lateral durante la fase de tareas. Contiene en su cabecera superior el espacio reservado para la línea de tiempo de artefactos (3c.4).
     - **Entrada «Diffs / Cambios en código» (`diffs`):**
       * *Evidencia observada:* Presencia de modificaciones sin confirmar en disco (`snapshot.diffs && snapshot.diffs.length > 0`).
       * *Comportamiento:* Si no hay diffs en disco, esta entrada **no existe** en el panel ni en el cuerpo. Si surgen modificaciones, se incorpora al panel; al clickearla, conmuta el visor de diffs al cuerpo central.
     - **Entrada «Actividad / Sesión de agente» (`activity`):**
       * *Evidencia observada:* Ejecutor de runtime activo (`runtimeActive === true`) o eventos de bitácora recientes registrados.
       * *Comportamiento:* Si no hay sesión ni eventos (reposo habitual con ejecutores externos), esta entrada **no existe**. Al iniciarse una sesión, entra al panel lateral; al clickearla, abre la narrativa y logs en el cuerpo ancho.
     - **Señales de entorno y acciones finales (no intercambiables):**
       * *Aviso de rama discrepante:* Si `state.actual !== state.expected`, se muestra una pastilla de alerta en el panel.
       * *Acción Archivar cambio:* Si el cambio está formalmente validado (`archive.available === true`), se habilita el botón de archivado al pie del panel.

  3. **Rotulación de cada entrada sin abrirla:**
     - Para que la persona sepa qué trae cada vista sin necesidad de hacer clic ni abrirla, cada tarjeta del panel declara explícitamente su métrica y estado en su rótulo:
       * `[ Tareas · 3 pendientes (5 listas) ]` (o `[ Tareas · 1 en curso ]`)
       * `[ Artefactos · 4/4 listos ]` (o `[ Artefactos · propuesta y 2 specs ]`)
       * `[ Diffs · 3 archivos (+48 / -12) ]`
       * `[ Actividad · Agente ejecutando (1m 20s) ]` (o `[ Actividad · Última sesión completada ]`)
       * `[ ⚠️ Rama: change/... ≠ actual ]`
       * `[ ✔️ Archivar cambio (validado) ]`

  4. **Preservación de estado al intercambiar (conmutar sin perder contexto):**
     - Conmutar entre vistas no debe costar esfuerzo de reubicación. Al intercambiar vistas entre el cuerpo y el panel lateral se preserva el estado en memoria de sesión:
       * **Posición de scroll vertical (`scrollTop`):** Cada vista recuerda su desplazamiento exacto. Si el usuario leía la línea 80 de una spec en Artefactos y conmuta a Tareas para verificar una casilla, al volver a Artefactos la vista aterriza en la línea 80 exacta.
       * **Selección / foco de tarea:** En Tareas, la tarea activa o expandida permanece en su estado.
       * **Pestaña / artefacto activo:** En Artefactos, el documento que se estaba examinando (`proposal`, `specs/<cap>`, `design`) permanece seleccionado.
       * **Archivo y pliegues en Diffs:** En el visor de diffs, el archivo seleccionado y los bloques colapsados se conservan.

  5. **Adaptación de las 4 ranuras estables (para que nada se mueva de lugar):**
     - Para cumplir estrictamente el requisito consolidado **«Un control no desplaza a los demás al cambiar»**, el panel se organiza en ranuras predecibles de posición fija:
       * **Ranura 1 (Superior) · Vista principal alternativa del ciclo:**
         - Si el cuerpo muestra Tareas, Ranura 1 aloja `[ Artefactos ]`.
         - Si el cuerpo muestra Artefactos (o Diffs), Ranura 1 aloja `[ Tareas ]`.
         - Dado que en un cambio activo siempre existen al menos tareas y artefactos, la Ranura 1 permanece siempre presente y fija como ancla superior.
       * **Ranura 2 (Media-alta) · Evidencia de código (Diffs):**
         - Si hay diffs observados en disco, aloja `[ Diffs ]`.
         - Si el cuerpo pasa a mostrar Diffs, Ranura 2 muestra la vista que fue desplazada (ej. `[ Artefactos ]` o `[ Tareas ]`), o mantiene el slot predecible.
         - Si no hay diffs en disco, la ranura no se reserva ni empuja; su aparición al producirse el primer diff entra mediante transición suave de opacidad (`fade-in`), sin salto brusco bajo el cursor.
       * **Ranura 3 (Media-baja) · Estado de Runtime / Actividad:**
         - Si hay sesión viva o actividad reciente, ocupa la Ranura 3.
         - Si el cuerpo pasa a mostrar Actividad, aloja la vista desplazada.
         - Si no hay actividad, la ranura no se muestra.
       * **Ranura 4 (Inferior) · Entorno Git y Acciones Finales:**
         - Aloja el aviso de discrepancia de rama (`ChangeBranchNotice`) y la acción contextual `[ Archivar cambio ]` cuando esté habilitada.

  6. **¿Cuándo no existe el panel lateral? (Revisión con el dato real):**
     - Con el modelo previo, se asumía erróneamente que en reposo el panel quedaba vacío. Con el modelo de intercambiador de vistas, **en un cambio activo el panel existe casi siempre**, porque como mínimo existen dos vistas disponibles (Tareas y Artefactos): una ocupa el cuerpo y la otra ocupa el panel.
     - **¿Cuándo NO existe o no ocupa lugar el panel?**
       * *En la pantalla de inicio del repositorio (`startScreen`):* No hay cambio activo abierto; el cuerpo muestra la lista «CAMBIOS EN CURSO» a ancho completo.
       * *En un cambio en fase embrionaria previa a la creación de artefactos:* Flujo inicial de carga o formulario sin vistas secundarias generadas.
       * *Por plegado manual a demanda:* Si la persona pulsa el control de colapso discreto (`[»]`), el panel se repliega a un riel mínimo de iconos o se oculta, cediendo el 100% del ancho al cuerpo central hasta su reapertura (`[«]`).

- [x] 3.5 Declarar el alcance del panel: este change lo resuelve para el cuerpo del ciclo. Dejar el
  mecanismo escrito de modo que otra vista de GitCron pueda adoptarlo sin rehacerlo, y declarar qué
  haría falta para extenderlo. No extenderlo acá: eso es otro change.

  ### Alcance y extensibilidad del Panel Lateral

  1. **Alcance acotado a este change:**
     - Se resuelve **exclusivamente para el cuerpo de la vista del ciclo (Pipeline / SDD)** como intercambiador dinámico de vistas y entorno contextual. No se extiende a otras pantallas en este change.
  2. **Mecanismo extensible desacoplado:**
     - Se define el componente modular `ViewSwitcherRail` (o `ContextualEnvironmentRail`) con un contrato desacoplado de slots tipados (`{ id: 'tasks' | 'artifacts' | 'diffs' | 'activity', label: string, badge?: string, slotIndex: 1 | 2 | 3 | 4, active: boolean, onClick: () => void }`).
     - El componente gestiona internamente la regla de auto-ocultamiento (`if (availableViews.length <= 1 && !hasEnvSignals) return null`), la transición de ancho continuo, la preservación de scroll y el estado de colapso manual (`isCollapsed`).
  3. **Qué haría falta para extenderlo a otras vistas de GitCron:**
     - Crear un provider o hook de contexto (`useViewSwitcher`) para que vistas como el Commit/Staging o el Visor de Ramas puedan registrar sus propias vistas e intercambiarlas dinámicamente con el cuerpo.
     - Unificar la coexistencia del rail con el panel lateral derecho (`Inspector`) para evitar saturación de paneles verticales en resoluciones medianas.
     - Ambas extensiones quedan explícitamente declaradas como materia de un change futuro.

---

### Casos especiales, enmiendas fechadas y decisiones de diseño fundamentales

#### El lugar reservado de la Línea de Tiempo de Artefactos (herencia 3c.4)
- **Problema de origen:** En `remaquetar-cuerpo-de-sdd` se acordó que la línea de tiempo de artefactos con nodos unidos tipo cronométrica no se dejaba «para acomodar más adelante», porque maquetar sin contarla obligaría a remaquetar dos veces. La tarea 2.2 de este change declaró que la hereda `gestionar-ciclo-openspec-desde-gitcron` en su tarea 3c.4.
- **Lugar reservado asignado:** Vive en la **cabecera superior de la Vista de Artefactos y Evidencia (`PipelineDetails`)**.
  * Cuando el usuario conmuta a la vista de Artefactos en el cuerpo central, la parte superior de la pantalla contiene el contenedor reservado `.artifactTimelineSlot`.
  * Este contenedor aloja el tren horizontal de nodos unidos e interactivos (`proposal` → `specs` → `design` → `tasks`) con su avance y desbloqueos.
  * Funciona como el selector de navegación entre los artefactos: al pulsar un nodo del tren, se despliega debajo el contenido markdown de ese documento con ritmo tipográfico.
  * Mientras `gestionar-ciclo-openspec-desde-gitcron` no implemente el grafo 3c.4, este espacio reservado contiene las solapas documentales existentes saneadas.
  * No invade las tareas y no requiere remaquetar el cuerpo cuando 3c.4 entre en funcionamiento.

#### Enmiendas a decisiones previas

1. **Enmienda del 2026-09-04 a la Decisión de la Observación 5 (Decisión 1.2): Retiro total de la línea de aviso de tarea sin sesión (`styles.taskNoSession`).**
   - *Antecedente:* En `remaquetar-cuerpo-de-sdd`, la decisión 1.2 / observación 5 reemplazó las cuatro filas de «No informado» en tareas sin sesión por una sola línea discreta: «Todavía no corrió ninguna sesión sobre esta tarea».
   - *Motivo de la enmienda:* Alejandro observó con acierto la utilidad real de mantener esa línea: una frase que sólo declara la ausencia de una sesión ensucia el ritmo visual de la lista de tareas en reposo. La ausencia de sesión es evidente por el estado pendiente de la tarea; declarar lo que *no* pasó no aporta valor al objetivo del momento. La información de ejecución (agente, diffs, duración) sólo se renderiza cuando existe una sesión real observada en disco/runtime. Si no hay sesión, no se dibuja ni ficha ni frase de disculpa. Cumple el requisito consolidado «El cuerpo muestra lo que sirve al objetivo del momento» (Scenario: Superficie sin nada que aportar no ocupa lugar).
2. **Enmienda del 2026-09-04 a la Decisión (b): Desacople de Actividad del cuerpo central.**
   - *Antecedente:* Decisión (b) contemplaba «Trabajo, Artefactos y Actividad» en una sola columna vertical con scroll.
   - *Motivo de la enmienda:* Medido en 1.2: Actividad está vacía el 100% del tiempo con ejecutores externos, y cuando se llenaba empujaba el scroll hacia el infinito (observación 21). Se retira del cuerpo vertical central y pasa a ser una vista condicional en el panel lateral intercambiador, respaldada por el desplegable canónico del panel derecho (`PipelineInspector`).

#### El caso especial del Glosario (y otras superficies análogas)
- **Problema:** El glosario no depende de ninguna evidencia observable de Git o del repositorio; es contenido didáctico conceptual estático. Forzarle una condición derivada de evidencia observada contradice su naturaleza.
- **Resolución:** El glosario **NO es una superficie condicional**. Es una **herramienta de consulta bajo demanda** (on-demand utility). Se retira del flujo y de las solapas del cuerpo del cambio. No compite por espacio con el trabajo. Se accede bajo demanda desde la barra general de la aplicación o mediante enlaces en términos técnicos subrayados.
- **Casos análogos:** La documentación de la metodología, los atajos de teclado y las guías de onboarding están en la misma situación: no se condicionan por evidencia, son utilidades bajo demanda.

#### Orden propuesto de implementación por región de pantalla (para el Grupo 4)
La implementación se ejecutará en tandas separadas por región de pantalla, con revisión visual de Alejandro entre región y región:
1. **Región 1 · Pantalla de inicio del repositorio (`startScreen`):**
   - *Qué abarca:* Reemplazo de «Siguiente paso» por «Empezar un cambio», jerarquización de Propose (primario) y Explore (secundario), apertura no invasiva del formulario enfocado (resuelve obs. 9 y 22), y centralidad de la lista «EN CURSO».
   - *Por qué va primera:* Es una pantalla autónoma que no depende del estado interno de un cambio activo; arreglarla primero elimina el empuje de la lista y valida el desacople de formularios.
2. **Región 2 · Cabecera del cambio activo (`changeHeader`):**
   - *Qué abarca:* Desinflar la doble fila (`headerRow1` y `headerRow2`), retirar glosario y botones fijos de archivar y diff, unificar identidad, retorno integrado y CTA principal derivado (resuelve obs. 14, 1, 3).
   - *Por qué va segunda:* Establece la jerarquía y contexto superior del cambio activo, liberando el espacio vertical antes de maquetar el cuerpo.
3. **Región 3 · Panel Lateral Intercambiador de Vistas (Modelo Codex dinámico):**
   - *Qué abarca:* Franja lateral de alto completo con mecanismo de conmutación de vistas («tabs dinámicos»), ranuras estables (1 a 4), preservación de scroll y estado, rótulos con métrica sin abrir, y plegado manual a demanda (resuelve obs. 21 y cumple «Un control no desplaza a los demás al cambiar»).
   - *Por qué va tercera:* El panel es el mecanismo estructural que gobierna a las regiones 4 y 5. Implementarlo al final obligaría a que las revisiones visuales de tareas y de artefactos se hagan sobre dos pantallas sueltas que todavía no se pueden conmutar entre sí —es decir, sobre algo que no es el resultado final—. Eso fue exactamente lo que hizo fracasar la revisión visual de `remaquetar-cuerpo-de-sdd`: mirar piezas fuera de su contexto y no poder juzgarlas. El panel se puede construir antes que el pulido de las vistas que conmuta porque las vistas de tareas y de artefactos **ya existen hoy** en el árbol (aunque estén mal dispuestas): el panel se construye para intercambiar esas dos tal como están hoy. Así el mecanismo se ve funcionando desde temprano y cada mejora posterior se juzga adentro del contexto real.
4. **Región 4 · Área soberana de Trabajo (Tareas en `.workArea`):**
   - *Qué abarca:* Tareas como centro del objetivo del momento a pantalla completa, retiro de títulos parásitos y elipsis destructiva (obs. 19), y retiro de disculpa de tarea sin sesión bajo la enmienda fechada.
   - *Por qué va cuarta:* Con la cabecera ya desinflada (Región 2) y el panel intercambiador ya operativo (Región 3), la lista de tareas se limpia y se evalúa en su contenedor soberano con el 100% de la vertical, pudiendo conmutar en vivo contra la vista de artefactos para validar la experiencia de trabajo real.
5. **Región 5 · Vista de Artefactos y Evidencia (`PipelineDetails`):**
   - *Qué abarca:* Vista soberana propia para artefactos con ritmo tipográfico de markdown (resuelve obs. 18, incumplimiento de spec), retiro definitivo de la solapa de glosario, y reserva explícita del contenedor `.artifactTimelineSlot` en su cabecera para la línea de tiempo 3c.4.
   - *Por qué va quinta:* Ya gobernada por el panel intercambiador (Región 3), se pule la lectura documental a pantalla completa con interlineado y márgenes reales, y se deja lista la ranura receptora de la línea de tiempo con nodos unidos, juzgando la alternancia entre tareas y artefactos sin amontonamientos.

---

### Trazabilidad contra observaciones y decisiones previas

| Elemento propuesto | Responde a |
| :--- | :--- |
| **Retiro de glosario y botones parásitos de cabecera** | Observación 14 («Cabecera sin criterio»), Requisito «La presentación SHALL declarar su jerarquía». |
| **Cabecera desinflada con CTA dominante** | Observación 1 («Cabecera ocupa primer tercio»), Observación 3 («Botones pesan igual»), Decisión a. |
| **Tareas soberanas a pantalla completa** | Observación 10 («Trabajo es la superficie que más se usa y se corta»), Decisión b. |
| **Eliminación de elipsis y título redundante en tareas** | Observación 19 («TAREAS DEL CAMBIO quedó suelto y textos cortados»). |
| **Retiro de línea de tarea sin sesión (`.taskNoSession`)** | Enmienda del 2026-09-04 a Decisión 1.2 / Obs. 5, Requisito consolidado «El cuerpo muestra lo que sirve al momento». |
| **Vista soberana de Artefactos intercambiable vía panel** | Observación 15 («Tareas empuja Evidencia»), Observación 20 («Evidencia no puede convivir con tareas en misma columna»). |
| **Lugar reservado para línea de tiempo de artefactos** | Herencia de tarea 3c.4 de `gestionar-ciclo-openspec-desde-gitcron` (preside la Vista de Artefactos). |
| **Ritmo y separación tipográfica en markdown** | Observación 18 («Markdown de las solapas sigue sin formato»), Requisito consolidado «El contenido de los artefactos se lee con ritmo». |
| **Retiro de «Actividad» del cuerpo central** | Observación 21 («Actividad quedó al fondo de todo fuera de vista»), Enmienda a Decisión b. |
| **Bloque «Empezar un cambio» jerarquizado** | Observación 22 («El estado del repo mezcla dos cosas; crear cambio no se llama Siguiente paso»). |
| **Formulario de nuevo cambio no invasivo** | Observación 9 («El formulario empuja la lista»), Requisito consolidado «Un control no desplaza a los demás al cambiar». |
| **Panel lateral intercambiador de vistas dinámico** | Modelo Codex corregido por Alejandro (2026-09-04), Requisito consolidado «Un control no desplaza a los demás al cambiar». |

## 4. Implementación, una región por tanda

- [ ] 4.1 Implementar lo aprobado **por región de pantalla, no de una sola vez**, con revisión visual
  de Alejandro entre región y región. El orden lo fija la propuesta aprobada.
- [ ] 4.2 Ninguna superficie que se abre empuja fuera de vista lo que se estaba mirando.
- [ ] 4.3 Cada superficie condicional declara qué la habilitó, y la condición sale de evidencia
  observada.

- [ ] 4.4 **Revisión visual de la Región 1 por Alejandro, 2026-09-04. Se acepta el avance y se
  corrigen cuatro cosas.** «Está empezando a verse mejor», con estas observaciones:

  23. **«93 archivados» se despliega hacia abajo como un menú.** Tiene que comportarse como el
      panel derecho de la aplicación: al pulsarlo, **el listado se muestra en el cuerpo**, no se
      abre hacia abajo empujando lo que está debajo. Es el modelo de intercambio aplicado acá.
  24. **El formulario se abre como modal encima del cuerpo, y los modales no van para esto.**
      Estaba avisado y se hizo igual, por una razón entendible —el intercambiador todavía no
      existe—, pero la solución no es un modal.
  25. **«Tengo clara la tarea» no es el nombre.** Alejandro: «parece gallego». Y proponer un cambio
      no es «una tarea»: medido contra la propia herramienta, OpenSpec llama **change** a la unidad
      de trabajo —`openspec new change`, `proposal.md`, *propose a change*— y **task** a las tareas
      de adentro de un change. El rótulo actual invierte los dos términos. Lo que se muestre tiene
      que usar el vocabulario de la herramienta. **La redacción final es de
      `explicar-el-ciclo-sin-tecnicismos`; acá se declara que el término está mal usado.**
  26. **Al elegir una de las dos opciones, las dos vuelven a mostrarse en fichas grandes.** Es
      redundante: ya se eligió. La elección hecha no tiene que repetirse ocupando el mismo espacio
      que antes de elegir.

- [ ] 4.5 **Agujero de la propuesta que destapó la revisión de 4.4, y hay que resolver antes de
  seguir.** La resolución del panel declara que **en la pantalla de inicio el panel no existe** y el
  cuerpo va a ancho completo. Pero las observaciones 23 y 24 piden exactamente lo contrario: que
  «archivados» y el formulario de empezar un cambio **se muestren en el cuerpo intercambiando con lo
  que había**, que es lo que hace el panel.
  O el intercambiador también gobierna la pantalla de inicio —y entonces ahí hay panel, o al menos
  el mecanismo de intercambio sin la franja—, o esa pantalla necesita su propia regla declarada.
  Sin resolver esto, la Región 1 no se puede terminar: sus dos defectos restantes son casos del
  mecanismo que todavía no existe.

  **Resuelto el 2026-09-04 por Alejandro:**
  - **El intercambiador gobierna todas las pantallas del cuerpo del ciclo, incluida la de inicio.**
    Una sola regla para todas: dos comportamientos distintos en dos pantallas es lo que hace que la
    aplicación se sienta inconsistente.
  - **El panel está presente prácticamente siempre.** Sus palabras: «es un sidebar que está para
    todos; más allá de que aparezca según las circunstancias y se popule con las opciones a elegir,
    es casi de cabeza que va, porque siempre tiene algo que mostrar para hacer click». La regla de
    que desaparece cuando no tiene nada **sigue valiendo, pero como caso borde y no como caso
    normal**: en la pantalla de inicio conviven los cambios en curso, los archivados y el
    formulario; en un cambio activo conviven las tareas, los artefactos y lo que traiga la
    circunstancia. Siempre hay al menos otra vista disponible.
  - **Consecuencia sobre el orden de implementación: el panel pasa a construirse primero**, antes de
    terminar la Región 1. Sus dos defectos restantes —el desplegable de archivados y el modal del
    formulario— son casos del mecanismo, y resolverlos sin él sólo produce más parches. El orden que
    declara la tarea 3.6 queda corregido acá.

- [ ] 4.6 **Segunda revisión visual de Alejandro, 2026-09-04, con el intercambiador ya andando.**
  «Me va gustando: cambia según la opción que elegís y usa el cuerpo para mostrar el contenido.»
  Tres correcciones:

  27. **«Empezar un cambio» está dos veces.** Sigue como bloque en el cuerpo de la pantalla de
      inicio y además es una entrada del panel. Con el mecanismo andando, el bloque del cuerpo
      sobra: la entrada del panel ya lo hace. Se retira del cuerpo.
  28. **El panel toma la altura de su contenido, no la de la ventana.** Ver la corrección escrita en
      la tarea 3.4. Se agranda y se achica según lo que haya, y con poca información lo presenta
      desplegable, como el panel derecho actual.
  29. **El control de mostrar y ocultar, tomado de la referencia.** En la interfaz de Codex se llama
      «Alternar resumen fijado», su ícono vive arriba y separado del panel, y hace dos cosas: al
      activarlo el panel aparece **corriendo el contenido del medio** para hacerle lugar, y al
      desactivarlo desaparece **devolviéndole ese lugar al contenido**, que queda siempre centrado.
      Ese desplazamiento **no incumple** «Un control no desplaza a los demás al cambiar»: ese
      requisito prohíbe que algo se mueva **solo**, no que se mueva porque la persona lo pidió. Hay
      que declarar esa distinción al implementarlo, para que nadie la lea al revés más adelante.

- [ ] 4.7 **Tercera revisión visual de Alejandro, 2026-09-04.** «La pantalla de inicio me gusta.»
  Tres detalles de forma del panel, tomados de la referencia:

  30. **La barra de desplazamiento del cuerpo va contra el borde derecho de la ventana**, no dentro
      del contenedor del contenido. En la referencia, el contenido se desplaza y su barra queda
      pegada al extremo de la ventana, no rodeando la caja.
  31. **El panel queda fijo al desplazarse.** Cuando el cuerpo se desplaza, el panel no se va con
      él: se queda donde está.
  32. **El panel no lleva borde que lo separe.** Tiene que condecir con el cuerpo, no leerse como
      una caja aparte pegada al costado. A lo sumo una sombra suave. Hoy tiene un borde delimitador.

  Confirmado además que **la vista del cambio activo sigue sin tocar** —cabecera amontonada, botón
  de glosario, «Siguiente paso», «Archivar cambio» suelto, «TAREAS DEL CAMBIO» y los textos
  cortados—: es la tanda siguiente y está previsto. El contenido del glosario es de
  `explicar-el-ciclo-sin-tecnicismos`; acá sólo se retira su botón cuando se rehaga esa cabecera.

## 5. Pruebas

- [ ] 5.1 Sostener lo decidido: que una superficie sin contenido no ocupe lugar, que siga siendo
  alcanzable, y que abrir una no desplace a las demás. Afirmar sobre el DOM montado.
- [ ] 5.2 Declarar qué NO cubre la verificación de este change y qué archivos recorre: una
  comprobación vale lo que abarca.

## 6. Revisión visual

- [ ] 6.1 El cuerpo se lee de arriba abajo, lo primero es lo que se va a hacer, nada se dice dos
  veces, y nada que no sirva al momento ocupa lugar. **La marca Alejandro.**

## 7. Cierre

- [ ] 7.1 `pnpm build` en cero. Va primero: la suite lee el CSS compilado de `out/`.
- [ ] 7.2 `pnpm exec tsc --noEmit` en cero.
- [ ] 7.3 `pnpm test` en verde, informando «Test Files» y «Tests».
- [ ] 7.4 `pnpm exec eslint` limpio sobre lo tocado.
- [ ] 7.5 `openspec validate adaptar-el-cuerpo-de-sdd-al-objetivo --strict` en cero.
- [ ] 7.6 `git diff --check` en cero.
