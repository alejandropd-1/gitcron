## ADDED Requirements

### Requirement: La regla de rama por cambio viaja por el canal de instrucciones
La convención de trabajar cada cambio en `change/<slug>` SHALL estar declarada en
`openspec/config.yaml`, de modo que el CLI la entregue a cualquier ejecutor que pida instrucciones. La
regla SHALL nombrar el mando concreto para crear la rama y SHALL decir qué hacer cuando ya existe. La
regla SHALL NOT depender de que el cambio se haya creado desde la aplicación.

El fundamento es que la implementación existente sólo cubre el formulario de la aplicación, y los
cambios de este proyecto se crean con `openspec new change` desde la terminal. La consecuencia es
medible: `git branch --list "change/*"` no devuelve nada sobre 35 ramas locales, con quince cambios
archivados desde que la función existe. Una convención que vive donde no pasa quien tiene que cumplirla
no se aplica nunca, y es el mismo fallo que este proyecto ya sufrió con un runtime que trabajó con
reglas locales sin enterarse del método.

Que la regla diga qué hacer si la rama ya existe importa porque cambiarse a una rama con trabajo de
otro cambio arrastra commits ajenos, y ésa es una decisión con consecuencias que no corresponde
adivinar.

#### Scenario: Ejecutor que pide instrucciones antes de abrir un cambio
- **WHEN** un ejecutor pide las instrucciones de un artefacto por el CLI
- **THEN** recibe la regla de trabajar el cambio en `change/<slug>` con su mando concreto

#### Scenario: La rama ya existe
- **WHEN** la rama del cambio ya existe al ir a crearla
- **THEN** la regla indica informarlo y no reutilizarla sin decisión humana

#### Scenario: Cambio creado fuera de la aplicación
- **WHEN** el cambio se crea con `openspec new change` desde la terminal
- **THEN** la regla igual alcanza al ejecutor, sin depender de ninguna pantalla
