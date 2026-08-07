# Pipeline repo evidence

## Purpose

Definir la captura local, segura y tolerante de evidencia por repositorio para construir snapshots verificables de Pipeline.
## Requirements
### Requirement: Evidencia local tolerante y explícita
Pipeline SHALL representar repositorios con o sin OpenSpec, preservando evidencia válida y emitiendo diagnósticos por fuentes ausentes o malformadas. Las fuentes observadas SHALL limitarse a los artefactos de OpenSpec y al estado de Git; Pipeline SHALL NOT leer registros del kit multi-agente retirado, como historiales de gates, delegaciones entre agentes o mediciones de diff visual.

#### Scenario: Repositorio sin OpenSpec
- **WHEN** un repositorio Git no contiene scaffold de OpenSpec
- **THEN** el snapshot conserva evidencia Git y marca las fuentes de OpenSpec como `unknown` sin fallar globalmente

#### Scenario: JSONL parcialmente corrupto
- **WHEN** una línea intermedia es inválida y existen líneas válidas posteriores
- **THEN** Pipeline conserva las líneas válidas y agrega un diagnóstico degradado para la línea inválida

#### Scenario: Registros del kit retirado presentes en disco
- **WHEN** un repositorio todavía contiene archivos como `docs/ai/logs/gates.jsonl` o `delegations.jsonl`
- **THEN** Pipeline los ignora por completo y no expone ningún campo derivado de ellos

### Requirement: Parsers de metadata sin render inseguro
Pipeline SHALL extraer metadata de tasks, reportes, auditorías y productores JSONL sin renderizar Markdown como HTML ni convertir campos ausentes en defaults exitosos.

#### Scenario: Task con marcador en texto
- **WHEN** `[x]` aparece dentro de prosa o código y no como marcador de una task Markdown
- **THEN** el parser no la cuenta como task completada

#### Scenario: Métrica opcional ausente
- **WHEN** una delegación no informa reintentos o espera humana
- **THEN** esos campos quedan `unknown` y no se normalizan a cero

### Requirement: Selección no ambigua de change
Pipeline SHALL seleccionar un change sólo por match inequívoco de branch o cuando exista un único change activo; en cualquier otro caso SHALL requerir selección.

#### Scenario: Dos changes activos sin match
- **WHEN** existen varios changes activos y la branch no identifica uno de forma inequívoca
- **THEN** el snapshot declara `selectionRequired` y no asigna un change arbitrario

### Requirement: Lectura confinada al repositorio
`RepoEvidenceReader` SHALL ejecutarse sólo en Electron main, resolver paths reales y rechazar lecturas que escapen del repositorio mediante traversal o symlink.

#### Scenario: Symlink externo
- **WHEN** una ruta permitida nominalmente resuelve fuera del root real del repositorio
- **THEN** la lectura se rechaza y queda un diagnóstico de seguridad sin exponer el contenido externo

#### Scenario: Archivo desaparece durante lectura
- **WHEN** un archivo desaparece entre stat y read
- **THEN** el reader degrada esa fuente y completa el resto del snapshot

### Requirement: Cero escrituras al repositorio observado
La ingesta F01 SHALL usar operaciones de solo lectura para filesystem, Git y OpenSpec y SHALL NOT crear cursores, caches o archivos dentro del repositorio observado.

#### Scenario: Captura incremental
- **WHEN** Pipeline conserva un cursor JSONL
- **THEN** lo persiste en la base global de GitCron y no junto al archivo observado

### Requirement: Contenido de artefactos disponible para lectura
La evidencia del cambio seleccionado SHALL transportar el contenido de `proposal.md`, `design.md` y `tasks.md`, además de su existencia, para que puedan leerse sin abrir el repositorio por fuera de la aplicación. El renderer SHALL NOT recibir un método de lectura de archivos: el contenido llega dentro de la evidencia ya contenida al repositorio.

#### Scenario: Artefacto presente
- **WHEN** el cambio seleccionado tiene `proposal.md` con contenido
- **THEN** la evidencia transporta ese markdown y la vista puede mostrarlo saneado

#### Scenario: Artefacto ausente
- **WHEN** el cambio seleccionado no tiene `design.md`
- **THEN** el contenido queda `null` y la vista declara que ese artefacto no existe, sin inventar un cuerpo vacío

#### Scenario: Sólo el cambio seleccionado
- **WHEN** hay varios cambios activos
- **THEN** sólo el seleccionado transporta contenido, y los demás conservan únicamente la señal de existencia

#### Scenario: Spec delta por capacidad
- **WHEN** el cambio seleccionado toca una o más capacidades
- **THEN** la evidencia transporta el `spec.md` de cada una junto a su identificador y su ruta de origen

#### Scenario: Capacidad sin archivo de spec
- **WHEN** existe la carpeta de una capacidad pero le falta el `spec.md`
- **THEN** la capacidad se lista igual con contenido `null`, porque la carpeta también es evidencia

### Requirement: Selección manual de change con precedencia sobre la automática
El renderer SHALL poder seleccionar manualmente un change activo para que ese change transporte el contenido de sus artefactos, sin depender de la rama. La selección manual SHALL tener precedencia sobre la selección automática por rama. Cuando no haya selección manual, SHALL aplicarse la selección automática existente. La selección manual SHALL reiniciarse al cambiar de repositorio.

#### Scenario: Varios changes activos en main con selección manual
- **WHEN** hay varios changes activos, la rama no coincide con ninguno, y el renderer selecciona manualmente uno
- **THEN** ese change transporta el contenido de sus artefactos y el renderer puede mostrarlos

#### Scenario: Sin selección manual
- **WHEN** el renderer no selecciona manualmente
- **THEN** se aplica la selección automática por rama como hasta hoy

#### Scenario: Cambio de repositorio
- **WHEN** se cambia de repositorio
- **THEN** la selección manual se reinicia y se aplica la automática del nuevo repo

### Requirement: Contenido de artefactos en pestaña dedicada
El markdown de los artefactos del change seleccionado SHALL mostrarse en una pestaña dedicada al lado de Trabajo y Actividad, no como un bloque al final del panel.

#### Scenario: Lectura de un artefacto
- **WHEN** se selecciona un artefacto (proposal, design, tasks o specs)
- **THEN** su contenido se muestra en la pestaña dedicada con el markdown saneado

### Requirement: Costo de lectura acotado al cambio seleccionado

La lectura de evidencia SHALL invocar el CLI de OpenSpec para validar únicamente el cambio
seleccionado. Un cambio activo que no está seleccionado SHALL reportar `validation: 'unknown'`
sin ejecutar ningún subproceso, porque no saber si un cambio es válido no es lo mismo que
saber que no lo es, y ninguna vista consume la validación de un cambio no seleccionado.

Este criterio SHALL alinearse con el que ya rige para el contenido de artefactos: el trabajo
caro se paga sólo por el cambio que la vista efectivamente muestra.

#### Scenario: Varios cambios activos

- **WHEN** el repositorio tiene varios cambios activos y uno está seleccionado
- **THEN** el CLI de validación se invoca exactamente una vez, para el cambio seleccionado

#### Scenario: Cambio activo no seleccionado

- **WHEN** un cambio activo no es el seleccionado
- **THEN** su `validation` queda `unknown` y no se ejecuta ningún subproceso por él

#### Scenario: Sin cambio seleccionado

- **WHEN** la selección no identifica ningún cambio
- **THEN** no se invoca el CLI de validación para ningún cambio activo

### Requirement: La evidencia leída corresponde al cambio que se muestra

El renderer SHALL informar el cambio que está mostrando cuando la selección automática no resolvió
ninguno, de modo que la evidencia leída corresponda a lo que hay en pantalla. Un cambio visible
SHALL NOT quedar sin leer por haber sido resuelto por el fallback de la vista.

Esto no habilita al backend a elegir por su cuenta: la selección no ambigua sigue rigiendo y sigue
sin adivinar. Lo que se corrige es que la elección que ya hace la vista para poder mostrar algo
deje de ser invisible para quien lee la evidencia.

La adaptación de la evidencia a la vista SHALL conservar la selección tal como la resolvió el
backend, incluida su ausencia. Sustituirla por un cambio cualquiera vuelve indistinguible "el
backend eligió éste" de "no eligió ninguno", y con esa distinción perdida no hay forma de saber que
hay algo que informar. El fallback para mostrar pertenece a la vista, que además lo informa.

#### Scenario: Selección ausente conservada hasta la vista

- **WHEN** el backend no resolvió ninguna selección
- **THEN** la evidencia adaptada la conserva ausente en vez de sustituirla por un cambio cualquiera

#### Scenario: La rama no identifica ningún cambio activo

- **WHEN** hay varios cambios activos, la rama no coincide con ninguno y la vista muestra uno por defecto
- **THEN** ese cambio se informa como seleccionado y su validación y artefactos se leen

#### Scenario: Selección manual vigente

- **WHEN** el usuario seleccionó manualmente un cambio
- **THEN** esa selección se conserva y el fallback no la pisa

#### Scenario: La selección automática ya resolvió

- **WHEN** la rama identifica un cambio de forma inequívoca
- **THEN** no se informa nada adicional y se respeta la selección automática

### Requirement: Los artefactos de un cambio archivado se pueden revisar

La evidencia del cambio archivado seleccionado SHALL transportar el contenido de sus artefactos, y
la vista SHALL mostrarlos, para poder revisar qué se hizo —incluida la firma humana en `tasks.md`—
sin salir de la aplicación.

El contenido SHALL viajar sólo para el archivado seleccionado, por el mismo motivo que en los
activos: transportar el markdown de todos haría crecer el snapshot sin que nadie lo mire.

#### Scenario: Archivado seleccionado

- **WHEN** se selecciona un cambio de la lista de completados
- **THEN** su propuesta, diseño, tareas y specs delta se pueden leer en la aplicación

#### Scenario: Archivados no seleccionados

- **WHEN** hay otros cambios archivados
- **THEN** no transportan contenido, sólo su identificador y su fecha

### Requirement: Las operaciones de Git sobre un repositorio no se solapan

Las operaciones de Git que ejecuta la aplicación sobre un mismo repositorio SHALL serializarse, de
modo que dos de ellas no toquen su índice a la vez. Repositorios distintos SHALL poder ejecutarse en
paralelo: tienen índices separados y no tienen por qué esperarse.

Git protege su índice con `.git/index.lock`. Dos procesos concurrentes hacen fallar al segundo con
`Unable to create index.lock`, y una operación cortada a la mitad deja el archivo huérfano
bloqueando todo lo que venga después.

El fallo de una operación SHALL NOT trabar la cola: la siguiente arranca igual, y el error se
propaga a quien la pidió sin tragárselo.

#### Scenario: Relectura durante una escritura

- **WHEN** el watcher dispara una relectura de evidencia mientras se está commiteando o archivando
- **THEN** las operaciones se ejecutan una después de la otra y ninguna falla por el lock

#### Scenario: Repositorios distintos

- **WHEN** hay operaciones sobre dos repositorios distintos
- **THEN** no se esperan entre sí

#### Scenario: Operación fallida

- **WHEN** una operación encolada falla
- **THEN** su error llega a quien la pidió y la siguiente operación se ejecuta igual

### Requirement: La evidencia de un cambio lleva cuándo empezó y cuándo se archivó
La evidencia de un cambio SHALL incluir su marca de creación con fecha y hora, y SHALL incluir la de
archivado cuando el cambio esté archivado. Ambas SHALL derivarse de la historia de Git. Cuando el
cambio todavía no esté confirmado, la marca de creación SHALL provenir del disco y SHALL quedar
distinguible de una marca confirmada.

El fundamento es que hoy no se puede saber cuánto lleva abierto un cambio ni cuánto duró uno terminado
sin salir de la aplicación: el cambio activo no muestra ninguna fecha y el archivado muestra una sola,
sin hora. Que la fuente sea Git y no el disco importa porque la marca del disco no sobrevive: se pierde
al archivar, porque el directorio bajo `archive/` se crea nuevo, y se pierde al clonar, donde todos los
cambios pasarían a figurar creados el día de la copia. Una marca que miente después de un `git clone`
es peor que ninguna.

Distinguir la marca no confirmada importa porque las dos afirman cosas distintas, y el paso de una a
otra es información: significa que el trabajo se confirmó.

#### Scenario: Cambio activo ya confirmado en Git
- **WHEN** se lee la evidencia de un cambio cuyo `proposal.md` ya está confirmado
- **THEN** su marca de creación es la del commit que lo añadió, con fecha y hora

#### Scenario: Cambio recién creado y sin confirmar
- **WHEN** se lee la evidencia de un cambio que todavía no tiene ningún commit
- **THEN** su marca de creación proviene del disco y queda distinguible de una confirmada

#### Scenario: Cambio archivado
- **WHEN** se lee la evidencia de un cambio archivado
- **THEN** lleva su marca de creación y la de archivado, y la creación sigue siendo alcanzable a través
  del rename

### Requirement: El contenido de una especificación se puede leer desde la aplicación
La aplicación SHALL poder obtener el contenido de una especificación consolidada a partir de su
identificador. La respuesta SHALL distinguir el contenido leído, el archivo vacío y el fallo de lectura.
La lectura SHALL respetar un límite de tamaño explícito. El contenido SHALL NOT transportarse en el
snapshot.

El fundamento es que las especificaciones consolidadas son el estado declarado del producto —lo que
quedó después de archivar cada cambio— y hoy son lo único del método que no se puede leer desde la
aplicación: la barra lateral las lista como texto muerto porque no tiene contenido que mostrar.

Que no viajen en el snapshot es una restricción medida, no una preferencia: las de este repositorio
pesan 145 KB en quince archivos, con una sola de 84,9 KB, y el snapshot se rearma en cada refresco que
dispara el watcher con cada guardado. Una especificación consolidada cambia cuando se archiva un cambio,
no cuando se guarda un archivo, así que atar su contenido al refresco paga un costo continuo por algo
que casi nunca cambia y casi nunca se mira.

Distinguir los tres casos importa porque piden respuestas distintas: un archivo vacío es un dato real
del repositorio, un fallo es algo que hay que reportar con su motivo, y confundirlos deja al visor en
blanco sin explicar por qué.

#### Scenario: Especificación legible
- **WHEN** se pide el contenido de una especificación que existe
- **THEN** se devuelve su texto

#### Scenario: Especificación vacía
- **WHEN** se pide el contenido de una especificación cuyo archivo está vacío
- **THEN** se devuelve vacío como dato, distinguible de un fallo

#### Scenario: Lectura que falla
- **WHEN** el archivo de una especificación no se puede leer
- **THEN** se informa el fallo en vez de devolver contenido vacío

### Requirement: La lectura no acepta rutas del renderer
El proceso principal SHALL recibir el identificador de la especificación y SHALL componer la ruta por su
cuenta. El identificador SHALL validarse contra el mismo alfabeto acotado que ya se exige al listar las
especificaciones, y la ruta resultante SHALL resolverse contenida al repositorio.

El fundamento es la invariante de seguridad del proyecto: el renderer no le entrega paths sin validar al
proceso principal. Aceptar la referencia de origen que el snapshot ya expone sería más directo, y sería
exactamente el agujero que esa invariante evita. Componer la ruta del lado del principal deja el control
donde tiene que estar, y no cuesta nada porque el identificador ya viene acotado.

#### Scenario: Identificador fuera del alfabeto
- **WHEN** se pide una especificación con un identificador que no respeta el alfabeto acotado
- **THEN** se rechaza sin tocar el disco

#### Scenario: Intento de salir del repositorio
- **WHEN** el identificador pretende escapar del directorio de especificaciones
- **THEN** se rechaza y no se lee ningún archivo fuera del repositorio

### Requirement: La atribución de un archivo declara su fuente
La evidencia de un archivo modificado SHALL declarar, cuando lo atribuya a un cambio, de qué fuente salió
esa atribución. Un archivo sin atribución SHALL quedar explícitamente sin atribuir, y SHALL NOT
presentarse como perteneciente a ningún cambio por descarte.

El fundamento es que las fuentes posibles no afirman lo mismo. Que un artefacto viva bajo la carpeta de
su cambio es un hecho de ubicación y no se puede equivocar. Que un archivo de código se haya editado
sobre la rama de un cambio es una declaración deliberada —alguien puso el trabajo ahí, y Git la sostiene
con independencia de quién editó, con qué herramienta y desde dónde—, pero afirma sobre el archivo por
dónde se lo editó, no por lo que el archivo es. Quien confirma en Git decide con esa información, y
necesita poder distinguir un hecho de una declaración. Colapsar las dos en un único identificador de
cambio produciría una atribución que parece verificada sin serlo, que es peor que no tener ninguna:
llevaría a confirmar archivos equivocados con confianza.

Dejar explícito lo no atribuido importa porque el trabajo hecho fuera de la rama de un cambio no lo
reclama ninguna fuente, y presentarlo como perteneciente al cambio seleccionado por ser el único
candidato sería inventar el dato.

#### Scenario: Archivo atribuido por la rama del cambio
- **WHEN** un archivo de código se modifica sobre la rama de un cambio
- **THEN** la evidencia lo atribuye a ese cambio declarando la rama como fuente

#### Scenario: Artefacto de otro cambio sobre la misma rama
- **WHEN** se modifica un artefacto que vive bajo la carpeta de un cambio distinto del de la rama
- **THEN** la evidencia lo atribuye por su ubicación, y la rama no la pisa

#### Scenario: Archivo sin ninguna fuente que lo reclame
- **WHEN** un archivo de código se modifica fuera de la rama de un cambio
- **THEN** queda explícitamente sin atribuir y no se le asigna el cambio seleccionado

### Requirement: El punto ciego de la atribución por rama queda visible donde se atribuye
La interfaz SHALL declarar, donde muestra una atribución por rama, que la rama afirma dónde se editó el
archivo y no para qué, y que el trabajo hecho sobre esa rama para otra cosa también aparece atribuido.
Esa declaración SHALL estar en la pantalla donde se atribuye, y SHALL NOT quedar sólo en un reporte.

El fundamento es que ese límite no es un defecto a corregir sino el alcance real de lo que la fuente
puede saber, y crece con el tiempo que se pasa en una rama: un typo, una dependencia o un arreglo no
relacionado, hechos durante días de trabajo sobre `change/<slug>`, quedan atribuidos igual. Una
declaración presentada sin su límite se lee como una verificación, y el lugar donde se muestra es la
pantalla desde la que se confirma trabajo en Git.

#### Scenario: Grupo atribuido por rama
- **WHEN** el panel muestra archivos atribuidos por la rama de un cambio
- **THEN** declara junto al grupo que puede contener trabajo hecho para otra cosa, y pide revisarlo

#### Scenario: Nada preseleccionado por efecto de la atribución
- **WHEN** hay archivos atribuidos por rama
- **THEN** ninguno entra elegido por esa atribución

