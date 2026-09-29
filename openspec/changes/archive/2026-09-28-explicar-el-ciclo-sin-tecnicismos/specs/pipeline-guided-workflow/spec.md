# pipeline-guided-workflow

## MODIFIED Requirements

### Requirement: El formulario declara qué hace con lo que se escribe
El formulario para empezar un cambio SHALL declarar que lo que se escribe arma la instrucción que
recibe un ejecutor, y SHALL NOT dejar creer que se está escribiendo un artefacto. Cada campo SHALL
declarar dónde termina lo que se escribe en él. La declaración SHALL ir junto a cada campo y en una
frase al principio, y SHALL NOT presentarse como un bloque explicativo.

Todo control del panel del ciclo que reciba texto o dispare una operación sobre el repositorio SHALL
declarar el mismo efecto con el mismo criterio, no sólo los campos de ese formulario. La declaración
SHALL estar escrita en lenguaje llano y SHALL NOT exigir conocer el vocabulario de OpenSpec para
entenderse.

El fundamento es que nada de lo que se completa se guarda en un archivo: los campos componen un texto
que un ejecutor recibe, y es ese ejecutor el que escribe la propuesta, el diseño y las tareas. La
instrucción completa se ve recién en el paso siguiente, dentro del lanzador, así que entre completar el
formulario y verla hay un tramo en que no se sabe qué se está armando. Declarar dónde termina un campo
es declarar el efecto de un control, que es lo mismo que ya hace la ayuda del identificador al declarar
su formato.

#### Scenario: Naturaleza del formulario
- **WHEN** se abre el formulario para empezar un cambio con la tarea clara
- **THEN** declara que lo que se escriba arma la instrucción para un ejecutor, no los artefactos

#### Scenario: Destino de cada campo
- **WHEN** se completa cualquiera de los campos del formulario
- **THEN** ese campo declara dónde termina lo que se escribe en él

#### Scenario: Un control fuera de ese formulario
- **WHEN** se presenta cualquier otro control del panel que reciba texto o dispare una operación sobre el repositorio
- **THEN** declara qué hace y adónde va lo que recibe, con el mismo criterio y en lenguaje llano

## ADDED Requirements

### Requirement: El vocabulario del método se explica donde se usa
Cada término del método que la aplicación muestre —propuesta, spec, delta, artefacto, archivar,
cambio— SHALL poder consultarse desde el lugar donde aparece, sin salir del panel y sin exigir
conocerlo de antemano. La aplicación SHALL NOT reemplazar el término por una paráfrasis: el
vocabulario de la herramienta se aprende, y esconderlo deja a la persona sin poder leer la
documentación de OpenSpec ni hablar con un ejecutor.

El fundamento está medido: el 2026-09-04 Alejandro, que construyó este panel y lo opera a diario,
declaró no saber qué es «la intención» de la cabecera ni dónde está «la propuesta», siendo que la
primera es el primer párrafo de la segunda.

#### Scenario: Un término a la vista
- **WHEN** la aplicación muestra un término del método en un rótulo, una pestaña o un mensaje
- **THEN** ese término se puede consultar desde ahí mismo y responde qué es y para qué sirve

#### Scenario: Término sin explicación disponible
- **WHEN** la aplicación muestra un término del que no tiene explicación
- **THEN** lo declara en vez de inventar una

### Requirement: El glosario se lee del método, no de una copia
La superficie de glosario SHALL describir las piezas del método y el orden en que aparecen en el
ciclo, y SHALL declarar cuál de sus contenidos proviene de la herramienta y cuál está escrito en la
aplicación. Lo que la herramienta ya entrega SHALL leerse de ella y SHALL NOT copiarse a mano, para
que una versión nueva de OpenSpec no deje al glosario afirmando algo que dejó de ser cierto.

#### Scenario: Contenido derivado de la herramienta
- **WHEN** el glosario describe artefactos, estados u operaciones que el CLI declara
- **THEN** los toma de la herramienta y no de un texto propio

#### Scenario: Contenido propio
- **WHEN** el glosario incluye una explicación que la herramienta no entrega
- **THEN** queda declarado que es de la aplicación
