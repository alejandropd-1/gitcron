## ADDED Requirements

### Requirement: La guía distingue no haber elegido de no haber ninguno
La guía del siguiente paso SHALL distinguir el estado en que hay cambios en curso y ninguno elegido del
estado en que no hay ningún cambio activo, y SHALL NOT afirmar que no hay cambios cuando los hay. En el
primer caso SHALL declarar que se puede entrar a uno de los que hay o empezar otro. La distinción SHALL
resolverse en la derivación y SHALL NOT taparse en el render.

El fundamento es que el panel dejó de entrar a un cambio por descarte, así que «ningún cambio
seleccionado» pasó a ser el estado normal de la pantalla de entrada. La derivación siguió leyéndolo
como el estado raro de un repositorio vacío, y el resultado es una pantalla que lista cuatro cambios en
curso y debajo afirma que no hay ninguno. Corregirlo en el render dejaría la afirmación falsa intacta
para cualquier otro consumidor.

#### Scenario: Cambios en curso y ninguno elegido
- **WHEN** el repositorio tiene cambios activos y no hay ninguno seleccionado
- **THEN** la guía declara que se puede entrar a uno de los que hay o empezar otro, y no afirma que no
  haya cambios activos

#### Scenario: Repositorio sin ningún cambio activo
- **WHEN** el repositorio no tiene ningún cambio activo
- **THEN** la guía lo declara como tal y ofrece empezar uno

## MODIFIED Requirements

### Requirement: El panel abre en el estado del repositorio
El panel SHALL abrir mostrando el estado del repositorio y SHALL NOT entrar a ningún cambio que la
persona no haya elegido. Entrar a un cambio SHALL ser una acción explícita, y volver al estado del
repositorio SHALL seguir siendo posible después de haber entrado. La pantalla de entrada SHALL
declarar los cambios en curso con su avance de tareas, lo archivado y las especificaciones, y SHALL
ofrecer abrir un cambio nuevo.

La guía del siguiente paso SHALL presentarse antes que las listas, de modo que su posición no dependa
de cuántos cambios haya. Cada cambio en curso SHALL poder desplegarse para ver sus tareas pendientes,
plegado por defecto. Los cambios archivados SHALL poder verse todos y SHALL poder abrirse desde ahí,
sin que una cuenta sea el único acceso.

El fundamento es que un cambio elegido por orden de lista no es información: el panel entraba al
primero de `activeChanges` y mostraba sus tareas como si fueran el asunto del momento, sin que nada
distinguiera esa elección de una deliberada. Mostrar primero el panorama es lo que permite decidir por
dónde seguir, que es la pregunta real al abrir la herramienta.

Que la guía vaya primero tiene su propio fundamento: es la acción que la pantalla existe para ofrecer,
y renderizada al final quedaba empujada fuera de vista por la lista de cambios. Que se vean las tareas
pendientes importa porque saber que van cinco de seis no dice cuál es la sexta, que es con lo que se
decide. Que los archivados sean alcanzables importa porque una cuenta sin lista deja inaccesible todo
lo que no entre en el acceso rápido de la barra lateral.

#### Scenario: Apertura con varios cambios en curso
- **WHEN** se abre el panel en un repositorio con más de un cambio activo y sin elección previa
- **THEN** se muestra el estado del repositorio con cada cambio y su avance, y no se entra a ninguno

#### Scenario: Entrar a un cambio
- **WHEN** se elige un cambio desde la pantalla de entrada o desde la lista
- **THEN** el panel muestra ese cambio, y esa elección se informa como el cambio en pantalla

#### Scenario: Abrir un cambio nuevo desde la entrada
- **WHEN** se pide empezar un trabajo nuevo desde la pantalla de entrada
- **THEN** el flujo de creación queda disponible sin tener que entrar antes a un cambio ajeno

#### Scenario: Ver qué falta en un cambio
- **WHEN** se despliega un cambio en curso desde la pantalla de entrada
- **THEN** se ven sus tareas pendientes, y las ya hechas no se listan

#### Scenario: Llegar a un archivado que no está entre los recientes
- **WHEN** el repositorio tiene más archivados de los que entran en el acceso rápido de la barra
  lateral
- **THEN** la pantalla de entrada permite verlos todos y abrir cualquiera de ellos
