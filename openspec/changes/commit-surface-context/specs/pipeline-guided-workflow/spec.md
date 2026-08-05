## ADDED Requirements

### Requirement: La superficie de preparación declara su contexto
El panel de preparación SHALL declarar la rama a la que va el commit, en la misma superficie donde se
elige qué entra y se corrige el mensaje. La aplicación SHALL NOT ofrecer desde ahí ninguna operación
que cambie de rama ni ninguna otra escritura de Git.

Mientras el panel está abierto, la columna lateral SHALL mostrar los archivos que ya están preparados,
con su estado, y SHALL declarar qué está mostrando. Al cerrarse el panel, la columna SHALL volver a su
contenido habitual. Esa lista SHALL ser una vista y SHALL NOT ofrecer controles que dupliquen acciones
del flujo de commit.

El fundamento es que un commit lo definen tres cosas —qué archivos, con qué mensaje, a qué rama— y la
tercera no estaba en la superficie donde se deciden las otras dos. Hoy pasa desapercibido porque la
rama siempre es la misma; deja de pasarlo en cuanto haya más de una.

Lo preparado se muestra porque el panel filtra los archivos ya staged para que el conteo baje al
preparar y no se ofrezcan dos veces. Esa decisión es correcta y tiene un efecto no buscado: deja
invisible la mitad del estado. Con lo que falta mandar de un lado y lo que ya está listo del otro, el
estado del commit se lee completo sin cambiar de pantalla. Mostrar en la columna lo que **no** está
preparado sería repetir lo que el panel ya lista agrupado.

#### Scenario: Rama de destino a la vista
- **WHEN** el panel de preparación está abierto
- **THEN** declara la rama a la que va el commit, sin ofrecer cambiarla

#### Scenario: Lo ya preparado mientras se decide
- **WHEN** hay archivos preparados y el panel de preparación está abierto
- **THEN** la columna lateral los lista con su estado, declarando que son los ya preparados

#### Scenario: Nada preparado todavía
- **WHEN** el panel está abierto y no hay ningún archivo preparado
- **THEN** la columna lo declara, en vez de quedar vacía

#### Scenario: Cierre del panel
- **WHEN** se cierra el panel de preparación
- **THEN** la columna lateral vuelve a su contenido habitual
