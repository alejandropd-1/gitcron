## ADDED Requirements

### Requirement: Cada grupo declara de qué está hecho
Cada grupo del panel de preparación SHALL declarar en prosa breve qué contiene y de dónde viene: los
artefactos de un cambio en curso nombrando ese cambio, el movimiento de un archivado nombrando qué se
archivó, y lo que ningún cambio reclama declarándolo como tal. El estado de cada archivo SHALL decirse
con palabra —nuevo, modificado, borrado— y SHALL NOT quedar sólo como una inicial. En el grupo que
ningún cambio reclama, cada archivo SHALL declarar además de qué tipo es, derivado de su ubicación.

Los controles que suman o quitan un grupo entero SHALL presentarse como controles, con marco e ícono,
y SHALL NOT quedar como texto suelto junto al rótulo.

El fundamento es que este panel existe para que una omisión se vea antes de confirmar, y un grupo que
sólo lleva rótulo no permite auditarlo: sumando todo de una, un archivo que no correspondía queda
declarado apenas como sin atribución y ahí se agota la información. El estado en palabra sigue el
mismo criterio por el que el control de tarea dejó de ser un elemento sin señal: un dato que sólo
aparece al pasar el mouse no está presentado. Declarar el tipo de archivo no es atribuirlo a un
trabajo —ese dato no existe— sino decir qué clase de archivo es, que es lo que sí se puede afirmar.

#### Scenario: Grupo de un cambio en curso
- **WHEN** el panel muestra los artefactos de un cambio activo
- **THEN** el grupo nombra ese cambio y declara que son sus artefactos

#### Scenario: Grupo de un archivado
- **WHEN** el panel muestra el movimiento de un archivado
- **THEN** el grupo declara qué cambio se archivó y que contiene el movimiento completo

#### Scenario: Grupo que ningún cambio reclama
- **WHEN** el panel muestra archivos que no son artefactos de ningún cambio
- **THEN** el grupo declara que ningún cambio los reclama, y cada archivo declara de qué tipo es

#### Scenario: Estado de cada archivo
- **WHEN** el panel lista un archivo modificado
- **THEN** su estado se lee con palabra sin tener que pasar el mouse por encima

#### Scenario: Control de un grupo
- **WHEN** el panel ofrece sumar o quitar un grupo entero
- **THEN** ese control se presenta con marco e ícono, distinguible del rótulo del grupo

## MODIFIED Requirements

### Requirement: El mensaje se sugiere y se puede editar
El mensaje SHALL derivarse del conjunto de archivos elegido y SHALL quedar editable en la misma
superficie donde se elige qué entra, antes de preparar y antes de confirmar. La aplicación SHALL NOT
tratarlo como definitivo, SHALL NOT impedir su modificación y SHALL NOT mostrarlo como texto que no se
puede tocar. Lo que se lea en esa superficie SHALL ser lo mismo que se va a confirmar. Cuando todos
los archivos elegidos pertenecen a un mismo cambio —activo o archivado—, la descripción SHALL ser el
identificador de ese cambio; cuando abarcan más de uno o ninguno, SHALL caer al alcance derivado de la
ubicación de los archivos.

El fundamento es que el tipo de un commit y el motivo del trabajo no son derivables del estado del
repositorio: requieren entender qué se hizo. Un mensaje derivado es un punto de partida útil, y
presentarlo como definitivo afirmaría algo que el dato no respalda. Que se pueda corregir donde se
decide qué entra importa porque es ahí donde se sabe qué se está por confirmar; mostrarlo sin poder
tocarlo obliga a recordar una corrección hasta otra pantalla. Que sea el mismo texto y no una copia
evita el modo de fallo que este panel existe para prevenir: que lo que se lee no sea lo que se
confirma. Que la descripción deje de nombrar un cambio en cuanto la selección abarca más de uno es
deliberado: es la señal visible de que el commit está mezclando trabajos, y llega antes de confirmar.
Que un cambio archivado sí pueda nombrar el mensaje corrige el caso en que la selección **es** el
archivado: dejarlo sin descripción vaciaba justamente el commit que mejor se puede describir, y el
riesgo de que un trabajo cerrado nombre un commit de trabajo en curso lo sigue cubriendo la regla del
identificador único.

#### Scenario: Selección de un solo cambio
- **WHEN** se prepara el commit y todos los archivos elegidos pertenecen a un mismo cambio
- **THEN** el mensaje sugerido nombra ese cambio y puede modificarse antes de confirmar

#### Scenario: Corrección del mensaje antes de preparar
- **WHEN** se corrige el mensaje en el panel de preparación
- **THEN** ese texto es el que queda para confirmar, sin tener que reescribirlo en otra pantalla

#### Scenario: Selección que es el archivado de un cambio
- **WHEN** los archivos elegidos son las dos mitades del archivado de un mismo cambio
- **THEN** el mensaje sugerido nombra ese cambio

#### Scenario: Selección que abarca varios orígenes
- **WHEN** los archivos elegidos pertenecen a más de un cambio, o a ninguno
- **THEN** el mensaje sugerido no nombra ningún cambio y usa el alcance derivado de la ubicación de
  los archivos

#### Scenario: Mensaje ya escrito por una persona
- **WHEN** el campo de commit ya tiene un mensaje escrito
- **THEN** la sugerencia no lo pisa
