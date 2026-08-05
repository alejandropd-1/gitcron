## ADDED Requirements

### Requirement: El formulario declara qué hace con lo que se escribe
El formulario para empezar un cambio SHALL declarar que lo que se escribe arma la instrucción que
recibe un ejecutor, y SHALL NOT dejar creer que se está escribiendo un artefacto. Cada campo SHALL
declarar dónde termina lo que se escribe en él. La declaración SHALL ir junto a cada campo y en una
frase al principio, y SHALL NOT presentarse como un bloque explicativo.

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

## MODIFIED Requirements

### Requirement: La actividad mostrada corresponde al cambio abierto
Con un cambio abierto, la columna de actividad SHALL mostrar únicamente sesiones de ese cambio, y
SHALL NOT mostrar sesiones de otro ni de ninguna sin atribuir. Cuando el cambio abierto no tiene
ninguna sesión registrada, la columna SHALL declararlo y SHALL NOT caer a la sesión de otro cambio.
Sin ningún cambio abierto, la columna SHALL mostrar todas las sesiones del repositorio y SHALL declarar
que lo mostrado es lo último del repositorio.

La columna SHALL declarar cuándo corrió la sesión que muestra, en su encabezado, sin depender de que
haya más de una sesión para elegir.

El fundamento es que el resto del panel central es del cambio abierto —sus tareas, sus artefactos, su
validación—, así que una columna al lado con otro criterio se lee como si fuera de ese cambio. El modo
de fallo es silencioso: nada declara la discrepancia, y notarla exige reconocer que la sesión que se
está leyendo no corresponde a lo que se está mirando. Un cambio sin sesiones es un estado normal
—recién creado, o trabajado desde afuera de la aplicación—, y mostrar la de otro para no dejar el
espacio vacío es justamente lo que produce la lectura equivocada. Sin cambio abierto el contexto es el
repositorio entero, y ahí no hay contra qué restringir.

Que se declare cuándo corrió responde a un defecto observado: sin cambio abierto la columna cae a la
última sesión del repositorio, que puede ser de días atrás, y el encabezado declaraba el ejecutor y el
estado pero no la fecha. La fecha vivía sólo en el selector de sesiones, que no se muestra cuando hay
una sola —que es justamente el caso donde más falta—. Sin esa marca, una sesión vieja se lee como
actividad en curso.

#### Scenario: Sesión más reciente perteneciente a otro cambio
- **WHEN** hay un cambio abierto y la sesión más reciente del repositorio pertenece a otro
- **THEN** la columna muestra la sesión del cambio abierto, y la del otro no aparece ni se ofrece para
  elegir

#### Scenario: Cambio abierto sin sesiones registradas
- **WHEN** el cambio abierto no tiene ninguna sesión
- **THEN** la columna declara que no hay actividad registrada para ese cambio, en vez de mostrar la de
  otro

#### Scenario: Corrida activa en otro cambio
- **WHEN** hay una sesión corriendo que pertenece a un cambio distinto del abierto
- **THEN** esa sesión no se muestra en la columna del cambio abierto

#### Scenario: Sin ningún cambio abierto
- **WHEN** el panel está en el estado del repositorio, sin cambio abierto
- **THEN** la columna muestra todas las sesiones del repositorio y declara que lo mostrado es lo último
  del repositorio

#### Scenario: Cuándo corrió lo que se muestra
- **WHEN** la columna muestra una sesión, haya una sola o varias
- **THEN** declara cuándo corrió, sin que haya que abrir el selector de sesiones
