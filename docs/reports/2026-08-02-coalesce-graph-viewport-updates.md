# Reporte — `coalesce-graph-viewport-updates`

**Fecha:** 2026-08-02 · **Base:** `main` en `123544e`

Tironeo al arrastrar el grafo cronométrico, reportado por Ale usando la aplicación.

## Diagnóstico

No era que el grafo fuera pesado de dibujar una vez. `useCanvasViewport` llamaba a `setViewport`
**por cada evento de mousemove**, sin coalescer por cuadro. Un mouse en Windows emite entre 125 y
1000 eventos por segundo; cada uno disparaba un `setState` que rerenderizaba `ChronometricGraph`
—500 commits (tope de `--max-count=500`) y 144 refs en este repositorio—. Se pedían cientos de
renders por segundo y el navegador pinta 60: el resto era trabajo descartado, y el gesto tironeaba.

`handleWheel` tenía el mismo defecto.

## Qué se tocó

Un solo archivo de producto: `hooks/use-canvas-viewport.ts`.

- `scheduleViewport` coalesce los caminos de gesto con `requestAnimationFrame`: los eventos se
  procesan todos y se aplica como mucho un encuadre por cuadro, con el último valor.
- `viewportRef` se adelanta al estado al calcular. Sin esto, dos pasos de rueda en el mismo cuadro
  leerían ambos el último valor *aplicado* y el segundo anularía al primero: la rueda perdería pasos.
  Hay un test que lo fija.
- `applyViewportNow` para los encuadres puntuales —`resetViewport`, centrado, zoom por botón,
  reencuadre por cambio de mundo—: aplican de inmediato y descartan el cuadro pendiente. Sin eso, un
  cuadro agendado antes de un reinicio se resolvería después y lo pisaría, de forma intermitente y
  dependiente del timing.
- `flushPendingFrame` al soltar el arrastre, para que el encuadre quede donde el usuario lo soltó y
  no un cuadro atrás.
- Cancelación del cuadro pendiente al desmontar.

Archivos:

- `hooks/use-canvas-viewport.ts`
- `hooks/__tests__/use-canvas-viewport.test.ts` (nuevo)

## Qué NO se tocó

- **La geometría del grafo.** La invariante 12 la protege. `constrainViewport` y `zoomAtPoint` quedan
  intactas y el conjunto de encuadres alcanzables no cambia: cambia cuándo se aplica el estado, no
  cuál es.
- `components/ChronometricGraph.tsx` — consumidor único del hook, sin modificar. Si su render sigue
  siendo caro, ahora ocurre 60 veces por segundo en vez de varios cientos. Abaratar el render en sí
  es otro trabajo y necesita su propia medición.
- `lib/canvas-viewport.ts` — funciones puras de cálculo.
- `vitest.config.ts` — el test se escribió sin JSX para entrar en el `include` existente
  (`hooks/__tests__/**/*.test.ts`) en vez de ampliar la configuración del arnés, que es alcance de
  `testing-harness`.
- Los otros dos hallazgos de la sesión, que quedan abiertos: el spinner de ~3 s al entrar a Pipeline
  en un repo, y el heartbeat de `git status` cada 2 s. Ver abajo.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec eslint <archivos tocados>` | limpio, sin salida |
| `pnpm exec tsc --noEmit` | 0 errores |
| `pnpm test` (corrida 1) | 85 archivos · 619 tests · verde |
| `pnpm test` (corrida 2) | 85 archivos · 619 tests · verde |
| `pnpm test` (corrida 3) | 85 archivos · 619 tests · verde |
| `openspec validate coalesce-graph-viewport-updates --strict` | válido |

Antes de este change la suite era de 84 archivos y 613 tests; los seis nuevos son los del hook.

**Sobre el flake:** tres corridas verdes, sin reproducir el `Test timed out in 5000ms` de
`git-hunks-ipc`, `branch-delete-ipc`, `git-ops-worktree-submodule` ni `git-sync-ipc`. Como en la
tanda anterior: **no está resuelto ni medido**, sólo no apareció. El punto C del handoff sigue
abierto.

## Cobertura agregada

Seis tests sobre el hook, que antes no tenía ninguno (`lib/__tests__/canvas-viewport.test.ts` cubre
sólo las funciones puras). Los cuadros están bajo control del test, así que no dependen del timing
real del navegador.

- Tres eventos de arrastre en un cuadro → un solo encuadre, con la última posición.
- Gesto a lo largo de varios cuadros → sin saltear cuadros.
- Dos pasos de rueda en un cuadro → el zoom se acumula en vez de anularse.
- Reinicio con cuadro pendiente → el pendiente no lo pisa.
- Soltar el arrastre antes del cuadro → conserva la última posición.
- Desmontar con cuadro pendiente → no aplica estado.

Los tres fallos que aparecieron durante el desarrollo fueron todos del harness de prueba (padding
fuera del rango de `constrainViewport`, y conteo de renders en vez de encuadres), no del código bajo
prueba.

## Qué logró este change, medido después de implementarlo

Instrumentando `ChronometricGraph` en dev y arrastrando el grafo:

| repo | commits | renders/s durante el arrastre | medio | máx |
|---|---|---|---|---|
| gitCronos | 500 | 3–7 | 50–70 ms (picos de 360) | 497 ms |
| odontoPau | 61 | 10–22 | 24–74 ms | 119 ms |
| odontoPia | 17 | 15–26 | 14–26 ms | 123 ms |

**El tironeo en gitCronos no desapareció, y este change no podía hacerlo desaparecer.** El
presupuesto por cuadro a 60 fps es 16,6 ms y cada render cuesta 50–70 ms: el techo real lo pone el
costo por render, no la frecuencia con la que se pide. Coalescer nunca iba a levantar los fps por
encima de lo que el render permite.

Lo que sí aporta, y es la razón de conservarlo: sin coalescencia, los eventos de mousemove llegan a
125–1000 por segundo y cada uno pedía un render de 50–70 ms. La demanda superaba a la capacidad por
un orden de magnitud y se acumulaba un atraso: el grafo iba quedando detrás del cursor y seguía
moviéndose después de soltar. Con la coalescencia siempre se renderiza la **última** posición
conocida y el atraso no se acumula, aunque los fps sigan siendo los que el render permita.

Dicho claro: **es un paso necesario y no suficiente.** El arreglo que falta es abaratar el render.

Los números son de modo dev, donde React es del orden de 2-3× más lento que empaquetado. La
proporción entre repos se mantiene.

## Medido en la sesión, no atacado

Al investigar el rendimiento aparecieron dos cosas más, con costos medidos:

- **Entrar a Pipeline en un repo cuesta ~3 s de pantalla de carga.** `openspec list --json` tarda
  1271 ms y `validate --strict` 1705 ms, cada uno un `cmd.exe → node → openspec`. `RepoMainView`
  keyea `PipelineWorkspace` por repo, así que cambiar de repo remonta y da carga completa. No es un
  cuelgue —se llega a `no-pipeline`—, pero se percibe como tal.
- **Heartbeat de `git status` cada 2 s** (`hooks/use-repo-loader.ts:656`), 108 ms por invocación,
  mientras la ventana esté enfocada, en cualquier vista. Su propio comentario lo declara red de
  seguridad redundante con chokidar.
- **`useRepoLoader` monta su effect de watching una vez por consumidor, y hay ocho.** La consola
  declara `MaxListenersExceededWarning: 11 repo:fs-change listeners added` y lo mismo para
  `repo:commits-changed`. Cada instancia suscribe ambos eventos y arranca **su propio** intervalo de
  2 s, así que un cambio de archivo dispara once `refreshStatus` —once `git status` sin deduplicar,
  porque ese canal no tiene el `inFlight` que sí tiene Pipeline— y un commit dispara once veces
  `refreshLog` + `refreshStatus` + `refreshBranches`. Los consumidores son `app/page.tsx`,
  `use-auto-fetch`, los cuatro `hooks/git-actions/*`, `BranchFilterDropdown` y el propio
  `ChronometricGraph`. Es el hallazgo de mayor impacto de la sesión y no se atacó acá.

Se verificó que el refresco de Pipeline **no** corre fuera de su tab: `refreshAndPush` sale por la
guarda de suscriptores y `PipelineWorkspace` se desmonta al cambiar de tab. Y que el CLI de OpenSpec
no escribe ningún archivo vigilado, así que no hay bucle de retroalimentación con chokidar.

## Pendiente

Dos tareas quedan **sin marcar**, y ninguna la puede marcar un agente:

- `4.7 Ale confirma con la aplicación que el arrastre dejó de tironear`. Ningún test demuestra que un
  gesto se sienta bien.
- `4.8 Archivado confirmado por Ale desde la aplicación`, que marca el botón de archivar.
