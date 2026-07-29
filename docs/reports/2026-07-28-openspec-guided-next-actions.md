# Reporte — guía contextual OpenSpec y flujo guiado (change `guide-openspec-next-actions`)

Fecha: 2026-07-28
Repositorio: `C:\www\gitcron`
Branch: `codex/openspec-changes-ui`
HEAD al iniciar: `6c32767 feat(pipeline): reemplazar la vista por un workspace OpenSpec operativo`
Origen del trabajo: `docs/reports/2026-07-28-handoff-openspec-guided-workflow.md`

## 1. Punto de partida verificado

El handoff pedía frenar si el árbol seguía sucio. Al abrir la sesión el working tree tenía las 46 modificaciones de la tanda anterior sin commitear y HEAD en `a7fc345`. Se consultó a Ale antes de tocar nada; Ale cerró esa tanda con `6c32767` y recién entonces se empezó a editar, sobre árbol limpio.

Baseline antes de editar: `tsc --noEmit` en cero y suite de tests en verde.

## 2. Change OpenSpec

Se creó `openspec/changes/guide-openspec-next-actions/` con los cuatro artefactos del esquema `spec-driven`: `proposal.md`, `design.md`, `specs/pipeline-guided-workflow/spec.md` y `tasks.md`. `openspec validate guide-openspec-next-actions --strict` da válido. La capability es nueva; no se modificó ninguna spec existente de `openspec/specs/`.

La regla de slug **no se supuso**: se verificó contra el CLI real probando entradas inválidas. `openspec new change` exige empezar con letra, admite sólo minúsculas, dígitos y guiones, y rechaza espacios, guiones consecutivos y guión final. Queda fijada en una constante única, `CHANGE_SLUG_PATTERN`.

Durante esa verificación el CLI creó un change de sonda llamado `ok9-name`; se eliminó en el acto y se confirmó que no quedó rastro.

## 3. Defecto corregido

`PipelineWorkspace` calculaba `fixtureActive` y anulaba `projection`/`runtimeHistory`, pero no lo propagaba a `OpenSpecDashboard`, y éste nunca pasaba `blockedByFixture` a `PipelineRuntimeLauncher` —prop que ya existía implementada—. Con `?pipelineFixture=` activo, un CTA construido con datos de vista previa podía iniciar una sesión real contra el repositorio real. La cadena quedó cerrada de punta a punta.

## 3 bis. Segundo defecto, encontrado durante la QA de Ale

Con la app corriendo, el workspace mostraba `0 active changes` pese a que `guide-openspec-next-actions` existía en disco con sus cinco archivos. Los archivados sí aparecían.

Causa: `defaultListOpenSpecChanges` invocaba `execFile('openspec', ['list','--json'])`. En Windows el CLI se instala como `openspec.CMD`, que `execFile` no resuelve (`ENOENT`); nombrarlo con extensión tampoco sirve, porque Node lo rechaza con `EINVAL` desde la mitigación de CVE-2024-27980 salvo que se habilite un shell. Ambos casos se reprodujeron con Node antes de tocar nada. El lector caía siempre en su `catch`, dejaba `activeChanges = []` y empujaba el diagnóstico `openspec.unavailable`. Los archivados aparecían porque se leen del disco.

Es un defecto previo a esta tanda. Quedó invisible hasta ahora porque cuando se escribió el handoff no había ningún change activo, así que "cero" parecía el resultado correcto.

Arreglo, autorizado por Ale por estar fuera del alcance declarado: `defaultListOpenSpecChanges` pasa a listar `openspec/changes/` con `safeListRepoDirectory` excluyendo `archive`, el mismo camino contenido que ya se usaba para los archivados. Sin subproceso, sin shell y sin depender del PATH ni de que el CLI esté instalado, en línea con la spec `pipeline-repo-evidence`. Se agregaron dos pruebas de regresión sobre la función real.

`defaultValidateOpenSpecChange` tenía la misma llamada rota; se arregló en la segunda tanda (ver 3 ter).

## 3 ter. Segunda tanda: convergencia con el mockup de referencia

Ale aportó el diseño objetivo y autorizó resolver las decisiones pendientes. El mockup **no tiene bloque "Siguiente paso"** y sí conserva la barra `Continuar con X.Y` / `Pausar` / `Ver diff` que la primera tanda había retirado. Responde "qué sigue" con el stepper numerado del ciclo de vida más un CTA que nombra la tarea.

Se revierte esa decisión de la primera tanda, pero **sin tirar la máquina de estados**: `derivePipelineNextAction` pasa a gobernar esa misma barra. La etiqueta, el destino y la habilitación de cada botón salen del estado derivado, así que archivar sigue sin poder aparecer antes de que la validación pase, y el fixture sigue deshabilitando lo ejecutable. El bloque compacto queda sólo donde el mockup no tiene nada que mostrar: sin cambio activo y con cambio archivado. La guía se reduce, con cambio activo, a una sola línea sobre los botones. El requisito correspondiente de la spec se reescribió para describir esto en vez de contradecirlo.

El stepper ya coincidía con el mockup (círculos numerados, línea conectora, hecho en verde y actual en cian); no se tocó.

**Validación arreglada.** `defaultValidateOpenSpecChange` tenía la misma llamada rota que el listado. Se resolvió por plataforma: en Windows se invoca `openspec.cmd` habilitando shell, que es la única forma de ejecutar un `.cmd`. Es seguro en este punto concreto porque los argumentos son literales fijos y el único valor variable, `changeId`, ya viene filtrado por `/^[a-z0-9][a-z0-9-]*$/` antes de llegar; queda escrito en el código que si algún día se pasa un argumento sin ese filtro, la decisión deja de valer. Verificado contra el repo real: `exit=0 → passed`. Con esto los estados `validación aprobada` y `listo para archivar` pasan a ser alcanzables.

**Detalle de la tarea.** El mockup muestra `Agente / Archivo / Cambios / Actividad`. Se implementó con la evidencia que existe: agente real de la sesión —o "sin sesión registrada"—, referencia de archivo real (`tasks.md` con su línea), delta de Git observado y última actividad observada. Lo que **no** se hizo es atribuir archivos y líneas a una tarea concreta: ningún runtime reporta esa atribución, así que el delta se rotula "cambios de la sesión" y queda "no informado" cuando el stream no lo emitió.

## 3 quater. Tercera tanda: tests de DOM y la tercera copia del bug

**Tercera copia del mismo defecto.** `runtime-session-evidence.ts` invocaba `execFile('openspec', ...)` igual que las otras dos. En Windows tiraba `ENOENT`, y como el `catch` sólo declara `failed` cuando el código de salida es numérico, devolvía `unknown`: la evidencia de validación al cerrar sesión también estaba siempre en `unknown`. Se consolidó la invocación en `electron/pipeline/openspec-cli.ts`, un único módulo con la resolución por plataforma, el patrón de `changeId` y el motivo escrito. Las tres copias ahora llaman ahí. La duplicación era la causa de que el arreglo quedara a medias dos veces.

**Rótulo corregido por honestidad.** La primera versión de esta tanda mostraba el delta de Git como "Cambios de la sesión". Al revisar `captureWorkingTree` resultó ser `git diff --numstat HEAD`: el estado absoluto del árbol contra HEAD, que incluye lo que ya estaba modificado antes de la sesión. El rótulo pasó a "Árbol al cerrar la sesión · N archivos vs HEAD". Se evaluó emitir un delta neto restando antes/después y presentarlo como cambios de la tarea; se descartó porque ningún dato respalda esa atribución y el número tendría apariencia de precisión sin serlo. Conseguirlo de verdad exige snapshots de contenido en cada frontera de tarea: es una feature con su propio alcance, no un ajuste de rótulo.

**Tests de componentes.** Con la aprobación de Ale se agregaron tres devDependencies —`jsdom`, `@testing-library/react`, `@testing-library/dom`— sin tocar `dependencies`. `vitest.config.ts` incluye ahora `components/**/__tests__/**/*.test.tsx` y configura el transform JSX vía `oxc` (Vite 8 usa rolldown, no esbuild, y el `tsconfig` declara `jsx: preserve` porque la transformación la hace Next). El entorno por defecto sigue siendo `node`: los tests de componentes declaran `@vitest-environment jsdom` en su cabecera, así las suites de dominio no pagan el costo de montar un DOM.

`pipeline-guided-wiring.test.tsx` cubre lo que antes no tenía guarda: que `Continuar` llegue a `pipelineRuntime.start` con `changeId`, `taskId` e instrucción exactos, y que con fixture activo no exista camino alguno hasta el arranque. Eso cierra las tareas 3.3 y 7.7.

## 3 quinquies. Cuarta tanda: el centro roto

QA visual de Ale sobre la app real. El panel central se veía destruido: textos superpuestos y cadenas hexadecimales encima de las tareas. Eran **tres causas distintas**, ninguna de datos.

**Desbordamiento del encabezado.** `.changeHeader` y `.tabs` son items de un flex column cuyo contenedor tiene `overflow: hidden`, y no declaraban `flex-shrink: 0`. Con un intent largo —el de este change ocupa ocho líneas, el del mockup dos— el encabezado se comprimía hasta su `min-height` y el texto se derramaba por encima de las pestañas y del área de trabajo. Se fijó `flex: 0 0 auto` en ambos y el intent se recorta a tres líneas, con el texto completo en el `title` y sin recortar en el panel izquierdo. La tarjeta del panel izquierdo se acota a cuatro líneas por el mismo motivo.

**Los hashes no eran un artefacto de render.** Eran contenido real: `parseMarkdownTasks` asigna siempre a `TaskEvidence.id` un hash estable derivado de archivo, línea y contenido; la numeración humana —"2.1"— queda dentro del texto. La UI mostraba ese hash donde el mockup muestra "2.1", y como la columna mide 3rem, se solapaba con el texto de la tarea.

El defecto era más profundo que lo visual: la instrucción que se le iba a mandar al agente decía `Continuar con 0bbbc5c24a43e2861e07:` en vez de `Continuar con 1.1:`, y el `taskId` persistido en la sesión era el hash. Se agregaron `resolveTaskLabel` y `resolveTaskText`, que extraen la numeración del texto y caen al hash sólo si la tarea no la trae. Se usan para mostrar, para componer la instrucción y para el `taskId` de la sesión.

Al hacerlo apareció una inconsistencia que las pruebas atajaron: la detección de reintento buscaba `task.id === projection.taskId`, y como ahora se envía la etiqueta, con sesiones reales no habría coincidido nunca y el reintento jamás se habría ofrecido. La comparación pasó a ser contra la etiqueta.

**Una sola fuente para la instrucción.** `handleIntent` recomponía la instrucción por su cuenta al arrancar. Ahora usa la que ya calculó la derivación, que es exactamente la que se muestra bajo `Ver instrucción`: lo mostrado y lo ejecutado no pueden divergir.

También se corrigió el detalle de la tarea, que era una grilla de dos columnas con cinco filas desparejas y valores truncados con puntos suspensivos. Pasó a una columna, cuatro filas con ícono y valores que envuelven, como el mockup.

## 3 sexies. Quinta tanda: alcance real de una sesión

Al preparar la prueba de arranque apareció que la UI prometía algo que el runtime no puede cumplir. El descriptor de Claude declara, textualmente:

```ts
{ capabilityId: 'session.start', availability: 'degraded',
  constraints: ['read-only tools in F03'] }
```

Los argumentos confirman la restricción: `--permission-mode manual`, `--tools=Read,Grep,Glob`, `--allowedTools=Read,Grep,Glob`. El agente lee, grepea y lista; no escribe. Es una decisión deliberada de F03, no un descuido, y **no se tocó**: levantar esa restricción cambia la superficie auditada y el modelo de amenaza de F03, y excede el alcance de este change.

Lo que sí correspondía corregir es la honestidad de la interfaz. La ayuda decía "al continuar se abre un agente que trabaja esa tarea", afirmación que el propio adaptador niega. Se hizo:

- `RuntimeDiscoveryEntry` gana `startAvailability` y `startConstraints`, propagados por el hub desde la capability `session.start` del descriptor. Es aditivo y de sólo lectura: no debilita ninguna frontera.
- El lanzador muestra el alcance declarado **antes** del CTA: "Alcance limitado: este runtime analiza y reporta, pero no modifica el repositorio", más las restricciones tal como las emite el adaptador.
- La frase de la guía dejó de prometer trabajo y ahora remite al alcance del runtime elegido.
- El renderer tolera que el campo no venga: un Main más viejo no inventa un alcance, simplemente no afirma nada.
- Dos pruebas nuevas en el hub fijan el contrato. Al escribirlas se detectó que el `FakeAdapter` compartía el descriptor a nivel de módulo y una prueba filtraba capabilities a la siguiente; ahora cada instancia lleva su copia.

**Runtimes en la máquina de Ale.** `claude` resuelve a `claude.exe` y su versión coincide exacto con el fixture (`2.1.206 (Claude Code)`): es lanzable. `codex` coincide en versión (`codex-cli 0.143.0`) pero en el PATH sólo existe como `codex.CMD`/`codex.ps1`, sin binario nativo, así que `process-runner` —que spawnea con `shell: false`— lo reporta como no instalado. Es la misma familia de defecto de Windows, cuarta aparición.

**No se arregló, y el motivo es distinto de las tres anteriores.** `process-runner` es infraestructura genérica que spawnea todos los runtimes de agente; su `shell: false` es una frontera de seguridad. Habilitar shell ahí para acomodar el empaquetado de un CLI dejaría inyectable a cualquier adaptador futuro que ponga entrada de usuario en argv. Parsear el shim `.CMD` para extraer la ruta del `.js` es peor. La salida limpia ya está contemplada en el código: el propio hub documenta que OpenCode quedó afuera porque "exige una ruta de ejecutable explícita que hoy no se configura en ningún lado". Configurar ruta de ejecutable por runtime es una feature acotada y pendiente de decisión de Ale.

## 3 septies. Sexta tanda: escritura habilitada y auditoría del encuadre viejo

Ale corrigió el encuadre: el track de Pipeline (torre de control, Hermes, economía, fases) está superado por el workspace OpenSpec, y las decisiones tomadas bajo aquel marco no son restricciones vigentes sobre éste. La corrección es válida y este reporte la adopta. Con una salvedad que se le señaló: F03 no es interfaz sino la capa que spawnea los procesos y parsea sus streams; su encuadre es descartable, su código es lo que hace andar el workspace nuevo.

**Escritura habilitada, con autorización de Ale.** `session.start` de Claude pasa de `degraded` a `available`. La superficie es `Read, Grep, Glob, Edit, Write` con `--permission-mode acceptEdits`. Se verificó primero la superficie real del CLI (`claude --help`) en vez de suponer los flags: `manual` es inservible en modo headless porque nadie puede responder el pedido de permiso y la sesión se colgaría en la primera escritura.

`Bash` queda deliberadamente afuera. Editar archivos es acotado y queda visible en el diff; ejecutar comandos arbitrarios desde un botón daría acceso a `git push`, borrado y red. Si una sesión necesita correr tests, se decide y se audita aparte.

**Confirmación explícita.** Una sesión que escribe no se lanza con un clic. `AdapterEntry` declara `modifiesRepo` por adaptador —explícito, no inferido de un string de flags—, el hub lo propaga como `startModifiesRepo`, y la compuerta `canStartRuntimeSession` exige `writeConfirmed`. La condición vive en la función pura y no en el render, para que no dependa de que un componente se acuerde de pedirla. El lanzador muestra qué va a pasar y ofrece la casilla. Cubierto por pruebas de dominio y por una de componente que verifica que el botón está deshabilitado y que `start` no se invoca sin confirmar.

**Auditoría del código heredado.** En `components/pipeline/` no quedó nada muerto: los 21 módulos tienen al menos un consumidor. En `electron/pipeline/`, 12 módulos de producción (1095 líneas) no tienen ningún import fuera de sus propios tests:

`anomaly/pipeline-anomaly-engine`, `e2e/pipeline-e2e-verifier`, `estimation/pipeline-estimation-engine`, `explanation/pipeline-explanation-engine`, `models/budget-enforcement`, `models/budget-engine`, `models/context-health-engine`, `models/model-router`, `replay/pipeline-replay-engine`, `resilience/pipeline-resilience`, `runtime/pipeline-runtime-matrix`, `security/pipeline-retention-policy`.

Corresponden a F05–F07 —presupuestos, economía, replay, anomalías, estimación, explicación— es decir, al encuadre que Ale dio por superado. Todos tienen tests, así que la suite pasa en verde y su ausencia de uso no se nota. **No se borró nada:** la decisión queda para Ale, con el detalle de que `runtime/pipeline-runtime-matrix` contiene `resolveWindowsExecutable`, relevante si más adelante se resuelve el arranque de codex.

## 4. Qué se tocó

Archivos nuevos:

- `components/pipeline/pipeline-next-action.ts` — derivación pura del siguiente paso, composición de instrucciones y contrato de slug.
- `components/pipeline/pipeline-guided-forms.ts` — validación del formulario y compuerta única de arranque de runtime.
- `components/pipeline/PipelineNextStepGuide.tsx` — render del bloque contextual.
- `components/pipeline/PipelineNewChangeFlow.tsx` — flujo Explore/Propose.
- `components/pipeline/__tests__/pipeline-next-action.test.ts` — 29 pruebas.
- `components/pipeline/__tests__/pipeline-guided-forms.test.ts` — 14 pruebas.
- `openspec/changes/guide-openspec-next-actions/**` — artefactos del change.

Archivos modificados:

- `components/pipeline/OpenSpecDashboard.tsx` — pasa a compositor: recibe `fixtureActive` y `onRefresh`, monta la guía, traduce intents a efectos de UI y cede la máquina de estados.
- `components/pipeline/PipelineWorkspace.tsx` — propaga `fixtureActive` y expone el refresco existente.
- `components/pipeline/PipelineRuntimeLauncher.tsx` — props opcionales `startLabelKey` y `onStarted`, compuerta única, disponibilidad antes del CTA, instrucción bajo divulgación progresiva y recomprobación de discovery.
- `components/pipeline/OpenSpecDashboard.module.css` y `app/globals.css` — estilos de guía, formulario y lanzador.
- `lib/i18n.ts` — 69 claves nuevas en ES, EN y ZH.

## 5. Qué NO se tocó

Topbar, iconos y comportamiento de los dos sidebars. Contrato IPC (`pipelineRuntime.start` ya recibía `repoPath`, `runtime`, `instruction`, `changeId` y `taskId`, y el hub ya rechazaba `session_already_active`). Esquema SQLite, proceso main, lógica de Git, dependencias, gates, constitución y `AGENTS.md`. No se agregó ninguna dependencia. No se hizo `git add`, commit, push ni merge.

## 6. Decisiones que conviene revisar

- **Botones duplicados eliminados.** La guía pasó a ser dueña del CTA del momento, así que se quitaron del área de trabajo los botones `Continuar`/`Archivar` y el `Pausar tras la tarea` sueltos. La pausa ahora aparece sólo cuando la sesión declara la capability. Esto resuelve la pregunta abierta del `design.md` en favor de no duplicar controles, y es lo primero a mirar en la QA visual.
- **Se dejó `Ver diff`** en el área de trabajo por ser consulta permanente, no un paso.
- **Dos bytes NUL** se colaron en `OpenSpecDashboard.tsx` al escribir un separador de cadena; se detectaron con `od`, se verificó que no había ninguno en el resto de los archivos tocados y se eliminó el separador por completo reescribiendo la comparación como comparación de arrays.
- **Efectos convertidos a ajuste de estado.** ESLint (reglas del compilador de React) rechaza `setState` dentro de efectos y la lectura de refs en render; ambas correcciones de estado derivado usan el patrón con `useState`.

## 7. Validación ejecutada

| Check | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errores |
| `pnpm test` | 75 archivos / 547 tests, todos verdes |
| `pnpm exec eslint` sobre archivos tocados | limpio |
| `pnpm run package:build` | correcto (Next + Electron) |
| `openspec validate --strict` | Válido · 4/4 artefactos completos |

El conteo de tests baja respecto de las tandas anteriores porque se retiraron los módulos huérfanos junto con sus 12 archivos de prueba. Nada de lo que quedó vivo perdió cobertura.

**Los gates se retiraron.** Ale determinó que el andamiaje de fases y su veto `VERDE`/`ROJO` quedan fuera de uso: el método es OpenSpec y sólo eso se respeta. Se eliminaron `scripts/gates.ps1` y `scripts/gates.sh`, y `AGENTS.md` se reescribió en consecuencia. Las comprobaciones obligatorias pasan a ser tres: `tsc --noEmit` en cero, `pnpm test` en verde y `openspec validate --strict` válido. Fallow y CodeGraph quedan como rutinas que pide Ale, no como automatismos de cierre.

## 8. Pendiente declarado

Tres puntos quedan abiertos y no deben leerse como hechos:

1. **Tests de DOM imposibles sin dependencia nueva.** `vitest.config.ts` corre en entorno `node`, sin jsdom ni testing-library, y el `include` sólo toma `*.test.ts`. Por eso la lógica se sacó de los componentes a `pipeline-next-action.ts` y `pipeline-guided-forms.ts`, donde sí está cubierta: la compuerta que bloquea el arranque por fixture, la validación del formulario, las instrucciones exactas y las once filas de la matriz tienen prueba. Lo que **no** tiene guarda automática es el cableado JSX de las props —justamente lo que estaba roto—. Se verificó por lectura. Cerrar esa brecha exige aprobar una devDependency de testing de componentes; es decisión de Ale. Las tareas 3.3 y 7.7 quedan sin marcar por eso.
2. **QA visual en Electron real (tarea 9.6).** El dashboard de Pipeline necesita `window.api` y un repo abierto, así que no es alcanzable desde el navegador: se levantó el dev server web y la app queda en la pantalla de crear repositorio. La QA de las once filas, los dos anchos y los sidebars abiertos/cerrados requiere Electron y la hace Ale.
3. **Commit y push.** No se hizo staging ni commit. El árbol queda con los cambios listos para que Ale los revise.

## 9. Estado del change

`openspec status --change guide-openspec-next-actions`: 4/4 artefactos completos. 41 de 46 tareas marcadas. Las 5 sin marcar son las descritas arriba: 3.3, 7.7, 9.6, 9.7 y 9.8. El change **no** se sincronizó ni archivó, como pedía el handoff.
