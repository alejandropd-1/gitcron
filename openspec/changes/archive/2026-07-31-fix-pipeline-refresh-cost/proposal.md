## Why

Con la solapa Pipeline abierta, **guardar cualquier archivo del repositorio dispara ~9 segundos
de trabajo en el proceso main y cuatro procesos hijo**. El watcher notifica, `RepoEvidenceReader`
recorre *todos* los changes activos y por cada uno invoca `openspec validate --strict` como
subproceso (medido: 2,4 s cada uno; 8,84 s los cuatro de este repo, en secuencia). Ninguna vista
consume la validación de un change que no sea el seleccionado, así que tres cuartos de ese costo
no alimentan nada.

Además el refresco no tiene control de concurrencia: como el debounce del watcher es de 250 ms y
la lectura tarda segundos, dos guardados seguidos apilan lecturas superpuestas, cada una con su
tanda de subprocesos. Y el refresco que dispara el watcher pierde la selección manual de change,
revirtiendo en cada guardado el arreglo que introdujo `fix-openspec-artifacts-selection`.

## What Changes

- La validación con `openspec validate --strict` SÓLO corre para el change seleccionado. Los
  demás changes activos reportan `validation: 'unknown'` —que ya es su valor honesto cuando no
  se los validó— en lugar de pagar un subproceso por cada uno.
- El refresco de Pipeline coalesce pedidos concurrentes idénticos (mismo repo y misma selección)
  sobre una única lectura en vuelo, en vez de ejecutar una por llamador.
- El refresco disparado por el watcher conserva la última selección manual conocida del repo, y
  agenda una relectura de cola si llegaron cambios mientras había una lectura en vuelo, para no
  perder evidencia.
- **No** cambia el contrato IPC: `pipeline:get-snapshot`, `pipeline:subscribe` y
  `pipeline:unsubscribe` conservan su firma y su forma de respuesta.

## Capabilities

### New Capabilities

Ninguna. El cambio acota el costo y corrige la propagación de un comportamiento ya especificado.

### Modified Capabilities

- `pipeline-repo-evidence`: se acota el alcance de la validación por CLI al cambio seleccionado,
  en línea con el criterio ya vigente para el contenido de artefactos.
- `pipeline-state-replay`: la suscripción recuerda la selección manual para que el snapshot
  emitido por el watcher no revierta a la selección automática, y el refresco declara su
  comportamiento ante pedidos concurrentes.

## Impact

- `electron/pipeline/repo-evidence-reader.ts` — alcance de `validateOpenSpecChange`.
- `electron/ipc/pipeline.ts` — coalescing, memoria de selección por repo, relectura de cola.
- `electron/__tests__/pipeline-ipc.test.ts` y los tests del reader — cobertura de lo anterior.
- Sin dependencias nuevas. Sin cambios en el renderer, en el esquema de SQLite ni en i18n.
- Fuera de alcance explícito: la barra de pasos de `OpenSpecDashboard` (change propio), el botón
  de archivado explícito (change propio) y los tres runtimes pendientes.
