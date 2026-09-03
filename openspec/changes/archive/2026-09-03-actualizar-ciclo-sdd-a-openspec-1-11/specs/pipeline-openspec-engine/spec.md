## ADDED Requirements

### Requirement: La instrucción SHALL venir del motor y no componerse a mano

Cuando GitCron entregue una instrucción a un ejecutor, SHALL usar la que el motor devuelve para esa
operación —el campo `instruction` de `openspec instructions <operación> --change <id> --json`— y NO
SHALL enumerar por su cuenta los comandos del CLI.

La aplicación SHALL agregar encima únicamente lo que el motor no puede saber: el objetivo que
escribió la persona y su alcance declarado.

El fundamento es medido. `components/pipeline/pipeline-next-action.ts` tiene cuatro funciones que
componen el texto a mano, y la de propuesta enumera `openspec new change`, `openspec status` y
`openspec instructions` uno por uno. Esa secuencia la resuelve un solo comando desde la versión 1.6,
y el texto quedó congelado con la forma que los comandos tenían dos versiones atrás. Una instrucción
escrita a mano envejece sin avisar: nada falla cuando el CLI cambia.

#### Scenario: El motor cambia la forma de una operación
- **WHEN** una versión nueva de OpenSpec modifica los pasos de una operación
- **THEN** la instrucción que recibe el ejecutor cambia con ella, sin editar la aplicación

#### Scenario: El motor no responde
- **WHEN** la consulta al motor falla o devuelve un estado bloqueado
- **THEN** la aplicación lo informa con el motivo real y no arranca ninguna sesión

### Requirement: El contexto del proyecto SHALL viajar al ejecutor

GitCron SHALL entregar al ejecutor el `context` y el `operationGuidance` que el motor devuelve
junto con la instrucción, y NO SHALL duplicar en su propio código las reglas que ese canal ya trae.

Hoy la aplicación consume `.state` y `.tasks` del JSON, e ignora los cuatro campos por los que el
CLI entrega el método: `context`, `operationGuidance`, `contextFiles` e `instruction`. El resultado
es que las reglas del proyecto —cómo se cierra una tanda, qué se puede hacer con Git, en qué rama
se trabaja— no llegan a quien ejecuta, salvo que alguien las escriba a mano en cada prompt.

#### Scenario: El proyecto declara una regla nueva en su configuración
- **WHEN** se agrega una regla al `config.yaml` del proyecto
- **THEN** el ejecutor lanzado desde la aplicación la recibe, sin que nadie edite la aplicación

### Requirement: Una escritura en Git SHALL anunciarse antes de ocurrir

Un control que modifica el repositorio SHALL declarar esa consecuencia antes de ejecutarla. Un
botón cuyo rótulo no nombra la escritura NO SHALL realizarla sin confirmación previa.

El caso declarado: «Revisar y elegir runtime» crea la rama del cambio. La casilla anuncia que la
rama se va a crear, pero la creación ocurre al apretar un botón que dice revisar, de modo que el
repositorio cambia de rama en el momento en que la persona creía estar mirando opciones.

#### Scenario: El control que escribe no nombra la escritura
- **WHEN** un control modifica el repositorio y su rótulo no lo declara
- **THEN** se pide confirmación explícita, o el rótulo se corrige para nombrarla

### Requirement: Cada campo del formulario SHALL declarar dónde termina lo que se escribe

Un campo que compone una instrucción o un artefacto SHALL indicar en qué termina su contenido:
qué queda escrito en el repositorio, qué es texto que sólo lee el ejecutor, y qué nombra una
carpeta o una rama.

Hoy cada campo tiene su texto de ayuda, pero explica el formato y no el destino. La diferencia
importa porque el formulario mezcla las tres cosas: el nombre del cambio crea una carpeta y una
rama, el objetivo es texto para el ejecutor, y ninguno se guarda como artefacto —los artefactos los
escribe el ejecutor después—.

#### Scenario: Un campo escribe en el repositorio
- **WHEN** el contenido de un campo determina una carpeta, una rama o un archivo
- **THEN** el formulario lo declara junto al campo, antes de que se complete

### Requirement: La versión del motor contra la que trabaja el ciclo SHALL estar declarada

La aplicación SHALL declarar contra qué versión de OpenSpec está escrito su ciclo, además de
mostrar la versión detectada en el repositorio.

Hoy la franja muestra la versión instalada, y eso alcanza para saber qué hay pero no para saber si
la aplicación la aprovecha. El desfase con la 1.5 pasó inadvertido porque los comandos viejos
siguieron funcionando: nada falló, y lo que se perdió fue todo lo agregado en seis versiones.

#### Scenario: La versión instalada supera a la declarada
- **WHEN** el repositorio tiene una versión de OpenSpec posterior a la que declara el ciclo
- **THEN** la aplicación lo informa, para que el desfase se vea en vez de descubrirse después
