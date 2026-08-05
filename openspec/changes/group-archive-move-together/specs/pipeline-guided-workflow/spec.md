## MODIFIED Requirements

### Requirement: El alcance se deriva, no se declara
Los archivos modificados SHALL agruparse por procedencia derivándola de su ubicación y del estado de
Git, sin depender de que ningún artefacto los enumere. Los grupos SHALL ser los artefactos de cada
cambio activo bajo su identificador, los restos de un archivado —`openspec/changes/archive/…` y
`openspec/specs/…`— y el código sin atribuir. Las dos mitades de un archivado —lo que quedó bajo la
ruta anterior del cambio y lo que apareció bajo `archive/…`— SHALL presentarse en un mismo grupo,
porque son el origen y el destino de un solo movimiento. Un archivo bajo la ruta de un cambio que no
fue archivado SHALL seguir perteneciendo a ese cambio. Ningún grupo SHALL entrar en la preparación sin
elección explícita. Los archivos que ya están staged SHALL quedar fuera de la preparación, porque ya
fueron enviados y ofrecerlos de nuevo los prepararía dos veces sin sentido.

El fundamento es que un alcance declarado de antemano sólo vale si alguien lo escribió y lo mantuvo
al día; derivarlo del estado real no puede quedar desactualizado. La procedencia se muestra porque
una omisión es el modo de fallo más silencioso, y porque un commit que mezcla dos trabajos es difícil
de revertir: ver de dónde viene cada archivo es lo que permite decidir antes y no después. Ningún
grupo se privilegia porque, sin un cambio de referencia, privilegiar uno significaría producir un
commit distinto según dónde estuviera el foco de una lista lateral.

Que las dos mitades de un archivado vayan juntas tiene un fundamento propio y verificable: la
detección de renombres de Git opera sobre el diff de un commit, así que repartirlas en dos commits la
deshabilita. Medido en este repositorio, con el movimiento entero en un commit los artefactos figuran
como renombres de cero líneas; con las mitades separadas figuran como un borrado y un alta sin
vínculo, y `git log --follow` deja de alcanzar el commit donde el artefacto se escribió. Ofrecer las
mitades por separado empuja a quien prepara hacia ese resultado sin advertirlo.

#### Scenario: Varios cambios en curso
- **WHEN** el árbol tiene archivos de más de un cambio modificados a la vez
- **THEN** cada uno aparece bajo el identificador del cambio al que pertenece, y ninguno entra en la
  preparación sin elegirse

#### Scenario: Archivado con sus dos mitades sin confirmar
- **WHEN** el árbol tiene a la vez lo que quedó bajo la ruta anterior de un cambio y lo que apareció
  bajo `archive/…` para ese mismo cambio
- **THEN** ambas mitades aparecen en un solo grupo, de modo que preparar ese grupo envíe el movimiento
  completo en un mismo commit

#### Scenario: Archivo borrado de un cambio que sigue activo
- **WHEN** falta un archivo bajo la ruta de un cambio y no hay ninguna carpeta de archivado para ese
  cambio
- **THEN** ese archivo sigue apareciendo en el grupo de ese cambio, no en el de restos de archivado

#### Scenario: Código sin atribuir
- **WHEN** hay archivos modificados que no son artefactos de ningún cambio
- **THEN** aparecen como sin atribuir, y pueden elegirse igual que cualquier otro grupo

#### Scenario: Archivos ya preparados no se ofrecen dos veces
- **WHEN** un archivo ya está staged de una preparación anterior
- **THEN** no aparece entre los que se ofrecen para preparar de nuevo

### Requirement: El mensaje se sugiere y se puede editar
El mensaje SHALL derivarse del conjunto de archivos elegido y SHALL quedar editable antes de
confirmar. La aplicación SHALL NOT tratarlo como definitivo ni impedir su modificación. Cuando todos
los archivos elegidos pertenecen a un mismo cambio —activo o archivado—, la descripción SHALL ser el
identificador de ese cambio; cuando abarcan más de uno o ninguno, SHALL caer al alcance derivado de la
ubicación de los archivos.

El fundamento es que el tipo de un commit y el motivo del trabajo no son derivables del estado del
repositorio: requieren entender qué se hizo. Un mensaje derivado es un punto de partida útil, y
presentarlo como definitivo afirmaría algo que el dato no respalda. Que la descripción deje de
nombrar un cambio en cuanto la selección abarca más de uno es deliberado: es la señal visible de que
el commit está mezclando trabajos, y llega antes de confirmar. Que un cambio archivado sí pueda
nombrar el mensaje corrige el caso en que la selección **es** el archivado: dejarlo sin descripción
vaciaba justamente el commit que mejor se puede describir, y el riesgo de que un trabajo cerrado
nombre un commit de trabajo en curso lo sigue cubriendo la regla del identificador único.

#### Scenario: Selección de un solo cambio
- **WHEN** se prepara el commit y todos los archivos elegidos pertenecen a un mismo cambio
- **THEN** el mensaje sugerido nombra ese cambio y puede modificarse antes de confirmar

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
