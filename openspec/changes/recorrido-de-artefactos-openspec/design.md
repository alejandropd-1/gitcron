## Context

Todo lo que este cambio toca ya está medido en el repositorio; no hay hipótesis abiertas sobre las
causas, sólo decisiones de forma.

- El cuerpo SDD vive en `components/pipeline/OpenSpecDashboard.module.css` con tres anchos
  independientes de 820 px (encabezado `.changeHeader` :224-234, cuerpo `.center`/`.startBody`
  :1390, esqueleto `.skeletonCenter` :4346) y container queries sólo hacia abajo (:1828, :1832). El
  panel «Confirmar archivado» (`OpenSpecDashboard.tsx` ~2599) no usa ese ancho: por eso asoma a los
  costados del encabezado pegajoso al scrollear. El riel flotante `.switcherRail` (:2981) es
  `position: sticky; top: var(--space-5)` y se apoya contra la línea inferior del encabezado.
- El vigilante de repositorio (`electron/ipc/watchers.ts:88`) es chokidar 4.0.3 con `ignored`
  (`createRepoIgnoreFilter`), `ignoreInitial`, `persistent` y `awaitWriteFinish` de 200 ms. Chokidar
  4 en Windows abre un `fs.watch` por directorio, sin `recursive`. `withRepoWatcherPaused` cierra y
  vuelve a armar el vigilante alrededor de operaciones que mueven carpetas. Los eventos alimentan la
  cadencia adaptativa de `electron/ipc/git-ops.ts` (~:270) y las relecturas del pipeline. La spec
  `repo-watch-lifecycle` ya exige una sola observación por repositorio y la limpieza al cerrar.
- El motor devuelve el grafo de artefactos: `openspec instructions <artefacto> --change <id> --json`
  trae `description`, `dependencies`, `unlocks`, `resolvedOutputPath` y `existingOutputPaths`;
  `openspec status --json` trae el estado de cada artefacto. El diseño archivado en
  `2026-09-18-gestionar-ciclo-openspec-desde-gitcron/design.md` ya documenta que duplicar eso en
  GitCron costó ocho reglas repetidas de dieciséis.
- `PipelineNewChangeFlow.tsx` compone un `/opsx:propose` a partir de campos con nombre y lo entrega
  al lanzador (`PipelineRuntimeLauncher.tsx`, `pipelineRuntime.start`), único que abre procesos.

## Goals / Non-Goals

**Goals**

- Un solo ancho de contenido para el cuerpo SDD, derivado del contenedor, con relleno lateral.
- Que GitCron observe un repositorio sin impedir que otros programas renombren sus carpetas.
- Que la pantalla de un cambio muestre el grafo de artefactos del motor y permita actuar desde él.
- Que abrir un cambio sea un recorrido de pasos con lo que el motor contesta.
- Dejar escrita la decisión de Alejandro sobre el escáner de bordes.

**Non-Goals**

- Cambiar las palabras de cada paso del recorrido: las decide `explicar-el-ciclo-sin-tecnicismos`.
- Invocar workflows de agente desde GitCron (revisión del alcance, sincronización con propuesta):
  siguen fuera hasta que exista un ejecutor de workflows.
- El widget de IA y la sesión de IA compartida: van en `modelos-en-casa`.
- Hacer seleccionable el resto de la aplicación fuera del cuerpo SDD.

## Decisions

**Un ancho, una variable.** El cuerpo declara `--sdd-body-width` en la raíz del dashboard y todos
los bloques (encabezado, cuerpo, paneles, esqueleto) la consumen. Valor base 820 px; por container
query hacia arriba (`@container (min-width: 1400px)`) sube a un valor mayor decidido en pantalla con
Alejandro (punto de partida: 1100 px), siempre con relleno lateral propio (`var(--space-5)` mínimo)
para que el contenido no toque nunca los bordes del contenedor. Alternativa descartada: ancho
fluido al 100 %; las líneas de texto largas se leen peor, y Alejandro pidió «adaptarse mejor», no
«ocupar todo».

**El encabezado pegajoso cubre el cuerpo.** El encabezado sigue pegajoso, pero su fondo opaco
ocupa el ancho del cuerpo (la misma variable) y ningún panel del cuerpo se dibuja más ancho que el
cuerpo. Con eso el panel de archivado deja de asomar. Alternativa descartada: hacerlo no pegajoso;
el encabezado es la referencia de dónde se está parado al scrollear una lista larga de tareas.

**El riel se despega.** `.switcherRail` recibe un `top` que suma la altura del encabezado más un
espacio (`var(--space-4)`), y el mismo espacio como margen superior cuando no está pegado. Sin
tocar su ancho de 240 px ni su plegado animado.

**Un solo handle recursivo.** `createWatcherInstance` deja chokidar y usa
`fs.watch(root, { recursive: true, persistent: true })` (Node 22 / Electron 42 en Windows, probado).
Se conserva, como envoltorio propio y pequeño: el filtro `createRepoIgnoreFilter` aplicado sobre la
ruta relativa de cada evento; la estabilización de escrituras (agrupar eventos del mismo archivo
durante 200 ms antes de emitir); y la misma interfaz (`close()`, `on('all')` o equivalente) que hoy
consumen git-ops y el pipeline, para que ningún consumidor cambie. Alternativa descartada:
`@parcel/watcher` (dependencia nueva, prohibida por la regla vigente). Riesgo conocido: Windows
puede perder eventos en ráfagas grandes bajo el modo recursivo; el temporizador de respaldo de
git-ops (spec `repo-watch-lifecycle`, «ajusta su cadencia») sigue cubriendo ese caso, y así se
declara en la spec.

**El grafo se lee, no se deriva.** Un canal de sólo lectura devuelve, por cambio, la lista de
artefactos con lo que trae `openspec instructions --json` de cada uno y el estado de
`openspec status --json`. La vista dibuja exactamente eso: una línea temporal con nodos unidos,
ordenados por dependencias (un nodo después de los que lo desbloquean). Un campo ausente no se
rellena. Un motor que falla muestra el fallo, nunca un grafo vacío. La operación de un artefacto
habilitado se dispara con el lanzador existente, mostrando antes `existingOutputPaths` para que
sobrescribir nunca sea silencioso. Sin orden obligatorio: se ofrece lo que el motor declara
habilitado.

**El recorrido reemplaza al formulario, sin inventar pasos.** `PipelineNewChangeFlow` pasa a ser una
secuencia de pasos: cada paso muestra dónde se está, qué contestó el motor (la salida del runtime,
tal como llega) y qué sigue. Los pasos son los de la rutina del CLI (explorar, proponer, aplicar,
archivar); si el motor no expone uno, el paso lo declara en vez de simularlo. El lanzador sigue
siendo el único que abre procesos.

**El escáner de bordes se decide, no se parchea.** Se presenta a Alejandro la medición (cantidad de
excepciones hoy, cuántas se agregaron por pantalla desde el 2026-09-07) y tres salidas: seguir por
lista, invertir el criterio (prohibir el borde sólo en contenedores de maqueta, permitirlo en
controles, datos y tarjetas por selector), o retirarlo. La decisión se escribe en tasks.md antes de
tocar el archivo.

## Risks / Trade-offs

- **Eventos perdidos en modo recursivo.** Mitigación: el temporizador de respaldo existente y una
  prueba que fuerza una ráfaga y verifica que el estado converge.
- **Consumidores acoplados a la forma de los eventos de chokidar.** Mitigación: el envoltorio
  conserva la interfaz y las pruebas de git-ops y del pipeline corren sin cambios.
- **Un ancho mayor cambia cómo se ven las listas largas.** Mitigación: el valor final se decide en
  pantalla con Alejandro en el monitor de 32" y en el portátil.
- **El grafo depende de la forma del JSON del motor.** Mitigación: las superficies consumidas se
  suman a `consumedSurfaces` del análisis de versión, para que un cambio de forma en una versión
  nueva se detecte antes de actualizar.

## Migration Plan

1. Maquetación (grupo 1) y vigilante (grupo 2) primero: son independientes del motor y se ven de
   inmediato.
2. Grafo de artefactos (grupo 3) sobre el canal de lectura, con pruebas contra JSON real del CLI.
3. Recorrido (grupo 4) sobre el lanzador existente.
4. Decisión del escáner (grupo 5) cuando Alejandro la tome; el archivo no se toca antes.

Sin migración de datos. Sin cambios de configuración.

## Open Questions

- Valor del ancho en pantallas anchas (punto de partida 1100 px): se decide mirando.
- Si el recorrido de apertura muestra la salida del runtime tal cual o resumida: lo decide
  `explicar-el-ciclo-sin-tecnicismos`; este cambio deja el lugar.
