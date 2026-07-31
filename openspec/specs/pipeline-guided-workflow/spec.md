# pipeline-guided-workflow Specification

## Purpose
TBD - created by archiving change guide-openspec-next-actions. Update Purpose after archive.
## Requirements
### Requirement: Siguiente paso derivado por función pura
La guía contextual SHALL calcularse con una función pura y determinística que reciba el snapshot observado, la selección y la proyección de runtime, y devuelva un único siguiente paso. La UI SHALL NOT derivar el estado con condicionales repartidos en JSX ni con estado local que no provenga de la evidencia.

#### Scenario: Misma evidencia produce la misma guía
- **WHEN** la función recibe dos veces el mismo snapshot, selección y proyección
- **THEN** devuelve el mismo siguiente paso, sin depender de reloj, orden de render ni estado previo

#### Scenario: Estados superpuestos resuelven por prioridad declarada
- **WHEN** coinciden una decisión pendiente, una sesión activa y una tarea pendiente
- **THEN** se aplica el orden decisión > sesión activa > fallo o reintento > tarea pendiente > validación > archivo, y se expone un solo siguiente paso

### Requirement: Datos de vista previa nunca ejecutan procesos reales
Con un fixture de desarrollo en pantalla, el siguiente paso SHALL declararse como vista previa y SHALL NOT ofrecer ninguna acción capaz de iniciar, detener o controlar una sesión real. El estado de fixture SHALL propagarse hasta el lanzador, no sólo hasta la proyección.

#### Scenario: Fixture activo no habilita el lanzador
- **WHEN** la vista se abre con un fixture de desarrollo seleccionado
- **THEN** la guía se identifica como vista previa y el lanzador queda bloqueado con su motivo visible, sin poder iniciar una sesión contra el repositorio real

#### Scenario: Fixture activo no genera acción ejecutable
- **WHEN** se deriva el siguiente paso desde un snapshot de fixture
- **THEN** el resultado no contiene ninguna acción que invoque el arranque de runtime

### Requirement: Sin cambio activo la guía distingue explorar de proponer
Sin cambio activo seleccionado, la guía SHALL ofrecer dos caminos diferenciados en una línea cada uno: proponer una tarea ya definida y explorar una idea todavía difusa. SHALL NOT exigir conocimiento previo de los comandos `/opsx:*`.

#### Scenario: Repositorio sin cambios activos
- **WHEN** el snapshot no reporta cambios activos
- **THEN** la guía presenta una acción primaria hacia Propose y una secundaria hacia Explore, cada una con su diferencia explicada

#### Scenario: Cambio archivado seleccionado
- **WHEN** la selección corresponde a un cambio archivado
- **THEN** la guía informa que ese trabajo terminó y ofrece empezar otro cambio, sin presentar acciones de Apply ni de Archive

### Requirement: Proponer un cambio exige objetivo y nombre válido
El flujo de Propose SHALL requerir un objetivo en lenguaje natural y un nombre de cambio que cumpla el mismo contrato de slug que OpenSpec. Las restricciones SHALL ser opcionales. El arranque SHALL quedar deshabilitado mientras falte el objetivo o el slug sea inválido, y los errores SHALL anunciarse junto al campo de forma accesible.

#### Scenario: Objetivo vacío
- **WHEN** la persona intenta iniciar sin escribir el objetivo
- **THEN** no se inicia ninguna sesión y el error queda asociado al campo correspondiente

#### Scenario: Slug inválido
- **WHEN** el nombre del cambio no cumple el contrato de slug
- **THEN** no se inicia ninguna sesión y se señala el campo del nombre

#### Scenario: Restricciones vacías no ensucian la instrucción
- **WHEN** se inicia una propuesta sin completar restricciones
- **THEN** la instrucción generada omite esa línea en lugar de emitirla vacía

### Requirement: Explorar no crea artefactos ni cambios activos
El flujo de Explore SHALL pedir una sola descripción y SHALL NOT registrar un cambio activo ni artefactos por sí solo. La instrucción generada SHALL asociar `changeId` nulo.

#### Scenario: Exploración iniciada
- **WHEN** se inicia una exploración con su descripción
- **THEN** la sesión arranca sin `changeId` y la navegación no muestra un cambio activo nuevo

### Requirement: Continuar una tarea conserva el contexto observado
La acción de continuar SHALL componer la instrucción de Apply con el identificador de cambio y el identificador de tarea leídos de la evidencia, sin pedir que la persona reescriba el prompt. La instrucción completa SHALL quedar bajo divulgación progresiva.

#### Scenario: Continuación de la próxima tarea pendiente
- **WHEN** existe un cambio activo con tareas pendientes y no hay sesión en curso
- **THEN** la guía nombra la próxima tarea y la acción primaria arranca con ese cambio y esa tarea asociados

#### Scenario: La instrucción no se impone como primer campo
- **WHEN** se muestra la acción de continuar
- **THEN** el texto completo de la instrucción sólo aparece al pedirlo explícitamente

### Requirement: Una sesión por repositorio
Con una sesión activa, la guía SHALL informar que el agente está trabajando y SHALL NOT ofrecer una acción que inicie otra sesión sobre el mismo repositorio.

#### Scenario: Intento de arranque con sesión viva
- **WHEN** la proyección declara una sesión activa
- **THEN** las acciones de arranque quedan deshabilitadas y la guía dirige a la actividad

#### Scenario: Pausa sólo con capability declarada
- **WHEN** la sesión activa no declara la capability de pausar tras la tarea
- **THEN** esa acción secundaria no se ofrece

### Requirement: El resultado se lee de la evidencia, no del fin del proceso
Al cerrar una sesión, el progreso SHALL releerse desde `tasks.md` y la validación desde su resultado real. Un proceso terminado SHALL NOT interpretarse como tarea completada ni como propuesta creada.

#### Scenario: Sesión termina sin mover el progreso
- **WHEN** la sesión cierra y `tasks.md` no registra tareas nuevas completadas
- **THEN** la guía informa que la sesión terminó pero la tarea sigue pendiente, y ofrece reintentarla con la misma instrucción

#### Scenario: Propuesta que no creó el cambio
- **WHEN** una sesión de Propose termina y el cambio no existe de forma verificable
- **THEN** no se selecciona ningún cambio nuevo ni se declara la propuesta exitosa

#### Scenario: Sesión fallida o interrumpida
- **WHEN** el resultado de la sesión es fallido o interrumpido
- **THEN** la guía ofrece reintentar la misma tarea y consultar la última actividad

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

### Requirement: Sin runtime lanzable la salida es accionable
Cuando ningún runtime resulta lanzable, la guía SHALL mostrar los diagnósticos reales del descubrimiento, indicando qué runtime falta o es incompatible y cómo volver a comprobarlo. SHALL NOT simular una instalación ni ejecutar shells arbitrarios desde el renderer.

#### Scenario: Ningún runtime disponible
- **WHEN** el descubrimiento no devuelve runtimes lanzables
- **THEN** se muestran los diagnósticos por runtime y una forma de reintentar la comprobación, sin ofrecer un arranque que fallaría

#### Scenario: Runtime instalado pero incompatible
- **WHEN** un runtime está instalado y su versión queda fuera de la base auditada
- **THEN** aparece deshabilitado con el motivo declarado por el adaptador

### Requirement: Guía densa, contextual y traducida
La guía SHALL adoptar la forma mínima que el contexto ya permita. Con un cambio activo, donde el ciclo de vida ya indica la etapa y la acción nombra su tarea, SHALL reducirse a una sola frase sobre la barra de acciones, sin bloque ni encabezado propios. Sin cambio activo o con uno archivado, donde no hay ni ciclo ni tareas que mostrar, SHALL presentarse como bloque compacto con a lo sumo etiqueta de estado, título corto, una frase, una acción primaria y una secundaria. En ningún caso SHALL introducir onboarding permanente ni textos explicativos extensos, ni duplicar un control que ya exista en pantalla. Toda string nueva SHALL existir en español, inglés y chino.

#### Scenario: Cambio activo seleccionado
- **WHEN** hay un cambio activo con su ciclo de vida y su lista de tareas a la vista
- **THEN** la guía aporta una única frase y la barra de acciones, sin repetir la etapa ni envolverse en un bloque aparte

#### Scenario: Sin alternativa real
- **WHEN** el estado no ofrece una segunda opción significativa
- **THEN** no se renderiza una acción secundaria de relleno

#### Scenario: Cobertura de idiomas
- **WHEN** se agrega una string a la guía
- **THEN** existe su equivalente en los tres idiomas soportados

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

