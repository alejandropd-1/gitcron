# Spec Delta

## MODIFIED Requirements

### Requirement: GitCron SHALL ofrecer instalar el motor local al repositorio o global al sistema, como elección explícita

GitCron SHALL presentar la instalación del motor de OpenSpec como dos acciones distintas y
rotuladas —instalarlo en el repositorio abierto, o instalarlo en el sistema— sin elegir por la
persona. Las dos difieren en algo que no se deduce del botón: la instalación local queda anotada en
el manifiesto del proyecto, versionada y reversible con Git, y sólo afecta a ese repositorio; la
global escribe fuera de todo repositorio, no tiene reversión por Git y le cambia la herramienta a
todos los proyectos de la máquina. Un botón único obliga a adivinar cuál de las dos ocurre.

Cuando lo que se ofrece es **actualizar** el motor que el repositorio ya usa, la acción SHALL
actualizarlo donde vive —la copia del repositorio si la resolución encontró esa, la del sistema si
encontró esa— y SHALL declarar cuál de las dos va a tocar antes de ejecutar. Ahí no hay elección que
hacer: actualizar otro motor que el que responde no es actualizar, y deja la pantalla anunciando una
versión que el repositorio nunca va a usar.

#### Scenario: Se ofrecen ambas
- **WHEN** el diagnóstico indica que hay una versión más nueva disponible
- **THEN** GitCron ofrece las dos acciones por separado, cada una declarando su alcance

#### Scenario: El repositorio no tiene manifiesto
- **WHEN** el repositorio abierto no tiene un manifiesto de paquetes donde anotar la dependencia
- **THEN** la acción local no se ofrece, declarando por qué, y la global sigue disponible

#### Scenario: Actualizar un motor que vive en el repositorio
- **WHEN** el motor que responde en el repositorio es su copia propia y se pide actualizarlo
- **THEN** el plan anuncia que va a actualizar el motor de ese repositorio, la instalación ocurre en el repositorio y el motor del sistema no se toca

#### Scenario: Actualizar un motor que vive en el sistema
- **WHEN** el motor que responde en el repositorio es el del sistema y se pide actualizarlo
- **THEN** el plan anuncia que va a actualizar el motor de toda la máquina y la instalación pasa por la confirmación previa de la instalación global

#### Scenario: Motor de procedencia que no se puede actualizar
- **WHEN** el motor que responde no es ni la copia del repositorio ni la del sistema, o su procedencia no se pudo determinar
- **THEN** la actualización del motor no se ofrece y se declara por qué

## ADDED Requirements

### Requirement: Una actualización del motor SHALL darse por hecha sólo si responde la versión pedida

GitCron SHALL instalar la versión exacta que el plan anunció, y SHALL marcar el paso del motor como
terminado sólo si, al volver a resolverlo desde el disco, responde esa versión. Que el motor
responda no alcanza: responde también cuando la instalación fue a parar a otro lugar, y así una
actualización que no cambió nada termina anunciándose como hecha.

#### Scenario: Responde la versión pedida
- **WHEN** la instalación termina y el motor resuelto responde la versión que el plan anunció
- **THEN** el paso del motor queda terminado con esa versión y, si estaba planeada, corre la actualización de la integración

#### Scenario: Responde otra versión
- **WHEN** la instalación termina sin error pero el motor resuelto responde una versión distinta de la anunciada
- **THEN** el paso del motor falla declarando la versión pedida, la que respondió y de dónde sale el motor que respondió, y la actualización de la integración no corre

#### Scenario: Aparece una versión más nueva entre el plan y la ejecución
- **WHEN** se publica una versión posterior después de mostrado el plan
- **THEN** se instala la versión que el plan anunció, no la nueva

### Requirement: Actualizar en el repositorio SHALL conservar el estilo de fijación del manifiesto

Al actualizar la copia del repositorio, GitCron SHALL dejar la dependencia anotada con el mismo
estilo que tenía: una versión exacta sigue exacta y un rango sigue siendo rango. Un proyecto que fija
la versión exacta lo hace para que su integración continua valide siempre con la misma herramienta;
convertirla en rango sin avisar le cambia esa garantía por la puerta de atrás.

#### Scenario: Versión fijada exacta
- **WHEN** el manifiesto anota la dependencia con una versión exacta y se actualiza a otra
- **THEN** el manifiesto queda con la nueva versión exacta, sin prefijo de rango

#### Scenario: Versión con rango
- **WHEN** el manifiesto anota la dependencia con un rango y se actualiza
- **THEN** el manifiesto queda con un rango que abarca la nueva versión, no con una versión exacta

### Requirement: Volver a la versión anterior SHALL ocurrir donde se actualizó

Cuando GitCron ofrece volver a la versión anterior del motor después de una actualización, SHALL
reinstalarla en el mismo lugar donde se hizo la actualización. Volver atrás en el sistema después de
haber actualizado la copia de un repositorio bajaría el motor de todos los proyectos de la máquina y
dejaría intacto el que se quería revertir.

#### Scenario: Volver atrás tras actualizar la copia del repositorio
- **WHEN** se actualizó la copia del repositorio y se pide volver a la versión anterior
- **THEN** la versión anterior se reinstala en el repositorio y el motor del sistema no se toca

#### Scenario: Volver atrás tras actualizar el motor del sistema
- **WHEN** se actualizó el motor del sistema y se pide volver a la versión anterior
- **THEN** la versión anterior se reinstala en el sistema
