## Why

El cambio `gestionar-ciclo-openspec-desde-gitcron` (archivado el 2026-09-18) dejó el ciclo OpenSpec
manejable desde GitCron: instalar y actualizar el motor, la integración por agente, el perfil de
workflows, el informe de versión y la configuración en el centro. Al cerrarlo quedaron cuatro cosas
medidas que no entraban en él y que hoy se ven todos los días:

- **El cuerpo SDD no se adapta a pantallas grandes.** Alejandro lo miró en un monitor de 32" el
  2026-09-18: una columna de 820 px en el medio de un área enorme. Medido: `max-width: 820px` en el
  encabezado del cambio (`OpenSpecDashboard.module.css:234`), en el cuerpo (`:1390`) y en el esqueleto
  de carga (`:4346`); sólo hay reglas para achicarse (1180 y 860 px), ninguna para crecer, y el
  cuerpo no tiene relleno lateral propio. Dos consecuencias visibles: el riel flotante toca el borde
  inferior del encabezado (`.switcherRail`, `:2981`, `top: var(--space-5)`), y al scrollear el
  encabezado pegajoso (820 px) se superpone al panel «Confirmar archivado», que es más ancho: dos
  anchos distintos para el mismo cuerpo.
- **GitCron traba a los demás.** Su vigilante de repositorio es `chokidar 4.0.3`
  (`electron/ipc/watchers.ts:88`), que en Windows abre un `fs.watch` por cada carpeta, sin
  `recursive` (`chokidar/handler.js:120-130`): miles de handles. Mientras GitCron observa un repo,
  ningún otro programa puede renombrar sus carpetas (ni `openspec archive` desde una terminal, ni
  VS Code, ni un `git checkout` que mueva directorios). VS Code observa con un solo handle recursivo
  en la raíz y por eso nunca traba a nadie. Node 22 / Electron 42 ya soporta
  `fs.watch(root, { recursive: true })` en Windows (probado en esta máquina el 2026-09-18).
- **El recorrido de los artefactos de un cambio no existe.** La aplicación muestra por artefacto
  un estado binario (una fila de píldoras HECHO) que no dice qué corresponde hacer ahora ni por qué,
  mientras el motor ya devuelve el grafo completo: `openspec instructions <artefacto> --change <id>
  --json` (estado, descripción, dependencias, qué desbloquea, dónde escribe) y `openspec status
  --json`. Alejandro pidió el 2026-09-04 la forma: **una línea temporal con nodos unidos**, como la
  de Cronometric, y rechazó una fila de fichas (commit `2218586` de `change/remaquetar-cuerpo-de-sdd`).
- **La conversación que abre un cambio sigue siendo un formulario.** El CLI ya tiene una rutina
  (`/opsx:explore` pregunta y propone un camino; `/opsx:propose` crea el cambio y declara qué
  artefacto escribió; `/opsx:apply` tilda; `/opsx:archive` cierra y dice adónde quedó). Alejandro
  pidió el 2026-09-07 que eso se muestre «con una interfaz linda y amena» en GitCron: un recorrido
  donde cada paso dice dónde está parado, qué contestó el motor y qué sigue. Punto de partida:
  `components/pipeline/PipelineNewChangeFlow.tsx`, que ya hace la primera pregunta.

Y una decisión pendiente que sólo puede tomar Alejandro: el escáner de bordes
(`components/__tests__/commit-graph-frame.test.tsx`) llegó a más de 80 excepciones y crece con cada
pantalla; un guardián cuya lista crece con cada uso deja de detener y pasa a documentar.

## What Changes

- **Maquetación del cuerpo SDD para cualquier pantalla.** Un solo ancho de contenido para todo el
  cuerpo (encabezado, paneles, lista, esqueleto), derivado del contenedor: crece en pantallas anchas
  y lleva relleno lateral propio. El encabezado pegajoso cubre el ancho del cuerpo con fondo opaco;
  el riel flotante queda separado del encabezado.
- **Un vigilante que no traba a nadie.** El vigilante de repositorio pasa a un único handle
  recursivo en la raíz, conservando el filtro de ignorados, la estabilización de escrituras y la
  cadencia adaptativa de git-ops. Sin dependencias nuevas.
- **El grafo de artefactos tal como lo devuelve el motor.** Para cada artefacto: estado,
  descripción, de qué depende, qué desbloquea y dónde va a escribir. Desde un artefacto habilitado se
  dispara su operación con los `existingOutputPaths` a la vista; un artefacto bloqueado no ofrece
  acción y muestra qué lo bloquea; un motor que falla no dibuja un grafo vacío. Forma: línea
  temporal con nodos unidos.
- **La conversación que abre un cambio, con cara de aplicación.** Un recorrido de pasos que muestra
  lo que el CLI devuelve y declara lo que no; nada de pasos inventados. Las palabras de cada paso
  las decide `explicar-el-ciclo-sin-tecnicismos`; este cambio decide el recorrido y su forma.
- **Decisión sobre el escáner de bordes.** Se registra la decisión de Alejandro: seguir con la
  lista, expresar el criterio de otra forma (prohibir el borde sólo en contenedores de maqueta), o
  retirarlo. No se toca el escáner hasta que la decisión esté escrita.

## Capabilities

### New Capabilities

- `openspec-artifact-graph`: el grafo de artefactos de un cambio, presentado y accionable desde
  GitCron, con la forma de línea temporal con nodos.
- `change-opening-journey`: la conversación que abre un cambio como recorrido de pasos.

### Modified Capabilities

- `sdd-body-layout`: el ancho del cuerpo se deriva del contenedor y lleva relleno; el encabezado
  pegajoso y el riel flotante respetan ese ancho.
- `repo-watch-lifecycle`: una sola observación por repositorio pasa a ser un solo handle recursivo
  en la raíz; renombrar carpetas desde otro programa mientras GitCron observa funciona.

## Impact

- `components/pipeline/OpenSpecDashboard.module.css` (anchos, encabezado, riel, esqueleto),
  `components/pipeline/PipelineEmptyState.tsx`.
- `electron/ipc/watchers.ts` y sus pruebas; consumidores de eventos en `electron/ipc/git-ops.ts` y
  el pipeline.
- Vista nueva del grafo de artefactos en `components/pipeline/` y su canal IPC de lectura
  (`openspec instructions --json`, `openspec status --json`), sólo lectura hasta que la persona
  dispare una operación.
- `components/pipeline/PipelineNewChangeFlow.tsx` y `PipelineRuntimeLauncher.tsx`.
- Sin dependencias nuevas. Sin cambios en `openspec/config.yaml`.
