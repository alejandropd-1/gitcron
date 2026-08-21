# ui-content-header Specification

## Purpose
TBD - created by archiving change unificar-encabezado-de-contenido. Update Purpose after archive.
## Requirements
### Requirement: El área de contenido SHALL encabezarse con una pieza única

Toda vista que encabece su contenido SHALL hacerlo con la misma pieza, y esa pieza SHALL declarar una
sola firma visual: un relleno, un tratamiento de borde y un tratamiento tipográfico. Cada vista SHALL
poblarla con sus propios rótulos y sus propios controles, y SHALL NOT redefinir su composición.

La altura SHALL tomar uno de dos valores según lo que la franja encabece, y ninguno más: la franja de
identidad, que aloja los controles de la vista, SHALL medir 44 px, que es el área objetivo mínima que
esos controles necesitan; la franja de columnas, que sólo lleva rótulos, SHALL medir 36 px, que es el
módulo con el que calzan las filas que describe.

El fundamento es que hoy existen tres implementaciones del mismo encabezado, escritas por separado y
divergentes en el detalle: el grafo clásico usa altura fija sin borde inferior, mientras el historial
y la vista de autoría usan relleno vertical con borde. Ninguna es incorrecta; el problema es que son
tres, porque cada vista nueva vuelve a resolver un caso ya resuelto y elige distinto. Una pieza
declarada convierte esa elección en una lectura.

Una vista PUEDE apilar dos instancias de la pieza cuando encabeza dos cosas distintas: la
identidad de la vista con los controles de su alcance, y la tabla que muestra debajo con los nombres
de sus columnas. En ese caso ambas instancias SHALL compartir la firma y SHALL NOT fundirse en una
sola franja, porque mezclar los controles de la vista con los rótulos de columna amontona dos
lecturas distintas en la misma línea. La vista de autoría ya resuelve el caso así.

#### Scenario: Vista que encabeza su contenido
- **WHEN** una vista muestra un encabezado sobre su contenido
- **THEN** ese encabezado tiene el mismo relleno, el mismo borde y el mismo tratamiento tipográfico que el de cualquier otra vista, y su altura es la de su rol

#### Scenario: Altura según el rol de la franja
- **WHEN** una franja aloja controles de la vista, o cuando sólo nombra las columnas de una tabla
- **THEN** mide 44 px en el primer caso y 36 px en el segundo, sin ningún otro valor posible

#### Scenario: Vista nueva
- **WHEN** se agrega una vista que necesita encabezar su contenido
- **THEN** usa la pieza declarada y aporta únicamente sus rótulos y sus controles

#### Scenario: Vista con identidad y con tabla
- **WHEN** una vista necesita encabezar su identidad y además nombrar las columnas de una tabla
- **THEN** apila dos instancias de la pieza, la de identidad arriba y la de columnas debajo, con la misma firma

### Requirement: Todo rótulo del encabezado SHALL provenir de la capa de traducción

Los rótulos del encabezado SHALL declararse en `lib/i18n.ts` en los tres idiomas y SHALL NOT
escribirse dentro de un componente. Las cadenas que informan cantidades SHALL resolverse con la
interpolación de valores que el módulo ya provee, y ninguna clave SHALL armarse concatenando trozos.

El fundamento es el invariante 8, que hoy no se cumple en dos de las cuatro superficies relevadas: el
grafo clásico escribe los nombres de sus cinco columnas en inglés dentro del JSX, y el historial arma
su rótulo en castellano por interpolación. La consecuencia es visible: la aplicación en inglés muestra
el historial en castellano y la aplicación en castellano muestra las columnas del grafo en inglés.
Existe además una clave declarada en los tres idiomas sin ningún consumidor, porque la vista siguió
armando su texto al lado.

#### Scenario: Cambio de idioma
- **WHEN** se cambia el idioma de la aplicación
- **THEN** todos los rótulos del encabezado cambian con él, en todas las vistas

#### Scenario: Rótulo con cantidad
- **WHEN** un encabezado informa cuántos elementos muestra
- **THEN** la cantidad se interpola como valor dentro de una clave declarada, y no se concatena para formar el nombre de la clave

### Requirement: El encabezado SHALL alojar los controles cuyo alcance es la vista

Un control que sólo afecta a lo que la vista muestra SHALL ubicarse en el encabezado de esa vista, y
SHALL NOT ubicarse en el panel lateral. El encabezado SHALL estar presente en toda vista que aloje un
control de este tipo, de modo que pasar de una vista a otra SHALL NOT desplazar el contenido.

El fundamento es el requisito ya vigente de que cada control resida en la superficie que corresponde a
su alcance. El selector de modo del grafo gobierna cuál de sus dos representaciones se muestra: su
alcance es el área de contenido del grafo. Ubicado en el panel lateral obliga a reservar altura en
todas las demás vistas para evitar el salto, y esa altura queda vacía. En el encabezado no hay nada
que reservar, porque cada vista aporta su propio contenido a la franja.

#### Scenario: Control de alcance acotado a una vista
- **WHEN** una vista ofrece un control que sólo afecta a lo que esa vista muestra
- **THEN** ese control está en el encabezado de la vista y no en el panel lateral

#### Scenario: Cambio de vista
- **WHEN** se pasa de una vista a otra
- **THEN** el contenido no se desplaza verticalmente por la aparición o desaparición de un control

### Requirement: El encabezado SHALL acompañar a las dos representaciones del grafo

El encabezado que aloja el selector de modo SHALL mostrarse tanto en la representación clásica como
en la cronométrica, y SHALL ubicarse por fuera de ambas, en el contenedor que las alterna. Los
rótulos de columna SHALL permanecer en una segunda instancia, dentro de la representación clásica y
debajo de la primera, porque describen la tabla y no la vista.

El fundamento es doble. Por un lado, el selector que elige entre las dos representaciones no pertenece
a ninguna: debe estar disponible desde las dos por igual. Por el otro, `components/ChronometricGraph.tsx`
está protegido por el invariante 12, y ubicar el encabezado en el contenedor común permite que la
representación cronométrica lo reciba sin que ese archivo se edite.

La contrapartida queda declarada: el lienzo cronométrico dispone de menos alto, y su proyección
depende del alto disponible. Ese efecto no se comprueba automáticamente y requiere validación visual
explícita, acotada por alcance y con fecha.

#### Scenario: Representación cronométrica
- **WHEN** se muestra el grafo en su representación cronométrica
- **THEN** el encabezado está presente, con la misma firma que en la representación clásica

#### Scenario: Alternancia entre representaciones
- **WHEN** se cambia de una representación del grafo a la otra
- **THEN** el encabezado con el selector permanece en su lugar y sólo cambia el contenido que encabeza

#### Scenario: Rótulos de columna del grafo
- **WHEN** se muestra el grafo en su representación clásica
- **THEN** los nombres de sus columnas ocupan una segunda franja debajo de la del selector, y no comparten línea con él

