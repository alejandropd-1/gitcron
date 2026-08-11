# Diseño

## Qué se sabe y qué no

Lo verificado en el código, con archivo y línea:

- `electron/ipc/watchers.ts:12-19` — `IGNORED_PATTERNS` incluye `/(^|[/\\])\.git([/\\]|$)/`, y se pasa
  como `ignored` a `chokidar.watch` en la línea 42. El directorio `.git/` no se observa.
- `electron/ipc/watchers.ts:45` — ya hay `awaitWriteFinish` con `stabilityThreshold: 200`.
- `electron/ipc/watchers.ts:47-53` — ya hay un agrupado propio de 250 ms antes de emitir `repo:fs-change`.
- `hooks/use-repo-loader.ts:719-723` — el temporizador dispara cada 2.000 ms, condicionado a
  `document.visibilityState === 'visible' && document.hasFocus()`.

Lo medido, con el comando que lo produjo:

- `git status --porcelain` sobre este repositorio, 20 corridas: mediana **42 ms**, mínimo 33, máximo 66.
  A un disparo cada 2 s con la ventana enfocada, ~76 s de CPU por hora.

**Lo que NO está medido, y es la incógnita principal del cambio:** cuántos eventos por segundo genera
observar los caminos elegidos de `.git/` durante una operación que escribe mucho ahí. Un `checkout`
entre ramas distantes reescribe el index completo; un rebase lo reescribe una vez por commit. La
hipótesis es que el agrupado ya existente los absorbe, pero **es una hipótesis y hay que medirla antes
de dar el cambio por bueno**. Si resultara que no los absorbe, el ajuste va en la ventana de agrupado,
no en volver a ignorar `.git/`.

## Qué observar dentro de `.git/`

Una lista cerrada, no el directorio. Cada camino con qué declara:

| Camino | Qué cambió |
|---|---|
| `.git/index` | lo preparado: `git add`, `git reset`, y también un `checkout` |
| `.git/HEAD` | la rama vigente |
| `.git/MERGE_HEAD` | hay un merge en curso; su ausencia, que terminó |
| `.git/rebase-merge/`, `.git/rebase-apply/` | hay un rebase en curso |
| `.git/refs/heads/` | se movió una rama local: un commit propio o ajeno |

Queda deliberadamente afuera `.git/objects/` —donde Git escribe cada objeto nuevo, sin que ninguno
cambie por sí solo lo que la aplicación muestra—, `.git/logs/` y los archivos `*.lock`, que aparecen y
desaparecen alrededor de cada operación.

**Alternativa descartada:** observar `.git/` entero y filtrar los eventos al recibirlos. Es más simple
de escribir y traslada todo el costo al proceso principal, que igual tendría que despertar por cada
objeto escrito. La lista blanca hace que ese trabajo no exista en lugar de descartarlo después.

**Alternativa descartada:** sondear el `mtime` de `.git/index` en lugar de observarlo. Un `stat` es más
barato que un evento, pero sigue siendo un sondeo con la misma cadencia fija que este cambio quiere
retirar, y no informa nada de `HEAD` ni de los rebases sin sondear cada uno.

## La guardia previa

La comprobación barata antes de releer tiene dos candidatos y **la decisión queda para quien implemente**,
con la medición correspondiente:

1. **`mtime` e `ino` de `.git/index`.** Un `stat` cuesta microsegundos. Cubre staging, checkout y commit.
   No cubre editar un archivo del árbol de trabajo, porque eso no toca el index — pero eso ya lo informa
   chokidar por su lado, así que las dos señales se complementan y ninguna reemplaza a la otra.
2. **Una marca propia**, puesta por el observador cuando emite un evento y consumida por la relectura.
   No toca el disco, pero sólo sabe de lo que la aplicación misma vio.

Riesgo conocido del camino 1: la resolución del `mtime` en algunos sistemas de archivos de Windows es de
un segundo. Dos escrituras dentro del mismo segundo pueden dar el mismo valor, y ahí `ino` y el tamaño
ayudan pero no cierran del todo. **Por eso la guardia decide si se puede saltear una lectura, y nunca si
se puede ignorar un evento**: ante la duda, se lee.

### Decisión: `stat` de `.git/index`

Se eligió el **camino 1** — `fs.stat` de `.git/index`, comparando `mtimeMs`, `size` e `ino` contra la firma
de la última lectura exitosa. La medición sobre `.git/index` de este repositorio (1000 corridas):
mediana **16 µs**, p99 **23 µs**. Un `git status --porcelain` de referencia vale 42 ms en reposo y 74 ms
bajo carga (tarea 1.1): la guardia es entre **2.600× y 4.600×** más barata, y aun con el round-trip IPC
(~1 ms) sigue siendo **~50×** más barata. El camino 2 (marca propia del observador) no toca disco, pero
sólo sabe lo que la app misma vio: si chokidar pierde el evento, la marca no se pone y el latido se
quedaría sin disparar la relectura justo cuando más falta hace.

La firma del `index` cubre preparado, `checkout`, `commit`, `reset` y el inicio/fin de un merge o rebase:
todas esas operaciones reescriben el `index`. No cubre editar un archivo del árbol sin prepararlo — pero
eso no toca el `index` y ya lo informa chokidar por su lado; las dos señales se complementan.

**Interacción con el hallazgo EPERM.** Durante una operación masiva (checkout entre ramas distantes),
chokidar sufre una tormenta de `EPERM` sobre el árbol de trabajo y en una corrida emitió cero eventos
agrupados (tarea 1.2): ahí el observador del árbol se rompe y la app depende del latido. Justo en ese
momento el `index` **sí** está siendo reescrito, así que la guardia basada en `stat` **fuerza** la
relectura independientemente de chokidar. Es decir, la guardia refuerza —no debilita— el respaldo en el
caso en que chokidar falla. El caso residual no cubierto (una edición aislada del árbol que ni toca el
`index` ni es vista por chokidar) lo acota la cadencia adaptativa (sección siguiente): el escalón quieto
hace una lectura completa periódica, de modo que la staleness quede limitada y nunca sea indefinida.

La firma se pide por un IPC nuevo (`git:index-signature`) que resuelve el directorio git sin spawnear un
proceso (`revparse` es caro): si `<repo>/.git` es un directorio se usa directo; si es un archivo
(worktree) se lee su línea `gitdir:`. La guardia sólo la invoca el latido, nunca el camino disparado por
un evento de filesystem: un evento ya es prueba de cambio, y así los mocks de las pruebas existentes no
necesitan un binding nuevo.

## La cadencia adaptativa

Un esquema simple y suficiente: dos escalones, no una curva.

- **Activo** —hubo un evento hace menos de N segundos—: cadencia frecuente, del orden de la actual.
- **Quieto**: cadencia espaciada, del orden de decenas de segundos.

Cualquier evento devuelve el temporizador al escalón activo. Los números concretos los fija quien
implemente y los declara en el reporte; no se ponen acá porque no hay medición que los respalde
todavía, y escribir un número que nadie midió es exactamente lo que este proyecto viene corrigiendo.

**Lo que no se hace:** eliminar el temporizador. La condición de ventana enfocada y visible se conserva
tal cual: es lo que impide que la aplicación trabaje de fondo.

## Riesgos

- **Que observar `.git/` genere una tormenta de eventos** durante checkout o rebase. Mitigación: la
  ventana de agrupado que ya existe; medición obligatoria antes de cerrar. Si no alcanza, se sube la
  ventana.
- **Que la guardia saltee una lectura que hacía falta**, por resolución de `mtime`. Mitigación: la
  guardia sólo evita releer, nunca descarta un evento; ante cualquier duda se lee.
- **Que espaciar el temporizador tape un evento perdido por más tiempo.** Es real y es el precio
  buscado: se paga porque el estado de Git pasa a llegar por evento. Si el escalón quieto resultara
  demasiado largo en uso real, se acorta.
