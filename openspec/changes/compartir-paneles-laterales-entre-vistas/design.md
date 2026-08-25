## Lo que hay hoy

### El estado, en una línea

`app/page.tsx:1674` pasa a la vista SDD el estado de los paneles del armazón sin traducirlo:

```js
pipelineLayout: {
  leftOpen: sidebarOpen,      // el mismo que abre el lateral del armazón
  rightOpen: detailsOpen,     // el mismo que abre el panel de detalles
  leftWidth: sidebarW,
  rightWidth: detailsW,
}
```

`components/pipeline/OpenSpecDashboard.module.css:249` usa eso para su grilla interna, vía
`data-left-open` y `data-right-open`. De ahí que un mismo interruptor abra el lateral del armazón en
una vista y una columna interna en otra.

`app/page.tsx:811` calcula `repositoryDetailsVisible` con `detailsOpen && …`, y `:1721` lo fuerza a
`false` cuando la vista es SDD. O sea: el lugar derecho del armazón ya se libera en esa vista. Lo que
falta es que algo lo ocupe.

### Las columnas de SDD

| Zona | Dónde | Qué muestra |
|---|---|---|
| `navigator` | `OpenSpecDashboard.tsx:1524` | cambio activo, completados recientes, especificaciones |
| `center` | `:1666` | avisos, estado del repositorio, siguiente paso, en curso, cerrados |
| `inspector` | `:2746` | rail con dos pestañas: actividad y herramientas |

`navigator` es navegación entre changes; `inspector` es contexto del change elegido. Las dos tienen
equivalente en el armazón: el lateral izquierdo navega, el derecho da contexto de lo seleccionado.

### Lo que el grafo pone a la derecha

`components/RepoDetailsPanel.tsx` muestra el detalle del commit seleccionado o, sin selección, el
panel de preparación del árbol de trabajo. Su comentario ya declara que «flota en la vista
chronometric y es inline en la clásica»: el concepto de flotar existe, atado hoy al modo del grafo.

## Decisiones

### Flotar significa alto propio, no superponerse

El panel derecho sigue en su columna y sigue repartiendo el ancho con el contenido: nada se
superpone y el contenido reflowea como hoy. Lo que cambia es que la tarjeta no llega al piso —tiene
su propio alto, con aire debajo— y ese alto se arrastra con el puntero.

Es la definición que dio Alejandro el 2026-08-22, y evita el costo del panel superpuesto: acá el
contenido es un grafo que se quiere ver entero, y una tarjeta que lo tape a mitad de lectura molesta
más de lo que suma.

### El arrastre vertical ya está escrito dos veces

`hooks/use-carto-layout.ts:57`, `beginRelationsDrag`, es el modelo: toma `e.clientY`, invierte el
delta cuando el panel crece hacia arriba, acota con un mínimo y un máximo declarados, y persiste en
`localStorage`. `components/ChronometricGraph.tsx:732` hace lo mismo para el lector de futuros.

Este change reusa ese patrón. No se inventa mecánica nueva.

### Por qué el estado se desacopla primero

Mientras `sidebarOpen` gobierne dos cosas, cualquier cambio en los paneles produce efectos cruzados
que ningún test detecta y que sólo se ven usando la aplicación. Desacoplarlo es barato y deja el
resto del trabajo sobre terreno firme. Por eso es la primera fase y se valida sola.

### El cuerpo de SDD se rehace al final

Retirar sus columnas propias es lo que más superficie toca. Va después de que los dos lugares del
armazón ya reciban contenido de las dos vistas, para que el contenido tenga adónde ir en vez de
quedar suelto.

### El panel derecho es un panel vivo

El lugar derecho no cambia de contenido por vista sino **por circunstancia**. No se reemplaza entero
al cambiar de pantalla: muestra lo que corresponde al momento, y las vistas aportan sus estados a una
misma pieza en vez de turnarse una superficie.

Hoy alterna entre tres —el inspector del ciclo de especificación, el detalle del commit elegido, y la
preparación del árbol sin selección—. El cuarto, confirmar un commit ya preparado desde el ciclo, es
lo que cierra el recorrido: se prepara en el centro y se confirma al costado, sin cambiar de vista.

La regla que se desprende y que conviene sostener: un estado nuevo se agrega a la pieza, no se abre
una superficie aparte. Cada superficie nueva que se abre es una que después hay que unificar, y este
change existe justamente por eso.

### Dos flujos de commit, a propósito

La vista del ciclo de especificación commitea *un change*: agrupa por alcance, muestra la rama
destino y redacta el mensaje a partir de lo que el change abarca. El grafo commitea *cambios
sueltos*: agrupa por archivo, permite quitar del stage, descartar, enmendar y combinar.

**Los dos se conservan.** Poder confirmar lo que uno quiera cuando uno quiera es una funcionalidad
declarada por Alejandro el 2026-08-22, no un residuo del flujo guiado. Que exista un camino
determinista para cerrar un change no quita el camino libre, y al revés.

Lo que se corrige no es la coexistencia sino el corte: hoy el flujo de SDD prepara y redacta pero no
confirma, y el de Graph confirma pero no ve la redacción del modelo ni la rama destino. Cada uno está
cortado justo donde al otro le sobra. Cruzar esas piezas los completa sin volverlos el mismo panel.

Lo que NO se cruza queda igual de declarado: quitar del stage, descartar, enmendar y combinar operan
sobre el árbol de trabajo y no sobre un change. Llevarlos a SDD sí sería duplicar superficie, y es la
clase de duplicación que la guía del repositorio prohíbe.

### El panel derecho como lista de secciones, no como estados excluyentes

Análisis pedido por Alejandro el 2026-08-24, a partir de su referencia: un panel que acumula
funciones, despliega las que la persona elige, y muestra más o menos según la circunstancia.

**Lo que el panel contiene hoy**, en sus cuatro estados: el inspector con sus dos solapas —sesiones y
«necesita atención» por un lado, la tarjeta del motor por el otro—; la preparación con la lista de
archivos ya preparados y la bitácora del modelo; el flujo de commit con su aviso de operación en
curso, sus dos listas con contador y su bloque de confirmación; y el detalle del commit con su
cabecera, sus metadatos y sus archivos.

Todos son bloques con título y contenido. Esa forma ya está escrita en el proyecto: la sección
plegable de `components/RepoSidebarParts.tsx:32`, con su control de plegado, su contador y su estado
recordado por repositorio, que la fase 7 llevó al panel lateral.

**La propuesta:** el panel derecho deja de alternar superficies excluyentes y pasa a ser una lista de
secciones plegables, con la misma pieza. Qué secciones existen lo decide la circunstancia; cuáles
están abiertas lo decide la persona, y se recuerda.

Resuelve cuatro cosas a la vez. Agregar una función pasa a ser agregar una sección, no abrir otra
superficie. Lo que no interesa se pliega en vez de competir por el alto. El alto deja de necesitar un
tope arbitrario, porque cada sección aporta el suyo y el panel desplaza. Y la bitácora deja de
empujar: es una sección más, que se abre cuando se quiere seguir el razonamiento y se pliega cuando
no.

**Resuelve además el defecto de estado duplicado.** Que el panel muestre una cosa *o* la otra es lo
que obliga a recordar «a qué estado volver», y es exactamente donde se desincronizaron las dos copias
de la preferencia de preparación. Con secciones no hay a dónde volver: la de confirmar aparece al
preparar y desaparece al cerrar, mientras las demás siguen en su lugar. Nunca se reemplazó nada.

Las familias quedarían así: en el grafo, detalle del commit, cambios sin preparar, listos para
confirmar y confirmar; en la vista del ciclo, cambio en curso, actividad, herramientas y —sólo
mientras se prepara— confirmar. La sección de confirmar es la misma en las dos, con la bitácora
adentro: es el flujo único que la fase 6 conectó.

**Consecuencia para la fase 4.** El alto arrastrable pierde sentido aplicado a una tarjeta suelta: si
el panel es una lista que desplaza, no hay tal tarjeta. Lo que sigue valiendo de la definición
original es que el panel no llegue al piso y que ese alto se arrastre, pero aplicado al panel entero.
Queda pendiente de decisión de Alejandro con este análisis a la vista.

### El cuerpo de SDD en una sola pista

Relevamiento de la tarea 7.1, hecho el 2026-08-24 con las columnas ya retiradas.

**Corrección del 2026-08-24, posterior:** la primera versión de este relevamiento presentó los cinco
bloques como una sola columna. No lo son. El centro tiene tres solapas —Trabajo, Actividad y
Artefactos, en `OpenSpecDashboard.tsx:271` y `:2180`—, y «Evidencia» y «Actividad» son solapas
enteras, no bloques debajo de «Tareas». La columna es la solapa Trabajo, y tiene cuatro bloques.
La decisión que sigue no cambia por eso: los encabezados hacen falta igual, y «Avisos» baja debajo
de «Siguiente paso» dentro de esa solapa.

Con un cambio elegido, la preparación cerrada y la solapa Trabajo activa, el centro se lee así:

| # | Bloque | Dónde | ¿Encabezado? |
|---|---|---|---|
| 1 | Avisos | `OpenSpecDashboard.tsx:1626` | Sí — rótulo, ícono, recuadro y color |
| 2 | Siguiente paso | `:2313` | No — un párrafo suelto |
| 3 | Lanzador de agente | `:2317` | No |
| 4 | Tareas | `:2334` | Sí — un `h4` |

Y las otras dos solapas traen un bloque cada una, tampoco rotulado: evidencia (`:2411`) y actividad
(`:2420`).

Con la preparación abierta, el bloque de preparar (`:1709`) ocupa el lugar de los cuatro y trae su
propio encabezado con la rama y los contadores.

**Qué compite por atención.** «Avisos» es el único con rótulo, recuadro, color y posición de arriba,
y es permanente: sus dos avisos son condiciones del repositorio, no del momento. Ocupa la primera
pantalla entera y deja las tareas —lo que la persona fue a hacer— abajo del pliegue.

**Qué quedó sin jerarquía.** Tres bloques seguidos sin rótulo. Antes los separaban líneas; la fase 5
las retiró conforme al requisito vigente y nada las reemplazó. Es el costo previsto de esa fase, y
es lo que 7.1 estaba escrita para encontrar.

**Decisión de Alejandro del 2026-08-24 sobre tres caminos propuestos: jerarquía por encabezado, sin
plegar.** Los tres bloques sin rótulo reciben el tratamiento que ya tiene «Avisos», y «Avisos» baja
debajo de «Siguiente paso». Se descartó llevar el centro a secciones plegables como los dos
laterales: plegar es comportamiento de superficie de contexto, y el centro es superficie de trabajo
—plegar lo que uno fue a hacer no tiene sentido—. Si más adelante hiciera falta, se apoya sobre esto
sin rehacerlo.

**Fuera de alcance, y declarado.** El centro conserva su paleta propia: diez tokens `--os-*` con 277
usos, más 214 apariciones de color literal —128 valores distintos— en su hoja de estilos. Los azules
que se ven ahí (`#1e354d`, `rgba(2, 15, 30, 0.6)`, `#5ed8ff`) vienen de la paleta anterior. Lo
resuelve `unificar-paleta-carbon-soul`, y la tarea 5.3 de este change ya lo dejó explícitamente
afuera. Un change por vez.

## Riesgo declarado

El lienzo cronométrico se redimensiona cuando cambian los paneles, y su proyección depende del
espacio disponible. `components/ChronometricGraph.tsx` está protegido por el invariante 12 y **no hay
autorización vigente para este alcance**. Las fases están escritas para no tocarlo: si alguna
pareciera exigirlo, se frena y se reporta, y la autorización se pide entonces, acotada y con fecha.

## Preguntas abiertas

- ~~**¿Qué pasa con el `navigator` de SDD?**~~ **Resuelta el 2026-08-22: se funden.** En la vista SDD
  el lateral izquierdo muestra la navegación de esa vista —cambios activos, completados y
  especificaciones— en lugar de las ramas, y el `navigator` se retira con su estado. El lateral pasa
  a significar «la navegación de la vista activa» en toda la aplicación. Lo que NO cambia en ninguna
  vista: el desplegable de vistas, la rama con sus indicadores, y las acciones sobre el repositorio.
- **¿El panel de preparación de SDD sigue en el cuerpo central o baja al lugar derecho?** Es
  superficie de trabajo y no de contexto, y el lugar derecho pasa a ser una tarjeta de alto acotado.
  La recomendación es que siga en el centro. Se decide con la fase 3 ya puesta.
- **¿El alto del panel derecho se recuerda por repositorio o globalmente?** El ancho hoy es global;
  la preferencia de ramas especulativas es por repositorio. La fase que lo implementa declara cuál
  eligió y por qué.
