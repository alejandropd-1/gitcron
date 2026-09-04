# Tareas

## Resultado de este change, declarado al cerrarlo el 2026-09-04

**La disposición propuesta se implementó y su revisión visual se rechazó.** El motivo no fue la
ejecución: fue la regla que este change se puso a sí mismo —«no agrega información ni la quita:
mueve, agrupa y jerarquiza lo que ya está»—. Con un cuerpo amontonado y esa restricción, lo único
posible era reubicar el montón, y eso fue lo que pasó: tareas empuja evidencia, evidencia empuja
actividad, y actividad termina fuera de vista.

**Lo que este change deja hecho y sirve:**

- El relevamiento: trece observaciones confirmadas contra el árbol, con archivo y línea. Es el
  activo más caro y lo hereda entero el change que sigue.
- Un piso implementado y medido, congelado en el commit `2218586` de la rama
  `change/remaquetar-cuerpo-de-sdd`: el área de trabajo dejó de estar clavada y puede crecer, las
  reglas de composición del texto de los artefactos se corrigieron, salió CSS muerto de una maqueta
  retirada, y el aviso de rama dejó de usar la caja pesada del aviso viejo.
- Cinco decisiones de disposición, con sus enmiendas y sus motivos.

**Lo que no resolvió y quién lo hereda:**

- La disposición del cuerpo, bajo una tesis distinta —mostrar lo que sirve al objetivo del momento
  en vez de mostrarlo todo siempre—: `adaptar-el-cuerpo-de-sdd-al-objetivo`.
- La forma del recorrido de artefactos, una línea temporal con nodos unidos:
  `gestionar-ciclo-openspec-desde-gitcron`, tarea 3c.4.
- Las palabras de los rótulos y las explicaciones de cada control:
  `explicar-el-ciclo-sin-tecnicismos`.

Las casillas que quedaron marcadas lo están porque el trabajo se hizo. La 4.6 se marca porque la
revisión visual **ocurrió**: su resultado fue el rechazo, y ese resultado está escrito en la 1.4.
Un change no se cierra en falso diciendo que no se revisó.


Las fases se envían por separado. Cada una se valida entera antes de pasar a la siguiente, y entre
fase y fase hay revisión visual de Alejandro. Este change no arranca hasta que
`unificar-paleta-carbon-soul` esté cerrado: buena parte de lo que hoy se ve mal es color y escala, y
juzgar la disposición a través de ese ruido lleva a decidir dos veces.

## 0. Adelantado fuera de este change

Se hizo el 2026-08-26 dentro de `unificar-paleta-carbon-soul`, porque Alejandro lo vio mirando la
aplicación y no tenía sentido dejarlo roto hasta que este change arranque. Queda anotado para que no
se releve dos veces.

- [x] 0.1 Convención de chevrons en acordeones: **cerrado apunta abajo, abierto apunta arriba**, y el
  indicador se ve siempre —antes era `opacity-0 group-hover:opacity-100`, o sea invisible hasta pasar
  el mouse—. Tocados: `RepoSidebarParts.tsx:68`, `:341` y `:588`, `GitFailureNotice.tsx:73`,
  `ChangelogPreview.tsx:99` y la regla `.changeToggle svg` de `OpenSpecDashboard.module.css:157`.
  Cubierto por una prueba nueva en `components/__tests__/navigation-and-controls.test.tsx`.
- [x] 0.2 El panel de IA del centro de SDD no se distinguía del fondo: `.aiPanel` declaraba un velo
  del 2% mientras `.aiFacts`, que vive adentro, usaba fondo sólido. Pasó a `--color-bg-overlay`, con
  `.aiFacts` hundido en `--color-bg-surface`.

## 1. Relevamiento acumulado

Ocho observaciones de Alejandro entre el 2026-08-24 y el 2026-08-25, con archivo y línea. Están
declaradas acá para que no vivan en el chat, que es donde se pierden.

- [x] 1.1 Confirmar cada una contra el árbol antes de proponer nada, y declarar las que ya no
  apliquen —el change de la paleta puede haber cambiado alguna—.

  1. **La cabecera ocupa el primer tercio.** Volver, nombre, «Creado 21/08/2026, 07:51», la intención
     en tres renglones **cortada con puntos suspensivos** —ni se lee entera ni se puede saltear—,
     tres solapas y tres botones. Recién después empieza el trabajo.
     - **Veredicto:** Sigue igual.
     - **Medición hoy (2026-09-04):** `components/pipeline/OpenSpecDashboard.tsx:2158-2252` (`<header className={styles.changeHeader}>` y `<div className={styles.tabsRow}>`), y `OpenSpecDashboard.module.css:347-364, 368-400`. El botón volver (`:2167`), título y fecha (`:2170-2176`), intención recortada a 3 líneas con ellipsis (`:2179-2181`, `.changeTitle p`), 3 pestañas (`:2189-2197`) y 3 acciones (`:2198-2251`) consumen el tercio superior antes de que el trabajo comience en `:2341`.
  2. **El aviso de rama es más grande que los avisos que se retiraron.** Usa `.readiness`, la caja
     del aviso viejo, en `ChangeBranchNotice.tsx:44`.
     - **Veredicto:** Sigue igual.
     - **Medición hoy (2026-09-04):** `components/pipeline/ChangeBranchNotice.tsx:44` (`<section className={styles.readiness} data-kind="branch">`). Sigue usando la caja `.readiness` de aviso pesado.
  3. **Los tres botones pesan igual.** «Continuar con X» es la acción; «Archivar cambio» y «Ver
     diff» son accesorias.
     - **Veredicto:** Sigue en pie (diagnóstico corregido).
     - **Medición hoy (2026-09-04):** `components/pipeline/OpenSpecDashboard.tsx:2198-2251` y `OpenSpecDashboard.module.css:396-401, 460-489`. La jerarquía cromática ya existe y está documentada en `:460-469`: `.primaryAction` tiene relleno pleno cian (`:486`, «único relleno del panel») y `.secondaryAction` tiene marco claro sin relleno (`:488`, «apoyo»). Lo que contradice esa jerarquía en pantalla y hace que los tres botones pesen igual es el igualador de tamaño de `.tabsRow .actions button` (`:400`, fijando `min-height: 2.75rem`, `min-width: 2.75rem` y padding idéntico a todos, con su motivo documentado en `:396-398` de competir en altura con las pestañas) sumado a que los tres botones comparten juntos el extremo derecho de esa misma fila (`:399`). La observación sigue en pie: el problema perceptivo persiste, no por falta de clases de color, sino por la equiparación dimensional y la ubicación simétrica en la fila.
  4. **El avance aparece dos veces:** en la barra del lateral y en el texto del siguiente paso.
     - **Veredicto:** Sigue igual.
     - **Medición hoy (2026-09-04):** En lateral, `components/pipeline/OpenSpecSidebarNav.tsx:169-173` (porcentaje y barra `.progressTrack`). En siguiente paso, `components/pipeline/pipeline-next-action.ts:512-516` pasando `completed` y `total` a `lib/i18n.ts:139` (`pipeline.next.task.help`: «Van {{completed}} de {{total}}...»), renderizado en `PipelineNextStepGuide.tsx:69` y `OpenSpecDashboard.tsx:2351`.
  5. **La ficha de tarea dice «No informado» tres de cuatro veces** —Agente, Fuente, Árbol al
     cerrar, Última—.
     - **Veredicto:** Sigue igual (decisión tomada el 2026-09-04).
     - **Medición hoy (2026-09-04):** `components/pipeline/OpenSpecDashboard.tsx:2413-2448` (`.taskDetail`). En reposo sin sesión activa previa, Agente muestra «Sin sesión» (`:2419`), Árbol al cerrar muestra «No informado» (`:2439`) y Última actividad muestra «No informado» (`:2444`), habiendo solo dato real en Fuente (`task.sourceRef`, `:2424`).
     - **Decisión 2026-09-04 (Alejandro):** Las filas de «No informado» NO se ocultan. Se reemplazan las cuatro por una sola línea que declare que no hubo sesión registrada. Esconder la ausencia la vuelve invisible, y en esta aplicación lo que no se sabe se declara.
  6. **Las pastillas de Artefactos se leen como botones.** Ya son solapas por dentro
     (`PipelineDetails.tsx:61`, `role="tab"` sobre `role="tablist"`); lo que falla es el estilo.
     - **Veredicto:** Sigue igual.
     - **Medición hoy (2026-09-04):** Los roles semánticos siguen intactos: `role="tab"` en `components/pipeline/PipelineDetails.tsx:88` y `role="tablist"` en `PipelineDetails.tsx:110` (desplazados desde la línea 61 por la inserción del hook de diffs en `:54-75`). El estilo en `app/globals.css:2296-2317` (`.pipeline-details__tab`) mantiene bordes, fondos y radios individuales (`border-radius: var(--radius-sm); background-color: var(--color-bg-overlay)`), leyéndose como botones sueltos.
  7. **Las fichas de artefactos repiten «HECHO» cuatro veces.** `PipelineArtifactGraph.tsx` — un
     ícono dice lo mismo sin gastar una palabra por ficha.
     - **Veredicto:** Sigue igual.
     - **Medición hoy (2026-09-04):** `components/pipeline/PipelineArtifactGraph.tsx:50-52` (`<span className="pipeline-artifact-graph__state">{t(STATE_LABEL_KEY[artifact.state]...)}</span>`), renderizando la palabra «Hecho» / «HECHO» para cada uno de los 4 artefactos (`proposal`, `design`, `specs`, `tasks`).
  8. **El panel de evidencia vive en `app/globals.css`**, no en la hoja de la vista, y tuvo reglas
     duplicadas que hubo que resolver en la paleta.
     - **Veredicto:** Cambió (problema parcial).
     - **Medición hoy (2026-09-04):** Las reglas duplicadas en `:3732` fueron eliminadas el 2026-09-01 en `unificar-paleta-carbon-soul` (tarea 4.0 a). Sin embargo, la anomalía estructural persiste: los estilos `.pipeline-details` y `.pipeline-artifact-graph` siguen viviendo en `app/globals.css:2263-2390` en vez de en `components/pipeline/OpenSpecDashboard.module.css`.
     - **Hallazgo aparte de CSS muerto en `app/globals.css` (2026-09-04):** `pipeline-card` tiene CERO apariciones en archivos `.tsx` y `.ts` del repositorio. La regla `.pipeline-card[data-scrolls] .pipeline-card__body { max-height: 26rem; overflow-y: auto; scrollbar-width: thin; }` en `app/globals.css:768-772` no se aplica a ningún elemento en tiempo de ejecución: es CSS muerto de una maqueta de tarjetas retirada. Su comentario original conserva el motivo de por qué existió:
       > «El tope de una lista lo pone la card, no la grilla. `scrolls` marca lo genuinamente ilimitado —bitácora, decisiones, agentes—: crece con su contenido hasta un techo y recién ahí scrollea por dentro. Un panel de cifras acotadas nunca lleva `scrolls`, así que se ve entero siempre. Ésa es la diferencia entre "esta lista sigue" y "te corté los datos".»
       Pertenece a esta observación de saneamiento de `globals.css`: no recorta nada en la vista actual porque ningún componente la invoca, pero ensucia la hoja global y debe ser retirada al migrar y sanear los estilos residuales.

- [x] 1.2 Las tres preguntas que decide Alejandro sobre lo relevado, antes de proponer disposición.
  **Decididas el 2026-09-04 por delegación explícita de Alejandro**, antes del relevamiento de 1.1.
  Si 1.1 mide algo que contradiga alguna, esa decisión se vuelve a tomar en vez de forzar la
  disposición sobre un supuesto que dejó de valer.

  **(a) Al entrar a un cambio, ¿qué querés ver primero?**
  **Qué corresponde hacer ahora, y el control que lo hace.** El nombre del cambio y la acción
  siguiente ocupan el primer bloque; todo lo demás va después.
  El motivo no es estético: la derivación ya existe. `derivePipelineNextAction` en
  `components/pipeline/pipeline-next-action.ts` resuelve doce estados posibles y devuelve la acción
  primaria, la secundaria y una frase de ayuda. Hoy ese resultado se pinta **debajo** del tercio de
  cabecera que denuncia la observación 1. No hay que calcular nada nuevo: hay que dejar de enterrar
  lo que ya se calcula.

  **(b) Las tres solapas, ¿son tres pantallas o una?**
  **Dos superficies, no tres. Trabajo y Artefactos se funden; Actividad queda aparte.**
  Trabajo y Artefactos son la misma pregunta —qué corresponde hacer, y sobre qué artefacto—, y
  separarlas obliga a recordar en vez de mirar. Fundirlas es además lo que habilita el recorrido de
  artefactos que trae la sección 3c de `gestionar-ciclo-openspec-desde-gitcron`: estado por
  artefacto, de qué depende, qué desbloquea y dónde escribe.
  Actividad no se funde porque no responde esa pregunta: es el registro de lo que pasó, no de lo que
  falta. Se mantiene aparte y **filtra por el cambio abierto**, que es la decisión que Alejandro
  tomó el 2026-08-04 con este motivo: el resto del panel ya es por cambio, y una columna que muestra
  actividad ajena al cambio abierto se lee como si fuera de ese cambio y engaña.

  **(c) La intención del cambio, ¿se lee alguna vez?**
  **Ahí no se lee. Se va de la cabecera.** Queda el nombre; el texto completo vive donde ya vive, en
  la propuesta, dentro de la superficie de artefactos.
  El motivo está en la observación 1: hoy se corta con puntos suspensivos a mitad de frase. Y hay
  algo peor, medido el 2026-09-04: `electron/pipeline/repo-evidence-reader.ts:405` compone ese texto
  como `firstWhyParagraph(proposal.md)`, así que **la «Intención» de la cabecera es el primer párrafo
  del «Why» de la propuesta**. El mismo texto está dos veces en la misma pantalla, con dos nombres
  distintos, y arriba está mutilado. No se saca porque estorbe: se saca porque es un duplicado
  truncado de algo que ya está entero. Un texto
  truncado no se lee, se saltea, y mientras tanto gasta tres renglones del primer tercio. La regla
  que queda para toda la vista: **si no cabe entero, no va truncado — va en otro lado, o no va**. Es
  la misma exigencia que ya rige en esta aplicación para lo que se muestra y lo que se ejecuta.

  **Enmienda del 2026-09-04 a (b), tras medir la observación 10.** Ya no son dos
  superficies: **es una sola superficie soberana (Trabajo y Artefactos) que toma la pantalla
  completa, sin solapas superiores**. Actividad no tiene solapa propia ni compite por el espacio
  principal porque está **estructuralmente vacía el 100% del tiempo** con ejecutores lanzados fuera
  de la aplicación (en terminales o IDE, que es la forma real de trabajo acá). Pasa a ser un panel
  accesorio colapsable / bajo demanda que sólo se activa o notifica cuando hay una sesión viva
  ejecutándose. Trabajo se adueña de todo el cuerpo del cambio.

  **Enmienda del 2026-09-04 a la observación 5.** La decisión anterior —reemplazar las cuatro filas
  de «No informado» por una sola línea dentro de la ficha— no sirve: una ficha que sólo contiene una
  excusa sigue siendo una ficha vacía. Alejandro lo marcó preguntando para qué serviría. Queda así:
  **la ficha no se dibuja cuando no hay sesión**; en su lugar va una sola línea en el bloque de la
  tarea diciendo que todavía no corrió nada sobre ella. Se declara la ausencia una vez, y no se paga
  con una ficha.

  **(d) ¿Dónde entra el recorrido de artefactos que viene después?**
  **No es una superficie nueva que haya que acomodar más adelante: es lo que reemplaza a la solapa
  Artefactos**, según (b). La disposición de 2.1 tiene que dibujar ese lugar contando con estado por
  artefacto, dependencias, desbloqueos y ruta de escritura, aunque quien lo llene sea
  `gestionar-ciclo-openspec-desde-gitcron`. Este change deja el lugar hecho; el otro lo llena.
  Se decide acá porque decidir la disposición sin contarlo obliga a remaquetar dos veces, que es el
  defecto que este mismo change denuncia en su propio Why.

  **(e) ¿Dónde entran el glosario y las explicaciones de cada control?**
  **En la maqueta, y se deciden acá — igual que (d), y por el mismo motivo.**
  El change `explicar-el-ciclo-sin-tecnicismos` va a agregar dos cosas a esta pantalla: una
  explicación junto a cada control que reciba texto o dispare una operación, y una superficie de
  glosario del vocabulario del método. La disposición de 2.1 tiene que dejarles el lugar:
  - **Las explicaciones** conviven con su control. Hay que decidir su forma —al lado, debajo, al
    pedido— sabiendo que van a ser muchas y que el requisito vigente prohíbe presentarlas como un
    bloque explicativo aparte.
  - **El glosario** es una superficie. Hay que decidir qué control lo abre, dónde aparece la
    respuesta y cómo convive con la inspección de artefactos, que ya ocupa la parte de abajo.

  **La frontera, declarada para que nadie la cruce:** este change decide **dónde va y qué forma
  tiene**; `explicar-el-ciclo-sin-tecnicismos` decide **qué dice**. Acá no se redacta ni una sola
  explicación: eso agrega información, y este change declara en su Why y en su tarea 2.2 que no
  agrega ni quita, sólo mueve, agrupa y jerarquiza.
  Decidido el 2026-09-04 por delegación de Alejandro, que lo señaló con razón: preguntar dónde va el
  glosario y qué muestra **es** una pregunta de maqueta.

- [x] 1.3 Cinco observaciones nuevas de Alejandro del 2026-09-04, mirando la aplicación. Confirmar
  cada una contra el árbol con el mismo criterio de 1.1 —sigue igual, cambió, ya no aplica— antes de
  incorporarlas a la disposición.

  9. **El formulario empuja la lista.** Al pulsar «Tengo clara la tarea» o «Quiero definirla mejor»
     en el bloque de entrada, el formulario se despliega **en el lugar** y corre hacia abajo la
     sección «EN CURSO». Lo que se estaba mirando se va de pantalla por abrir otra cosa.
     - **Veredicto:** Sigue igual.
     - **Medición hoy (2026-09-04):** `components/pipeline/OpenSpecDashboard.tsx:2574-2589` y `components/pipeline/PipelineNewChangeFlow.tsx:327-463`. Al pulsar «Tengo clara la tarea» o «Quiero definirla mejor» en `PipelineNextStepGuide` (`:2574`), el manejador `handleIntent` activa `flowMode = true`. `PipelineNewChangeFlow` se monta inline en el flujo vertical de `styles.startScreen` inmediatamente entre la guía y el bloque `styles.startBlock` (`h4` «EN CURSO», `:2588`). Al ser un formulario extenso con múltiples pasos de configuración, empuja verticalmente la lista de cambios activos fuera de la pantalla.

  10. **«Trabajo» es la superficie que más se usa y se corta.** Es donde Alejandro sigue las tareas
      y el avance a lo largo del tiempo, y el contenido queda recortado. Medir qué lo recorta y
      dónde: la observación 8 declara que estos estilos viven en `app/globals.css`, así que el tope
      puede no estar donde se lo busca.
      - **Veredicto:** Sigue igual.
      - **Medición hoy (2026-09-04) — Qué recorta a «Trabajo»:**
        El recorte se produce por una superposición de factores en el árbol de layout:
        1. **`.workArea` en `flex: 0 0 auto` a la cabeza:** en `components/pipeline/OpenSpecDashboard.module.css:415-420`, `.workArea` fija `flex: 0 0 auto; padding: var(--space-4) var(--space-5);`. Al no tener `flex: 1 1 auto; min-height: 0;`, el área de tareas no se expande para aprovechar el alto disponible de la ventana y se comporta como un bloque rígido subordinado a la compresión de sus padres.
        2. **Cabecera fija y sobredimensionada en `.center`:** `.changeHeader` (`:337-347`, `flex: 0 0 auto; min-height: 5.4rem; padding: var(--space-4) var(--space-5);`) y `.tabsRow` (`:368-384`, `flex: 0 0 auto;` conteniendo solapas de `3.2rem` y acciones de `min-height: 2.75rem`), sumados al aviso de rama pesado `.readiness` (`:1569`) y al bloque inline del siguiente paso (`:1547`), consumen de antemano gran parte de la vertical útil antes de que comience la lista de tareas.
        3. **Contenedor `.body` rígido:** en `OpenSpecDashboard.module.css:96-103`, `.body` fija `flex: 1 1 auto; overflow: hidden; min-height: 0;`.
        4. **Compresión en `.center`:** en `OpenSpecDashboard.module.css:319-332`, `.center` tiene `display: flex; flex-direction: column; overflow-y: auto; scrollbar-width: thin;`, pero al estar atrapado entre el `overflow: hidden` del padre y el consumo rígido de la cabecera, la lista de tareas inferiores queda desplazada hacia abajo y recortada fuera del viewport inicial.
      - **Medición hoy (2026-09-04) — Qué pinta hoy «Actividad»:**
        1. **Origen de los datos:** `components/pipeline/OpenSpecDashboard.tsx:512-529`. `visibleActivity` se alimenta de `selectedSession?.activity`. Las sesiones de runtime (`runtimeSessions`) provienen de `[projection, ...(runtimeHistory || [])]`. Con un cambio abierto y sin sesiones lanzadas desde el runner interno de GitCron, `selectedSession` es `null`, cayendo a `[]` (`:529`).
        2. **Lo que se muestra en pantalla:** `components/pipeline/ActivityFeed.tsx:108-118`. Con `groups.length === 0`, `runtimeAttached === false` y `reasoningAvailable === null`, la vista de Actividad renderiza exactamente:
           - Título de sección: «Actividad» (`OpenSpecDashboard.tsx:2477`).
           - Primer aviso: `pipeline.activity.reasoningUnknown` (`lib/i18n.ts:654`): «Todavía no sabemos si este runtime expone su razonamiento: ninguna sesión lo declaró.»
           - Segundo aviso: `pipeline.activity.noRuntime` (`lib/i18n.ts:655`): «No hay sesión de runtime adjunta, así que no hay bitácora que mostrar.»
        3. **Conclusión:** Para la forma de trabajo habitual de Alejandro (agentes ejecutados externamente desde la terminal o el IDE), «Actividad» permanece **estructuralmente vacía** el 100% del tiempo. Esto motiva la enmienda del 2026-09-04 a la Decisión 1.2 (b): Actividad no amerita una superficie primaria ni solapas superiores que compitan con «Trabajo».

  11. **«Ver el repositorio» quedó legacy.** El control de vuelta al repositorio no se lee como
      parte de la vista actual.
      - **Veredicto:** Sigue igual.
      - **Medición hoy (2026-09-04):** `components/pipeline/OpenSpecDashboard.tsx:2167-2169` y `components/pipeline/OpenSpecDashboard.module.css:1514-1534`. El botón «Volver» (`<ChevronLeft size={12} /> {t('pipeline.openspec.start.back')}`) está montado como primer elemento hijo suelto dentro de `.changeTitle`, justo antes del `<h3>`. En CSS tiene estilo mono en versalitas de 12px con borde sutil (`.backToStart:1514`). No forma parte de la navegación general de la ventana ni se integra a la barra superior como breadcrumb o botón de retorno; se ve como un enlace residual huérfano flotando sobre el título.

  12. **Las pestañas de evidencia no dicen qué son.** «Propuesta», «Diseño», «Specs (1)», «Tareas»,
      «Archivos y diffs (0)»: nombres que suponen conocer OpenSpec. Alejandro, que la usa todos los
      días, declaró no saber qué es «la intención» ni dónde está «la propuesta». Es la observación 6
      llevada más lejos: no es sólo que parezcan botones, es que no se entiende qué hay detrás de
      cada una. Comprobar además si esas cinco siguen siendo las correctas contra OpenSpec 1.11, o
      si el conjunto de artefactos cambió.
      - **Veredicto:** Sigue igual (y comprobado contra OpenSpec 1.11).
      - **Medición hoy (2026-09-04):**
        - En código: `components/pipeline/PipelineDetails.tsx:111-115` (`proposal`, `design`, `specs`, `tasks`, `diffs`) y `lib/i18n.ts:672-683`.
        - **Comprobación contra CLI OpenSpec 1.11:** Ejecutado `openspec status --change remaquetar-cuerpo-de-sdd --json`, el motor confirma que el esquema `spec-driven` define exactamente cuatro artefactos formales de planificación: `proposal` (`proposal.md`), `specs` (`specs/**/*.md`), `design` (`design.md`) y `tasks` (`tasks.md`). El conjunto de artefactos en OpenSpec 1.11 **no cambió**. La quinta pestaña («Archivos y diffs») no es un artefacto de OpenSpec sino una vista propia de GitCron (`snapshot.diffs` y `git diff --numstat HEAD`).
        - **Problema de uso:** Los rótulos usan la nomenclatura técnica interna de OpenSpec sin explicar su función («Propuesta» aloja la justificación e intención del cambio; «Specs» aloja los requisitos por capacidad; «Diseño» las decisiones de arquitectura; «Tareas» el checklist de implementación; «Archivos y diffs» la evidencia del diff en disco). Quien usa la aplicación a diario no tiene por qué descifrar qué artefacto contiene la intención ni dónde se inspecciona cada decisión.

  13. **El markdown de adentro está mal compuesto.** Doble espaciado entre párrafos y todo el texto
      en el mismo peso, sin jerarquía. «Tareas» es la única que se lee razonablemente. Es
      composición tipográfica, no color: la paleta y la escala ya se unificaron en
      `unificar-paleta-carbon-soul`.
      - **Veredicto:** Sigue igual.
      - **Medición hoy (2026-09-04):** `app/globals.css:2397-2483` (`.pipeline-markdown`).
        - **Doble espaciado:** El contenedor `.pipeline-markdown` declara `gap: var(--space-4)` (`:2400`), mientras que los elementos markdown internos declaran sus propios márgenes verticales (`.pipeline-markdown__h1...h6` tienen `margin-top: var(--space-4)` en `:2416`, los items de lista tienen `margin-top: var(--space-2)` en `:2477`, etc.). Esta combinación de flex gap con márgenes genera un espaciado inflado e inconsistente entre bloques.
        - **Ausencia de jerarquía tipográfica:** Todos los niveles de encabezados (`h1` a `h6`) comparten idéntico peso (`font-weight: 600`, `:2414`) y `.pipeline-markdown__strong` también usa `font-weight: 600` (`:2480`). Además, los niveles `h4`, `h5` y `h6` tienen `font-size: var(--font-size-sm)` (`:2435`), que es exactamente el mismo tamaño que el párrafo normal (`:2401`), distinguiéndose únicamente por el color cian (`color: var(--color-primary)`, `:2436`). La jerarquía visual queda completamente aplanada.

- [x] 1.4 Revisión visual de Alejandro del 2026-09-04, sobre la disposición ya implementada.
  **La disposición implementada se rechaza.** Nueve observaciones, y una conclusión de fondo que
  obliga a revisar la restricción central de este change antes de volver a proponer nada.

  14. **La cabecera no tiene criterio.** «Cambio activo», «Ver el repositorio», «Siguiente paso» con
      su flecha, el botón «Continuar con X» y la frase «Al continuar se abre un agente…» quedaron uno
      al lado del otro, sin jerarquía. «Archivar cambio» quedó suelto y solo a la derecha.
  15. **Las tareas siguen empujando «Evidencia» hacia abajo.** La observación 9 se resolvió para el
      formulario y volvió a aparecer entre tareas y evidencia.
  16. **Las solapas de artefactos quedaron con textos largos y siguen sin entenderse.** El intento de
      explicarlas en el rótulo las hizo más largas sin hacerlas más claras. **Nota de frontera:** las
      palabras son de `explicar-el-ciclo-sin-tecnicismos`; acá se resuelve que el rótulo quepa y se
      lea.
  17. **La línea de tiempo de artefactos es mala.** Se esperaba una línea temporal con nodos unidos
      por una línea, como la de Cronometric, y no lo que quedó.
  18. **El markdown de las solapas sigue sin formato.** La observación 13 no se resolvió en lo que se
      ve.
  19. **«TAREAS DEL CAMBIO» quedó suelto y no se entiende**, y los textos siguen cortándose sin
      terminar.
  20. **La evidencia no puede convivir con las tareas en la misma columna.** Debería estar en otra
      pantalla del cuerpo, alcanzable desde un control junto a las tareas.
  21. **«ACTIVIDAD» quedó al fondo de todo, fuera de vista.** Hay que resolver si cumple algún rol,
      si funciona, y si el desplegable «Actividad» del panel derecho ya lo cubre.
  22. **El estado del repositorio mezcla dos cosas.** Debería mostrar sólo «EN CURSO». «Siguiente
      paso» va aparte y además no se entiende como nombre: lo que hace es **crear una tarea nueva**.
      Y hay que declarar si «Quiero definirla mejor» y «Tengo clara la tarea» son dos caminos
      distintos o una duplicación.

- [x] 1.5 **La restricción de este change es la causa de lo rechazado en 1.4, y hay que resolverla
  antes de volver a proponer.** El Why y la tarea 2.2 declaran que este change «no agrega información
  ni la quita: mueve, agrupa y jerarquiza lo que ya está». Con esa regla, un cuerpo amontonado sólo
  puede reordenarse: nada puede dejar de mostrarse, así que el montón se reubica y sigue empujando.
  Lo que Alejandro pidió el 2026-09-04 es lo contrario y lo dijo con un ejemplo concreto —la ventana
  flotante de Codex, donde cada ítem aparece según la circunstancia, queda disponible si se lo
  quiere, y si no, no ocupa lugar—: **la disposición tiene que ser condicional**, mostrar lo que
  sirve al objetivo del momento en vez de mostrarlo todo siempre.
  Decidir y declarar: se levanta la restricción en este change explicando con qué la reemplazamos, o
  este change se cierra con lo que sirva y la disposición condicional va a uno nuevo. **La decide
  Alejandro.** Sin esta decisión, cualquier propuesta nueva vuelve a chocar con la misma pared.

## 2. La disposición nueva

- [x] 2.1 Proponer la disposición sobre lo relevado y lo decidido, sin implementarla. Se propone
  **contra las cinco decisiones de 1.2** (con sus enmiendas del 2026-09-04) e incorporando las
  **trece observaciones relevadas**, no en libre: una propuesta que las contradiga se rechaza sin
  discutir la maqueta. **La aprueba Alejandro**, que delegó las decisiones de 1.2 pero no la
  aprobación de lo que se dibuje con ellas.

  ### Propuesta de Disposición de la Vista SDD (Cuerpo del Cambio)

  #### 1. Principio rector y orden de lectura de arriba hacia abajo
  La vista se concibe como un espacio de trabajo soberano, directo y continuo, gobernado por la regla:
  *lo primero que se ve es qué corresponde hacer ahora y el control que lo ejecuta; el trabajo no se
  recorta y nada se dice dos veces*.

  Se estructura en dos bloques principales dentro de la vista del cambio:
  1. **Banda superior de contexto y acción inmediata:** Navegación integrada, identidad compacta, siguiente paso ejecutable presidiendo el bloque y control de acceso al glosario.
  2. **Cuerpo soberano de Trabajo y Artefactos (Superficie Unificada):** Flujo vertical continuo que integra las tareas en curso y el recorrido/inspección de artefactos. La actividad se subordina a un panel accesorio/colapsable bajo demanda al estar estructuralmente vacía en reposo.

  Para las dos incorporaciones del change `explicar-el-ciclo-sin-tecnicismos` (cumpliendo la **Decisión e**):
  - **Explicación co-localizada e inmediata:** Cada control que reciba texto o dispare una operación sobre el repositorio incorpora su explicación en línea, inmediatamente adyacente a él, prohibiéndose bloques explicativos separados o paneles de ayuda distantes (requisito «El formulario declara qué hace con lo que se escribe»).
  - **Superficie de glosario en doble modalidad:** Ofrece una pestaña de referencia profunda en el visor inferior y un drawer lateral deslizante para consultas contextuales al vuelo, conviviendo con la inspección de artefactos sin taparla ni desplazar la vertical de las tareas.

  Adicionalmente, se corrige la pantalla de entrada del repositorio para que el alta de cambios no desplace el contenido existente.

  ---

  #### 2. Desglose detallado por componente

  ##### Bloque I · Cabecera Integrada y Acción Inmediata (Arriba de todo)
  - **Lo que desaparece de la cabecera:**
    - La intención del cambio (`selectedChange.intent`) desaparece de la cabecera. Cumple la **Decisión (c)** y resuelve la **Observación 1**: se elimina el párrafo truncado con puntos suspensivos a 3 renglones. Su texto íntegro vive en la propuesta dentro de la superficie de artefactos.
    - Se eliminan las solapas de navegación superior rígidas (`.tabsRow .tabs`), liberando el tercio superior (resuelve **Observación 1** y cumple la **Enmienda del 2026-09-04 a Decisión b**).
    - Se retira el aviso de rama gigante con caja `.readiness` (resuelve **Observación 2**).
  - **Lo que sube y preside el encabezado:**
    - El **Siguiente Paso** (`derivePipelineNextAction`) sube directamente al encabezado. Cumple la **Decisión (a)**: al entrar a un cambio lo primero que se lee es qué corresponde hacer ahora y el control ejecutable que lo hace.
  - **Estructura visual:**
    - **Fila 1 (Navegación, Identidad y Glosario):**
      - **Navegación integrada (resuelve Observación 11):** En lugar del botón aislado `.backToStart` con borde tenue y tipografía mono descolgado sobre el título, se incorpora un breadcrumb o control de retorno integrado a la barra superior (`‹ Repositorio / [changeId]`).
      - **Identidad del cambio:** Nombre (`changeId`) destacado + Fecha de creación (`createdAt`).
      - **Aviso de rama en línea (resuelve Observación 2):** Si la rama actual no coincide con la esperada (`ChangeBranchNotice`), se muestra un badge compacto en línea junto al nombre, suprimiendo la caja `.readiness`.
      - **Control de apertura del Glosario (Decisión e):** En el extremo de la fila de navegación, un botón compacto de acceso al glosario (`[? Glosario del método]`) para consultar términos del método en cualquier momento.
    - **Fila 2 (Acción Ejecutable, Explicaciones y Controles Jerarquizados):**
      - **A la izquierda (Acción Principal / Siguiente Paso):**
        - Botón primario de acción (CTA) con tratamiento dominante (`primaryAction`, relleno pleno cian `:486` e ícono `Play`, ej. «Continuar con X»). Se desacopla de cualquier fila de pestañas y del igualador de tamaño (`.tabsRow .actions button:400`), presidiendo el bloque con escala y jerarquía propias (resuelve **Observación 3**).
        - Frase de guía orientada exclusivamente a la acción concreta. **Se retira «Van X de Y»** para no duplicar el avance que ya informa el lateral (resuelve **Observación 4**).
        - **Explicación de la operación (Decisión e):** Debajo o al lado del botón, una línea de micro-copy (`font-size-xs`, color secundario) declara la operación concreta que se ejecutará en Git/OpenSpec antes de dispararla (marcador de posición: `[declaración inline de la operación disparada sobre el repo]`), sin bloques explicativos apartados.
      - **A la derecha (Acciones Accesorias Subordinadas):**
        - Grupo de acciones accesorias (`secondaryAction`, marco claro sin relleno `:488`): «Archivar cambio» (con conteo de tareas pendientes) y «Ver diff». Se ubican como controles de apoyo subordinados, sin forzar al CTA a su mismo molde dimensional (resuelve **Observación 3**).
        - Cada acción accesoria incluye su micro-copy explicativo inline en su tooltip/popover o en su estado expandido.
      - **Despliegue inline de confirmación con explicación (Decisión e):** Si se solicita archivar, el panel `archiveConfirm` se despliega inmediatamente bajo la cabecera. Cada control de confirmación u opción incluye su texto explicativo en línea aclarando el efecto destructivo o irreversible antes de confirmar (marcador de posición: `[declaración del efecto de archivo en el repositorio]`).

  ##### Bloque II · Cuerpo Soberano: Trabajo e Inspección de Artefactos (Fundidos)
  Cumple la **Enmienda del 2026-09-04 a la Decisión (b)**: Trabajo y Artefactos son una sola superficie continua que toma la pantalla completa sin solapas superiores divisorias. Al medirse que «Actividad» está estructuralmente vacía por ejecutarse los agentes en terminales externas, Actividad deja de ocupar una solapa de primer nivel. Trabajo se adueña del espacio completo.

  - **Resolución del corte de contenido (resuelve Observación 10 contra sus causas reales):**
    - **`.workArea` flexible:** Pasa de `flex: 0 0 auto` a `flex: 1 1 auto; min-height: 0;`, convirtiéndose en el contenedor flexible principal que absorbe el espacio vertical y permite el crecimiento natural de las tareas sin compresión pasiva.
    - **Eliminación del tercio superior rígido:** `.changeHeader` abandona la altura mínima forzada (`min-height: 5.4rem`) y los paddings inflados, y `.tabsRow` deja de forzar botones de acción de `2.75rem` en la vertical; la cabecera compacta cede el espacio útil al contenido de trabajo.
    - **Normalización del contenedor `.center` dentro de `.body`:** `.body` mantiene `flex: 1 1 auto; min-height: 0;` y `.center` opera con un único scroll vertical natural sin atrapamientos ni compresión provocada por hijos rígidos en `flex: 0 0 auto`.
  - **Sección A · Área de Tareas en Ejecución:**
    - **Lanzador de agente:** Si se presionó «Continuar», `PipelineRuntimeLauncher` se abre inmediatamente bajo la cabecera. Los campos de instrucción o parámetros incorporan explicaciones en línea bajo cada entrada (Decisión e).
    - **Lista de tareas (`tasks.md`):**
      - Checkboxes interactivos, identificador de tarea y descripción limpia.
      - **Explicación del control de tarea (Decisión e):** En el toast o micro-interacción al marcar/desmarcar un checkbox, una línea de micro-copy declara la consecuencia en `tasks.md` y Git (marcador de posición: `[declaración de constancia escrita al alternar la tarea]`).
      - **Ficha de tarea activa (cumple Enmienda 2026-09-04 a Observación 5):** Cuando la tarea activa no tiene sesión registrada, la ficha `.taskDetail` **NO se dibuja** (cero fichas vacías con cuatro filas de «No informado»). En su lugar, se muestra una única línea discreta dentro del ítem de la tarea indicando que todavía no corrió ninguna sesión. Las cuatro filas detalladas (Agente, Fuente, Árbol al cerrar, Última) se reservan exclusivamente para cuando exista una sesión registrada real.
  - **Sección B · Recorrido e Inspección de Artefactos (Decisión d):**
    - Se ubica a continuación del área de tareas en el mismo flujo vertical.
    - **B.1 Recorrido del Ciclo OpenSpec (Pipeline Graph):**
      - Tren horizontal que refleja el ciclo: `Propuesta (proposal.md)` → `Especificaciones (specs/)` → `Diseño (design.md)` → `Tareas (tasks.md)`.
      - **Estados por ícono:** Cada estación muestra un glifo semántico (check verde, play cian, candado ámbar), eliminando la palabra «HECHO» repetida cuatro veces (resuelve **Observación 7**).
      - **Espacio para el ciclo:** Se preserva el lugar asignado para que `gestionar-ciclo-openspec-desde-gitcron` presente dependencias («depende de...»), desbloqueos («desbloquea...») y rutas en disco (cumple **Decisión d**).
    - **B.2 Pestañas de Inspección Funcionales y Superficie de Glosario (resuelve Observaciones 6, 8, 12 y Decisión e):**
      - Pestañas con estilo de solapa real integrada sobre el panel (borde inferior continuo y pestaña activa unida), corrigiendo el aspecto de botones sueltos (resuelve **Observación 6**).
      - **Rótulos contextualizados frente a OpenSpec 1.11 (resuelve Observación 12):**
        1. `[ Porqué y alcance (proposal.md) ]`: Contiene el motivo e intención del cambio completos, sin recortes (cumple **Decisión c**).
        2. `[ Requisitos por capacidad (specs/) ]`: Contiene las especificaciones y deltas por capacidad.
        3. `[ Decisiones técnicas (design.md) ]`: Contiene la arquitectura y decisiones de diseño.
        4. `[ Checklist de ejecución (tasks.md) ]`: Contiene el detalle del plan de tareas.
        5. `[ Archivos y diffs git ]`: Contiene el visor de archivos modificados y diffs en disco.
        6. `[ Glosario del método ]`: **Superficie de consulta completa del Glosario (Decisión e)**.
      - **Convivencia del Glosario con la Inspección de Artefactos (Decisión e):**
        - *Modo consulta completa (en el visor inferior):* Al integrarse como solapa en `PipelineDetails`, el glosario convive en el mismo contenedor de lectura tipográfica y scroll que los artefactos. No requiere un tercer panel vertical ni rompe la jerarquía de la pantalla.
        - *Modo consulta contextual al paso (Drawer lateral / Flyout):* Cuando el usuario pulsa sobre un término técnico subrayado dentro de cualquier artefacto o explicación (ej. `[marcador de posición: término interactivo del método]`), o cuando invoca el botón `[? Glosario]` desde la cabecera, la definición aparece en un **drawer lateral derecho** deslizable (panel superpuesto de ancho fijo, ej. `22rem`, fondo sólido `var(--color-bg-surface)` con borde izquierdo y botón de cierre).
        - *Motivo de convivencia:* El drawer lateral permite consultar la definición técnica mientras se mantiene a la vista el artefacto o el control que se está operando, **sin desplazar verticalmente la lista de tareas hacia abajo y sin tapar la pestaña de artefactos activa**.
      - Mudanza de estilos a `OpenSpecDashboard.module.css` (prepara **tarea 2.6** y resuelve **Observación 8**).
    - **B.3 Composición Tipográfica de Markdown (resuelve Observación 13):**
      - **Ritmo regular:** Se elimina la doble separación eliminando la colisión entre el flex `gap` de `.pipeline-markdown` y los márgenes verticales de sus hijos, adoptando un margen inferior tipográfico consistente.
      - **Escala jerárquica clara:** Se diferencian los niveles de encabezado variando peso y tamaño (`h1` 1.25rem/bold 700, `h2` 1.125rem/semibold 650, `h3` 1rem/medium 600, `h4` 0.875rem/uppercase mono), reservando el color cian sólo para indicadores y no como único sustituto de jerarquía en títulos del mismo tamaño del texto.

  ##### Bloque III · Actividad Subordinada y Bajo Demanda (Enmienda 1.2 b, Observación 10)
  - Al estar estructuralmente vacía cuando se trabaja con agentes externos desde la terminal, Actividad no compite por espacio con el flujo de trabajo principal.
  - Se presenta como un registro secundario colapsable o accesible bajo demanda. Si se lanza una sesión desde el launcher integrado, se despliega o señaliza con un indicador de bitácora viva.
  - Mantiene el filtro estricto por el cambio abierto.

  ##### Bloque IV · Pantalla de Inicio del Repositorio y Formularios (resuelve Observación 9 y Decisión e)
  - En `styles.startScreen`, al presionar «Tengo clara la tarea» o «Quiero definirla mejor», `PipelineNewChangeFlow` **NO se despliega inline empujando la lista «EN CURSO» hacia abajo**.
  - El flujo de nuevo cambio se presenta como una vista modal o panel enfocado que reemplaza limpiamente el contenido de inicio con un control de cierre claro (`dismissFlow`), preservando a la vista la lista de cambios activos sin desbordar el scroll.
  - **Explicaciones en campos de entrada (Decisión e):** En cumplimiento estricto del requisito «El formulario declara qué hace con lo que se escribe», cada campo de texto (título, intención, etc.) lleva una explicación en línea inmediatamente debajo del input (`font-size-xs`, micro-copy), asociada por `aria-describedby` (marcador de posición: `[declaración del destino del texto y archivo escrito en openspec/]`). No se permite agruparlas en un bloque de ayuda separado.

  ---

  #### 3. Matriz de correspondencia y trazabilidad

  | Decisión / Observación | Problema medido en relevamiento | Solución en la maqueta propuesta |
  | :--- | :--- | :--- |
  | **Decisión (a)** | El siguiente paso quedaba enterrado al pie de la cabecera. | Siguiente Paso y CTA primario presiden la cabecera inmediatamente junto al nombre. |
  | **Decisión (b) + Enmienda** | «Dos superficies» ya no aplica: Actividad está vacía el 100% del tiempo con ejecutores externos. | Una sola superficie soberana (Trabajo + Artefactos) a pantalla completa sin solapas superiores; Actividad subordinada como panel colapsable bajo demanda. |
  | **Decisión (c)** | La intención se truncaba a 3 líneas con puntos suspensivos. | Se retira de la cabecera; vive completa en la pestaña de Propuesta. |
  | **Decisión (d)** | Falta de soporte visual para el ciclo de artefactos. | Espacio reservado para tren de artefactos con dependencias, desbloqueos y rutas. |
  | **Decisión (e)** | Falta definir lugar y forma para explicaciones de controles (sin bloques aparte) y glosario del método sin romper la inspección de artefactos. | Explicaciones en micro-copy inline inmediatamente bajo cada control/input (`aria-describedby`); glosario como pestaña en el visor inferior (modo completo) y drawer lateral derecho (modo contextual al vuelo) que convive sin tapar artefactos ni desplazar tareas. |
  | **Observación 1** | Cabecera saturada ocupando el primer tercio con intención truncada. | Cabecera compacta: intención eliminada, solapas superiores rígidas retiradas. |
  | **Observación 2** | Aviso de rama gigante con caja `.readiness`. | Badge compacto en línea junto al título del cambio. |
  | **Observación 3** | Botones de acción igualados en tamaño por `.tabsRow .actions button`. | Botón primario (`primaryAction`) destacado y dominante; secundarios como apoyo subordinado. |
  | **Observación 4** | Avance duplicado en lateral y en texto «Van X de Y». | Se retira «Van X de Y» de la frase de guía; el avance vive en el lateral. |
  | **Observación 5 + Enmienda** | Ficha de tarea repite «No informado» cuatro veces sin sesión. | La ficha no se dibuja sin sesión; una sola línea declara que no hubo ejecución. |
  | **Observación 6** | Pastillas de artefactos se leen como botones sueltos. | Solapas con borde inferior continuo y pestaña activa integrada (`role="tab"`). |
  | **Observación 7** | Fichas de artefactos repiten «HECHO» cuatro veces. | Estados expresados mediante glifos/íconos semánticos (check, play, candado). |
  | **Observación 8** | Estilos de evidencia dispersos en `app/globals.css` y CSS muerto (`pipeline-card`). | Estilos migrados a `OpenSpecDashboard.module.css` y saneamiento de reglas muertas en `globals.css`. |
  | **Observación 9** | Formulario de nuevo cambio empuja «EN CURSO» fuera de vista. | Despliegue enfocado/modal con cierre explícito que no corre la lista hacia abajo. |
  | **Observación 10** | «Trabajo» se corta por `.workArea` en `flex: 0 0 auto` y cabecera sobredimensionada (`.changeHeader` + `.tabsRow`) dentro de `.body` con `overflow: hidden`. | `.workArea` pasa a `flex: 1 1 auto; min-height: 0;`, cabecera compacta que no fagocita la vertical, y scroll vertical fluido único. |
  | **Observación 11** | Botón «Volver» descolgado con estilo mono legacy. | Control de retorno integrado en la cabecera como breadcrumb o botón de navegación. |
  | **Observación 12** | Pestañas de evidencia usan jerga técnica incomprensible de OpenSpec. | Rótulos funcionales que declaran qué contiene cada artefacto frente a OpenSpec 1.11. |
  | **Observación 13** | Markdown con doble espaciado (gap + margin) y escala aplanada en peso 600. | Ritmo vertical regular unificado y jerarquía tipográfica real con variación de pesos y tamaños. |
- [x] 2.2 Implementar lo aprobado. Mover, agrupar y jerarquizar lo que ya está: este change no
  agrega información ni la quita.
  - **Cabecera integrada de dos filas:** Fila 1 agrupa retorno al repositorio como control integrado de navegación, identidad del cambio (`changeId` y fecha) con badge compacto de rama (`.branchNoticeBadge`), y botón de acceso al glosario (`.glossaryToggleBtn`). Fila 2 ubica el Siguiente Paso presidiendo a la izquierda con CTA primario dominante (`.primaryAction`) y micro-copy inline explicativo, y las acciones accesorias subordinadas a la derecha (`.secondaryAction`).
  - **Cuerpo en superficie única continua soberana:** `.workArea` pasa a `flex: 1 1 auto; min-height: 0;` con scroll fluido, alojando el lanzador y la lista interactiva de tareas (`tasks.md`), seguida inmediatamente en el mismo flujo vertical continuo por la inspección de artefactos (`PipelineDetails`).
  - **Subordinación de Actividad:** Actividad pasa a un bloque colapsable bajo demanda `<details>` al pie (`.fullActivity`), reconociendo que permanece estructuralmente vacía en reposo con ejecutores de terminal externos.
  - **Formulario de nuevo cambio enfocado:** En `startScreen`, el alta se envuelve en contenedor modal enfocado (`.startNewChangeModal`) con control de cierre explícito, sin empujar la lista de cambios activos fuera de pantalla.
  - **Drawer lateral para glosario contextual:** Panel superpuesto deslizable a la derecha (`.glossaryDrawer`) para consultar definiciones técnicas al paso sin desplazar verticalmente las tareas ni tapar los artefactos.

- [x] 2.3 Los controles declaran su jerarquía: la acción principal se distingue de las accesorias.
  - El botón primario del siguiente paso aplica `.primaryAction` (fondo pleno cian dominante, ícono y escala destacada), desacoplado del igualador de tamaño rígido `.tabsRow .actions button`.
  - Las acciones accesorias («Archivar cambio», «Ver diff») aplican `.secondaryAction` (marco claro sin relleno), manteniéndose como controles de apoyo subordinados.

- [x] 2.4 Las solapas se ven como solapas. Es estilo, no semántica: el rol ya está bien.
  - Se sustituye el aspecto de botones o pastillas sueltas por estilo de solapa real integrada: contenedor con borde inferior continuo y pestaña activa con borde inferior `2px solid var(--color-primary)` y fondo transparente unificado con la superficie.
  - Los 6 rótulos funcionales frente a OpenSpec 1.11 en `lib/i18n.ts`: `Porqué y alcance (proposal.md)`, `Requisitos por capacidad (specs/)`, `Decisiones técnicas (design.md)`, `Checklist de ejecución (tasks.md)`, `Archivos y diffs git` y `Glosario del método`.

- [x] 2.5 Lo repetido deja de repetirse, según los casos 4, 5 y 7 del relevamiento.
  - **Caso 4:** Se retiró "Van X de Y" de la frase de guía del siguiente paso (`pipeline.next.task.help`), evitando duplicar el avance que ya expone el panel lateral.
  - **Caso 5:** Cuando la tarea activa no tiene sesión registrada, la ficha `.taskDetail` no se dibuja (cero fichas vacías con cuatro filas de «No informado»); se presenta una única línea discreta `.taskNoSession` indicando que aún no corrió ninguna sesión.
  - **Caso 7:** El grafo de artefactos (`PipelineArtifactGraph`) sustituyó la palabra «HECHO» repetida cuatro veces por íconos semánticos (`Check`, `Play`, `Lock`), preservando el texto accesible para lectores de pantalla en `.pipeline-artifact-graph__sr-text`.
  - **Caso 1:** La intención del cambio se retiró de la cabecera truncada a tres líneas con puntos suspensivos; vive íntegra en la solapa de Propuesta.

- [x] 2.6 El panel de evidencia se muda a la hoja de la vista.
  - Se trasladaron los estilos de `.pipeline-details*` y `.pipeline-artifact-graph*` desde `app/globals.css` a `components/pipeline/OpenSpecDashboard.module.css`, encapsulados bajo `.openspecScope`.
  - Se retiró la regla de CSS muerto `.pipeline-card[data-scrolls]` de `app/globals.css`.
  - Se corrigió `.pipeline-markdown` eliminando la colisión entre el flex `gap` y los márgenes verticales, y se restituyó la escala tipográfica con jerarquía real de peso y tamaño (`h1` 700/lg, `h2` 650/md, `h3` 600/base, `h4` 650/xs mono uppercase, `strong` 700).

## 3. Verificación

- [x] 3.1 En tests, sostener lo que se decidió: que un bloque no vuelva a duplicarse, que un rótulo
  no falte, que el orden sea el acordado. Afirmar sobre el DOM montado y sobre el orden.
  Una prueba puede sostener una decisión ya tomada; no puede tomarla.
  - Creada la suite dedicada `components/pipeline/__tests__/pipeline-sdd-body-layout.test.tsx` con 11 pruebas:
    - Verificación del orden DOM continuo (Siguiente Paso en cabecera -> Lista de tareas en `.workArea` -> Inspección de artefactos en `.pipeline-details` -> Actividad subordinada colapsable).
    - Ausencia de solapas superiores rígidas (`openspec.tabs.work`, `openspec.tabs.details`).
    - Verificación de clases `.primaryAction` en CTA y `.secondaryAction` en botones accesorios.
    - Presencia de los 6 rótulos funcionales en el `tablist` de evidencia con `pipeline-details__tab--active`.
    - Ausencia de "Van X de Y" en el texto de ayuda del siguiente paso.
    - Ausencia del texto truncado de intención en la cabecera.
    - Ausencia de las cuatro filas vacías de detalle en tareas sin sesión y presencia de `.taskNoSession`.
    - Presencia de íconos semánticos en el grafo de artefactos.
    - Ausencia de `.pipeline-details` y `.pipeline-card[data-scrolls]` en `globals.css` y presencia en module CSS.
  - Ajustadas pruebas preexistentes que dependían de la ubicación anterior: `pipeline-details.test.ts`, `pipeline-change-branch-notice.test.tsx`, `pipeline-openspec-dashboard-integration.test.tsx`, `pipeline-activity-scope.test.tsx` y `commit-graph-frame.test.tsx`.

- [x] 3.2 Declarar qué NO cubre la verificación de este change, declarando qué archivos recorre: una comprobación vale lo que abarca.
  - **Archivos recorridos por la verificación:**
    - `lib/i18n.ts`: verificación de cadenas limpias de avance duplicado, rótulos funcionales y estados discretos sin sesión.
    - `components/pipeline/PipelineArtifactGraph.tsx`: comprobación de glifos semánticos sin texto repetitivo.
    - `components/pipeline/PipelineDetails.tsx`: comprobación de pestañas reales, convivencia de glosario y fallback de intención completa.
    - `components/pipeline/ChangeBranchNotice.tsx`: comprobación del badge compacto en línea.
    - `app/globals.css`: comprobación de mudanza de evidencia, saneamiento de markdown y retiro de CSS muerto.
    - `components/pipeline/OpenSpecDashboard.module.css`: comprobación de contenedor soberano `.workArea`, dos filas de cabecera, desacople de acciones, solapas reales y conformidad con paleta y escala visual.
    - `components/pipeline/OpenSpecDashboard.tsx`: comprobación de superficie única soberana continua, orden de lectura, subordinación de actividad, modal enfocado y drawer de glosario.
    - Suites de pruebas: `pipeline-sdd-body-layout.test.tsx`, `pipeline-details.test.ts`, `pipeline-change-branch-notice.test.tsx`, `pipeline-openspec-dashboard-integration.test.tsx`, `pipeline-activity-scope.test.tsx`, `commit-graph-frame.test.tsx`, `ui-color-scan.test.ts`, `visual-scale-scan.test.ts`, `target-size.test.ts`.
  - **Qué NO cubre la verificación de este change:**
    - **Contenido del glosario y redacción de explicaciones de controles:** Este change implementa la maqueta, los contenedores, el drawer lateral, la solapa y los marcadores de posición (`[marcador de posición]`), pero no redacta ni valida las definiciones didácticas de términos ni los textos explicativos; esa responsabilidad corresponde al change `explicar-el-ciclo-sin-tecnicismos`.
    - **Visualización de dependencias y desbloqueos en disco:** Se reservó el espacio estructural para el ciclo de artefactos, pero la lectura profunda de dependencias y rutas reales del árbol de artefactos del CLI pertenece al change futuro `gestionar-ciclo-openspec-desde-gitcron`.
    - **Compatibilidad con navegadores no-Chromium (WebKit/Safari, Firefox):** Al ser una aplicación de escritorio empaquetada con Electron 42 (Chromium) para Windows, no se ejecutan comprobaciones cross-browser fuera de Chromium y el entorno jsdom de Vitest.
    - **Lógica interna y parser del CLI de OpenSpec:** Los estados del grafo y los subcomandos de OpenSpec interactúan mediante los adaptadores e IPC existentes sin mutar la herramienta externa.
    - **Revisión visual perceptiva de Alejandro (Tarea 4.6):** Las pruebas automatizadas verifican el DOM montado y la conformidad técnica, pero la evaluación de ritmo tipográfico y comodidad operativa en pantalla real queda bajo la revisión visual humana.

## 4. Cierre y validación

- [x] 4.1 `pnpm build` sin errores.
  - Compilación Next.js 15.5.18 finalizada exitosamente (`Compiled successfully in 18.7s`, `Exporting (2/2)`, código de salida 0).
- [x] 4.2 `pnpm exec tsc --noEmit` sin errores de tipado.
  - Verificación estricta de TypeScript 5.9 sin advertencias ni errores (código de salida 0).
- [x] 4.3 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests».
  - Pasada 1: 177 test files pasados (177), 1602 tests pasados (1602).
  - Pasada 2: 177 test files pasados (177), 1602 tests pasados (1602).
- [x] 4.4 `openspec validate remaquetar-cuerpo-de-sdd --strict` en cero.
  - Salida: `Change 'remaquetar-cuerpo-de-sdd' is valid` (código de salida 0).
- [x] 4.5 `git diff --check` en cero y `git status --short --branch` informado.
  - `git diff --check`: cero errores de formato ni espacios al final de línea (código 0).
  - Rama activa: `change/remaquetar-cuerpo-de-sdd`.
- [x] 4.6 Revisión visual completa: el cuerpo se lee de arriba abajo, lo primero es lo que se va a
  hacer, y nada se dice dos veces. **La marca Alejandro.**
