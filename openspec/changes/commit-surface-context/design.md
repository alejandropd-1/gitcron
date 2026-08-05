## Context

El panel de preparación se armó alrededor de una pregunta: qué archivos entran. Después se le sumó el
mensaje. La rama nunca entró porque siempre fue la misma, y el rail derecho quedó como estaba porque
nadie lo miró mientras el panel estaba abierto.

`currentBranch` ya llega al componente como prop y se usa en dos lugares. `modifiedFiles` ya trae el
booleano `staged` por archivo. Todo lo que este trabajo necesita ya está en el renderer: no hay lectura
nueva de Git ni cambio en el proceso principal.

La restricción que ordena todo: acá no se ejecuta ninguna operación de Git. La rama se muestra, no se
cambia. Es la invariante 6 —las escrituras nuevas de Git son sólo las que el change autoriza
explícitamente— y este change no autoriza ninguna.

## Goals / Non-Goals

**Goals:**

Que la rama de destino esté donde se decide. Que lo ya preparado se vea mientras se decide qué falta.
Que el rail derecho aporte algo durante la preparación.

**Non-Goals:**

Crear ramas, cambiar de rama, o cualquier escritura de Git. La rama por cambio como flujo. El ancho de
los paneles de artefactos. El grafo de OpenSpec.

## Decisions

**La rama va en el encabezado del panel, junto al mensaje.** Es el bloque que ya reúne lo que define el
commit. Se descartó ponerla en cada grupo —no cambia por grupo— y se descartó confiar en que alcanza
con la barra inferior: esa barra es evidencia del repositorio y se lee como contexto, no como parte de
la decisión que se está tomando arriba.

**El rail derecho muestra lo ya preparado, no lo que falta.** Lo que falta es exactamente lo que el
panel lista agrupado; repetirlo daría dos vistas de lo mismo, una de ellas peor. Lo preparado, en
cambio, no se ve en ningún lado desde que el panel filtra los staged, y es la otra mitad de la misma
pregunta. Se descartó mostrar ambas cosas en el rail: sería la duplicación otra vez, con menos espacio.

**El rail cambia sólo mientras el panel está abierto.** Cerrar el panel devuelve ACTIVIDAD. Se descartó
un selector para elegir qué muestra el rail: agrega una decisión que nadie pidió, y el criterio —qué
sirve mientras se prepara— ya lo resuelve el estado del panel.

**Lo preparado se lista sin controles.** Es una vista, no una superficie de acción: quitar del stage se
hace desde el flujo de commit, que es donde ya vive. Se descartó sumar un control de "quitar": duplicaría
una acción existente en una superficie nueva, que es lo que la guía prohíbe para archivar.

## Risks / Trade-offs

**Un rail que cambia de contenido según otra cosa puede desorientar.** → El encabezado del rail declara
qué está mostrando en cada caso, y el cambio siempre acompaña a una acción deliberada —abrir o cerrar
el panel—, nunca ocurre solo. La comprobación es la validación visual de Ale.

**Mostrar la rama sin poder cambiarla puede leerse como una promesa.** → Se muestra como dato, con el
mismo tratamiento que la barra de evidencia le da hoy, y sin ningún control al lado. Este change no
ejecuta Git y eso es condición de aceptación, no una omisión.

**La lista de preparados puede quedar larga.** → Desplaza dentro de su propio alto, como el resto del
rail. No se recorta a un número fijo: recortar sin decirlo es lo que dejó veintinueve archivados
inalcanzables, y no se repite el error.

## Open Questions

Ninguna que bloquee. Queda para la validación visual si el rail debe volver a ACTIVIDAD al cerrar el
panel, como se implementa, o quedarse en preparados hasta que se confirme.
