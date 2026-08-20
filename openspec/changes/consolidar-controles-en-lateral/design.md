## Context

Tras el change anterior la aplicación quedó con tres franjas apiladas: la barra de ventana con las
pestañas de repositorio, la barra de acciones con seis controles, y el área de contenido. La del
medio se redujo de catorce a seis, pero sigue atravesando la pantalla completa.

`components/TopBar.tsx` aloja hoy esos seis: los dos controles de plegado, el desplegable de
acciones, traer, publicar, recargar, el desplegable de herramientas y la búsqueda.
`components/RepoSidebar.tsx` recibió en el change anterior la navegación entre vistas —cuatro filas
permanentes— y el mantenimiento de la aplicación al pie. `components/ChronometricGraph.tsx` contrajo
sus cinco controles tras un menú en el extremo inferior derecho.

Al usarlo, dos de esas soluciones mostraron su límite: las cuatro filas de navegación compiten en
altura con la lista de ramas, y el menú del lienzo puso el lector de ramas futuras detrás de dos
clics, listado como si fuera una acción más.

## Goals / Non-Goals

**Goals:**

Que entre la barra de ventana y el trabajo no haya nada. Que cada control esté donde su alcance lo
ubica. Que el lector de ramas futuras se alcance de un clic. Que el estado del repositorio se lea en
cualquier vista.

**Non-Goals:**

La vista Pipeline. El contenido de las vistas, que sólo cambia de lugar. Agregar dependencias.
Cambiar qué hace cada acción.

## Decisions

**Los controles de plegado suben a la barra de ventana y no bajan al lateral.** Es la única decisión
que no admite alternativa: un control que despliega el panel lateral no puede vivir dentro del panel
lateral, porque plegarlo lo dejaría inalcanzable. La barra de ventana es la única superficie que no
se pliega. La búsqueda los acompaña por proximidad de uso, y porque la referencia ubica ahí sus
controles equivalentes.

**Las acciones del repositorio bajan al lateral, no a la barra de ventana.** Se evaluó repartirlas
—lo más frecuente arriba, el resto abajo— y se descartó: dividir acciones de la misma familia en dos
superficies obliga a recordar cuál está dónde. Y la barra de ventana ya carga las pestañas de
repositorio, que con varios abiertos ocupan casi todo el ancho.

**Traer y publicar siguen sin entrar en el desplegable.** La decisión del change anterior no se
revisa: son las operaciones que se repiten decenas de veces por jornada. Lo único que cambia es la
superficie donde viven.

**La navegación pasa a desplegable encabezado por la vista activa.** Cuatro filas permanentes ocupan
altura para una decisión que se toma pocas veces por sesión, mientras la lista de ramas —que se
recorre continuamente— compite por ese espacio. Se evaluó una fila de cuatro íconos con rótulo, más
compacta y sin ocultar nada, y se descartó por dos razones: el encabezado que nombra la vista activa
declara dónde se está, cosa que hoy sólo se deduce de cuál pestaña está resaltada; y los atajos de
teclado ya permiten cambiar de vista sin abrir nada, de modo que el clic extra sólo lo paga quien no
los usa. Si al usarlo resultara molesto, la fila de íconos queda como alternativa conocida.

**El control del lienzo abre el lector, no un menú.** Un menú cuya entrada principal abre otro panel
es un rodeo. Acercar, alejar y restablecer quedan sueltos porque son acciones de un clic que no
ganan nada agrupadas, y el interruptor de ramas especulativas se muda dentro del lector, que es
aquello cuyo contenido gobierna.

**El estado del repositorio se muestra como indicador, no como franja.** Se evaluó una barra de
estado inferior permanente —es lo que hacen los editores— y se descartó: agregaría una franja
horizontal justo en el change que viene a quitar una. Los indicadores junto al nombre del
repositorio usan el mismo lenguaje que las ramas ya emplean para declarar su sincronización.

## Risks / Trade-offs

**Es la segunda mudanza seguida de los mismos controles** → Cada movimiento es una oportunidad de
dejar un control sin cablear, y esta vez desaparece el componente que los alojaba. La mitigación es
que las pruebas verifiquen que cada acción llega a su destino desde su ubicación nueva, no sólo que
se dibuja.

**El panel lateral concentra todo** → Navegación, acciones, ramas, estado y mantenimiento. La
referencia que se sigue tiene menos elementos que esta aplicación. No está medido cuánto ocupa el
resultado: corresponde contarlo al implementar y declararlo. Si el lateral queda tan cargado como
estaba la barra, el problema se mudó en lugar de resolverse.

**El desplegable esconde tres vistas detrás de un clic** → Es el costo aceptado de recuperar altura
para las ramas. Los atajos lo compensan para quien los use; para quien no, es un clic más por cambio
de vista. Si molesta, la fila de íconos con rótulo es la alternativa.

## Migration Plan

Primero la barra de ventana, que es donde van los controles de plegado: hasta que estén ahí, quitar
la franja intermedia dejaría el panel lateral sin forma de reabrirse. Después las acciones al
lateral. Después la navegación como desplegable y los indicadores de estado. Por último los controles
del lienzo, que son independientes del resto.

No hay migración de datos ni cambios de contrato. Revertir es descartar cambios no confirmados.

## Open Questions

Cuántos elementos quedan en el panel lateral y cuánta altura ocupan con la lista de ramas desplegada.
No está medido; se cuenta al implementar.

Si el desplegable de vistas resulta cómodo en uso sostenido o si conviene la fila de íconos. Se
resuelve usándolo.
