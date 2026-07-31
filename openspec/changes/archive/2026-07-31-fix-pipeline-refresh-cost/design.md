# Design — Costo de refresco de Pipeline

## Context

El camino de refresco es: chokidar (debounce 250 ms) → `notifyPipelineRepoChanged` →
`PipelineService.refresh()` → `RepoEvidenceReader.read()` → reducer → SQLite → push por IPC.

Medido en este repositorio, con cuatro changes activos:

| Tramo | Costo |
|---|---|
| `openspec validate --strict` (uno) | 2,4 s |
| Los cuatro, en secuencia | 8,84 s |
| Lecturas de disco (33 reportes + 10 specs + artefactos) | decenas de ms |
| Blob persistido en SQLite | ~78 KB |

El dominante es el CLI por un margen enorme. En Windows cada invocación es
`cmd.exe → node → openspec` (`shell: true`, obligado por CVE-2024-27980 con `openspec.cmd`),
así que el costo real en la app es al menos el medido.

`RepoEvidenceReader.read()` recorre los changes activos con un `for` y hace `await` adentro: las
validaciones son estrictamente secuenciales. Se verificó que ningún consumidor del renderer lee
`validation` de un change que no sea el seleccionado —`lifecycle()`, el panel de evidencia y
`derivePipelineNextAction` usan siempre `selectedChange.validation`—, así que tres de las cuatro
invocaciones no alimentan nada visible.

## Goals / Non-Goals

**Goals**

- Que el refresco pague una sola validación, la del change seleccionado.
- Que pedidos concurrentes idénticos no multipliquen la lectura.
- Que el snapshot emitido por el watcher conserve la selección manual.
- Que ninguna evidencia observada se pierda por el control de concurrencia.

**Non-Goals**

- No se toca la barra de pasos (`lifecycle()` en `OpenSpecDashboard`): es un change propio.
- No se toca el botón de archivado ni el trato de sesiones persistidas: change propio.
- No se cambia el contrato IPC ni la firma de `pipeline:*`.
- No se paraleliza la validación: el objetivo es no hacer el trabajo, no hacerlo más rápido.
- No se introduce caché con TTL ni invalidación por mtime. Sería otra fuente de verdad que
  mantener; acotar el alcance ya rinde el 75 % sin agregar estado.

## Decisions

### 1. Validar sólo el change seleccionado, con la guarda donde ya está la de artefactos

`read()` ya decide `changeId === selection.changeId` para poblar `artifacts`. La validación pasa
a usar exactamente esa misma condición, en el mismo lugar. Un change no seleccionado queda en
`'unknown'`.

*Alternativa descartada:* validar todos en paralelo con `Promise.all`. Bajaría 8,8 s a ~2,5 s
pero dispararía cuatro `cmd.exe` simultáneos por cada guardado de archivo, y seguiría pagando
trabajo que nadie mira. Hacer menos es mejor que hacer lo mismo más rápido.

*Alternativa descartada:* cachear el resultado por `changeId` + mtime del directorio. Agrega una
fuente de verdad y una política de invalidación para ahorrar sobre un costo que, acotado, ya es
de una sola invocación.

**Honestidad del dato:** `'unknown'` es el valor correcto para un change no validado —es el que
el propio CLI wrapper devuelve cuando no pudo ejecutarse—, no un default optimista. No se afirma
`passed` sin respaldo.

### 2. Coalescing por clave `repoPath + selección`

En `registerPipelineHandlers`, un `Map<string, Promise<Result>>` indexado por
`` `${repoPath}\0${selección ?? ''}` ``. Un pedido cuya clave ya está en vuelo se resuelve con la
promesa existente en lugar de arrancar otra lectura.

Esto resuelve de paso el doble refresco del renderer: `PipelineWorkspace` dispara
`pipelineGetSnapshot` y `pipelineSubscribe` casi simultáneamente con la misma selección, y hoy
cada uno paga una lectura completa. Con la clave compartida, pagan una.

*Alternativa descartada:* sacarle el refresco a `pipeline:subscribe` para que sólo registre. Es
más directo pero cambia la forma de la respuesta del canal y obliga a tocar sus tests y el
contrato; el coalescing consigue el mismo ahorro sin mover el contrato, que es lo que se quiere
en un change de performance.

La clave incluye la selección a propósito: dos pedidos con selecciones distintas producen
snapshots distintos y no pueden compartir resultado.

### 3. Selección recordada por repo, y relectura de cola

`subscriptions` pasa de `Map<string, Set<number>>` a una estructura que además guarda la última
selección informada para ese repo. `pipeline:subscribe` ya recibe `selectedChangeId` y el
renderer re-suscribe cuando la selección cambia (el effect tiene `manualSelection` en sus deps),
así que el valor se mantiene al día sin protocolo nuevo.

El notificador del watcher usa esa selección en lugar de pasar `undefined`, que es lo que hoy
revierte a la selección automática por branch.

**Relectura de cola:** con debounce de 250 ms y lecturas de segundos, una notificación que llega
durante una lectura en vuelo no puede simplemente unirse a ella —esa lectura observó el disco
*antes* del cambio que la disparó—. Se marca el repo como sucio y, al resolver la lectura en
vuelo, se corre exactamente una relectura más. Un solo flag booleano: N notificaciones durante
un vuelo producen una relectura, no N.

*Alternativa descartada:* subir el debounce del watcher. Afectaría también el refresco del panel
de archivos sin tocar, que no tiene este problema y quiere ser inmediato.

## Risks / Trade-offs

- **Un change no seleccionado ya no muestra su validación** → Verificado que ningún consumidor la
  lee. Si en el futuro una vista quiere el estado de validación de la lista completa de changes,
  tiene que pedirlo explícitamente, no obtenerlo como efecto secundario del refresco.
- **El coalescing podría servir un snapshot marginalmente viejo a un pedido explícito** → La
  ventana es la duración de una lectura y sólo aplica a pedidos con selección idéntica emitidos
  mientras otro está en vuelo. La relectura de cola garantiza que el estado final observado sea
  el del disco.
- **La selección recordada es por repo, no por ventana** → GitCron tiene una sola ventana
  principal. Si alguna vez hubiera dos observando el mismo repo con selecciones distintas, la
  última suscripción gana. Se documenta como límite conocido y no se sobre-diseña por un caso
  que hoy no existe.
- **Riesgo de regresión en los tests de IPC** → Los tests existentes de `pipeline-ipc` cubren el
  registro de handlers y el ciclo de suscripción; se agregan casos y no se relajan los actuales.

## Migration Plan

No hay migración. No cambia el esquema de SQLite, ni el contrato IPC, ni ningún dato persistido.
Revertir el change es revertir el commit.

## Open Questions

Ninguna. El alcance quedó cerrado con la medición previa y con la verificación de consumidores
de `validation`.
