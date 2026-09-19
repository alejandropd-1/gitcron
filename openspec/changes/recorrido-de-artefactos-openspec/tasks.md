## 1. Maquetación del cuerpo SDD para cualquier pantalla

- [ ] 1.1 Declarar `--sdd-body-width` en la raíz del dashboard (`components/pipeline/OpenSpecDashboard.module.css`, `.dashboard` :72) con valor base 820 px y una container query hacia arriba (`@container (min-width: 1400px)`) que lo suba al valor que se decida en pantalla con Alejandro (punto de partida 1100 px). Todo bloque que hoy declara `max-width: 820px` (`.changeHeader` :234, `.center`/`.startBody` :1390, `.skeletonCenter` :4346) pasa a consumir la variable, con relleno lateral propio de `var(--space-5)` como mínimo.
- [ ] 1.2 Que ningún panel del cuerpo se dibuje más ancho que el cuerpo: el panel «Confirmar archivado» (`OpenSpecDashboard.tsx` ~2599) y cualquier otro que hoy escape de la columna pasan a la misma variable. El encabezado pegajoso (`.changeHeader`) cubre el ancho del cuerpo con fondo opaco.
- [ ] 1.3 Despegar el riel flotante del encabezado: `.switcherRail` (:2981) con `top` igual a la altura del encabezado más `var(--space-4)`, y el mismo espacio como margen superior en reposo. Sin tocar su ancho ni su plegado.
- [ ] 1.4 Pruebas en `components/pipeline/__tests__/pipeline-sdd-body-layout.test.tsx` (hoy 21): encabezado, cuerpo, panel de archivado y esqueleto comparten el ancho; con contenedor de 1400 px o más el ancho es mayor que el base; el riel queda separado del encabezado. Sin bordes nuevos (escáner `commit-graph-frame.test.tsx`); escala visual (`lib/__tests__/visual-scale-scan.test.ts`).
- [ ] 1.5 Alejandro mira en el monitor de 32" y en el portátil y fija el valor del ancho. **La marca Alejandro.**

## 2. Un vigilante que no traba a nadie

- [ ] 2.1 En `electron/ipc/watchers.ts`, reemplazar chokidar por un envoltorio propio sobre `fs.watch(root, { recursive: true, persistent: true })`: filtro `createRepoIgnoreFilter` sobre la ruta relativa de cada evento; estabilización de escrituras agrupando eventos del mismo archivo durante 200 ms; misma interfaz (`close()` y suscripción a eventos) que consumen `electron/ipc/git-ops.ts` y el pipeline. `withRepoWatcherPaused` sigue cerrando y rearmando. Sin dependencias nuevas; chokidar sale de `package.json` si no lo usa nadie más (medir con grep).
- [ ] 2.2 Pruebas en `electron/__tests__/` (las de `watchers` y las de git-ops que consumen eventos, hoy en verde): un cambio en un archivo produce un evento; un archivo ignorado no; una ráfaga de escrituras del mismo archivo produce un solo evento estabilizado; y la prueba de sabotaje del renombre: con la observación activa sobre un repositorio temporal, renombrar una carpeta desde fuera **funciona** (con chokidar falla: pegar en el reporte la salida de la prueba sobre el código viejo).
- [ ] 2.3 Verificación real: con GitCron abierto sobre este repositorio, `openspec archive` de un change de sonda desde una terminal y un renombre de carpeta desde el Explorador funcionan. **La marca Alejandro.**

## 3. El grafo de artefactos tal como lo devuelve el motor

- [ ] 3.1 Canal IPC de sólo lectura que, para un cambio, devuelve la lista de artefactos con lo que trae `openspec instructions <artefacto> --change <id> --json` de cada uno (`description`, `dependencies`, `unlocks`, `resolvedOutputPath`, `existingOutputPaths`) y el estado de `openspec status --json`. Rutas validadas como el resto de los canales; sin escritura. Las dos superficies se suman a `consumedSurfaces` del análisis de versión (`electron/pipeline/openspec-version-analysis.ts:235-285`).
- [ ] 3.2 Vista del grafo en `components/pipeline/`: una línea temporal con nodos unidos por una línea, ordenados por dependencias (un nodo después de los que lo desbloquean), con estado, descripción y ruta de salida por nodo. Mirar antes el intento rechazado (commit `2218586` de `change/remaquetar-cuerpo-de-sdd`, una fila de fichas) para no repetirlo. Ningún texto a mano; un campo ausente no se rellena; un motor que falla muestra el fallo.
- [ ] 3.3 Desde un artefacto habilitado, disparar su operación con el lanzador existente (`PipelineRuntimeLauncher.tsx`), mostrando antes `existingOutputPaths`; un artefacto bloqueado no ofrece acción y muestra qué lo bloquea. Sin orden obligatorio.
- [ ] 3.4 Pruebas contra JSON real del CLI 1.13 guardado como fixture (`electron/__tests__/`): la vista refleja el grafo devuelto y no uno derivado; bloqueado sin acción y con causa; fallo del motor sin grafo vacío; salida existente mostrada antes de disparar.
- [ ] 3.5 Alejandro aprueba la forma de la línea temporal en pantalla. **La marca Alejandro.**

## 4. La conversación que abre un cambio, con cara de aplicación

- [ ] 4.1 `components/pipeline/PipelineNewChangeFlow.tsx` pasa a un recorrido de pasos (explorar, proponer, aplicar, archivar): cada paso dice dónde está la persona, qué contestó el motor (la salida del runtime tal como llega, en el lugar que `explicar-el-ciclo-sin-tecnicismos` decida cómo redactar) y qué sigue. Un paso que el motor no expone se declara, no se simula. El lanzador sigue siendo el único que abre procesos; nada corre sin confirmación.
- [ ] 4.2 Pruebas en `components/pipeline/__tests__/` (hoy `pipeline-openspec-init-flow.test.tsx` 5 y las del flujo nuevo): un paso con salida del motor se marca hecho y presenta el siguiente; un paso no expuesto se declara; ninguna operación corre sin confirmar.
- [ ] 4.3 Alejandro recorre la apertura de un cambio de sonda de punta a punta. **La marca Alejandro.**

## 5. Decisión sobre el escáner de bordes

- [ ] 5.1 Medir y presentar: cuántas excepciones tiene hoy `allowedPatterns` en `components/__tests__/commit-graph-frame.test.tsx`, cuántas se agregaron por pantalla desde el 2026-09-07, y las tres salidas (seguir por lista; invertir el criterio prohibiendo el borde sólo en contenedores de maqueta; retirarlo). **La decide Alejandro**, y la decisión se escribe acá antes de tocar el archivo.
- [ ] 5.2 Aplicar la decisión escrita, con sus pruebas.

## 6. Cierre y validación

- [ ] 6.1 `pnpm build` en cero antes de las pruebas (`font-size-as-color` lee de `out/`).
- [ ] 6.2 `pnpm exec tsc --noEmit` sin errores de tipado; eslint sin avisos nuevos (los tres errores preexistentes de `set-state-in-effect` en `OpenSpecDashboard.tsx` y `OpenSpecInspector.tsx` no se arreglan ni se silencian en este cambio).
- [ ] 6.3 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 6.4 `openspec validate recorrido-de-artefactos-openspec --strict` en cero; `git diff --check` en cero; `git status --short --branch` informado, sin confirmar nada en Git.
- [ ] 6.5 Revisión visual y funcional en la aplicación. **La marca Alejandro.**
