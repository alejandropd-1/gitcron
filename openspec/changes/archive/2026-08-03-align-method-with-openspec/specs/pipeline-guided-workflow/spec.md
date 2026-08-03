## ADDED Requirements

### Requirement: Archivar hace lo que OpenSpec define y nada más
Archivar desde la aplicación SHALL ejecutar el archivado de OpenSpec —mover el cambio a su histórico
y consolidar las especificaciones— y SHALL NOT realizar ninguna operación de control de versiones.
La aplicación SHALL mostrar qué va a ocurrir antes de ejecutar, y SHALL NOT declarar éxito si el
archivado falló.

El fundamento es que OpenSpec declara explícitamente que deja el control de versiones al usuario:
gestiona artefactos de planificación, no commits. Fusionar ambas cosas obligó a inventar un
manifiesto y una tarea de firma que sólo existen en este repositorio, y que ningún ejecutor puede
descubrir consultando la herramienta.

#### Scenario: Archivado pedido desde la aplicación
- **WHEN** una persona confirma el archivado de un cambio
- **THEN** el cambio queda archivado con sus especificaciones consolidadas, y el estado de Git no se
  modifica

#### Scenario: El archivado falla
- **WHEN** el archivado de OpenSpec devuelve un error
- **THEN** se informa el motivo real y no se declara éxito

### Requirement: La metodología viaja por el canal de la herramienta
Las reglas de trabajo que un ejecutor debe respetar SHALL declararse donde el CLI de OpenSpec las
entrega —contexto del proyecto y reglas por artefacto—, de modo que cualquier ejecutor las reciba al
pedir instrucciones. Una regla que sólo exista en un archivo suelto SHALL NOT considerarse vigente
para agentes.

El fundamento es que una convención que depende de que alguien abra un archivo se pierde en cuanto
el ejecutor no lo tiene: en este repositorio, un runtime sin los comandos instalados nunca vio el
flujo y trabajó con reglas locales sin saberlo.

#### Scenario: Ejecutor que pide instrucciones para un artefacto
- **WHEN** un ejecutor consulta las instrucciones de un artefacto de un cambio
- **THEN** recibe el contexto del proyecto y las reglas que apliquen a ese artefacto

#### Scenario: Regla que contradice a la herramienta
- **WHEN** una regla local impone un paso que la herramienta no define
- **THEN** se retira o se declara por el canal de la herramienta, y no queda en un archivo suelto

## REMOVED Requirements

### Requirement: El archivado registra la firma humana y sólo eso
**Reason**: La tarea de firma es una convención propia de este repositorio, con texto literal, que
OpenSpec no define y que ningún ejecutor puede descubrir consultando el CLI. Existía para dejar
constancia de un gesto humano dentro de un flujo que además commiteaba; sin ese acoplamiento, no
tiene función. Su efecto observable —marcar una casilla— tampoco demostraba lo que su texto sugería.

**Migration**: Los cambios ya archivados conservan su tarea de firma marcada, como registro de cómo
se trabajó entonces. Los cambios activos dejan de necesitarla. Quien quiera dejar constancia de una
validación humana la escribe como una tarea más y la marca cuando la hizo.

### Requirement: Confirmar el trabajo en Git con alcance declarado y a la vista
**Reason**: OpenSpec declara que no realiza operaciones de repositorio, y acoplar el commit al
archivado obligó a inventar el manifiesto `commit.md` para declarar un alcance que, de otro modo, no
era deducible. La necesidad que resolvía —saber qué archivo pertenece a qué cambio cuando hay varios
en curso— sigue siendo real, pero corresponde a una acción de control de versiones, no al archivado.

**Migration**: Confirmar en Git vuelve a ser una acción manual, con las herramientas de Git que la
aplicación ya ofrece. Reconstruirla como acción propia —con los archivos del cambio preseleccionados
y un mensaje editable— se propone por separado. Los `commit.md` de cambios archivados quedan como
están.
