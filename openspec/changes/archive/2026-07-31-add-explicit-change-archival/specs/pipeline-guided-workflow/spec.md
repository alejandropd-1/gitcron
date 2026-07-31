## MODIFIED Requirements

### Requirement: Validación y archivo aparecen sólo en su momento

La acción de archivar SHALL habilitarse únicamente con validación aprobada. Con tareas completas y
validación desconocida, la guía SHALL pedir comprobar el cambio. Con validación fallida, SHALL
dirigir a corregir y SHALL NOT habilitar el archivo.

La validación aprobada SHALL ser la **única** condición del archivado. Tareas pendientes y sesiones
persistidas SHALL NOT bloquearlo: la convención de trabajo cierra cada cambio con una tarea de
handoff humano que ningún runtime tilda, así que condicionar el archivo a que no queden tareas lo
vuelve inalcanzable. Cuando queden tareas sin tildar, el control SHALL declarar cuántas son, para
que la decisión se tome con el dato a la vista y no por omisión.

#### Scenario: Validación fallida

- **WHEN** la validación del cambio seleccionado es fallida
- **THEN** la acción primaria lleva a corregir con los diagnósticos reales y la acción de archivar permanece deshabilitada

#### Scenario: Validación desconocida con tareas completas

- **WHEN** todas las tareas figuran completas y la validación es desconocida
- **THEN** la guía pide actualizar la validación en lugar de ofrecer el archivo

#### Scenario: Validación aprobada

- **WHEN** la validación es aprobada y el cambio no está archivado
- **THEN** la acción primaria ofrece archivar el cambio

#### Scenario: Validación aprobada con tareas pendientes

- **WHEN** la validación es aprobada y quedan tareas sin tildar
- **THEN** el control de archivado está disponible y declara cuántas tareas quedan pendientes

#### Scenario: Validación aprobada con una sesión persistida sobre una tarea pendiente

- **WHEN** existe una sesión cerrada que apunta a una tarea que sigue sin tildar y la validación es aprobada
- **THEN** el control de archivado sigue disponible, sin que la sesión lo bloquee

#### Scenario: Cambio ya archivado

- **WHEN** el cambio seleccionado está archivado
- **THEN** el control de archivado no se ofrece

## ADDED Requirements

### Requirement: Archivar se ejecuta desde el proceso principal, no por un agente

Archivar un cambio SHALL ejecutarse invocando el CLI de OpenSpec desde el proceso principal, con
confirmación humana explícita previa, y SHALL NOT delegarse en una sesión de runtime. El comando
que se muestra antes de confirmar SHALL ser exactamente el que se ejecuta.

Archivar es una operación determinística y acotada: mueve el cambio al archivo y consolida sus
especificaciones. Delegarla en un agente agrega un intermediario que puede no tener el comando
—o no tener shell para correrlo— y devolver éxito sin haber hecho nada.

El resultado SHALL leerse del código de salida y la salida del CLI, y SHALL NOT declararse exitoso
por el mero fin del proceso. Un fallo SHALL mostrar el motivo real informado por el CLI.

#### Scenario: Confirmación previa

- **WHEN** se activa el control de archivado
- **THEN** se muestra el comando exacto a ejecutar y el archivado no ocurre hasta que se confirma explícitamente

#### Scenario: Archivado exitoso

- **WHEN** el CLI archiva el cambio y sale con código cero
- **THEN** la evidencia se relee, el cambio pasa a figurar como archivado y se declara explícitamente que se archivó, nombrándolo

#### Scenario: El cambio archivado desaparece de la lista activa

- **WHEN** el cambio archivado deja de estar entre los activos y la selección pasa a otro
- **THEN** el aviso de archivado sigue visible, porque si no la única señal del éxito sería una desaparición

#### Scenario: Archivado fallido

- **WHEN** el CLI rechaza el archivado, por ejemplo por un delta de spec inválido
- **THEN** se muestra el motivo informado por el CLI y el cambio sigue activo, sin declarar éxito

#### Scenario: Vista previa

- **WHEN** hay datos de vista previa en pantalla
- **THEN** el archivado no puede ejecutarse

### Requirement: La confirmación de una acción no depende del scroll

Los controles que una acción abre SHALL presentarse fuera del contenedor con scroll, junto a la
barra de acciones que los originó, y SHALL ser visibles cualquiera sea la posición de scroll al
activarlos.

Abrirlos dentro del área desplazable obliga a volver arriba para encontrar lo que se acaba de
pedir, y con una lista larga la confirmación puede quedar fuera de pantalla sin ninguna señal.

#### Scenario: Confirmación pedida desde el final de una lista larga

- **WHEN** se activa el control de archivado con la lista de tareas desplazada hasta el final
- **THEN** la confirmación aparece a la vista sin requerir volver a desplazarse

### Requirement: Refrescar la evidencia no descarta lo que ya se muestra

Un refresco de evidencia sobre un workspace ya cargado SHALL conservar en pantalla el contenido
vigente mientras se relee, y SHALL declarar que está actualizando. SHALL NOT reemplazar el
workspace por su estado de carga.

Reemplazarlo desmonta la vista y con ella todo estado efímero —incluido el aviso de una acción
recién completada—, y se percibe como una recarga completa en vez de una actualización. El estado
de carga SHALL reservarse para cuando todavía no hay nada que mostrar.

#### Scenario: Refresco tras una acción

- **WHEN** se relee la evidencia con un snapshot ya en pantalla
- **THEN** el contenido vigente permanece visible, se declara la actualización en curso y el aviso de la acción completada sobrevive

#### Scenario: Primera carga

- **WHEN** todavía no hay ningún snapshot para ese repositorio
- **THEN** se muestra el estado de carga, porque no hay nada vigente que conservar

### Requirement: El arranque respeta el destino de la acción que lo abrió

Al abrir el lanzador de runtime, el cambio y la tarea asociados SHALL ser los de la acción que lo
abrió, y SHALL NOT volver a derivarse del estado de la evidencia. Una acción de archivado SHALL
arrancar sin tarea asociada aunque existan tareas pendientes.

Derivar el destino por segunda vez permite que lo ejecutado deje de coincidir con lo mostrado: una
sesión de archivado que quedara atada a una tarea pendiente se registraría como intento sobre esa
tarea y volvería a trabar el cambio.

#### Scenario: Archivado con tareas pendientes

- **WHEN** se confirma el archivado de un cambio que todavía tiene tareas sin tildar
- **THEN** la sesión arranca sin tarea asociada y con la etiqueta de archivado

#### Scenario: Continuación de tarea

- **WHEN** se confirma continuar una tarea pendiente
- **THEN** la sesión arranca asociada a esa tarea y con la etiqueta de continuación
