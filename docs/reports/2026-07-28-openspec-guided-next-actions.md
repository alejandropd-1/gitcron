# Reporte — guía contextual OpenSpec y flujo guiado (change `guide-openspec-next-actions`)

Fecha: 2026-07-28
Repositorio: `C:\www\gitcron`
Branch: `codex/openspec-changes-ui`
HEAD al iniciar: `6c32767 feat(pipeline): reemplazar la vista por un workspace OpenSpec operativo`
Origen del trabajo: `docs/reports/2026-07-28-handoff-openspec-guided-workflow.md`

## 1. Punto de partida verificado

El handoff pedía frenar si el árbol seguía sucio. Al abrir la sesión el working tree tenía las 46 modificaciones de la tanda anterior sin commitear y HEAD en `a7fc345`. Se consultó a Ale antes de tocar nada; Ale cerró esa tanda con `6c32767` y recién entonces se empezó a editar, sobre árbol limpio.

Baseline antes de editar: `gates.ps1 fast` = **VERDE** (C1, C2, C3, C4, C6).

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

**Pendiente relacionado:** `defaultValidateOpenSpecChange` (línea 73) tiene exactamente la misma llamada rota, así que en Windows la validación siempre reporta `unknown`. No se tocó: a diferencia del listado, validar sí requiere el CLI y no puede resolverse leyendo disco. Consecuencia práctica: los estados `validación aprobada` y `listo para archivar` no son alcanzables en Windows hasta arreglarlo. Necesita decisión sobre shell vs. resolver el entry JS.

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
| `pnpm test` | 86 archivos / 566 tests, todos verdes (antes 84 / 521) |
| `pnpm exec eslint` sobre archivos tocados | limpio |
| `pnpm run package:build` | correcto (Next + Electron) |
| `gates.ps1 fast` | **VERDE** |
| `gates.ps1 full` | **PENDIENTE** |

`gates.ps1 full` queda **PENDIENTE**, no verde. Los responsables son los mismos de siempre: C5 lint y C8 fallow, deuda heredada declarada por el propio gate con baseline al 2026-07-23. Se comprobó que esta tanda **no agregó deuda**: `pnpm exec eslint .` sobre todo el repo devuelve 76 errores y 19 warnings, exactamente el baseline declarado. C1, C2, C3, C4, C6 y C7 correctos.

## 8. Pendiente declarado

Tres puntos quedan abiertos y no deben leerse como hechos:

1. **Tests de DOM imposibles sin dependencia nueva.** `vitest.config.ts` corre en entorno `node`, sin jsdom ni testing-library, y el `include` sólo toma `*.test.ts`. Por eso la lógica se sacó de los componentes a `pipeline-next-action.ts` y `pipeline-guided-forms.ts`, donde sí está cubierta: la compuerta que bloquea el arranque por fixture, la validación del formulario, las instrucciones exactas y las once filas de la matriz tienen prueba. Lo que **no** tiene guarda automática es el cableado JSX de las props —justamente lo que estaba roto—. Se verificó por lectura. Cerrar esa brecha exige aprobar una devDependency de testing de componentes; es decisión de Ale. Las tareas 3.3 y 7.7 quedan sin marcar por eso.
2. **QA visual en Electron real (tarea 9.6).** El dashboard de Pipeline necesita `window.api` y un repo abierto, así que no es alcanzable desde el navegador: se levantó el dev server web y la app queda en la pantalla de crear repositorio. La QA de las once filas, los dos anchos y los sidebars abiertos/cerrados requiere Electron y la hace Ale.
3. **Commit y push.** No se hizo staging ni commit. El árbol queda con los cambios listos para que Ale los revise.

## 9. Estado del change

`openspec status --change guide-openspec-next-actions`: 4/4 artefactos completos. 41 de 46 tareas marcadas. Las 5 sin marcar son las descritas arriba: 3.3, 7.7, 9.6, 9.7 y 9.8. El change **no** se sincronizó ni archivó, como pedía el handoff.
