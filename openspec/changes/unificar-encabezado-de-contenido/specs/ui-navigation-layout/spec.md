## MODIFIED Requirements

### Requirement: Las acciones de la barra superior SHALL jerarquizarse por frecuencia de uso

Traer y publicar cambios SHALL permanecer visibles como acciones directas en el panel lateral, bajo
su título y por encima de la lista de ramas; deshacer, rehacer, crear rama, guardar temporalmente y
aplicar parche SHALL agruparse en un desplegable ubicado junto a ellas. Recargar SHALL permanecer
visible junto a las dos primeras. La aplicación SHALL NOT presentar una franja de acciones sobre el
repositorio entre la barra de ventana y el área de contenido.

Esa prohibición SHALL NOT alcanzar al encabezado del área de contenido, que es otra pieza: no
atraviesa el ancho de la ventana sino que empieza a la derecha del panel lateral, no lleva acciones
sobre el repositorio sino el rótulo de la vista y los controles cuyo alcance es esa vista, y
pertenece al contenido en lugar de anteponerse a él.

El fundamento de la jerarquía no cambia: traer y publicar son las operaciones que se repiten decenas
de veces por jornada, y esconderlas detrás de un menú agrega un paso a lo más frecuente para ahorrar
espacio en lo que se usa de a ratos. Recargar acompaña a esas dos porque es la misma operación
conceptual: sincronizar con el remoto.

Lo que cambia es dónde ocurre. Seis controles no justifican una franja que atraviesa la pantalla
entera antes de que empiece el trabajo, y la referencia declarada en el invariante 11 resuelve el
caso concentrando el control en el lateral y dejando la ventana con sus pestañas.

Lo que se agrega es la distinción entre las dos franjas. La redacción anterior prohibía «ninguna
franja de controles» entre la ventana y el contenido, y esa prohibición leída al pie alcanzaba al
encabezado de contenido, que sí lleva un control y que las vistas ya usaban antes de este change.
Nombrar las dos piezas por separado evita que la ambigüedad se resuelva sola cada vez que alguien
lea el requisito.

#### Scenario: Acción frecuente
- **WHEN** se quiere traer o publicar cambios
- **THEN** la acción se ejecuta con un solo clic desde el panel lateral, sin abrir ningún menú

#### Scenario: Acción ocasional
- **WHEN** se quiere crear una rama, guardar temporalmente o aplicar un parche
- **THEN** la acción está en el desplegable de acciones del panel lateral, rotulada y alcanzable por teclado

#### Scenario: Composición de la ventana
- **WHEN** se muestra cualquier vista de la aplicación
- **THEN** entre la barra de ventana y el área de contenido no existe ninguna franja de acciones sobre el repositorio

#### Scenario: Encabezado del contenido
- **WHEN** una vista encabeza su contenido con su rótulo y los controles de su alcance
- **THEN** esa franja está permitida, empieza a la derecha del panel lateral y no lleva acciones sobre el repositorio

### Requirement: Cada control SHALL residir en la superficie que corresponde a su alcance

Un control SHALL ubicarse según sobre qué actúa: la navegación entre vistas y el mantenimiento de la
aplicación en el panel lateral, las acciones sobre el repositorio en el panel lateral junto a ellas, y
los controles que sólo afectan a una vista en el encabezado de esa vista. Un control SHALL NOT
permanecer visible en una pantalla donde no produce efecto, y SHALL NOT reservar espacio en ella.

El fundamento es que la barra superior acumulaba cinco categorías distintas en una sola franja, y esa
mezcla obligaba a leerla entera para encontrar cualquier cosa. Cuando el lugar de un control depende
de su alcance, la ubicación deja de memorizarse y pasa a deducirse.

Lo que se agrega es la segunda mitad de la regla. El selector de modo del grafo cumplía la primera
—no se mostraba fuera del grafo— pero vivía en el panel lateral, que no es la superficie de su
alcance, y para no desplazar el contenido al cambiar de vista debía reservar allí una altura que
quedaba vacía. Un control que se oculta pero deja su hueco sigue ocupando la pantalla donde no
produce efecto.

#### Scenario: Selector que sólo aplica a una vista
- **WHEN** se está en una vista distinta de aquella que el selector afecta
- **THEN** ese selector no ocupa lugar ni reserva altura en ninguna superficie

#### Scenario: Selector en la vista que gobierna
- **WHEN** se está en la vista que el selector afecta
- **THEN** el selector aparece en el encabezado de esa vista

#### Scenario: Mantenimiento de la aplicación
- **WHEN** se presentan la versión de la aplicación y el estado de sus actualizaciones
- **THEN** se ubican junto a los ajustes, la ayuda y el perfil, y no entre las acciones del repositorio
