## MODIFIED Requirements

### Requirement: El mensaje sugerido distingue el archivado del trabajo
Cuando el conjunto que se va a preparar corresponda a un archivado, el mensaje sugerido SHALL
intercalar `archived` antes del identificador del cambio. Cuando corresponda a un retiro, SHALL
intercalar `retired` junto al identificador y, si hubo cambio reemplazante, nombrarlo. Un conjunto
de artefactos de un cambio activo SHALL seguir sugiriendo sólo el identificador, y un conjunto que
abarque más de un cambio SHALL seguir devolviendo la descripción vacía.

El fundamento es que el circuito de un cambio produce ahora tres commits distinguibles —el del
trabajo, el del archivado y el del retiro— y la aplicación sugiere hoy el mismo texto para los dos
primeros. El retiro suma un tercero: retirar mueve el cambio al archivo sin consolidar specs y
dejando `retirement.md`, y su commit tiene que leerse como lo que es, no como un archivado más. Que
el caso de varios cambios siga vacío importa porque esa ausencia es deliberada: es la señal de que
el commit está mezclando trabajos, y llega antes de confirmar.

#### Scenario: Preparación de un archivado
- **WHEN** el conjunto a preparar son las dos mitades del archivado de un cambio y su spec consolidada
- **THEN** el mensaje sugerido nombra el cambio precedido de `archived`

#### Scenario: Preparación del trabajo de un cambio activo
- **WHEN** el conjunto a preparar son artefactos de un cambio activo y su código
- **THEN** el mensaje sugerido nombra el cambio sin la palabra `archived`

#### Scenario: Preparación de un retiro con reemplazo
- **WHEN** el conjunto a preparar es el movimiento de un cambio retirado cuyo motivo es `superseded`
- **THEN** el mensaje sugerido nombra el cambio precedido de `retired` y nombra además el reemplazo

#### Scenario: Preparación de un retiro sin reemplazo
- **WHEN** el conjunto a preparar es el movimiento de un cambio retirado por un motivo distinto de `superseded`
- **THEN** el mensaje sugerido nombra el cambio precedido de `retired`, sin nombrar reemplazo

#### Scenario: Conjunto que abarca varios cambios
- **WHEN** el conjunto a preparar incluye un retirado y artefactos de otro cambio
- **THEN** la descripción queda vacía, para que la escriba una persona

## ADDED Requirements

### Requirement: Retirar es un cierre distinto del archivado y no consolida especificaciones
Retirar un cambio SHALL ejecutar `openspec archive <change-id> --yes --skip-specs` desde el proceso
principal, de modo que el cambio se mueva al archivo histórico **sin** aplicar sus delta specs sobre
`openspec/specs/`. El archivado normal SHALL mantener su comando y su significado actuales
(`openspec archive <change-id> --yes`), y SHALL NOT verse alterado por la existencia del retiro.

El fundamento es que un cambio obsoleto no debe seguir implementándose, y consolidar sus
especificaciones las convertiría en canónicas sin haberse hecho el trabajo: un cambio `superseded`
dejaría requirements vigentes que su reemplazo contradice, y uno `invalidated` dejaría vigente una
premisa que ya no vale. `--skip-specs` existe para esto en el CLI, y verificarlo es parte de la
aceptación.

#### Scenario: Retiro omite la consolidación
- **WHEN** se retira un cambio cuya delta spec contradice la spec canónica
- **THEN** el cambio pasa al archivo histórico y la spec canónica queda byte-igual a como estaba

#### Scenario: El archivado normal no cambia
- **WHEN** se archiva un cambio completado
- **THEN** el comando ejecutado sigue siendo `openspec archive <id> --yes` y sus delta specs se consolidan

### Requirement: Retirar exige una decisión humana estructurada
Retirar SHALL requerir un motivo categórico —`superseded`, `no-longer-needed`, `duplicate`,
`invalidated` o `abandoned`— y una explicación libre, acotada y obligatoria que responda por qué no
se implementará, qué cambió, qué parte aprovechó el reemplazo y qué debe consultarse en su lugar.
SHALL requerir además una declaración del estado real de implementación —`none`, `partial` o
`unknown`— que no se inferirá de las tareas abiertas. La explicación libre SHALL NOT interpolarse en
ningún comando del shell.

El fundamento es que el cambio retirado queda como registro que una IA futura consultará, y un
registro sin motivo ni contexto obliga a adivinar por qué algo que parecía vigente ya no lo está.
Declarar el estado de implementación responde a que «tiene tareas abiertas» no prueba que no se haya
escrito código: un cambio puede estar implementado y sin tildar. Que el texto libre no pase por el
shell es la invariante que rige toda escritura de esta aplicación.

#### Scenario: Motivo categórico obligatorio
- **WHEN** se intenta retirar sin elegir un motivo categórico
- **THEN** la acción no se habilita y se señala el campo del motivo

#### Scenario: Explicación obligatoria
- **WHEN** se intenta retirar con la explicación vacía
- **THEN** la acción no se habilita y se señala el campo de la explicación

#### Scenario: Estado de implementación declarado
- **WHEN** se intenta retirar sin declarar el estado de implementación
- **THEN** la acción no se habilita hasta elegir `none`, `partial` o `unknown`

#### Scenario: Implementación parcial exige resolución
- **WHEN** el estado declarado es `partial` o `unknown`
- **THEN** se muestra una advertencia más fuerte y la explicación debe indicar qué ocurrirá con ese código

#### Scenario: El texto libre no llega al shell
- **WHEN** se confirma el retiro con una explicación arbitraria
- **THEN** los argumentos pasados al CLI son sólo el change-id y los flags fijos, nunca la explicación

### Requirement: El cambio reemplazante se valida cuando el retiro es por reemplazo
Cuando el motivo sea `superseded`, el cambio reemplazante SHALL ser obligatorio y SHALL validarse:
ser un slug válido, no ser el mismo cambio que se retira, existir como cambio, preferentemente seguir
activo, y no formar parte de un ciclo de reemplazo. Para los demás motivos el reemplazo SHALL ser
nulo.

El fundamento es que un `superseded` sin reemplazo rompe la promesa del motivo —si nada lo reemplaza,
no fue reemplazado— y un reemplazo que apunta a sí mismo o a un ciclo vuelve el registro mentiroso. La
aplicación puede recomendar que el reemplazo declare en su `proposal.md` qué reemplaza, pero SHALL
NOT modificarlo silenciosamente.

#### Scenario: Reemplazo obligatorio para superseded
- **WHEN** el motivo es `superseded` y no se indica reemplazo
- **THEN** la acción no se habilita y se señala el campo del reemplazo

#### Scenario: Reemplazo inválido
- **WHEN** el reemplazo no es un slug válido o es el mismo cambio que se retira
- **THEN** la acción se bloquea con el motivo declarado

#### Scenario: Reemplazo inexistente
- **WHEN** el reemplazo no existe como cambio
- **THEN** la acción se bloquea declarando que no se encontró

#### Scenario: Ciclo de reemplazo
- **WHEN** el reemplazo forma un ciclo con otros retiros ya registrados
- **THEN** la acción se bloquea declarando el ciclo

#### Scenario: Reemplazo para un motivo que no es superseded
- **WHEN** el motivo no es `superseded`
- **THEN** el reemplazo es nulo y no se pide

### Requirement: El retiro tiene un registro canónico legible y versionable
Antes de mover el cambio, la operación SHALL escribir dentro de su directorio un archivo
`retirement.md` con un bloque YAML frontmatter —`schemaVersion`, `closureKind: retired`,
`disposition`, `retiredAt` ISO-8601, `replacementChange`, `specSync: skipped`,
`implementationState`, `completedTasks`, `totalTasks`, `sourceBranch`, `sourceHead`, `confirmedBy:
human`— seguido de Markdown con el motivo, la explicación, las consecuencias, el reemplazo si existe,
la declaración explícita de que las delta specs no se aplicaron, el estado de cualquier
implementación parcial y el comando ejecutado. Ese archivo SHALL viajar con el cambio al archivo
histórico y SHALL ser la fuente canónica del retiro; las demás superficies SHALL derivar de él y
SHALL NOT duplicar la explicación en `proposal.md`, `tasks.md`, SQLite ni i18n. La operación SHALL
NOT inventar identidad de usuario: el commit posterior aportará la autoría Git.

El fundamento es que dispersar el mismo texto en varios archivos produce inconsistencias en cuanto
uno se edita, y que un registro estructurado permite que la UI muestre motivo, fecha y reemplazo sin
parsear prosa. Que el archivo viva dentro del directorio del cambio hace que el movimiento del
archivado lo traslade sin pasos extra, y que un cambio retirado sea autosuficiente como registro.

#### Scenario: Archivo creado antes de mover
- **WHEN** se confirma el retiro
- **THEN** `retirement.md` existe dentro del directorio del cambio antes de que el CLI lo mueva

#### Scenario: Viaja al histórico
- **WHEN** el cambio pasa al archivo histórico
- **THEN** `retirement.md` aparece dentro de su carpeta archivada

#### Scenario: Una sola fuente
- **WHEN** varias superficies muestran el retiro
- **THEN** todas leen del mismo `retirement.md`, sin copiar la explicación en otros artefactos

#### Scenario: Sin identidad inventada
- **WHEN** se escribe `retirement.md`
- **THEN** no se registra nombre ni email de usuario; `confirmedBy` vale `human`

### Requirement: Retirar se ejecuta desde el proceso principal con verificación del filesystem
Retirar SHALL ejecutarse desde el proceso principal de Electron, resolviendo la ruta canónica del
repositorio, validando el slug y todos los campos IPC, escribiendo `retirement.md` de forma segura y
ejecutando el CLI con argumentos literales o validados. Tras ejecutar, SHALL releer la evidencia del
filesystem y SHALL declarar éxito sólo si el cambio dejó la lista de activos, apareció en
`openspec/changes/archive/`, `retirement.md` viajó con él y las specs canónicas no fueron modificadas.
SHALL NOT declarar éxito por el mero fin del proceso. El renderer SHALL NOT recibir filesystem, shell
ni paths libres.

El fundamento es el mismo que sostiene el archivado desde el proceso principal: delegar la operación
en un agente permite que devuelva éxito sin haber hecho nada, y declarar éxito por el fin del proceso
permite declarar un retiro que el disco desmiente. Verificar las cuatro condiciones del filesystem es
lo que distingue «el CLI dijo ok» de «el retiro ocurrió».

#### Scenario: Confirmación previa con comando exacto
- **WHEN** se activa el retiro
- **THEN** se muestra el comando exacto a ejecutar y el retiro no ocurre hasta confirmarse

#### Scenario: Retiro exitoso verificado
- **WHEN** el CLI archiva con `--skip-specs` y sale con código cero
- **THEN** la evidencia se relee, el cambio figura como retirado y se declara explícitamente, nombrándolo

#### Scenario: Fallo del CLI no declara éxito
- **WHEN** el CLI rechaza el retiro
- **THEN** se muestra el motivo real informado por el CLI y el cambio sigue activo, sin declarar éxito

#### Scenario: Specs canónicas intactas
- **WHEN** el retiro se completa
- **THEN** `openspec/specs/` no registra cambios atribuibles a la consolidación del retirado

### Requirement: El plan de retiro no muta y se invalida si el repositorio cambió
La operación SHALL separar un plan que sólo describe —`pipeline:retire-change-plan`— de la
ejecución que escribe —`pipeline:retire-change`—. El plan SHALL mostrar el cambio, las tareas
completas y pendientes, las capabilities y delta specs que no se sincronizarán, el motivo elegido,
el reemplazo, el estado de implementación, los archivos que se crearán o moverán, el comando exacto
y el recordatorio de que no se hará commit; y SHALL NOT modificar nada. Si entre el plan y la
confirmación el repositorio cambió de forma relevante, el plan SHALL invalidarse y SHALL pedirse uno
nuevo.

El fundamento es que un plan que también ejecuta no es un plan, y que un cambio del repositorio entre
lo mostrado y lo ejecutado permite retirar un estado que ya no es el que la persona vio: por ejemplo,
si se tildó una tarea que cambia el conteo o si se editó la delta spec.

#### Scenario: El plan no escribe
- **WHEN** se pide el plan de retiro
- **THEN** no se crea ni mueve ningún archivo, y no se ejecuta el CLI

#### Scenario: Confirmación muestra lo que se ejecutará
- **WHEN** se pide confirmar el retiro
- **THEN** se ve el comando exacto, los archivos que se crearán o moverán y el recordatorio de no-commit

#### Scenario: El repositorio cambió entre plan y confirmación
- **WHEN** el estado del cambio o del árbol varió desde que se generó el plan
- **THEN** el plan se invalida y se pide generarlo de nuevo

### Requirement: Un cambio retirado se distingue para siempre de uno completado
Un cambio retirado SHALL presentarse con un badge «Retirado» distinto del «Completado»/«Archivado»,
SHALL NOT contarse dentro de «Completados», y SHALL declarar que sus delta specs no se consolidaron.
La lista histórica SHALL seguir siendo una sola —con badges que distingan `Completado` de `Retirado`—
en lugar de abrir una sección aparte, para alterar lo menos posible la navegación actual. Si hay
cambio reemplazante, SHALL poder abrirse desde ahí. Los cambios históricos anteriores sin
`retirement.md` SHALL interpretarse como `completed` por compatibilidad.

El fundamento es que contar un retirado como completado miente sobre el estado del trabajo, y que dos
cierres distintos que se ven iguales dejan de distinguirse justo cuando más falta hace —al mirar el
histórico para saber qué se hizo y qué no—. Mantener una sola lista con badges evita multiplicar
superficies y respeta la regla del panel de no alterar la navegación por cada feature nueva.

#### Scenario: Retirado en la lista histórica
- **WHEN** se lista un cambio retirado junto a otros completados
- **THEN** lleva un badge «Retirado» distinguible del «Completado»

#### Scenario: El contador no miente
- **WHEN** se retira un cambio
- **THEN** el contador de completados no aumenta

#### Scenario: Histórico anterior sin registro
- **WHEN** se muestra un cambio archivado antes de esta feature, sin `retirement.md`
- **THEN** se presenta como completado, sin badge de retirado

#### Scenario: Abrir el reemplazo
- **WHEN** un retirado declara un cambio reemplazante
- **THEN** puede abrirse ese reemplazo desde el detalle del retirado

### Requirement: Retirar no toca Git y el commit queda como acción separada
Retirar SHALL NOT ejecutar stage, commit, push, merge, tag, PR ni borrado de ramas, y SHALL NOT
revertir implementación parcial automáticamente. Tras retirar, la aplicación SHALL actualizar la
atribución de archivos y SHALL ofrecer el circuito normal de «Preparar commit» con un mensaje
sugerido que distinga el retiro (p. ej. `chore(openspec): retirar <id>…`). Crear el commit SHALL
seguir siendo una acción humana explícita.

El fundamento es el mismo que retiró el commit automático del archivado: OpenSpec gestiona artefactos
de planificación y deja el control de versiones al usuario, y un retiro puede tener implementación
parcial cuya resolución —revert, absorción o conservación— es una decisión que sólo quien entiende el
trabajo puede tomar.

#### Scenario: Retiro sin Git
- **WHEN** se retira un cambio
- **THEN** no se modifica el estado de Git más allá de los archivos del cambio movidos por el CLI

#### Scenario: Commit sugerido propio
- **WHEN** tras retirar se prepara el commit
- **THEN** el mensaje sugerido distingue el retiro y no se crea ningún commit automáticamente

### Requirement: Un retiro interrumpido o repetido se resuelve sin dejar un retiro falso
La operación SHALL diseñarse para no declarar un retiro si el CLI falla después de escribir
`retirement.md`. SHALL ser idempotente o disponer de una recuperación explícita y verificable: reintentar
un retiro cuyo `retirement.md` ya existe SHALL detectarlo y continuar, y un retiro ya consumado SHALL
no declararse pendiente. SHALL cubrir el cambio ya archivado, el cambio inexistente, el reemplazo
inexistente, el cierre repetido y el proceso reiniciado con un retiro en curso.

El fundamento es que `retirement.md` se escribe antes del archivado, así que un fallo del CLI puede
dejar el registro en un cambio que sigue activo. Si la operación no trata ese caso, o bien deja un
registro mentiroso o bien bloquea todo reintento con un error confuso.

#### Scenario: Fallo después del registro
- **WHEN** `retirement.md` se escribió y el CLI falla
- **THEN** el cambio sigue activo, el registro se detecta al reintentar y la operación puede continuar

#### Scenario: Retiro ya hecho
- **WHEN** se intenta retirar un cambio que ya está archivado
- **THEN** se informa que ya no está activo y no se ejecuta nada

#### Scenario: Cambio inexistente
- **WHEN** el cambio a retirar no existe
- **THEN** se informa su ausencia sin ejecutar nada

#### Scenario: Cierre repetido
- **WHEN** se confirma dos veces el retiro del mismo cambio
- **THEN** la segunda vez declara que ya no está activo, sin duplicar el registro
