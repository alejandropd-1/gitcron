## ADDED Requirements

### Requirement: La actividad mostrada corresponde al cambio abierto
Con un cambio abierto, la columna de actividad SHALL mostrar únicamente sesiones de ese cambio, y
SHALL NOT mostrar sesiones de otro ni de ninguna sin atribuir. Cuando el cambio abierto no tiene
ninguna sesión registrada, la columna SHALL declararlo y SHALL NOT caer a la sesión de otro cambio.
Sin ningún cambio abierto, la columna SHALL mostrar todas las sesiones del repositorio.

El fundamento es que el resto del panel central es del cambio abierto —sus tareas, sus artefactos, su
validación—, así que una columna al lado con otro criterio se lee como si fuera de ese cambio. El modo
de fallo es silencioso: nada declara la discrepancia, y notarla exige reconocer que la sesión que se
está leyendo no corresponde a lo que se está mirando. Un cambio sin sesiones es un estado normal
—recién creado, o trabajado desde afuera de la aplicación—, y mostrar la de otro para no dejar el
espacio vacío es justamente lo que produce la lectura equivocada. Sin cambio abierto el contexto es el
repositorio entero, y ahí no hay contra qué restringir.

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
- **THEN** la columna muestra todas las sesiones del repositorio, sin filtrar por cambio
