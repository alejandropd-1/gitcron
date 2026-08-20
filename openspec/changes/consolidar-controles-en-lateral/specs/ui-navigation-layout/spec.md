## MODIFIED Requirements

### Requirement: Las acciones de la barra superior SHALL jerarquizarse por frecuencia de uso

Traer y publicar cambios SHALL permanecer visibles como acciones directas en el panel lateral, bajo
su título y por encima de la lista de ramas; deshacer, rehacer, crear rama, guardar temporalmente y
aplicar parche SHALL agruparse en un desplegable ubicado junto a ellas. Recargar SHALL permanecer
visible junto a las dos primeras. La aplicación SHALL NOT presentar una franja de acciones entre la
barra de ventana y el área de contenido.

El fundamento de la jerarquía no cambia: traer y publicar son las operaciones que se repiten decenas
de veces por jornada, y esconderlas detrás de un menú agrega un paso a lo más frecuente para ahorrar
espacio en lo que se usa de a ratos. Recargar acompaña a esas dos porque es la misma operación
conceptual: sincronizar con el remoto.

Lo que cambia es dónde ocurre. Seis controles no justifican una franja que atraviesa la pantalla
entera antes de que empiece el trabajo, y la referencia declarada en el invariante 11 resuelve el
caso concentrando el control en el lateral y dejando la ventana con sus pestañas.

#### Scenario: Acción frecuente
- **WHEN** se quiere traer o publicar cambios
- **THEN** la acción se ejecuta con un solo clic desde el panel lateral, sin abrir ningún menú

#### Scenario: Acción ocasional
- **WHEN** se quiere crear una rama, guardar temporalmente o aplicar un parche
- **THEN** la acción está en el desplegable de acciones del panel lateral, rotulada y alcanzable por teclado

#### Scenario: Composición de la ventana
- **WHEN** se muestra cualquier vista de la aplicación
- **THEN** entre la barra de ventana y el área de contenido no existe ninguna franja de controles

### Requirement: La barra del lienzo SHALL contraerse en un control y SHALL NOT llevar recuadro

El control ubicado en el extremo inferior derecho del área de contenido SHALL abrir el lector de
ramas futuras de forma directa, y SHALL NOT presentar un menú intermedio. Acercar, alejar y
restablecer el encuadre SHALL presentarse como controles sueltos sobre el lienzo, sin agruparse tras
ningún control. Ninguna de esas superficies SHALL llevar recuadro ni borde propio.

El lector de ramas futuras SHALL conservar su propia superficie desplegable, con sus pestañas y su
alto arrastrable, y SHALL NOT convertirse en una entrada de menú: es un panel de lectura, no una
acción, y necesita superficie para cumplir su función. El interruptor de ramas especulativas SHALL
vivir dentro de ese lector, que es aquello cuyo contenido gobierna.

El fundamento del cambio es de uso observado: agrupar los cinco controles tras un menú puso el lector
—que es una superficie de trabajo— detrás de dos clics y de una lista donde figuraba como si fuera
una acción más. Un menú cuya entrada principal abre otro panel es un rodeo, no una simplificación.

#### Scenario: Apertura del lector
- **WHEN** se activa el control del extremo inferior derecho
- **THEN** el lector de ramas futuras se despliega directamente, sin menú previo

#### Scenario: Controles de encuadre
- **WHEN** se muestra el lienzo
- **THEN** acercar, alejar y restablecer están disponibles como controles sueltos, sin recuadro y sin agrupamiento

#### Scenario: Interruptor de ramas especulativas
- **WHEN** se abre el lector de ramas futuras
- **THEN** el interruptor de ramas especulativas está dentro de él

## ADDED Requirements

### Requirement: La barra de ventana SHALL alojar los controles de plegado y la búsqueda

Los controles que muestran u ocultan los paneles laterales, y el acceso a la búsqueda, SHALL ubicarse
en la barra de ventana, a la derecha de las pestañas de repositorio. SHALL permanecer alcanzables
cuando cualquiera de los paneles esté plegado.

El fundamento es que un control de disposición no puede vivir dentro de aquello que dispone: si el
control que reabre el panel lateral estuviera en el panel lateral, plegarlo lo dejaría inalcanzable.
La barra de ventana es la única superficie que no se pliega, y es donde la referencia declarada en el
invariante 11 ubica sus propios controles equivalentes.

#### Scenario: Panel lateral plegado
- **WHEN** el panel lateral está plegado
- **THEN** su control de despliegue sigue visible en la barra de ventana

#### Scenario: Posición estable
- **WHEN** se cambia de vista o de repositorio
- **THEN** los controles de plegado y la búsqueda permanecen en la misma posición

### Requirement: La navegación entre vistas SHALL presentarse como un desplegable encabezado por la vista activa

La navegación SHALL mostrar la vista actual como encabezado del panel lateral y SHALL desplegar las
demás al activarse; al elegir una, el encabezado SHALL pasar a nombrarla. SHALL cumplir el
comportamiento de teclado que rige para todo desplegable de la aplicación.

El fundamento es que cuatro filas permanentes ocupan altura para una decisión que se toma de a una
por vez y que cambia pocas veces por sesión, mientras la lista de ramas —que se recorre
continuamente— compite por ese mismo espacio. El encabezado que nombra la vista activa cumple además
una segunda función: declara dónde se está, que hoy sólo se deduce de cuál pestaña está resaltada.

Las vistas SHALL seguir siendo alcanzables por atajo de teclado sin abrir el desplegable, como ya lo
son hoy.

#### Scenario: Cambio de vista
- **WHEN** se elige otra vista en el desplegable
- **THEN** el contenido cambia y el encabezado pasa a nombrar la vista elegida

#### Scenario: Atajo de teclado
- **WHEN** se usa el atajo de una vista sin abrir el desplegable
- **THEN** la vista cambia igual y el encabezado la refleja

### Requirement: El estado del repositorio SHALL mostrarse junto a su nombre en el panel lateral

La rama actual, el estado del árbol de trabajo y el de validación SHALL presentarse como indicadores
junto al nombre del repositorio en el panel lateral, disponibles en todas las vistas.

El fundamento es que hoy esa información vive dentro de una sola vista, y sirve en todas: al preparar
un commit importa en qué rama se está, y al mirar el historial también. Presentarla como indicador
—del mismo modo que las ramas ya declaran su estado de sincronización— la hace legible de un vistazo
sin ocupar una franja propia.

#### Scenario: Estado visible en cualquier vista
- **WHEN** se está en cualquier vista de la aplicación
- **THEN** la rama actual y el estado del árbol de trabajo se leen junto al nombre del repositorio

#### Scenario: Estado señalado sin depender del color
- **WHEN** un indicador comunica una condición del repositorio
- **THEN** se distingue por forma o rótulo además de por color
