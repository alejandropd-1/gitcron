## ADDED Requirements

### Requirement: Archivar SHALL admitir un motivo opcional que viaje con el cambio

Al archivar, la aplicación SHALL ofrecer un campo opcional para dejar escrito por qué se archiva, y
SHALL conservarlo junto a los artefactos del cambio. La aplicación SHALL ofrecerlo de forma más
visible cuando queden tareas sin completar, sin volverlo obligatorio. El fundamento es que el
archivado es el único cierre que OpenSpec define, así que un trabajo abandonado y uno terminado
llegan al histórico con la misma forma; quien lo lea después —persona o agente— no puede
distinguirlos, y la razón por la que algo se desestimó es exactamente lo que evita que se vuelva a
proponer.

#### Scenario: Archivado con tareas pendientes
- **WHEN** se archiva un cambio que conserva tareas sin completar
- **THEN** se ofrece escribir el motivo de forma destacada, y archivar sigue siendo posible sin escribirlo

#### Scenario: El motivo acompaña al cambio
- **WHEN** se archiva un cambio con motivo escrito
- **THEN** el motivo queda junto a los artefactos del cambio archivado, legible sin la aplicación

### Requirement: La sincronización de specs SHALL mostrar qué fusionaría antes de ejecutarse

La aplicación SHALL ofrecer la sincronización de specs con una vista previa de qué capacidades y
requisitos se incorporarían a los specs principales, y SHALL ejecutarla sólo tras confirmación. Sin
previa, la operación se juzga por su resultado ya escrito: sincronizar consolida en la fuente de
verdad del proyecto, y revisar después es revisar algo que ya ocurrió.

#### Scenario: Vista previa antes de sincronizar
- **WHEN** se pide sincronizar los specs de un cambio
- **THEN** se muestra qué se incorporaría a los specs principales y nada se escribe hasta confirmar

#### Scenario: Sincronización confirmada
- **WHEN** se confirma la sincronización
- **THEN** los specs principales quedan modificados en el árbol de trabajo, sin confirmarse en Git

### Requirement: Las acciones disponibles SHALL preceder al diagnóstico, que SHALL presentarse contraído

El panel SHALL presentar primero las acciones que se pueden ejecutar y el estado resumido en una
línea, y SHALL diferir el diagnóstico extenso —convivencia de esquemas, inventario de archivos
administrables, listados de workflows instalados— tras un control que lo despliega, contraído por
omisión. El fundamento es de uso observado: la revisión de actualización ocupa tres pantallas de
diagnóstico antes de llegar a lo accionable, de modo que quien entra a resolver algo lee un informe
para encontrar el botón. El diagnóstico no se retira porque sirve cuando algo falla; deja de ser lo
primero porque no es lo que se viene a hacer.

#### Scenario: Apertura del panel
- **WHEN** se abre la revisión del motor o de un cambio
- **THEN** se ven primero las acciones disponibles y el estado en una línea, con el diagnóstico contraído

#### Scenario: Consulta del diagnóstico
- **WHEN** se despliega el diagnóstico
- **THEN** se muestra completo, sin haberse perdido ninguna de las evidencias que ya presentaba

### Requirement: Una operación bloqueada SHALL declarar el motivo junto al control que la ofrece

Cuando una operación no se pueda ejecutar, la aplicación SHALL mantener su control visible,
deshabilitado, con el motivo declarado junto a él y sin depender del desplazamiento para leerlo. El
fundamento es que un botón que desaparece no enseña nada: quien lo buscaba concluye que la función no
existe. Uno deshabilitado con su motivo al lado indica qué hay que resolver para habilitarlo.

#### Scenario: Operación bloqueada por el estado del repositorio
- **WHEN** una operación no puede ejecutarse por el estado de la rama o del árbol de trabajo
- **THEN** su control se muestra deshabilitado con el motivo a la vista

### Requirement: Las operaciones que mutan el repositorio entero SHALL bloquearse sobre la rama principal, y las que editan un cambio SHALL NOT bloquearse

La aplicación SHALL impedir sobre la rama principal las operaciones que alteran el repositorio como
conjunto —actualizar la integración y archivar— y SHALL permitir en cualquier rama las que editan los
artefactos de un cambio o su lista de tareas. El criterio es el riesgo de la operación y no la rama
en que se está: bloquear todo sobre la principal impediría empezar un cambio, que es de donde se
empieza siempre, mientras que permitir todo dejaría consolidar specs sobre la rama que otros usan de
base.

#### Scenario: Actualizar la integración sobre la rama principal
- **WHEN** se intenta actualizar la integración estando en la rama principal
- **THEN** la operación se bloquea declarando el motivo, y el motor no se invoca

#### Scenario: Editar tareas sobre cualquier rama
- **WHEN** se editan las tareas de un cambio estando en la rama principal
- **THEN** la operación se permite y el archivo queda modificado sin confirmar
