# Leer una especificación consolidada desde la aplicación

**Change:** `read-specification-contents` · **Fecha:** 2026-08-07 · **Tareas:** 26/27 (falta la
validación visual de Ale)

## Qué se hizo

La barra lateral lista las especificaciones consolidadas como botones y, al abrir una, su contenido se
muestra en el centro con el markdown renderizado. El contenido se pide por un canal propio y no viaja en
el snapshot.

## La medición que cambió el diseño

La propuesta original decía sumar el contenido de cada `openspec/specs/<id>/spec.md` al snapshot, "como
ya hace con los artefactos de un change". Antes de escribir código se midió qué pesaba eso:

| | |
|---|---|
| Especificaciones | 15 archivos |
| Peso total | **145 KB** |
| La más grande, `pipeline-guided-workflow` | **84,9 KB** |

El snapshot se rearma en cada refresco y el watcher refresca con cada guardado de archivo. Ese peso se
pagaría continuamente por un contenido que casi nunca se mira y que sólo cambia al archivar un cambio.
Este panel ya tuvo que corregir el costo de su refresco una vez; reintroducirlo sabiéndolo habría sido
peor que la primera.

Así que el contenido se lee bajo demanda. **Costo del refresco: cero.** Hay una prueba que fija que la
evidencia de especificaciones del snapshot sigue sin campo de contenido, para que no vuelva por
descuido.

## Lo que también se descartó

**Transportar sólo la especificación seleccionada**, que es el patrón que ya usan los artefactos de un
cambio y de un archivado. Acota el peso al que de verdad se mira y habría sido lo más parecido a lo
existente. Se descartó por lo que cuesta enchufarlo: la selección tendría que viajar al proceso
principal como parámetro nuevo, tocando `pipeline:get-snapshot`, la suscripción, la clave de caché
—hoy `repoPath + selectedChangeId`— y la re-suscripción al cambiar de especificación. Mucha plomería
para un contenido que no necesita seguir al árbol de trabajo.

La lectura puntual no inventa un patrón: `pipeline:archive-plan` y `pipeline:runtime:history` ya
resuelven así lo que hace falta en un momento y no en cada refresco.

## Seguridad: identificador, no ruta

El canal recibe el identificador de la especificación y **no** el `sourceRef` que el snapshot ya expone,
aunque eso hubiera sido más directo. Aceptar una ruta armada por el renderer es exactamente lo que la
invariante del proyecto no permite. El identificador se valida contra `/^[a-z0-9][a-z0-9-]*$/` —el mismo
alfabeto que el lector ya exige al listar—, la ruta se compone del lado del principal y se resuelve
contenida al repositorio, con un tope de 512 KB.

Hay pruebas de que `../../etc`, `..`, `a/../../b` y `/absoluto` se rechazan **sin llegar a resolver el
repositorio**: el corte ocurre antes de tocar disco.

## Tres estados, no dos

La respuesta distingue contenido leído, archivo vacío y fallo. Un archivo vacío es un dato real del
repositorio y se declara como tal; un fallo informa el motivo que dio el lector —`missing`, `rejected`,
`too-large`— sin normalizarlo, porque no existir y superar el límite no son el mismo problema.

## Un detalle que impuso el linter, y mejoró el código

La primera versión marcaba el estado de carga dentro del efecto, y el linter lo rechaza por los renders
en cascada. La corrección fue derivar el estado de la identidad de la especificación en vez de marcarlo:
lo cargado viaja junto al identificador al que corresponde, y "cargando" es simplemente que todavía no
coincidan. De paso resuelve gratis el caso de cambiar de especificación mientras la anterior viaja:
hasta que llega la que corresponde se ve la carga, nunca el contenido de otra.

## El defecto que apareció al probarlo

La primera versión de la vista usaba `flex: 1 1 auto; min-height: 0`. Con una especificación corta se
veía bien; con `pipeline-guided-workflow` —la de 84,9 KB— el markdown pasaba **por detrás** de la franja
de evidencia, que quedaba cortada a media pantalla con texto atravesándola. Ale lo vio al abrirla.

La causa estaba escrita en el propio CSS del panel: `.center` declara que es el único que scrollea, y
las demás vistas usan `flex: 0 0 auto` para tomar su altura natural y **empujar** lo de abajo. Con
`1 1 auto` la vista se encogía al alto disponible y su contenido desbordaba sin mover nada. Corregido al
patrón que el panel ya tenía.

Es un defecto que ninguna prueba iba a encontrar: jsdom no calcula layout, y sólo se manifiesta con un
documento largo de verdad.

## El segundo defecto que apareció probando

Con una especificación abierta, tocar un cambio o un archivado en la barra lateral no la cerraba: el
centro seguía mostrando la especificación mientras la barra marcaba lo recién elegido, y la única salida
era "ver el repositorio". La barra lateral parecía no responder.

La causa es que la especificación abierta y el cambio seleccionado compiten por el centro, y sólo una de
las dos se limpiaba. Ahora elegir un cambio —o abrir un artefacto, que es el otro camino que ocupa el
centro— cierra la especificación. Queda fijado con una prueba.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **105 archivos / 769 tests**, verde en **tres corridas
completas** —dos antes de la corrección de layout y una después—, con la salida capturada entera en las
tres. Son dos archivos y diez tests más que la base de
103/759, exactamente los agregados. Lint limpio sobre los nueve archivos tocados.
`openspec validate read-specification-contents --strict` válido.

## Lo que no se midió

No se midió cuánto tarda en abrirse la especificación más grande. Se sabe que pesa 84,9 KB y que es una
sola lectura de disco; si se nota demora, el visor ya reserva el espacio y muestra el estado de carga.

Tampoco se resuelve que el contenido quede viejo si alguien archiva un cambio con una especificación
abierta: se relee al volver a abrirla. Atarlo al watcher sería el costo que este diseño evita, y el caso
es infrecuente.
