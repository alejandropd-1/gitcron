## Decisión: lectura bajo demanda, no en el snapshot

El contenido de una especificación se pide por un canal propio cuando se abre, y no viaja en el
snapshot.

**Alternativa descartada: sumarlo al snapshot, como los artefactos de un cambio.** Era el plan escrito
en la propuesta original y tiene a favor la consistencia: hoy todo lo que el panel muestra llega por el
snapshot. Se descarta por una medición. Las especificaciones consolidadas de este repositorio pesan
**145 KB en quince archivos**, y una sola —`pipeline-guided-workflow`— pesa **84,9 KB**. El snapshot se
rearma en cada refresco y el watcher refresca con cada guardado de archivo, así que ese peso se pagaría
continuamente por un contenido que casi nunca se mira y que sólo cambia al archivar. Este panel ya tuvo
que corregir el costo de su refresco una vez; reintroducirlo con los ojos abiertos sería peor que la
primera.

**Alternativa descartada: transportar sólo la especificación seleccionada**, como se hace con los
artefactos del cambio y del archivado. Es el patrón más parecido a lo que ya existe y acota el peso al
que de verdad se mira. Se descarta por lo que cuesta enchufarlo: la selección tendría que viajar al
proceso principal como parámetro nuevo del snapshot, y eso toca el canal `pipeline:get-snapshot`, el de
suscripción, la clave de caché que hoy es `repoPath + selectedChangeId`, y la re-suscripción al cambiar
de especificación. Es mucha plomería para un contenido que no necesita refrescarse con el árbol de
trabajo: una spec consolidada cambia cuando se archiva un cambio, no cuando se guarda un archivo.

La lectura puntual no inventa un patrón: `pipeline:archive-plan` y `pipeline:runtime:history` ya
resuelven así lo que se necesita en un momento y no en cada refresco.

## Decisión: el identificador se valida, la ruta no viaja

El canal recibe el identificador de la especificación, no una ruta, y lo valida contra
`/^[a-z0-9][a-z0-9-]*$/` antes de componer la ruta, que además se resuelve contenida al repositorio.

**Alternativa descartada: recibir el `sourceRef` que el snapshot ya expone.** Es más directo —la vista
ya lo tiene— y evita recomponer la ruta. Se descarta porque aceptar una ruta armada por el renderer es
exactamente lo que la invariante de seguridad no permite: el proceso principal no recibe paths sin
validar. Recibir un identificador acotado a un alfabeto y componer la ruta del lado del main deja el
control donde tiene que estar. Es la misma validación que el lector ya aplica al listar
`openspec/specs`.

## Decisión: sin contenido no es lo mismo que vacío ni que fallo

La respuesta distingue tres casos: contenido leído, archivo que existe y está vacío, y lectura que
falló.

**Alternativa descartada: devolver cadena vacía en cualquier caso que no sea contenido.** Simplifica el
consumidor a una sola comprobación. Se descarta porque los tres piden respuestas distintas: un archivo
vacío es un dato real del repositorio, un fallo de lectura es algo que hay que reportar con su motivo, y
confundirlos deja al visor en blanco sin decir por qué. Es el mismo criterio por el que el resto de la
evidencia distingue `null` de vacío.

## Riesgo

**Una superficie de lectura nueva hacia el repositorio.** Mitigación: identificador validado contra un
alfabeto cerrado, ruta compuesta en el main y resuelta contenida, límite de tamaño explícito, y ninguna
escritura. No se acepta ninguna ruta que venga del renderer.

**El contenido puede quedar viejo respecto del disco.** Se lee al abrir, así que si alguien archiva un
cambio con la especificación abierta, lo que se ve queda desactualizado hasta volver a abrirla.
Mitigación: ninguna por ahora, y se declara. Refrescarlo exigiría atarlo al watcher, que es justamente
el costo que este diseño evita; el caso —archivar mientras se lee una spec— es infrecuente y no corrompe
nada.

## Sin medir

No se midió cuánto tarda leer la especificación más grande al abrirla. Se sabe que pesa 84,9 KB y que la
lectura es una sola de disco; si en el uso se nota una demora, el paso siguiente sería mostrar el estado
de carga que el visor ya usa para los artefactos de un archivado.
