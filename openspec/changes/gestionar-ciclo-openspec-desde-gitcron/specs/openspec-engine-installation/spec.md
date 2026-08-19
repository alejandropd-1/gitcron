## ADDED Requirements

### Requirement: GitCron SHALL ofrecer instalar el motor local al repositorio o global al sistema, como elección explícita

GitCron SHALL presentar la actualización del motor de OpenSpec como dos acciones distintas y
rotuladas —instalarlo en el repositorio abierto, o actualizar el del sistema— sin elegir por la
persona. Las dos difieren en algo que no se deduce del botón: la instalación local queda anotada en
el manifiesto del proyecto, versionada y reversible con Git, y sólo afecta a ese repositorio; la
global escribe fuera de todo repositorio, no tiene reversión por Git y le cambia la herramienta a
todos los proyectos de la máquina. Un botón único obliga a adivinar cuál de las dos ocurre.

#### Scenario: Se ofrecen ambas
- **WHEN** el diagnóstico indica que hay una versión más nueva disponible
- **THEN** GitCron ofrece las dos acciones por separado, cada una declarando su alcance

#### Scenario: El repositorio no tiene manifiesto
- **WHEN** el repositorio abierto no tiene un manifiesto de paquetes donde anotar la dependencia
- **THEN** la acción local no se ofrece, declarando por qué, y la global sigue disponible

### Requirement: La instalación global SHALL exigir una confirmación que declare qué ejecuta y a qué alcanza

Antes de ejecutar una instalación global, GitCron SHALL mostrar el comando literal, la ruta del
gestor de paquetes y del entorno de Node que va a usar, y los demás repositorios abiertos que
quedarían afectados. Sin eso la persona autoriza una operación cuyo alcance real no está a la vista:
el motor global es uno solo para todas las pestañas abiertas, y la operación no se deshace con Git.

#### Scenario: Confirmación previa
- **WHEN** se pide la instalación global
- **THEN** se muestra el comando exacto, la ruta resuelta del gestor y la lista de repositorios abiertos afectados, y nada se ejecuta hasta confirmar

#### Scenario: Se cancela la confirmación
- **WHEN** la persona cancela en la confirmación
- **THEN** no se invoca ningún gestor de paquetes

### Requirement: El gestor de paquetes SHALL resolverse del sistema, canonicalizado, y su ausencia SHALL declararse

GitCron SHALL localizar el gestor de paquetes en el sistema, canonicalizar su ruta antes de
ejecutarlo, y declarar de forma accionable cuándo no lo encuentra. La aplicación empaqueta Node pero
no un gestor de paquetes, así que el ejecutable es del entorno de quien la usa: puede no estar en el
PATH que hereda la aplicación, y con un administrador de versiones de Node la ruta cambia al cambiar
de versión. Resolverlo una vez y recordarlo apunta a un ejecutable que puede haber dejado de existir.

#### Scenario: Gestor ausente
- **WHEN** no se encuentra un gestor de paquetes en el sistema
- **THEN** GitCron declara que no puede instalar y qué falta, sin dejar la acción en carga indefinida

#### Scenario: Resolución por uso
- **WHEN** se ejecuta una instalación
- **THEN** la ruta del gestor se resuelve en ese momento y no se reutiliza una resolución previa

### Requirement: La ejecución del gestor SHALL ser no interactiva, acotada en tiempo y con su salida capturada

GitCron SHALL invocar el gestor de paquetes en modo no interactivo, con un tope de tiempo, y SHALL
capturar su salida para mostrarla. El proceso hijo no tiene terminal donde responder: si el gestor
pregunta algo o pide elevación, espera una respuesta que nunca llega, y sin tope la acción queda
colgada sin explicación.

#### Scenario: El gestor requiere permisos que no tiene
- **WHEN** el gestor falla por permisos insuficientes
- **THEN** GitCron declara la falla con su salida real y el estado del motor queda como estaba

#### Scenario: La ejecución excede el tope
- **WHEN** la ejecución supera el tiempo máximo
- **THEN** el proceso se termina y se informa el vencimiento, sin dejar la interfaz en carga

### Requirement: Tras instalar, el estado del motor SHALL recalcularse desde el disco

Terminada una instalación, GitCron SHALL volver a resolver el motor y recalcular su estado en lugar
de asumir que quedó en la versión pedida. Que el gestor termine sin error no prueba qué versión
quedó ni cuál va a resolver la aplicación: con una instalación local presente, la resolución la
prefiere sobre la global, y afirmarlo sin comprobarlo repite el defecto de declarar un estado que
nadie verificó.

#### Scenario: Instalación terminada
- **WHEN** una instalación termina sin error
- **THEN** GitCron vuelve a resolver el ejecutable y muestra la versión que realmente responde

### Requirement: Instalar en el repositorio SHALL dejar el cambio sin confirmar en Git

La instalación local SHALL dejar el manifiesto y el archivo de bloqueo modificados en el árbol de
trabajo, sin confirmarlos. Es lo que la hace reversible: mientras el cambio no esté en el historial,
descartarlo es una operación de Git ordinaria.

#### Scenario: Instalación local terminada
- **WHEN** termina una instalación local
- **THEN** el manifiesto y el bloqueo quedan modificados sin confirmar y se enumeran los archivos tocados
