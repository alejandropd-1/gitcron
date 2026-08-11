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
