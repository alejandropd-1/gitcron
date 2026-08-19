## ADDED Requirements

### Requirement: Cada control SHALL residir en la superficie que corresponde a su alcance

Un control SHALL ubicarse según sobre qué actúa: la navegación entre vistas y el mantenimiento de la
aplicación en el panel lateral, las acciones sobre el repositorio en la barra superior, y los
controles que sólo afectan a una vista dentro de esa vista. Un control SHALL NOT permanecer visible
en una pantalla donde no produce efecto.

El fundamento es que la barra superior acumula hoy cinco categorías distintas en una sola franja, y
esa mezcla obliga a leerla entera para encontrar cualquier cosa. Cuando el lugar de un control
depende de su alcance, la ubicación deja de memorizarse y pasa a deducirse.

#### Scenario: Selector que sólo aplica a una vista
- **WHEN** se está en una vista distinta de aquella que el selector afecta
- **THEN** ese selector no ocupa lugar en la barra superior

#### Scenario: Mantenimiento de la aplicación
- **WHEN** se presentan la versión de la aplicación y el estado de sus actualizaciones
- **THEN** se ubican junto a los ajustes, la ayuda y el perfil, y no entre las acciones del repositorio

### Requirement: La navegación entre vistas SHALL vivir en el panel lateral, encima de las ramas

Las vistas de la aplicación SHALL presentarse como una sección de navegación en la parte superior del
panel lateral, por encima de la lista de ramas, y SHALL declarar cuál está activa. La barra superior
SHALL NOT contener navegación.

El fundamento es de jerarquía: la vista que se está mirando es la decisión más abarcativa de la
pantalla —determina todo lo demás—, y hoy se toma en una franja compartida con acciones puntuales
como guardar temporalmente o aplicar un parche.

#### Scenario: Cambio de vista
- **WHEN** se elige otra vista en el panel lateral
- **THEN** el contenido cambia y la sección de navegación declara cuál quedó activa

#### Scenario: Panel lateral oculto
- **WHEN** el panel lateral está oculto
- **THEN** la navegación sigue siendo alcanzable, sea reabriéndolo o por teclado, y no queda inaccesible

### Requirement: Las acciones de la barra superior SHALL jerarquizarse por frecuencia de uso

Traer y publicar cambios SHALL permanecer visibles como acciones directas; deshacer, rehacer, crear
rama, guardar temporalmente y aplicar parche SHALL agruparse en un desplegable. Recargar SHALL
permanecer visible junto a las dos primeras.

El fundamento es que traer y publicar son las operaciones que se repiten decenas de veces por
jornada, y esconderlas detrás de un menú agrega un paso a lo más frecuente para ahorrar espacio en lo
que se usa de a ratos. Recargar acompaña a esas dos porque es la misma operación conceptual:
sincronizar con el remoto.

#### Scenario: Acción frecuente
- **WHEN** se quiere traer o publicar cambios
- **THEN** la acción se ejecuta con un solo clic, sin abrir ningún menú

#### Scenario: Acción ocasional
- **WHEN** se quiere crear una rama, guardar temporalmente o aplicar un parche
- **THEN** la acción está en el desplegable de acciones, rotulada y alcanzable por teclado

### Requirement: Las herramientas auxiliares SHALL agruparse en un desplegable con sus atajos visibles

El terminal, el filtro y la búsqueda SHALL presentarse en un desplegable propio, y cada entrada SHALL
mostrar su atajo de teclado junto a su rótulo. El fundamento es doble: son superficies que se abren,
no acciones que se ejecutan, y quien las usa seguido termina usando el teclado —mostrar el atajo
donde está la entrada es lo que hace que se aprenda.

#### Scenario: Apertura de una herramienta
- **WHEN** se elige una herramienta del desplegable
- **THEN** se abre su superficie y el desplegable se cierra

#### Scenario: Atajo de teclado
- **WHEN** se presiona el atajo de una herramienta sin abrir el desplegable
- **THEN** la herramienta se abre igual

### Requirement: Todo desplegable SHALL cerrarse con Escape, con un clic afuera y SHALL ser recorrible por teclado

Un desplegable SHALL abrirse con clic o con teclado, SHALL cerrarse con la tecla de escape y con un
clic fuera de su superficie, SHALL permitir recorrer sus entradas con las flechas y activarlas con
Enter, y SHALL devolver el foco al control que lo abrió al cerrarse. El fundamento es que agrupar
controles detrás de un menú sólo mejora la pantalla si el menú no cuesta más que lo que ahorra: uno
que atrapa el foco o que obliga a alcanzar el mouse para cerrarse empeora lo que vino a resolver.

#### Scenario: Cierre por teclado
- **WHEN** hay un desplegable abierto y se presiona la tecla de escape
- **THEN** se cierra y el foco vuelve al control que lo abrió

#### Scenario: Recorrido por teclado
- **WHEN** hay un desplegable abierto y se recorren sus entradas con las flechas
- **THEN** el foco avanza entrada por entrada y Enter activa la que está enfocada

### Requirement: La barra del lienzo SHALL contraerse en un control y SHALL NOT llevar recuadro

Los controles del lienzo SHALL presentarse contraídos tras un único control ubicado en el extremo
inferior derecho del área de contenido, y su superficie SHALL NOT llevar recuadro ni borde propio,
en coherencia con el resto de la aplicación. Son acercar, alejar, restablecer y el interruptor de
ramas especulativas.

El lector de ramas futuras SHALL conservar su propia superficie desplegable, con sus pestañas y su
alto arrastrable, y SHALL NOT convertirse en una entrada de menú: es un panel de lectura, no una
acción, y necesita superficie para cumplir su función.

#### Scenario: Controles contraídos
- **WHEN** se muestra el lienzo
- **THEN** sus controles están contraídos tras un único control, sin recuadro alrededor

#### Scenario: Apertura del lector de ramas futuras
- **WHEN** se abre el lector de ramas futuras, sea desde los controles o al elegir una rama especulativa
- **THEN** se despliega como panel con sus pestañas y su alto arrastrable, conservando su comportamiento actual

### Requirement: El lienzo SHALL readaptarse al ancho de su contenedor sin reconstruir la capa de nodos

El lienzo cronométrico SHALL observar el tamaño de su contenedor y recalcular el encuadre cuando
cambie —al mostrar u ocultar un panel lateral, al arrastrar su separador o al redimensionar la
ventana—, y ese recálculo SHALL alterar únicamente la transformación del encuadre, sin reconstruir la
capa de nodos de commit.

El fundamento del primer punto es que hoy el lienzo no reacciona: el problema quedaba oculto porque
el panel derecho flotaba por encima y una máscara desvanecía el grafo justo debajo, y al retirar
ambos el dibujo quedó tapado. El fundamento del segundo es el requisito ya vigente en
`graph-render-isolation`: los nodos no cambian de posición en coordenadas de mundo cuando cambia el
encuadre, y reconstruirlos produce elementos idénticos a los anteriores, que es el trabajo que impide
sostener el cuadro. Un ajuste de ancho que reconstruya nodos convierte una mejora de composición en
una caída de rendimiento.

La observación SHALL hacerse sobre el contenedor y no mediante escuchas de tamaño de ventana, porque
el ancho del lienzo cambia también cuando la ventana no cambia.

#### Scenario: Se muestra u oculta un panel lateral
- **WHEN** se muestra u oculta un panel lateral y el ancho del lienzo cambia
- **THEN** el encuadre se recalcula y el contenido queda completo dentro del área visible

#### Scenario: Arrastre del separador
- **WHEN** se arrastra el separador de un panel lateral
- **THEN** el lienzo acompaña el cambio de ancho sin reconstruir la capa de nodos

#### Scenario: Redimensionado sin cambio de contenido
- **WHEN** cambia el tamaño del contenedor y no cambian los commits, la selección ni el hover
- **THEN** la capa de nodos no se vuelve a construir
