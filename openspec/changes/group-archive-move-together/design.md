## Context

`fileOrigin(file)` (`lib/change-commit-scope.ts:70`) decide la procedencia mirando una ruta y nada
más. Eso alcanzaba mientras cada ruta se explicara sola, y deja de alcanzar para un archivado: el
origen —`openspec/changes/<id>/…`— y el destino —`openspec/changes/archive/<fecha>-<id>/…`— son
indistinguibles, ruta por ruta, de un cambio activo y de un resto de archivado cualquiera. Sólo
mirando el conjunto se ve que son el mismo movimiento.

La restricción que ordena el diseño es que la función tiene que seguir siendo pura y probable con
tablas de entrada y salida. Ese es el motivo por el que el alcance dejó de declararse en un
`commit.md` y pasó a derivarse, y no se degrada ahora para resolver un caso.

El nombre de la carpeta de archivado es `YYYY-MM-DD-<id>`, verificado contra las ocho carpetas
existentes en `openspec/changes/archive/`.

## Goals / Non-Goals

**Goals:**

Que las dos mitades de un archivado se ofrezcan juntas, de modo que preparar el grupo produzca un
commit donde Git detecte los renombres. Que el commit del archivado pueda nombrarse. Que un archivo
borrado de un cambio que no fue archivado siga perteneciendo a ese cambio.

**Non-Goals:**

Cambiar qué hace `openspec archive`. Mirar el estado de Git de cada archivo dentro de la derivación.
El ancho de los paneles de artefactos ni el grafo de OpenSpec.

## Decisions

**La pertenencia se resuelve contra el conjunto, no contra la ruta suelta.** `deriveRepoCommitScope`
calcula primero el conjunto de identificadores archivados presentes —los que aparecen en alguna ruta
bajo `archive/`— y recién entonces clasifica cada archivo. Un `openspec/changes/<id>/…` cuyo `<id>`
está en ese conjunto es la mitad borrada de un movimiento y va con la otra mitad.

Se descartó pasar el estado de Git de cada archivo —`deleted` frente a `untracked`— para reconocer las
mitades. Sería el dato más directo, pero obliga a la función a recibir la forma de `GitFile` y la
sacaría del terreno de las tablas de entrada y salida, que es la propiedad que hace que esta
derivación se pueda probar entera. La detección por conjunto de rutas es suficiente: un archivado
siempre deja sus dos mitades modificadas a la vez, porque es un movimiento.

Se descartó también resolverlo en el componente, agrupando los dos grupos al renderizar. Dejaría la
función devolviendo una agrupación que nadie usa tal cual, y el criterio de qué es un movimiento
viviría en el render en vez de donde se prueba.

**El identificador se extrae quitando el prefijo de fecha.** `2026-08-05-add-pipeline-start-screen` →
`add-pipeline-start-screen`, sacando `YYYY-MM-DD-`. Se descartó partir por el último guion o buscar el
identificador entre los cambios activos: lo primero rompe con cualquier identificador que contenga
guiones —que es la norma— y lo segundo no funciona justamente para un cambio archivado, que ya no está
entre los activos. Si una carpeta no tiene el prefijo de fecha, no aporta identificador y sus archivos
siguen contando como restos sin atribuir: es más seguro que adivinar.

**Un archivado archivado nombra el commit.** `soleChangeId` pasa a leer identificadores también de las
rutas bajo `archive/`. La regla no cambia de forma —un solo identificador en todo lo elegido lo nombra,
dos lo dejan vacío—, sólo se amplía la fuente. Se descartó mantener la regla anterior, que negaba
identificador a los restos de archivado: se tomó en `raise-commit-to-repo-level` para que un trabajo ya
cerrado no nombrara un commit de trabajo en curso, y ese riesgo lo sigue cubriendo la regla del
identificador único —si hay restos de un archivado y artefactos de un cambio activo, son dos
identificadores y la descripción queda vacía igual—.

## Risks / Trade-offs

**Un cambio activo cuyo identificador coincida con uno recién archivado quedaría absorbido.** → No
puede darse: `openspec archive` mueve la carpeta, así que mientras `openspec/changes/<id>/` exista con
contenido, no hay `archive/<fecha>-<id>/` del mismo `<id>`. Lo único que puede quedar bajo la ruta
vieja después de archivar son borrados, que es exactamente lo que se quiere agrupar. Si alguien
recreara un cambio con el mismo identificador el mismo día, sus archivos irían al grupo del archivado;
se acepta, porque el caso exige repetir un identificador ya usado, que la propia herramienta
desaconseja.

**El commit del archivado deja de estar separado del de trabajo si alguien elige todo junto.** → Es
elección de quien prepara, no del panel, y sigue habiendo señal: con dos identificadores distintos la
descripción queda vacía. Agrupar no fuerza a mezclar, ofrece la unidad correcta.

**No se midió que esto ahorre commits.** → Lo que se afirma es verificable: hoy las dos mitades caen en
grupos distintos y prepararlas por separado impide la detección de renombres, comprobado sobre
`56ddab1` y `cde474f` contra `9396978`. Que el ciclo pase de seis commits a tres es una consecuencia
esperada del cambio, no una medición.

## Open Questions

Ninguna.
