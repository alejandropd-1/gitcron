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
La guía SHALL adoptar la forma mínima que el contexto ya permita. Con un cambio activo, donde el ciclo de vida ya indica la etapa y la acción nombra su tarea, SHALL reducirse a una sola frase sobre la barra de acciones, sin bloque ni encabezado propios. Sin cambio activo o con uno archivado, donde no hay ni ciclo ni tareas que mostrar, SHALL presentarse como bloque compacto con a lo sumo etiqueta de estado, título corto, una frase, una acción primaria y una secundaria. En ningún caso SHALL introducir onboarding permanente ni textos explicativos extensos, ni duplicar un control que ya exista en pantalla. Cuando la acción primaria derivada ya ofrezca archivar el cambio, SHALL NOT renderizarse además el botón de archivar siempre visible, porque ambos tendrían mismo texto y mismo efecto. Toda string nueva SHALL existir en español, inglés y chino.

#### Scenario: Cambio activo seleccionado
- **WHEN** hay un cambio activo con su ciclo de vida y su lista de tareas a la vista
- **THEN** la guía aporta una única frase y la barra de acciones, sin repetir la etapa ni envolverse en un bloque aparte

#### Scenario: Sin alternativa real
- **WHEN** el estado no ofrece una segunda opción significativa
- **THEN** no se renderiza una acción secundaria de relleno

#### Scenario: Cobertura de idiomas
- **WHEN** se agrega una string a la guía
- **THEN** existe su equivalente en los tres idiomas soportados

#### Scenario: Archivar ya ofrecido como acción primaria
- **WHEN** la validación del cambio está aprobada y no quedan tareas pendientes, de modo que la acción primaria derivada es archivar
- **THEN** no se renderiza además el botón de archivar siempre visible, para no presentar dos controles con el mismo texto y el mismo efecto

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

### Requirement: La lista de cambios activos es acotada y navegable

La lista de cambios activos SHALL tener un alto acotado y desplazamiento propio, de modo que todo
cambio activo sea alcanzable y las secciones siguientes del navegador queden accesibles sin
recorrerla entera. Ningún cambio activo SHALL quedar fuera de vista sin señal de que existe.

#### Scenario: Más cambios activos que alto disponible

- **WHEN** los cambios activos no entran en el alto de su sección
- **THEN** la lista se desplaza dentro de su propio espacio y las secciones siguientes siguen accesibles

### Requirement: Desplegar un cambio es una acción pedida, no un efecto de seleccionarlo

Un cambio SHALL desplegar su detalle sólo cuando se lo pide con el control destinado a eso.
Seleccionar un cambio SHALL NOT desplegarlo, y ningún elemento de la lista SHALL aparecer o
desaparecer de la vista como efecto lateral de una acción distinta.

Desplegar el seleccionado ocupaba varias veces el alto de un ítem plegado, así que al cambiar la
selección se plegaba el anterior y aparecía un cambio hasta entonces invisible. Un elemento que se
descubre por rebote de otra acción no está realmente presentado.

#### Scenario: Selección de un cambio

- **WHEN** se selecciona un cambio de la lista
- **THEN** el cambio queda seleccionado y su detalle permanece plegado hasta que se lo pida

#### Scenario: Despliegue explícito

- **WHEN** se activa el control de desplegado de un cambio
- **THEN** ese cambio muestra su detalle, con independencia de cuál esté seleccionado

### Requirement: Pipeline no inventa superficies de aviso propias

Los avisos de Pipeline SHALL emitirse por la superficie de notificaciones de la aplicación, y
Pipeline SHALL NOT construir una propia para lo mismo. Una segunda superficie obliga a mirar dos
lugares distintos para enterarse de la misma clase de cosa, y duplica autocierre, cierre manual y
animación que ya están resueltos.

Los avisos de mensaje simple SHALL ajustarse a su contenido, con un tope de ancho. Un aviso de
cuatro palabras no debe ocupar el ancho máximo. Los avisos que presentan acciones SHALL conservar
un ancho estable, porque ahí el ancho sostiene la disposición de los controles.

#### Scenario: Archivado exitoso

- **WHEN** un cambio se archiva con éxito
- **THEN** el aviso aparece en la superficie de notificaciones de la aplicación, nombrando el cambio

#### Scenario: Aviso corto

- **WHEN** el texto de un aviso simple es más angosto que el tope
- **THEN** el aviso ocupa el ancho de su contenido y no el tope

### Requirement: El progreso se percibe donde ocurre

Mientras se relee la evidencia, el progreso SHALL declararse también en el elemento que va a
cambiar, no sólo en un indicador global. Seleccionar un cambio dispara una relectura tras la cual
se completa el ciclo de vida y se habilitan acciones; sin señal en ese mismo lugar, la espera se
lee como que la aplicación no respondió.

#### Scenario: Relectura tras seleccionar un cambio

- **WHEN** hay una relectura de evidencia en curso
- **THEN** el ciclo de vida del cambio declara visualmente que está actualizándose

#### Scenario: Sin relectura

- **WHEN** no hay ninguna relectura en curso
- **THEN** el ciclo de vida se muestra en reposo, sin señal de actividad

### Requirement: Lo que la aplicación confirma en Git se refleja en sus vistas

Cuando la aplicación crea commits por su cuenta, SHALL avisar que el historial cambió, y las vistas
de Git SHALL releer historial, estado y ramas. Un commit hecho por la aplicación SHALL NOT quedar
invisible en su propio grafo.

El aviso de cambios en el árbol no alcanza: relee el estado de los archivos, no el historial. Sin
una señal propia, la única forma de comprobar que el commit ocurrió es mirar por fuera de la
aplicación.

#### Scenario: Archivado con commits

- **WHEN** se archiva un cambio confirmando también en Git
- **THEN** el historial, el estado y las ramas se releen, y los commits nuevos aparecen en el grafo

#### Scenario: Archivado sin commits

- **WHEN** se archiva sin confirmar en Git
- **THEN** no se emite el aviso de historial cambiado

### Requirement: Los controles de una acción son alcanzables a cualquier alto de ventana

Un panel de confirmación SHALL mantener sus controles alcanzables aunque su contenido supere el
alto disponible, desplazándose dentro de sí mismo en lugar de empujarlos fuera de pantalla.

Un contenedor que centra su contenido SHALL NOT recortar el comienzo al desbordar, porque ese
recorte no se puede alcanzar con scroll.

#### Scenario: Ventana baja

- **WHEN** el panel de confirmación no entra en el alto disponible
- **THEN** el panel se desplaza dentro de su espacio y sus botones siguen a la vista

#### Scenario: Contenido que desborda una ficha centrada

- **WHEN** el contenido de una ficha centrada supera el alto disponible
- **THEN** se alinea al comienzo y se puede recorrer entero, sin recorte inalcanzable

### Requirement: El centro se recorre como una sola pieza

El área central SHALL tener un único desplazamiento y sus regiones SHALL NOT desplazarse por su
cuenta. Un contenido que aparece —como la confirmación de un archivado— SHALL empujar a lo que
sigue, y SHALL NOT reemplazarlo ni retirarlo.

Varias áreas desplazables se reparten un alto que ya es escaso: en ventanas bajas los controles
quedan encimados sobre el contenido o fuera de alcance. Y retirar lo de abajo para hacer lugar
oculta contexto que la persona no pidió esconder.

#### Scenario: Confirmación abierta en una ventana baja

- **WHEN** se abre la confirmación de archivado y el alto disponible es escaso
- **THEN** empuja hacia abajo el contenido que sigue, y todo se recorre con un solo desplazamiento

#### Scenario: Contenido que sigue presente

- **WHEN** hay una confirmación abierta
- **THEN** el contenido de trabajo sigue estando, debajo, alcanzable con el mismo desplazamiento

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

### Requirement: Preparar el commit sin confirmarlo
La aplicación SHALL poder dejar preparado el commit —archivos listos y mensaje sugerido escrito— y
SHALL NOT ejecutar el commit ni ninguna operación que publique. Confirmar SHALL seguir siendo una
acción explícita en el flujo de commit existente.

La preparación SHALL vivir a nivel del repositorio, en su propia superficie, y SHALL NOT depender de
que haya un cambio seleccionado ni de que exista algún cambio activo. La superficie SHALL alcanzarse
desde el estado del árbol que el panel ya declara. Los archivos que la persona elige sumar SHALL
poder sumarse todos a la vez, por grupo o de a uno. Tras preparar con éxito, la lista SHALL
reemplazarse por un resumen que declare cuántos archivos se enviaron, en vez de seguir mostrándolos
como pendientes.

El fundamento es que preparar y confirmar son decisiones distintas: una es reversible y la otra queda
en la historia. Fusionarlas fue lo que obligó a inventar un manifiesto declarado para saber qué
entraba, y a marcar una casilla para registrar que alguien había mirado. El nivel importa por una
razón aparte: el commit describe el estado del árbol, no el de un cambio, y atarlo a la selección
dejaba estados reales sin ninguna superficie desde la cual prepararse —los restos de un archivado
sobre un repositorio sin cambios activos—. El resumen tras preparar quita la duda de si la acción
tuvo efecto.

#### Scenario: Repositorio con archivos sin confirmar
- **WHEN** se pide preparar el commit y hay archivos modificados elegidos
- **THEN** esos archivos quedan preparados y el mensaje sugerido queda escrito, sin que se ejecute
  ningún commit

#### Scenario: Preparación sin ningún cambio activo
- **WHEN** el repositorio no tiene ningún cambio activo pero sí archivos modificados
- **THEN** la superficie de preparación sigue siendo alcanzable y permite preparar esos archivos

#### Scenario: Nada que preparar
- **WHEN** el árbol no tiene archivos modificados sin preparar
- **THEN** la preparación no se ofrece, y no se prepara ni se escribe nada

#### Scenario: Sumar todos los archivos a la vez
- **WHEN** hay archivos modificados y se elige sumarlos todos
- **THEN** todos ellos entran en la preparación sin tener que tildarlos uno por uno, y se puede
  deshacer esa elección con el mismo control

#### Scenario: Resumen tras preparar
- **WHEN** la preparación tiene éxito y ya no quedan archivos por preparar
- **THEN** la lista se reemplaza por un texto que declara cuántos archivos se enviaron a commit, en
  vez de seguir mostrándolos como pendientes

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

### Requirement: El grafo de artefactos se lee del estado real
La aplicación SHALL obtener el estado de los artefactos de un cambio desde el CLI de OpenSpec, leyendo su grafo de dependencias con estados `blocked` / `ready` / `done`, las dependencias faltantes de cada artefacto y los requisitos de `apply`. La lectura SHALL ejecutarse sólo para el cambio seleccionado: el spawn del CLI es costoso y el watcher refresca en cada guardado, así que leerlo para todos los cambios activos pagaría un costo que ningún consumidor usa.

El fundamento es que el panel Pipeline se está convirtiendo en la interfaz visual de OpenSpec, y OpenSpec abandonó el modelo de fases a favor de un grafo de dependencias. Sin leer ese grafo, el panel no puede reflejar qué artefacto bloquea a cuál ni qué falta para que `apply` esté listo, y termina adivinando con un ciclo de vida fijo que no coincide con la realidad del cambio.

#### Scenario: Cambio seleccionado transporta el grafo
- **WHEN** se selecciona un cambio activo y la lectura del CLI del grafo está disponible
- **THEN** el cambio transporta el estado de cada artefacto, sus dependencias faltantes y los requisitos de `apply`

#### Scenario: Los cambios no seleccionados no pagan el costo
- **WHEN** hay varios cambios activos pero sólo uno está seleccionado
- **THEN** la lectura del grafo se invoca una sola vez y los cambios no seleccionados transportan el campo como nulo

#### Scenario: El CLI no pudo ejecutarse
- **WHEN** la invocación del CLI del estado no puede ejecutarse o falla
- **THEN** el campo declara que no está disponible sin confundir esa indisponibilidad con un grafo vacío, y el resto del snapshot sigue llegando

### Requirement: La instrucción no depende de comandos instalados en el runtime
La instrucción que la guía entrega a un runtime SHALL ser autosuficiente: SHALL NOT requerir que ese
runtime tenga instalado ningún comando propio de una extensión. SHALL nombrar la acción a realizar y
los comandos del CLI de OpenSpec que la respaldan, de modo que cualquier ejecutor pueda cumplirla.

El fundamento es que los comandos de extensión se instalan por runtime y su ausencia no se anuncia:
un ejecutor que no los tiene responde que no conoce el comando y termina sin hacer nada. Ya ocurrió
con el archivado, donde la sesión cerraba en milisegundos y la aplicación declaraba éxito. Delegar
en el runtime un conocimiento que la guía puede expresar convierte una diferencia de instalación en
una acción que no ocurre.

#### Scenario: Runtime sin los comandos de la extensión
- **WHEN** se lanza una sesión con un runtime que no tiene instalados los comandos de OpenSpec
- **THEN** la instrucción alcanza para realizar la acción, porque nombra los comandos del CLI en vez
  de invocar uno de la extensión

#### Scenario: Runtime que sí los tiene
- **WHEN** se lanza una sesión con un runtime que sí los tiene instalados
- **THEN** la instrucción sigue siendo válida y describe el mismo trabajo

### Requirement: La instrucción declara el cambio y la tarea sobre los que se trabaja
Toda instrucción de implementación SHALL nombrar el cambio y la tarea concretos, y SHALL incluir el
texto de esa tarea. Una instrucción que sólo nombre el cambio SHALL NOT considerarse suficiente.

El fundamento es que sin la tarea explícita el ejecutor elige por su cuenta cuál seguir, y la guía
pierde la correspondencia entre lo que ofreció y lo que se hizo.

#### Scenario: Continuar una tarea concreta
- **WHEN** la guía ofrece continuar una tarea y se lanza la sesión
- **THEN** la instrucción nombra el cambio, el identificador de la tarea y su texto

### Requirement: Cada archivo declara su procedencia
La preparación SHALL mostrar de dónde viene cada archivo modificado: del cambio seleccionado, de
otro cambio activo —nombrándolo—, de un archivado, o sin atribuir. SHALL NOT presentar en una misma
lista indistinta todo lo que no pertenece al cambio.

El fundamento es que la atribución existe y hoy se descarta: un archivo bajo la carpeta de un cambio
dice a cuál pertenece. Ocultarlo obliga a recordar qué se tocó en cada trabajo, que es el esfuerzo
que la preparación existe para ahorrar.

#### Scenario: Varios trabajos encimados
- **WHEN** el árbol tiene archivos de más de un cambio activo y restos de un archivado
- **THEN** cada archivo aparece bajo el grupo que le corresponde, y los de otro cambio muestran de
  cuál son

#### Scenario: Código sin atribuir
- **WHEN** un archivo modificado no pertenece a ningún cambio de forma verificable
- **THEN** aparece como sin atribuir, y no se le adjudica un cambio por proximidad ni por orden

### Requirement: El estado de cada archivo se ve
La preparación SHALL indicar el estado de cada archivo —modificado, agregado, borrado, renombrado o
sin seguimiento— con la misma representación que ya usa la aplicación para el área de preparación de
Git.

El fundamento es que borrar y agregar son decisiones distintas y hoy se ven iguales. Reutilizar la
representación existente evita que la misma información se lea de dos maneras según la pantalla.

#### Scenario: Archivos en distintos estados
- **WHEN** la lista incluye archivos agregados, modificados y borrados
- **THEN** cada uno muestra su estado con el distintivo correspondiente

### Requirement: El mensaje se deriva de lo que se va a preparar
El mensaje sugerido SHALL derivarse del conjunto completo de archivos que la preparación va a
incluir, contando los elegidos a mano. SHALL NOT calcularse sólo sobre los atribuibles al cambio.

El fundamento es que el alcance del mensaje describe el commit que se va a hacer. Calcularlo sobre
un subconjunto produce una sugerencia que no corresponde a lo que se confirma, y con ningún archivo
propio no puede derivar nada.

#### Scenario: Todo elegido a mano
- **WHEN** el cambio no tiene archivos propios y se eligen archivos sin atribuir para sumar
- **THEN** el mensaje sugerido refleja el alcance de esos archivos elegidos

#### Scenario: Propios y elegidos juntos
- **WHEN** se preparan archivos propios del cambio junto con otros elegidos a mano
- **THEN** el mensaje se deriva de ambos conjuntos

### Requirement: El contenido del panel se puede copiar
El texto que la guía muestra —rutas de archivo, mensajes y títulos de tarea— SHALL poder
seleccionarse y copiarse.

El fundamento es que son datos que se usan afuera: una ruta se pega en una terminal, un título se
cita en otro lado. Impedir la selección obliga a transcribir a mano lo que ya está en pantalla.

#### Scenario: Copiar una ruta de la lista
- **WHEN** se selecciona el texto de una ruta mostrada en la preparación
- **THEN** el texto queda disponible para copiar

### Requirement: El panel abre en el estado del repositorio
El panel SHALL abrir mostrando el estado del repositorio y SHALL NOT entrar a ningún cambio que la
persona no haya elegido. Entrar a un cambio SHALL ser una acción explícita, y volver al estado del
repositorio SHALL seguir siendo posible después de haber entrado. La pantalla de entrada SHALL
declarar los cambios en curso con su avance de tareas, lo archivado y las especificaciones, y SHALL
ofrecer abrir un cambio nuevo.

La guía del siguiente paso SHALL presentarse antes que las listas, de modo que su posición no dependa
de cuántos cambios haya. Cada cambio en curso SHALL poder desplegarse para ver sus tareas pendientes,
plegado por defecto. Los cambios archivados SHALL poder verse todos y SHALL poder abrirse desde ahí,
sin que una cuenta sea el único acceso.

El fundamento es que un cambio elegido por orden de lista no es información: el panel entraba al
primero de `activeChanges` y mostraba sus tareas como si fueran el asunto del momento, sin que nada
distinguiera esa elección de una deliberada. Mostrar primero el panorama es lo que permite decidir por
dónde seguir, que es la pregunta real al abrir la herramienta.

Que la guía vaya primero tiene su propio fundamento: es la acción que la pantalla existe para ofrecer,
y renderizada al final quedaba empujada fuera de vista por la lista de cambios. Que se vean las tareas
pendientes importa porque saber que van cinco de seis no dice cuál es la sexta, que es con lo que se
decide. Que los archivados sean alcanzables importa porque una cuenta sin lista deja inaccesible todo
lo que no entre en el acceso rápido de la barra lateral.

#### Scenario: Apertura con varios cambios en curso
- **WHEN** se abre el panel en un repositorio con más de un cambio activo y sin elección previa
- **THEN** se muestra el estado del repositorio con cada cambio y su avance, y no se entra a ninguno

#### Scenario: Entrar a un cambio
- **WHEN** se elige un cambio desde la pantalla de entrada o desde la lista
- **THEN** el panel muestra ese cambio, y esa elección se informa como el cambio en pantalla

#### Scenario: Abrir un cambio nuevo desde la entrada
- **WHEN** se pide empezar un trabajo nuevo desde la pantalla de entrada
- **THEN** el flujo de creación queda disponible sin tener que entrar antes a un cambio ajeno

#### Scenario: Ver qué falta en un cambio
- **WHEN** se despliega un cambio en curso desde la pantalla de entrada
- **THEN** se ven sus tareas pendientes, y las ya hechas no se listan

#### Scenario: Llegar a un archivado que no está entre los recientes
- **WHEN** el repositorio tiene más archivados de los que entran en el acceso rápido de la barra
  lateral
- **THEN** la pantalla de entrada permite verlos todos y abrir cualquiera de ellos

### Requirement: La correspondencia entre rama y cambio se declara sin navegar
Cuando el estado del repositorio identifica un cambio a partir de la rama actual, el panel SHALL
señalarlo en la pantalla de entrada y SHALL NOT entrar a ese cambio por su cuenta. La señal SHALL
distinguirse de la elección de una persona.

El fundamento es que esa correspondencia es el dato más útil para decidir por dónde seguir, y gastarlo
en saltar adentro lo vuelve invisible: quien llegaba a un cambio no podía distinguir si estaba ahí
porque su rama lo identificaba o porque era el primero de la lista.

#### Scenario: La rama identifica un cambio
- **WHEN** el estado del repositorio informa un cambio derivado de la rama actual
- **THEN** ese cambio queda señalado en la pantalla de entrada, sin que el panel entre a él

#### Scenario: La rama no identifica ninguno
- **WHEN** el estado del repositorio no informa ningún cambio para la rama actual
- **THEN** la pantalla de entrada no señala ninguno y no se elige uno por descarte

### Requirement: Un repositorio sin nada archivado no se lee como vacío
El panel SHALL declarar el estado de un repositorio que tiene cambios en curso y ningún archivado
como lo que es —trabajo abierto que todavía no llegó a su primer archivado— y SHALL NOT presentarlo
sólo como una cuenta en cero junto a las demás. Las cuentas que significan ausencia de trabajo y las
que significan trabajo sin cerrar SHALL distinguirse entre sí.

El fundamento es que un cero de archivados y un cero de cambios activos significan cosas opuestas: el
primero es el estado normal de cualquier proyecto antes de su primer archivado, y el segundo es un
repositorio sin trabajo abierto. Presentarlos igual hace que un repositorio con la mayoría de sus
tareas hechas se lea como uno donde no pasó nada. Es el mismo principio por el que un valor
desconocido no se muestra como cero, aplicado a un cero que no significa ausencia.

#### Scenario: Repositorio antes de su primer archivado
- **WHEN** el repositorio tiene cambios activos, ninguno archivado y ninguna especificación
- **THEN** la pantalla declara que todavía no se archivó nada y muestra el avance real de los cambios
  en curso, en vez de presentar el estado como vacío

#### Scenario: Repositorio sin ningún trabajo abierto
- **WHEN** el repositorio no tiene ningún cambio activo
- **THEN** la pantalla lo declara como tal y ofrece empezar uno, distinguiéndolo del caso anterior

### Requirement: La actividad mostrada corresponde al cambio abierto
Con un cambio abierto, la columna de actividad SHALL mostrar únicamente sesiones de ese cambio, y
SHALL NOT mostrar sesiones de otro ni de ninguna sin atribuir. Cuando el cambio abierto no tiene
ninguna sesión registrada, la columna SHALL declararlo y SHALL NOT caer a la sesión de otro cambio.
Sin ningún cambio abierto, la columna SHALL mostrar todas las sesiones del repositorio y SHALL declarar
que lo mostrado es lo último del repositorio.

La columna SHALL declarar cuándo corrió la sesión que muestra, en su encabezado, sin depender de que
haya más de una sesión para elegir.

El fundamento es que el resto del panel central es del cambio abierto —sus tareas, sus artefactos, su
validación—, así que una columna al lado con otro criterio se lee como si fuera de ese cambio. El modo
de fallo es silencioso: nada declara la discrepancia, y notarla exige reconocer que la sesión que se
está leyendo no corresponde a lo que se está mirando. Un cambio sin sesiones es un estado normal
—recién creado, o trabajado desde afuera de la aplicación—, y mostrar la de otro para no dejar el
espacio vacío es justamente lo que produce la lectura equivocada. Sin cambio abierto el contexto es el
repositorio entero, y ahí no hay contra qué restringir.

Que se declare cuándo corrió responde a un defecto observado: sin cambio abierto la columna cae a la
última sesión del repositorio, que puede ser de días atrás, y el encabezado declaraba el ejecutor y el
estado pero no la fecha. La fecha vivía sólo en el selector de sesiones, que no se muestra cuando hay
una sola —que es justamente el caso donde más falta—. Sin esa marca, una sesión vieja se lee como
actividad en curso.

#### Scenario: Sesión más reciente perteneciente a otro cambio
- **WHEN** hay un cambio abierto y la sesión más reciente del repositorio pertenece a otro
- **THEN** la columna muestra la sesión del cambio abierto, y la del otro no aparece ni se ofrece para
  elegir

#### Scenario: Cambio abierto sin sesiones registradas
- **WHEN** el cambio abierto no tiene ninguna sesión
- **THEN** la columna declara que no hay actividad registrada para ese cambio, en vez de mostrar la de
  otro

#### Scenario: Corrida activa en otro cambio
- **WHEN** hay una sesión corriendo que pertenece a un cambio distinto del abierto
- **THEN** esa sesión no se muestra en la columna del cambio abierto

#### Scenario: Sin ningún cambio abierto
- **WHEN** el panel está en el estado del repositorio, sin cambio abierto
- **THEN** la columna muestra todas las sesiones del repositorio y declara que lo mostrado es lo último
  del repositorio

#### Scenario: Cuándo corrió lo que se muestra
- **WHEN** la columna muestra una sesión, haya una sola o varias
- **THEN** declara cuándo corrió, sin que haya que abrir el selector de sesiones

### Requirement: Empezar un cambio puede crear su rama
Al empezar un cambio con la tarea clara, la aplicación SHALL poder crear la rama `change/<slug>` y dejar
el repositorio parado en ella antes de lanzar la sesión. Esa creación SHALL declararse en el formulario
antes de ocurrir y SHALL poder desactivarse; desactivada, la aplicación SHALL NOT ejecutar ninguna
operación de Git.

Si la rama no se puede crear, la aplicación SHALL informar el motivo real y SHALL NOT lanzar la sesión.
SHALL NOT cambiarse a una rama existente con ese nombre por su cuenta.

El fundamento es que un archivo de código no se puede atribuir a un cambio: ese dato no existe en el
repositorio, y por eso el panel de preparación sólo puede declarar de qué tipo es cada archivo sin cambio
que lo reclame. Una rama por cambio resuelve la atribución con el mecanismo propio de Git, sin inventar
registro alguno.

Que se declare y se pueda desactivar responde a que es una escritura de Git, y en este proyecto las
escrituras nuevas se autorizan explícitamente. Que un fallo detenga el arranque responde a que la persona
acaba de leer que se iba a trabajar en `change/<slug>`: arrancar en otra rama sería divergencia entre lo
declarado y lo ejecutado. Que no se reutilice una rama existente responde a que arrastraría los commits de
un trabajo anterior, que es una decisión con consecuencias y no algo que corresponda adivinar.

#### Scenario: Cambio nuevo con la rama activada
- **WHEN** se empieza un cambio con la tarea clara y la creación de la rama está activada
- **THEN** se crea `change/<slug>`, el repositorio queda parado en ella, y recién entonces se lanza la
  sesión

#### Scenario: Creación de la rama desactivada
- **WHEN** se empieza un cambio con la creación de la rama desactivada
- **THEN** la sesión se lanza sin que se ejecute ninguna operación de Git

#### Scenario: La rama no se puede crear
- **WHEN** la creación de la rama falla, por existir ya o por cualquier otro motivo
- **THEN** se informa el motivo real y la sesión no se lanza

### Requirement: La superficie de preparación declara su contexto
El panel de preparación SHALL declarar la rama a la que va el commit, en la misma superficie donde se
elige qué entra y se corrige el mensaje. La aplicación SHALL NOT ofrecer desde ahí ninguna operación
que cambie de rama ni ninguna otra escritura de Git.

Mientras el panel está abierto, la columna lateral SHALL mostrar los archivos que ya están preparados,
con su estado, y SHALL declarar qué está mostrando. Al cerrarse el panel, la columna SHALL volver a su
contenido habitual. Esa lista SHALL ser una vista y SHALL NOT ofrecer controles que dupliquen acciones
del flujo de commit.

El fundamento es que un commit lo definen tres cosas —qué archivos, con qué mensaje, a qué rama— y la
tercera no estaba en la superficie donde se deciden las otras dos. Hoy pasa desapercibido porque la
rama siempre es la misma; deja de pasarlo en cuanto haya más de una.

Lo preparado se muestra porque el panel filtra los archivos ya staged para que el conteo baje al
preparar y no se ofrezcan dos veces. Esa decisión es correcta y tiene un efecto no buscado: deja
invisible la mitad del estado. Con lo que falta mandar de un lado y lo que ya está listo del otro, el
estado del commit se lee completo sin cambiar de pantalla. Mostrar en la columna lo que **no** está
preparado sería repetir lo que el panel ya lista agrupado.

#### Scenario: Rama de destino a la vista
- **WHEN** el panel de preparación está abierto
- **THEN** declara la rama a la que va el commit, sin ofrecer cambiarla

#### Scenario: Lo ya preparado mientras se decide
- **WHEN** hay archivos preparados y el panel de preparación está abierto
- **THEN** la columna lateral los lista con su estado, declarando que son los ya preparados

#### Scenario: Nada preparado todavía
- **WHEN** el panel está abierto y no hay ningún archivo preparado
- **THEN** la columna lo declara, en vez de quedar vacía

#### Scenario: Cierre del panel
- **WHEN** se cierra el panel de preparación
- **THEN** la columna lateral vuelve a su contenido habitual

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

### Requirement: La guía distingue no haber elegido de no haber ninguno
La guía del siguiente paso SHALL distinguir el estado en que hay cambios en curso y ninguno elegido del
estado en que no hay ningún cambio activo, y SHALL NOT afirmar que no hay cambios cuando los hay. En el
primer caso SHALL declarar que se puede entrar a uno de los que hay o empezar otro. La distinción SHALL
resolverse en la derivación y SHALL NOT taparse en el render.

El fundamento es que el panel dejó de entrar a un cambio por descarte, así que «ningún cambio
seleccionado» pasó a ser el estado normal de la pantalla de entrada. La derivación siguió leyéndolo
como el estado raro de un repositorio vacío, y el resultado es una pantalla que lista cuatro cambios en
curso y debajo afirma que no hay ninguno. Corregirlo en el render dejaría la afirmación falsa intacta
para cualquier otro consumidor.

#### Scenario: Cambios en curso y ninguno elegido
- **WHEN** el repositorio tiene cambios activos y no hay ninguno seleccionado
- **THEN** la guía declara que se puede entrar a uno de los que hay o empezar otro, y no afirma que no
  haya cambios activos

#### Scenario: Repositorio sin ningún cambio activo
- **WHEN** el repositorio no tiene ningún cambio activo
- **THEN** la guía lo declara como tal y ofrece empezar uno

### Requirement: El formulario declara qué hace con lo que se escribe
El formulario para empezar un cambio SHALL declarar que lo que se escribe arma la instrucción que
recibe un ejecutor, y SHALL NOT dejar creer que se está escribiendo un artefacto. Cada campo SHALL
declarar dónde termina lo que se escribe en él. La declaración SHALL ir junto a cada campo y en una
frase al principio, y SHALL NOT presentarse como un bloque explicativo.

El fundamento es que nada de lo que se completa se guarda en un archivo: los campos componen un texto
que un ejecutor recibe, y es ese ejecutor el que escribe la propuesta, el diseño y las tareas. La
instrucción completa se ve recién en el paso siguiente, dentro del lanzador, así que entre completar el
formulario y verla hay un tramo en que no se sabe qué se está armando. Declarar dónde termina un campo
es declarar el efecto de un control, que es lo mismo que ya hace la ayuda del identificador al declarar
su formato.

#### Scenario: Naturaleza del formulario
- **WHEN** se abre el formulario para empezar un cambio con la tarea clara
- **THEN** declara que lo que se escriba arma la instrucción para un ejecutor, no los artefactos

#### Scenario: Destino de cada campo
- **WHEN** se completa cualquiera de los campos del formulario
- **THEN** ese campo declara dónde termina lo que se escribe en él

### Requirement: El estado de los artefactos se lee del grafo de OpenSpec

El panel SHALL mostrar, para el cambio seleccionado, el estado de cada artefacto de planificación
tal como lo devuelve `openspec status --json`, y SHALL NOT derivarlo de un modelo propio. El estado
de cada artefacto (`done`, `ready` o `blocked`) SHALL leerse del campo `status.artifacts` del cambio
seleccionado, y cuando un artefacto esté `blocked` SHALL declarar qué dependencias le faltan.

La superficie del grafo SHALL mostrarse junto a los artefactos del cambio seleccionado. Cuando el
grafo no exista —`status` ausente, o `available: false` por un CLI que no pudo correr— la superficie
SHALL NOT renderizarse, y SHALL NOT inventarse un estado derivado de las tareas o la validación como
sustituto. La barra de fases del encabezado y el contador «Paso N de 5» SHALL NOT modificarse en
esta pasada.

Lo que se rompe si no se cumple: el dato que `consume-openspec-status` cableó hasta el renderer
sigue sin consumirse, y el panel continúa mostrando progreso por un modelo de fases que OpenSpec
abandonó, perdiendo la información de qué artefacto bloquea a cuál —que es justo lo que el grafo
trae y la derivación propia no puede producir.

#### Scenario: Cambio seleccionado con grafo completo

- **WHEN** el cambio seleccionado tiene `status` con todos sus artefactos en `done`
- **THEN** la superficie muestra cada artefacto declarado como `done` y no muestra dependencias faltantes

#### Scenario: Artefacto bloqueado declara qué lo bloquea

- **WHEN** un artefacto del cambio seleccionado está en `blocked` con `missingDeps` no vacío
- **THEN** la superficie muestra ese artefacto como `blocked` y declara las dependencias que le faltan

#### Scenario: Sin grafo no se dibuja la superficie

- **WHEN** el cambio seleccionado tiene `status` ausente o `available: false`
- **THEN** la superficie del grafo no se renderiza y no aparece ningún estado inventado en su lugar

#### Scenario: Cambio no seleccionado

- **WHEN** no hay cambio seleccionado
- **THEN** la superficie del grafo no se renderiza, porque el grafo sólo existe para el cambio seleccionado

### Requirement: El progreso no se declara como una secuencia de etapas fijas
El panel SHALL NOT presentar el trabajo de un cambio como una secuencia ordenada de etapas, y SHALL NOT
numerar una posición dentro de ella. El estado de cada artefacto SHALL declararse a partir del grafo
que devuelve el CLI, y las señales operativas —validación, avance de tareas, qué conviene hacer ahora—
SHALL seguir declarándose donde ya se derivan de evidencia.

El fundamento es que OpenSpec abandonó el modelo de fases: se puede trabajar sobre cualquier artefacto
habilitado en cualquier momento, y las dependencias habilitan en vez de bloquear el orden. Un contador
que declara una posición dentro de cinco etapas no es una imprecisión estética: enseña un orden
obligatorio que no existe, y lo enseña con la autoridad de la herramienta. Mientras convivió con el
grafo del CLI, el panel daba dos respuestas distintas a la misma pregunta y una era inventada.

Nada de lo que la secuencia mostraba queda sin respuesta: el estado por artefacto lo da el grafo, la
validación la declara la barra de evidencia, el avance de tareas la lista de cambios, y la acción
siguiente la guía. Retirar la secuencia quita una afirmación falsa sin quitar información.

#### Scenario: Cambio abierto
- **WHEN** se abre un cambio activo
- **THEN** el panel no muestra una secuencia de etapas ni una posición numerada dentro de ella

#### Scenario: La guía conserva su acción
- **WHEN** la guía del siguiente paso declara qué conviene hacer
- **THEN** ofrece su acción sin declarar una posición dentro de una secuencia

#### Scenario: El estado de los artefactos sigue disponible
- **WHEN** el cambio abierto transporta el grafo del CLI
- **THEN** el estado de cada artefacto sigue declarándose a partir de ese grafo

#### Scenario: Relectura de evidencia en curso
- **WHEN** la evidencia se está releyendo con un cambio abierto
- **THEN** el panel lo declara en el encabezado del cambio

### Requirement: Los controles del panel se distinguen por peso
Los controles del panel SHALL presentarse en niveles visualmente distinguibles según lo que hacen: la
acción principal sobre el repositorio, las acciones de apoyo, y los controles que despliegan o suman
dentro de una lista. Un nivel SHALL NOT depender de leer su texto para reconocerse. Los controles SHALL
presentarse a un tamaño que no obligue a acercarse, sin que el panel deje de ser denso en información.

Los títulos de grupo, su descripción y su lista SHALL separarse entre sí de modo que se lean como tres
cosas y no como un bloque.

El fundamento es que los controles se agregaron de a uno, cada uno resolviendo su caso, y ninguno se
decidió mirando a los otros: terminaron todos con el mismo tono sobre marco tenue. Un panel donde hay
que leer cada botón para saber cuál pesa más no es productivo, y la densidad que este proyecto busca es
de información, no de tamaño de letra.

#### Scenario: Acción principal frente a las de apoyo
- **WHEN** el panel ofrece a la vez su acción principal y acciones de apoyo
- **THEN** se distinguen entre sí sin leer sus textos

#### Scenario: Controles dentro de una lista
- **WHEN** un grupo o un cambio ofrece desplegar o sumar su contenido
- **THEN** ese control se presenta con un peso distinto del de las acciones sobre el repositorio

#### Scenario: Título, descripción y lista de un grupo
- **WHEN** un grupo declara qué contiene y lista sus archivos
- **THEN** el título, la descripción y la lista quedan separados entre sí

### Requirement: Los conteos concuerdan en número
Todo texto que muestre una cantidad SHALL concordar en número con esa cantidad. La elección entre
singular y plural SHALL resolverse en un solo lugar y SHALL NOT repetirse en cada punto de uso. En las
lenguas que no concuerdan en número, la variante singular SHALL existir igual con el texto que
corresponda.

El fundamento es que un texto que no concuerda delata que nadie miró el caso de uno, y el caso de uno
es el más frecuente al final de cualquier trabajo: la última tarea pendiente, el único archivo
preparado, el primer cambio archivado. Resolverlo en cada punto de uso garantiza que el próximo texto
con número se olvide.

#### Scenario: Una sola unidad
- **WHEN** un texto muestra una cantidad de uno
- **THEN** usa la variante singular

#### Scenario: Varias unidades
- **WHEN** un texto muestra una cantidad distinta de uno
- **THEN** usa la variante plural

### Requirement: El panel se puede recorrer con teclado
Cada control del panel SHALL declarar su estado de foco con un contorno de contraste suficiente, y
SHALL NOT quedarse con el contorno por defecto del navegador sobre superficies de color propio. Ningún
control SHALL desactivar su contorno sin declarar un reemplazo. El foco SHALL declararse en
`:focus-visible`, de modo que aparezca al recorrer con teclado y no al hacer clic.

Una acción que no está disponible SHALL seguir siendo alcanzable con el teclado y SHALL anunciarse como
deshabilitada, en vez de salir del orden de foco, cuando su ausencia impida descubrir que la acción
existe.

El fundamento es que este panel se validó siempre mirándolo, y hay defectos que sólo aparecen
recorriéndolo. El contorno por defecto sobre un botón relleno en tema oscuro casi no se distingue,
mientras el resto del panel declara todos sus estados: quien recorre con teclado pierde de vista dónde
está parado. Y la acción principal del panel está deshabilitada justo en el estado en que el panel se
abre —sin archivos elegidos—, así que sacarla del orden de foco la vuelve indescubrible para quien no
usa el mouse: no se puede aprender lo que no se puede alcanzar.

Que sea `:focus-visible` y no `:focus` responde a que el contorno informa dónde quedó el teclado; al
hacer clic la persona ya sabe dónde apretó, y el contorno ahí es ruido.

#### Scenario: Recorrido con teclado por los controles del panel
- **WHEN** se recorre el panel con el teclado
- **THEN** cada control declara que tiene el foco con un contorno visible

#### Scenario: Foco tras un clic
- **WHEN** se apreta un control con el mouse
- **THEN** no se dibuja el contorno de foco

#### Scenario: Acción principal sin archivos elegidos
- **WHEN** el panel está abierto y no hay ningún archivo elegido
- **THEN** la acción de preparar se puede alcanzar con el teclado, se anuncia como deshabilitada, y
  apretarla no prepara nada

### Requirement: Un control no desplaza a los demás al cambiar
Un control que alterna su texto o su cuenta SHALL reservar el espacio de su variante más larga, y SHALL
NOT desplazar a los elementos que tiene al lado al cambiar. Las cuentas SHALL alinearse por columna
para que un dígito más no corra el texto.

El fundamento es que tildar una casilla mueve hoy el título del panel y su descripción: «Sumar todos»
pasa a «Quitar todos» y «Elegidos: 0 de 5» pasa a «5 de 5», y las dos cosas arrastran a lo que tienen
alrededor. Una interfaz que se reacomoda cuando la acción no cambió de lugar obliga a volver a buscar
lo que se estaba mirando, y hace dudar de si se apretó lo que se quería.

#### Scenario: Elegir archivos en el panel de preparación
- **WHEN** se tildan archivos y los controles cambian de texto y de cuenta
- **THEN** el resto del encabezado del panel no se desplaza

#### Scenario: Cuenta que crece de un dígito a dos
- **WHEN** una cuenta pasa de una cifra a dos
- **THEN** el texto que la acompaña no se corre

### Requirement: El contenido de los artefactos se lee con ritmo
El texto de los artefactos SHALL presentarse con interlineado y separación entre bloques suficientes
para leer un documento largo, y la separación SHALL distinguir un encabezado de un párrafo en vez de
tratar todos los bloques por igual.

El fundamento es que `proposal.md` y `design.md` son documentos de prosa densa y largos, y el ritmo
tipográfico del panel se heredó de cuando mostraba fragmentos cortos: con todos los bloques a la misma
distancia no hay dónde descansar la vista ni cómo reconocer la estructura sin leerla.

#### Scenario: Documento largo en un artefacto
- **WHEN** se abre una propuesta o un diseño extensos
- **THEN** sus párrafos y encabezados se distinguen por su separación, no sólo por su tamaño

### Requirement: El estado del repositorio se lee en una línea
El control del encabezado que abre la preparación SHALL presentarse en una sola línea, sin marco propio
que lo separe de la barra que lo contiene, y SHALL declarar la rama de destino con el mismo tratamiento
que recibe dentro del panel de preparación. La acción SHALL conservar su forma de control.

El fundamento es que ese control hace una sola cosa y estaba maquetado como tres —rótulo, dato
secundario y pastilla, dentro de una caja sobre otra caja—. La rama es el destino del commit, el mismo
dato que el panel de preparación declara al lado del mensaje: mostrarlo igual en los dos lugares evita
que se lea como dos cosas distintas.

#### Scenario: Encabezado del panel
- **WHEN** el panel muestra el estado del repositorio y su acción de preparar
- **THEN** se leen en una sola línea y la rama se distingue del resto del texto

#### Scenario: La rama en los dos lugares
- **WHEN** la rama se declara en el encabezado y en el panel de preparación
- **THEN** recibe el mismo tratamiento visual en ambos

### Requirement: El visor renderiza las convenciones de la metodología
El visor de artefactos SHALL renderizar los seis niveles de encabezado de markdown como encabezados, y
SHALL NOT imprimir sus almohadillas como texto. Los niveles SHALL encajarse bajo la jerarquía de
encabezados de la página sin saltos y sin exceder el último nivel disponible. Las listas SHALL
mostrarse con su marcador.

El fundamento es que el nivel de cuatro almohadillas es el que la metodología usa para cada escenario
—es una regla suya que un escenario lleva exactamente cuatro— y era el único que el visor no
reconocía: cada `#### Scenario:` de cada requisito salía impreso crudo, con sus almohadillas a la
vista. Un visor que no entiende la convención más frecuente de lo que muestra no está mostrando el
documento, está mostrando su fuente a medias.

Las listas pierden su marcador por el reajuste global de estilos de la aplicación, que es correcto para
el resto del producto; el visor lo restituye para sí porque en un documento una lista tiene que
distinguirse de un párrafo indentado.

#### Scenario: Escenario de un requisito
- **WHEN** un artefacto contiene una línea de encabezado de cuatro almohadillas
- **THEN** se renderiza como encabezado y sus almohadillas no aparecen en pantalla

#### Scenario: Jerarquía del documento dentro de la página
- **WHEN** un artefacto usa varios niveles de encabezado
- **THEN** se encajan bajo los encabezados de la página en orden, sin saltar niveles

#### Scenario: Lista dentro de un artefacto
- **WHEN** un artefacto contiene una lista
- **THEN** sus ítems se muestran con marcador, distinguibles de un párrafo

### Requirement: No coexisten instrucciones que contradigan la metodología
El repositorio SHALL NOT contener artefactos que impartan instrucciones de trabajo a un ejecutor y
contradigan la metodología vigente. Un artefacto de ese tipo que quede obsoleto SHALL retirarse de las
rutas donde se lo encuentra al recorrer el repositorio, y SHALL conservarse como registro histórico
declarando que ya no rige y qué lo reemplazó.

El fundamento es el mismo que sostiene que la metodología viaje por el canal de la herramienta: un
ejecutor recorre el repositorio y toma como vigente lo que encuentra. Ya ocurrió una vez —un runtime
trabajó con reglas locales sin saber que había un flujo— y el requisito que salió de ahí obliga a
retirar la regla que contradice, no sólo a declarar la correcta. Mientras un archivo con una sección
titulada «modo de trabajo obligatorio» siga en la raíz, la declaración del canal compite con él en vez
de reemplazarlo.

Se conservan como registro y no se borran porque describen trabajos que se hicieron y explican
decisiones que siguen vivas en el código: lo que se retira es su autoridad, no su contenido.

#### Scenario: Instrucción obsoleta encontrada en el repositorio
- **WHEN** un artefacto imparte instrucciones de trabajo que contradicen la metodología vigente
- **THEN** se retira de la ruta donde se lo encuentra al recorrer el repositorio y se conserva
  declarando que ya no rige

#### Scenario: Mecanismo al que apunta una instrucción retirada
- **WHEN** una instrucción retirada nombra un directorio como fuente de trabajo para agentes
- **THEN** ese directorio se retira junto con ella, para que la instrucción no siga siendo ejecutable

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

### Requirement: La forma de un tasks.md viaja por el canal de instrucciones
La forma de un `tasks.md` SHALL estar declarada en `openspec/config.yaml`, de modo que el CLI la
entregue a cualquier ejecutor que pida instrucciones. Las reglas SHALL exigir secciones numeradas, y
cada casilla SHALL numerarse dentro de su sección. Cada regla SHALL poder comprobarse leyendo
únicamente el archivo en cuestión, y SHALL NOT remitir a otros archivos como referencia de forma.

El fundamento es que hoy la forma no está escrita en ningún lado: las reglas de `tasks` existentes
hablan de verificabilidad, de quién marca y de cuándo, pero ninguna de estructura. Que todos los
`tasks.md` de este repositorio coincidan es imitación de los archivos vecinos, y esa costumbre se
sostiene hasta el primer ejecutor que no los mira. En `C:\www\odontoPau` aguantó cuatro de cinco
cambios —164 casillas jerárquicas sin una plana— y se rompió en el quinto, que quedó como lista plana
sin secciones.

Que las reglas se comprueben sobre un archivo solo es lo que las distingue de la costumbre que
reemplazan. Una regla que dijera "seguí el formato de los demás cambios" tendría el mismo punto ciego:
quien no mira alrededor no va a mirar alrededor porque una regla se lo pida.

#### Scenario: Ejecutor que pide instrucciones para escribir tareas
- **WHEN** un ejecutor pide por el CLI las instrucciones del artefacto de tareas
- **THEN** recibe la forma completa —secciones numeradas y casillas jerárquicas— sin remitir a otros archivos

#### Scenario: Casilla fuera de toda sección
- **WHEN** una tarea no pertenece a ninguna sección
- **THEN** las reglas indican que falta la sección, no que la casilla vaya suelta

#### Scenario: Comprobación sobre un archivo solo
- **WHEN** se quiere verificar si un `tasks.md` cumple la forma
- **THEN** alcanza con leer ese archivo, sin consultar ningún otro cambio

### Requirement: Las tareas se redactan para quien no estuvo en la conversación
Cada tarea SHALL nombrar el archivo, el comando o el criterio concreto que la hace verificable, de modo
que un ejecutor que no participó de la conversación pueda ejecutarla. El archivo SHALL NOT llevar
marcas propias del ejecutor —identificadores, comentarios u otras anotaciones— porque cada casilla se
identifica por su posición en el archivo.

El fundamento es que un `tasks.md` es el encargo que recibe alguien que llega después, y una tarea
redactada como recordatorio de quien la pensó no le sirve. La prohibición de marcas propias no es
estética: en el caso observado cada casilla arrastraba un `<!-- id: N -->` que ningún consumidor lee
—GitCron identifica las casillas por número de línea—, agregado por un ejecutor que suplió con
invención lo que nadie le había declarado.

#### Scenario: Tarea sin referencia concreta
- **WHEN** una tarea no nombra archivo, comando ni criterio comprobable
- **THEN** no cumple la regla, porque quien llega después no puede saber cuándo está hecha

#### Scenario: Anotaciones agregadas por el ejecutor
- **WHEN** un ejecutor agrega identificadores o comentarios a las casillas
- **THEN** no cumple la regla, porque la identificación es posicional y nadie consume esas marcas

### Requirement: La forma rige igual al documentar trabajo ya hecho
Un cambio escrito para documentar trabajo ya realizado SHALL usar la misma forma que uno escrito por
delante. Que el trabajo ya esté hecho SHALL NOT habilitar una estructura distinta.

El fundamento es que el único desvío observado ocurrió exactamente en ese contexto: el encargo fue
documentar en OpenSpec una tarea que ya estaba a medio hacer, sin flujo previo y sin pedir
instrucciones, y el ejecutor resolvió sobre la marcha. Lo que en un flujo normal se sobreentiende, en
uno improvisado se omite, y el artefacto que queda se lee peor durante el resto de su vida sin que
nada haya fallado en el momento.

#### Scenario: Cambio creado para documentar lo ya hecho
- **WHEN** se pide documentar en OpenSpec una tarea que ya está empezada o terminada
- **THEN** el `tasks.md` usa secciones numeradas y casillas jerárquicas igual que cualquier otro

### Requirement: El mensaje sugerido distingue el archivado del trabajo
Cuando el conjunto que se va a preparar corresponda a un archivado, el mensaje sugerido SHALL
intercalar `archived` antes del identificador del cambio. Un conjunto de artefactos de un cambio activo
SHALL seguir sugiriendo sólo el identificador, y un conjunto que abarque más de un cambio SHALL seguir
devolviendo la descripción vacía.

El fundamento es que el circuito de un cambio produce dos commits —el del trabajo y el del archivado— y
hoy la aplicación sugiere el mismo texto para los dos, así que el historial queda con dos entradas
indistinguibles salvo por su contenido. Ya se corrige a mano en cada archivado de este repositorio:
`chore: archived render-openspec-markdown`, `chore: archived retire-stale-agent-instructions`. Una
sugerencia que hay que corregir siempre del mismo modo es una sugerencia incompleta.

Que el caso de varios cambios siga vacío importa porque esa ausencia es deliberada: es la señal de que
el commit está mezclando trabajos, y llega antes de confirmar. Rellenarla con el identificador del
archivado escondería justamente el caso donde hace falta que una persona escriba el mensaje.

#### Scenario: Preparación de un archivado
- **WHEN** el conjunto a preparar son las dos mitades del archivado de un cambio y su spec consolidada
- **THEN** el mensaje sugerido nombra el cambio precedido de `archived`

#### Scenario: Preparación del trabajo de un cambio activo
- **WHEN** el conjunto a preparar son artefactos de un cambio activo y su código
- **THEN** el mensaje sugerido nombra el cambio sin la palabra `archived`

#### Scenario: Conjunto que abarca varios cambios
- **WHEN** el conjunto a preparar incluye un archivado y artefactos de otro cambio
- **THEN** la descripción queda vacía, para que la escriba una persona

### Requirement: La guía no ofrece ver diffs que no existen
La guía de próximas acciones SHALL ofrecer la acción "Ver diff" únicamente cuando el snapshot tenga al
menos un diff. Sin diffs, la acción SHALL NOT aparecer, y el estado SHALL conservar su acción
principal. El criterio de disponibilidad SHALL ser el mismo que usa el botón del panel.

El fundamento es que los diffs se producen a partir de sesiones de runtime lanzadas desde la
aplicación, y un cambio trabajado a mano o por un agente arrancado desde la terminal no genera
ninguna. Ofrecer igual la acción lleva a una sub-pestaña vacía sin explicar por qué, y una guía que
propone un paso que no lleva a nada deja de servir para saber cuál es el próximo paso. Que el panel y
la guía compartan el criterio evita que uno de los dos vuelva a quedarse atrás cuando cambie la regla.

#### Scenario: Cambio listo para archivar sin ninguna sesión corrida
- **WHEN** el cambio está listo para archivar y el snapshot no tiene ningún diff
- **THEN** la guía ofrece archivar y no ofrece ver el diff

#### Scenario: Cambio listo para archivar con diffs de una sesión
- **WHEN** el cambio está listo para archivar y el snapshot tiene al menos un diff
- **THEN** la guía ofrece ver el diff y lleva a la sub-pestaña de diffs con contenido

#### Scenario: Panel y guía frente al mismo snapshot
- **WHEN** un snapshot no tiene diffs
- **THEN** ni el botón del panel ni la acción de la guía ofrecen abrirlos

