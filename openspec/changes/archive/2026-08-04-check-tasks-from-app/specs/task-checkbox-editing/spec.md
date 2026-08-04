## ADDED Requirements

### Requirement: Cambiar el estado de una tarea desde la aplicación
Una persona SHALL poder marcar y desmarcar cualquier tarea de un cambio activo desde donde la está
mirando. El cambio SHALL escribirse en el archivo de tareas del cambio, y SHALL NOT alterar ninguna
otra línea de ese archivo.

El fundamento es que hoy no hay forma de hacerlo sin abrir el archivo a mano, y las tareas que
dependen de una validación humana quedan sin marcar aunque la validación haya ocurrido. Un registro
que dice que quedó pendiente algo que se hizo es peor que no tener registro.

#### Scenario: Marcar una tarea cumplida
- **WHEN** una persona marca una tarea pendiente de un cambio activo
- **THEN** la tarea queda marcada en el archivo de tareas y el resto del archivo no cambia

#### Scenario: Desmarcar una tarea
- **WHEN** una persona desmarca una tarea marcada y confirma la acción
- **THEN** la tarea queda sin marcar en el archivo de tareas

### Requirement: Desmarcar exige confirmación
Desmarcar una tarea ya marcada SHALL pedir confirmación explícita antes de aplicarse. Marcar una
tarea pendiente SHALL NOT pedirla.

El fundamento es la asimetría entre las dos acciones: marcar agrega una afirmación que su autor está
haciendo en ese momento, mientras que desmarcar borra la constancia de algo que alguien afirmó haber
hecho antes. Además, cada cambio queda registrado, y un clic accidental escribiría en el registro
algo que nadie quiso.

#### Scenario: Intento de desmarcar
- **WHEN** una persona desmarca una tarea marcada
- **THEN** se pide confirmación y nada se escribe hasta obtenerla

#### Scenario: Confirmación rechazada
- **WHEN** la confirmación de desmarcar se cancela
- **THEN** la tarea conserva su estado y no se registra ningún cambio

### Requirement: Cada cambio de estado queda registrado en el repositorio
Todo cambio de estado de una tarea SHALL registrarse en un archivo del propio cambio, con la fecha,
la tarea afectada y la dirección del cambio. El registro SHALL vivir en el repositorio, y SHALL NOT
guardarse únicamente en almacenamiento local de la aplicación.

El fundamento es que un registro que sólo existe dentro de la aplicación no lo puede leer quien
trabaje sobre el repositorio sin ella —incluido cualquier ejecutor automático—, y desaparece al
cambiar de máquina. Viajando con el cambio, acompaña al trabajo que describe.

#### Scenario: Marcar deja constancia
- **WHEN** se marca o desmarca una tarea
- **THEN** se agrega una línea al registro del cambio indicando fecha, tarea y dirección

#### Scenario: El registro acompaña al cambio
- **WHEN** el cambio se archiva
- **THEN** su registro viaja con él, junto al resto de sus artefactos

### Requirement: Un cambio archivado no se edita
Las tareas de un cambio archivado SHALL NOT poder modificarse desde la aplicación, y la interfaz
SHALL declarar el motivo.

El fundamento es que un archivado es el registro de cómo se trabajó entonces. Editarlo después haría
que describa algo que no ocurrió.

#### Scenario: Tarea de un cambio archivado
- **WHEN** se muestra una tarea de un cambio ya archivado
- **THEN** su estado no se puede modificar, y se indica que está archivado
