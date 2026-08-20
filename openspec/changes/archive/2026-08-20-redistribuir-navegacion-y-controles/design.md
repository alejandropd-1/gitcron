## Context

La barra superior concentra hoy catorce controles de cinco categorías: el pliegue del panel lateral,
la navegación entre vistas, deshacer y rehacer, traer y publicar, rama, guardado temporal, parche,
recargar, el selector de modo de grafo, el mantenimiento de la aplicación, terminal, filtro,
búsqueda y el pliegue del panel derecho. Ninguno sobra por sí mismo; lo que sobra es que convivan.

El rearmado visual anterior dejó la aplicación sin líneas divisorias y con el armazón separado del
contenido, pero al retirar lo que tapaba ciertas cosas quedaron expuestos tres defectos previos: el
lienzo no reacciona al ancho de su contenedor, su barra inferior conserva un recuadro que ya nada
más tiene, y `components/RepoMainView.tsx` conservó sus líneas por haber quedado fuera del alcance
declarado de aquella limpieza.

El proyecto ya tiene resuelto lo que este change necesita en dos puntos clave. La persistencia por
repositorio existe: las carpetas de ramas se guardan con una clave por ruta de repositorio. Y el
comportamiento de render del lienzo está normado: `graph-render-isolation` exige que mover el
encuadre no reconstruya la capa de nodos, porque el encuadre se aplica como una única transformación
sobre el contenedor.

## Goals / Non-Goals

**Goals:**

Que la ubicación de cada control se deduzca de su alcance en lugar de memorizarse. Que la vista de
grafo se dibuje completa cualquiera sea el ancho disponible, sin costo de render. Que las conjeturas
del agente se muestren sólo cuando alguien lo pide, y que esa decisión se respete por proyecto.

**Non-Goals:**

Cambiar qué hace cada acción: este change las mueve, no las modifica. Rediseñar el contenido de las
vistas. Tocar la geometría de la línea de tiempo o de los nodos. Agregar dependencias.

## Decisions

**Traer y publicar quedan fuera del desplegable.** Son las operaciones que se repiten decenas de
veces por jornada; esconderlas agrega un paso a lo más frecuente para ahorrar espacio en lo que se
usa de a ratos. Se evaluó agrupar todo el bloque en un solo menú —es lo que pediría la simetría
visual— y se descartó por esa razón. Recargar las acompaña porque es la misma operación conceptual:
sincronizar con el remoto.

**El selector de modo de grafo baja a la vista de grafo.** Es el único control de la barra que no
tiene efecto fuera de una vista. La alternativa de dejarlo arriba y deshabilitarlo en las demás se
descartó: un control permanentemente deshabilitado en tres de cuatro pantallas ocupa el mismo lugar
sin dar nada a cambio.

**El mantenimiento de la aplicación baja al pie del panel lateral.** Versión y actualizaciones no
actúan sobre el repositorio abierto sino sobre GitCron. Su lugar es junto a ajustes, ayuda y perfil,
que comparten esa naturaleza.

**El lector de ramas futuras no entra en el menú del lienzo.** Los controles del lienzo —acercar,
alejar, restablecer, interruptor de conjeturas— son acciones puntuales y se contraen bien. El lector
tiene tres pestañas, alto arrastrable y estado propio persistido: es una superficie de lectura.
Meterlo en un menú obligaría a resolver dónde se despliega un panel de ese tamaño, y la respuesta
sería «subiendo desde abajo», que es lo que ya hace. Se conserva su comportamiento y sólo se retira
el recuadro que lo envuelve.

**El lienzo observa su contenedor, no la ventana.** El ancho disponible cambia al plegar un panel o
arrastrar un separador, sin que la ventana cambie de tamaño; una escucha de ventana no se entera de
ninguno de esos casos. Se usa `ResizeObserver` sobre el contenedor.

**El recálculo altera el encuadre y nada más.** Es la decisión que gobierna el costo de esta parte.
`graph-render-isolation` ya exige que mover el encuadre no reconstruya la capa de nodos, y ese
requisito se sostiene sin excepción: al cambiar el ancho, lo que cambia es la transformación que
envuelve a los nodos, no los nodos. Se evaluó recalcular la proyección completa —sería más simple de
escribir— y se descartó porque reconstruiría elementos idénticos a los anteriores en cada cuadro de
un arrastre de separador, que es exactamente el trabajo que el requisito vigente prohíbe.

**La preferencia de conjeturas usa el mecanismo que ya existe.** Una clave por ruta de repositorio,
igual que las carpetas de ramas. Se evaluó guardarla en la base de datos local junto al resto del
estado del repositorio, y se descartó por desproporción: es un booleano de interfaz, no evidencia del
repositorio, y agregar una tabla para eso introduce una migración que nada justifica.

**Los dos encendidos automáticos se retiran, no se condicionan.** Se evaluó conservarlos para el caso
de un repositorio sin preferencia registrada —«la primera vez que hay predicciones, mostrarlas»— y se
descartó: el estado por omisión es oculto y una excepción a la regla por omisión es una regla nueva
que nadie pidió.

## Risks / Trade-offs

**Mover la navegación puede romper el cambio de vista** → Es riesgo funcional, no estético: si sale
mal, la aplicación no se ve fea, no navega. La mitigación es que el estado de vista activa no cambia
de forma, sólo de lugar desde donde se dispara, y que las pruebas cubran el cambio de vista desde el
panel lateral y con el panel plegado.

**Un desplegable puede costar más de lo que ahorra** → Uno que atrape el foco, que no cierre con
escape o que obligue a alcanzar el mouse empeora lo que vino a resolver. El requisito
correspondiente lo fija y las pruebas lo cubren.

**El observador de tamaño puede disparar recálculos en exceso durante un arrastre** → No está medido
cuántas veces notifica `ResizeObserver` durante el arrastre de un separador. La contención está en
que el recálculo sea barato por construcción —altera una transformación, no reconstruye nodos—, de
modo que su frecuencia importe poco. Si aun así se observara pérdida de cuadros, se acota la
frecuencia; no se hace de antemano, conforme al requisito vigente de que las optimizaciones se
justifican con mecanismos reales y no por precaución.

**Apagar las conjeturas por omisión puede hacerlas invisibles para quien no sepa que existen** → El
interruptor queda a la vista en los controles del lienzo y declara su estado. Se acepta el costo:
mostrar conjeturas sin que nadie las pida es peor que requerir un clic para verlas.

## Migration Plan

Primero las correcciones que no dependen de nada: las líneas que quedaron, el recuadro de la barra
inferior y la readaptación del lienzo. Después la preferencia de conjeturas, que es independiente.
Por último la redistribución de controles, que es lo que más superficie toca y conviene hacer sobre
una base ya estable.

No hay migración de datos. Una preferencia de conjeturas ausente equivale a oculto, que es el estado
por omisión, de modo que quien actualice no encuentra nada roto. Revertir es descartar cambios no
confirmados en Git.

## Open Questions

Cuántas veces notifica `ResizeObserver` durante el arrastre de un separador y si eso llega a
percibirse. No está medido; se comprueba al implementar y se informa.

Si la navegación necesita atajos de teclado propios para las cuatro vistas, o si alcanza con que sea
alcanzable al reabrir el panel lateral. Se resuelve al usarla.
