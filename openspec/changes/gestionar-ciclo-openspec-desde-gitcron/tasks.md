## 1. Corrección del estado de integración

- [ ] 1.1 En `electron/ipc/pipeline-openspec.ts`, reemplazar la rama `installedIntegration.skills.length > 0` de `buildEngineStatusSnapshot` por una derivación basada en `installedWorkflowsByTarget` y `targets` de `electron/pipeline/openspec-evidence.ts`: la integración sólo se declara `up-to-date` si el target vigente del esquema actual tiene sus workflows instalados.
- [ ] 1.2 En `electron/__tests__/pipeline-openspec-evidence.test.ts`, agregar un caso con workflows presentes sólo en `.codex`/`.agent` y ninguno en `.agents`, afirmando que `integrationState` NO es `up-to-date`. Ejecutar la prueba de sabotaje: revertir 1.1, confirmar que el caso falla, restaurar, y pegar en el reporte la salida de la corrida fallida.
- [ ] 1.3 En `components/pipeline/OpenSpecEngineCard.tsx`, verificar que el estado resumido no pueda decir «Al día» mientras el detalle informa un target sin configurar, y agregar el caso al test del componente.

- [ ] 1.4 **Auditoria del 2026-09-07: la tarjeta gano una segunda autoridad sobre el estado de
  integracion, y las demas superficies no se enteran.**
  Al resolver 1.3 se agrego `deriveEffectiveIntegrationState` en
  `components/pipeline/OpenSpecEngineCard.tsx:82-108`: una **segunda derivacion** del estado de
  integracion, hecha en el renderer, que degrada `up-to-date` a `outdated` cuando el detalle informa
  un target sin configurar.
  El problema no es la regla, que es correcta: es **donde vive**. Ahora hay dos autoridades que
  calculan lo mismo con entradas distintas:
  - El proceso principal, en `electron/ipc/pipeline-openspec.ts` (`buildEngineStatusSnapshot`), que
    tras 1.1 lo deriva de `installedWorkflowsByTarget` y `targets`.
  - La tarjeta, que lo re-deriva de `configuredAgentsCount`, `totalPresentAgentsCount`,
    `presentToolDirectories` y `configuredTools`.
  Y **nadie mas conoce la segunda**. Medido el 2026-09-07, los otros dos consumidores siguen leyendo
  el valor crudo del proceso principal:
  - `lib/openspec-update-guide.ts:130-135`, `deriveUpdateMatrixAction`, que con `up-to-date` devuelve
    `none`: **no ofrece actualizar**.
  - `components/pipeline/pipeline-domain.ts:288`, `hasOpenSpecEngineAttention`, que enciende el
    triangulo ambar del inspector.
  Consecuencia: en el caso que 1.3 dice resolver, la tarjeta pasa a decir «Desactualizado» y
  «Necesita atencion» mientras la aplicacion **no ofrece ninguna accion** y el triangulo del
  inspector no se enciende. Se cambio una contradiccion por otra.
  Ademas, la tarea 1.3 pedia **verificar** que el resumen no pudiera decir «Al dia» con un target sin
  configurar, y agregar el caso a la prueba del componente. Que la verificacion no se sostuviera sin
  agregar un mecanismo nuevo es la senal de que **1.1 quedo incompleta**: la regla pertenece a la
  fuente, no a la pantalla.
  Resolver llevando la regla al proceso principal y dejando que la tarjeta muestre lo que recibe.

- [ ] 1.5 **Registro del 2026-09-07: una prueba afirmaba el defecto como si fuera lo correcto.**
  `electron/__tests__/pipeline-openspec-evidence.test.ts:322`, en la prueba «reproduce en disco real
  el caso exacto de Alejandro: CLI 1.5, legacy skills 1.5, custom skills y global config 5
  workflows», afirmaba `expect(snapshot.integrationState).toBe('up-to-date')` sobre un repositorio
  con los skills oficiales unicamente en `.codex` y ningun workflow oficial en `.agents`.
  Es exactamente la mentira que el `proposal.md` de este change denuncia, escrita como expectativa.
  La prueba reproducia el caso que Alejandro reporto y afirmaba el veredicto equivocado como
  correcto: mientras estuviera asi, cualquier arreglo de 1.1 la habria hecho fallar y habria parecido
  una regresion.
  Se cambio a `toBe('outdated')` en la tanda del 2026-09-07, declarado en el reporte. Queda anotado
  porque es el tipo de hallazgo que hay que poder encontrar despues: una comprobacion en verde no
  dice que el comportamiento sea correcto, dice que es el que alguien escribio.

## 2. Autoría de tareas en el proceso principal

- [ ] 2.1 En `electron/pipeline/task-checkbox.ts`, agregar funciones puras `addTaskLine`, `editTaskText`, `moveTaskLine` y `removeTaskLine` con la misma forma de resultado tipado que `toggleTaskCheckbox` y su misma verificación de `expectedText`, sin alterar ninguna línea ajena a la operación.
- [ ] 2.2 En `electron/pipeline/task-checkbox.ts`, extender `composeTaskLogEntry` para registrar el tipo de operación y si la originó una persona o un agente, conservando el formato de una línea por entrada legible sin herramientas.
- [ ] 2.3 En `electron/pipeline/__tests__/`, cubrir 2.1 y 2.2 con tablas de entrada y salida, incluyendo: sangría y numeración preservadas al editar el texto, rechazo por `mismatch` cuando la línea cambió, y que ninguna operación toca líneas vecinas.
- [ ] 2.4 En `electron/ipc/pipeline-tasks.ts`, registrar los canales de agregar, editar, mover y eliminar tarea, con la misma validación de ruta autorizada, slug y contención `resolveInside` que ya usa `pipeline:set-task-checked`, devolviendo códigos de error y nunca prosa.
- [ ] 2.5 En `electron/__tests__/`, verificar que cada canal nuevo rechaza ruta no autorizada, slug inválido y cambio archivado, y que ante `mismatch` no escribe. Afirmar sobre el llamado a la escritura, no sólo sobre el valor devuelto.

- [ ] 2.6 **Tres decisiones que hay que tomar antes de escribir las funciones de 2.1**, medidas el
  2026-09-07 sobre `electron/pipeline/task-checkbox.ts` (72 lineas).

  **a. La numeracion al mover y al agregar.** La expresion que reconoce una tarea es
  `TASK_LINE = /^(\s*-\s*\[)([ xX])(\]\s*)(.*)$/` (`:12`): el numero —`4.12`— cae **adentro del
  grupo del texto**, no es una posicion. Mover una linea mueve su numero con ella.
  Lectura propuesta: **el numero es un identificador, no un lugar.** Este mismo archivo lo demuestra:
  tiene grupos `3b`, `3c`, `9b` y `9c`, asi que la numeracion ya no describe el orden. Renumerar al
  mover contradiria ademas la regla de la propia 2.1 —«sin alterar ninguna linea ajena a la
  operacion»—, porque obligaria a reescribir todas las de abajo.
  Consecuencia que hay que aceptar de frente: despues de arrastrar, la lista puede mostrar 8.9 arriba
  de 8.8. Si eso no se acepta, la alternativa es renumerar y entonces 2.1 cambia de regla. **La decide
  Alejandro.**
  Lo mismo vale para `addTaskLine`: declarar que numero recibe una tarea nueva y por que, o si no
  recibe ninguno.

  **b. El encabezado del registro deja de ser cierto.** `LOG_HEADING = '# Registro de tildes'`
  (`:64`) nombra un archivo que hasta hoy solo anotaba marcar y desmarcar. Con 2.2 va a anotar
  tambien agregar, editar, mover y borrar. Un encabezado que dice «tildes» sobre un registro que ya no
  es de tildes es la misma clase de mentira que este change vino a corregir en la tarjeta del motor.
  Cambiarlo, y declarar que pasa con los registros ya escritos en repositorios existentes: no se
  reescriben.

  **c. La tolerancia del `expectedText`.** La comprobacion de `toggleTaskCheckbox` (`:44`) acepta la
  linea no solo cuando el texto coincide, sino tambien cuando `expectedText` **empieza con** el texto
  del archivo. Es una tolerancia a texto recortado, y para marcar una casilla no hace dano. Para
  **editar** el texto de una tarea si: aceptaria escribir sobre una linea que no es exactamente la que
  se leyo. Decidir si las funciones nuevas comparten esa tolerancia o exigen coincidencia exacta, y
  escribir el motivo al lado.

- [ ] 2.7 **Auditoria del 2026-09-07: `toggleTaskCheckbox` cambio de comportamiento sin declararlo,
  y sin prueba que lo cubra.**
  Al escribir las cuatro funciones nuevas se agrego `detectEol` y se cambio el cierre de la funcion
  que ya existia: antes unia las lineas con el salto de Unix fijo y ahora usa el que encontro en el
  archivo (`electron/pipeline/task-checkbox.ts`). El reporte de la tanda no lo menciona.
  **El cambio es correcto y arregla un defecto anterior**: la version vieja partia aceptando ambos
  finales de linea y volvia a unir siempre con el de Unix, asi que tildar una sola casilla en un
  `tasks.md` con finales de linea de Windows **reescribia el archivo entero**. Un clic producia un
  diff de todas las lineas. Preservar el final de linea es lo que corresponde.
  Lo que falta es lo otro: **ninguna prueba lo cubre.** Medido el 2026-09-07,
  `electron/__tests__/pipeline-task-checkbox.test.ts` no tiene ni un caso con finales de linea de
  Windows en la entrada. Las cinco funciones del modulo llaman a `detectEol` y nada comprueba que
  preserven lo que encontraron.
  Agregar la cobertura para las cinco: entrada con finales de linea de Windows, salida que los
  conserva. Y declarar el arreglo donde se pueda leer: cambio lo que la aplicacion escribe en el
  repositorio de la persona.

## 3. Escritura de artefactos en el proceso principal

- [ ] 3.1 En `electron/pipeline/`, agregar la consulta de `openspec instructions <artefacto> --change <slug> --json` mediante `runAuthorizedOpenSpec`, devolviendo `resolvedOutputPath`, `instruction`, `template`, `context`, `dependencies`, `unlocks` y `existingOutputPaths` sin interpretar su contenido. Medido el 2026-09-07: en OpenSpec 1.11.0 el campo `rules` no existe en la salida JSON del CLI; en su lugar expone `unlocks` y `existingOutputPaths`.
- [ ] 3.2 En `electron/ipc/pipeline-specs.ts`, agregar el canal de escritura de un artefacto, contenido a las rutas que devuelve 3.1, rechazando cualquier destino fuera del directorio del change y todo cambio archivado.
- [ ] 3.3 Agregar al registro del change las entradas de escritura de artefacto, con el mismo formato y origen declarado que 2.2.
- [ ] 3.4 En `electron/__tests__/`, verificar que el canal de escritura rechaza una ruta fuera del change aunque venga de una respuesta del CLI manipulada, y que sobre un change archivado no escribe.
- [ ] 3.5 Agregar la operación de revisión del alcance de un cambio en curso, delegándola al workflow que el motor exponga para ello. Medido el 2026-09-07: el CLI 1.11.0 no cuenta con subcomando de revisión (falla con `change_error: Artifact 'update' not found in schema 'spec-driven'`); la revisión es un workflow de agente documentado en `.agents/skills/openspec-update-change/SKILL.md`. Depende de 8.5 para la presentación y revisión bloque por bloque mediante DiffViewer antes de confirmar cualquier escritura. Fundamento medido: en `unificar-sistema-visual-gitcron` el alcance se revisó cinco veces editando sólo la lista de tareas, y `design.md` terminó describiendo una causa que la investigación posterior desmintió.
- [ ] 3.6 Declarar cuándo la revisión cambia el propósito del trabajo en lugar de precisarlo, y en ese caso ofrecer abrir un cambio nuevo en vez de reescribir el vigente. Heurística «Update vs. Start Fresh» documentada por el propio motor en `.agents/skills/openspec-update-change/SKILL.md:91`: «If the request changes the change's intent rather than refining it, first verify whether the optional $openspec-new-change (Codex) or /openspec-new-change (other agents) workflow is available. If it is, recommend starting fresh with $openspec-new-change [...] (the "Update vs. Start Fresh" heuristic). If it is unavailable, ask for a distinct unused change name and recommend openspec new change "<new-change-name>" instead.» Es el criterio que el propio motor documenta, y el que en esta sesión llevó a partir dos veces un change en lugar de ampliarlo.

- [ ] 3.7 **Auditoria del 2026-09-07: la suite no esta en verde, y la causa es de la tanda de 3b.**
  Medido dos veces sobre el arbol de la tanda: `pnpm test` completo devuelve exit **1**, con
  1 archivo y 1 prueba en rojo sobre 180 y 1734. El reporte de la tanda declara 1734 en verde y
  exit 0.
  La que falla es
  `electron/__tests__/pipeline-openspec-ipc.test.ts` > «update-execute detecta la invalidacion del
  plan diagnostico frente a cambios en la evidencia viva».
  **Corriendo ese archivo solo, pasa** (18 de 18, exit 0). Falla unicamente dentro de la suite
  completa, o sea bajo carga.
  Causa medida: en la tanda de 3b se agregaron a `buildEngineStatusSnapshot` dos consultas al CLI
  —`doctor` y `context`— que lanzan procesos de verdad, sin cache. Esa prueba llama a
  `update-execute`, que construye el snapshot **dos veces** —el del plan y el vivo—, y **no sustituye
  `runDoctor` ni `runContext`**: desde esa tanda lanza hasta cuatro procesos reales de `openspec`
  donde antes no lanzaba ninguno. En Windows, con antivirus y la suite en paralelo, alcanza para
  pasarse del presupuesto.
  Correccion de una lectura propia: al auditar la tanda de 3b se anoto ese costo y se lo califico de
  poco preocupante porque no es un camino caliente. La suite dice otra cosa.
  Dos cosas que resolver, y son distintas:
  1. La prueba sustituye `runDoctor` y `runContext` como sustituye el resto. Una prueba de IPC no
     tiene por que lanzar el CLI de verdad.
  2. El costo en la aplicacion: `checkLatestOpenSpecVersion`, que vive en el mismo archivo y tambien
     sale afuera, **tiene cache**; `doctor` y `context` no. Medir cuanto tardan y decidir con el
     numero: o son lo bastante baratos y se declara por que no llevan cache, o siguen el patron del
     vecino.

## 3b. Diagnóstico del motor

- [ ] 3b.1 En `electron/pipeline/`, agregar la consulta del diagnóstico de salud de relaciones que el motor entrega en formato legible por máquina, transportando su resultado como datos sin recomponerlo en prosa.
- [ ] 3b.2 Agregar la consulta del contexto de trabajo resuelto que el motor produce para agentes, con el mismo criterio de transporte.
- [ ] 3b.3 Presentar ambos en la aplicación dentro del diagnóstico contraído, respetando la clasificación de gravedad que el motor declara y sin inventar advertencias cuando no reporta ninguna.
- [ ] 3b.4 En `electron/__tests__/`, verificar que un diagnóstico sin problemas no produce advertencias en la interfaz, y que una condición reportada por el motor se presenta con la gravedad que el motor le asigna y no con otra.

## 3c. El recorrido de artefactos, tal como lo da el motor

- [ ] 3c.1 Presentar el grafo de artefactos de un change tal como lo devuelve `openspec instructions <artefacto> --change <id> --json`: para cada artefacto, su estado, su `description`, de qué `dependencies` depende, qué `unlocks` habilita al completarse, y en qué `resolvedOutputPath` va a escribir. Hoy la aplicación muestra sólo estado binario por artefacto —una fila de píldoras HECHO— que no dice qué corresponde hacer ahora ni por qué. Ningún texto de esta vista se escribe a mano: todo sale del JSON del motor, y un campo que no viene no se inventa.
- [ ] 3c.2 Elegir un artefacto habilitado y disparar su operación desde ahí, con `existingOutputPaths` a la vista para que sobrescribir nunca sea silencioso. No hay orden obligatorio: OpenSpec abandonó el modelo de fases, así que la vista ofrece lo que el motor declara habilitado y no una secuencia numerada.
- [ ] 3c.3 Pruebas: la vista refleja el grafo que devolvió el motor y no uno derivado; un artefacto bloqueado no ofrece acción y muestra qué lo bloquea; un motor que falla no dibuja un grafo vacío que se lea como «no falta nada».
- [ ] 3c.4 La forma del recorrido. Alejandro la pidió el 2026-09-04, mirando el intento que rechazó en
  `remaquetar-cuerpo-de-sdd`: **una línea temporal con nodos unidos por una línea**, como la de
  Cronometric, y no una fila de fichas. La forma no es decorativa acá: el grafo tiene dependencias y
  desbloqueos, y una línea con nodos los puede mostrar mientras que una fila de fichas los esconde.
  Ese intento anterior está en el commit `2218586` de la rama `change/remaquetar-cuerpo-de-sdd`, para
  mirarlo antes de rehacerlo. **La aprueba Alejandro.**

## 4. Sincronización de specs

- [ ] 4.1 **Medición y estado real: `openspec sync` no existe en OpenSpec 1.11.0.** El grupo 4 original se formuló asumiendo un comando CLI inexistente. Medido contra OpenSpec 1.11.0 (`openspec --help`, `openspec change --help`, `openspec spec --help`): no hay comando ni subcomando de sincronización independiente. En OpenSpec la sincronización de specs ocurre de dos únicas formas:
  - Automática al archivar: `openspec archive <id>` archiva el cambio y fusiona las delta specs en `openspec/specs/`.
  - Manual guiada por agente: a través del workflow/skill `openspec-sync-specs` (`.agents/skills/openspec-sync-specs/SKILL.md`), diseñado para que un agente lea las delta specs y edite inteligentemente las specs principales sin archivar (ej. agregando escenarios o requisitos específicos sin sobrescribir el archivo completo).
- [ ] 4.2 **Alternativa B adoptada por decisión de Alejandro: delegación en el workflow nativo `openspec-sync-specs`.**
  Rechaza la Alternativa A (cálculo algorítmico y fusión propia en GitCron) para no dictar el criterio del canal ni duplicar lógica de OpenSpec. Si no hay agente disponible para ejecutar el workflow, la sincronización se detiene informando explícitamente el motivo (`reason: 'no-agent'`), sin caer en un cálculo de emergencia propio.
- [ ] 4.3 **Canales IPC de sincronización (`electron/ipc/pipeline-sync.ts`):**
  - `pipeline:sync-preview`: Estrictamente de sólo lectura. Lee las delta specs del cambio y las main specs correspondientes, computa la propuesta del agente y devuelve un diff unificado por capacidad mediante `generateUnifiedDiff`. Garantiza cero escrituras en disco.
  - `pipeline:sync-execute`: Exige confirmación previa explícita (`options.confirmed === true`). Escribe únicamente las capacidades aceptadas por el usuario bajo `openspec/specs/<cap>/spec.md` sanitizando rutas dentro del repositorio. Las especificaciones quedan sin confirmar en el árbol de Git (GitCron no realiza commit automático).
- [ ] 4.4 **Integración y máquina de revisión por bloque (8.5 a 8.7):**
  La propuesta del agente se visualiza a través de `AgentProposalReview` con `DiffViewer` en modo `proposal`, destacada visualmente con borde discontinuo violeta (`--color-accent-purple`) y etiqueta `NO ESCRITO`. Permite aceptar/descartar bloques individuales, editar el resultado final y confirmar la escritura. Verificado con pruebas automatizadas en `electron/__tests__/pipeline-sync-ipc.test.ts` que aseguran: validación de repositorios y slugs, rechazo sin confirmación explícita, parada sin fallback ante agente no disponible y escritura exclusiva de capacidades aceptadas.

- [ ] 4.5 **Auditoria del 2026-09-07: la Alternativa A entro por la ventana, y la aplicacion le
  atribuye al agente una fusion que el agente no hizo.**
  Medido sobre `electron/ipc/pipeline-sync.ts` y `electron/main.ts:322`.
  El canal de vista previa esta escrito con dos puntos de inyeccion, `isAgentAvailable` e
  `invokeSyncWorkflow`, y **la aplicacion no le pasa ninguno**: `main.ts:322` registra los
  manejadores solo con `getMainWindow`. Entonces, en la aplicacion corriendo:
  - `isAgentAvailable` toma su valor por omision, que es `async () => true`. La rama honesta
    —«no hay agente, me detengo»— **nunca se ejecuta**.
  - `invokeSyncWorkflow` queda indefinido, asi que **siempre** corre la rama de respaldo, comentada
    en el codigo como «simula el resultado del agente».
  Y esa rama hace esto: pega el contenido del spec principal, dos saltos de linea, y el spec
  delta entero. Es decir, **copia el delta completo al final del spec principal.** No es una
  fusion inteligente: es una
  concatenacion, y hace justo lo contrario de lo que el workflow declara que hay que hacer —«adding
  a scenario without copying the entire requirement»—: copia el requisito entero y lo duplica.
  Lo grave no es el algoritmo: es la **atribucion**. La respuesta del canal declara
  `workflow: 'openspec-sync-specs'` sobre un contenido que ese workflow no produjo. La aplicacion
  dice de donde viene algo, y no es de ahi.
  El prompt de la tanda lo prohibia con todas las letras: «NO caer a un cálculo propio de emergencia
  — eso sería la Alternativa A entrando por la ventana». Es exactamente lo que paso.
  Por que las pruebas no lo vieron: **las siete inyectan las dependencias que la aplicacion nunca
  pasa.** La que cubre el caso `no-agent` inyecta `isAgentAvailable: false`, que en produccion no
  ocurre jamas. La suite prueba una configuracion que no existe fuera de la suite.
  Resolver:
  1. Retirar la rama de respaldo. Sin runner del workflow, el canal se detiene y lo dice. Un camino
     que no existe se declara ausente; no se rellena.
  2. `isAgentAvailable` por omision no puede ser `true`. Sin forma de comprobarlo, la respuesta
     honesta es que no se sabe, y eso tambien detiene.
  3. Decidir y declarar **como se invoca el workflow de verdad**, que es lo que falta para que la
     Alternativa B exista. Mientras no este, el canal no ofrece una vista previa: informa que la
     sincronizacion sin archivar todavia no esta disponible y que archivar si sincroniza.
  4. Al menos una prueba tiene que ejercitar el canal **como lo registra `main.ts`**, sin inyectar
     nada. Es la unica que habria detectado esto.

## 5. Motivo al archivar

- [ ] 5.1 En `electron/ipc/pipeline-archive.ts`, aceptar un motivo opcional y conservarlo junto a los artefactos del cambio archivado, legible sin la aplicación.
- [ ] 5.2 En `electron/__tests__/`, verificar que archivar sin motivo sigue funcionando y que con motivo el texto queda escrito con el cambio.
- [ ] 5.3 **Archivar no puede depender de que nadie más mire el repositorio.** En Windows,
  `openspec archive` falla con `EPERM: operation not permitted, rename` sobre
  `openspec/changes/<id>` cuando cualquier proceso tiene un archivo de esa carpeta abierto, y el
  sistema no permite renombrarla.
  Caso real del 2026-09-02: falló desde la aplicación, desde la terminal, y también con la
  aplicación y el entorno de desarrollo cerrados. El bloqueo eran **dos servidores MCP** —CodeGraph
  y Fallow— que indexan el árbol con vigilante propio; matándolos, el archivado pasó en el primer
  intento. Verificado además con un `rename` a mano desde el shell, que fallaba igual: **el
  bloqueo lo impone el sistema de archivos, no el CLI**.
  Es intermitente, y por eso engaña: el índice de CodeGraph se había reescrito esa misma mañana
  después de un día de mover archivos en masa, mientras que el archivado del día anterior había
  funcionado sin problema. Un fallo así apunta siempre a lo último que se tocó —esa mañana se había
  actualizado OpenSpec— y no a su causa.
  El error se lee como si el CLI tuviera una salida sin usar —«No fallback copy was attempted»—
  pero en `dist/core/archive.js` de la 1.11 ese respaldo es **otro `rename`**, a una carpeta
  `.openspec-move-<uuid>`. Si el primero falló porque la carpeta está tomada, el segundo falla por
  lo mismo: la copia directa habría funcionado y el CLI no llega a intentarla. Es un defecto de la
  herramienta y corresponde reportarlo con `openspec feedback` antes de rodearlo acá.
  Lo que la aplicación sí puede hacer: reconocer el `EPERM`, decir que lo causa un proceso con la
  carpeta abierta, y no presentarlo como un fallo del cambio —el cambio está bien; lo que falla es
  la mudanza—.
  **Medición del 2026-09-03, que corrige lo anterior: el proceso que bloquea puede ser la propia
  aplicación.** Ese día el archivado falló con los servidores MCP ya detenidos. Listando los
  descriptores del sistema con `NtQuerySystemInformation`, los handles sobre
  `openspec/changes/<id>/specs` eran de dos procesos propios: `electron.exe`, por el vigilante
  Chokidar de `electron/ipc/watchers.ts`, y el `node.exe` de `tsup --watch` que levanta
  `pnpm electron:dev`. En Windows, vigilar un árbol con `ReadDirectoryChangesW` mantiene abiertos
  handles `FILE_LIST_DIRECTORY` sobre cada carpeta vigilada, y con un handle de directorio abierto
  el sistema prohíbe renombrar esa carpeta aunque deje crear, escribir y borrar los archivos de
  adentro. Por eso los cinco archivos del cambio se abrían sin problema y el directorio no se podía
  mover: **el bloqueo es de carpeta, no de archivo**, y buscarlo archivo por archivo no lo
  encuentra.
  El reintento con retroceso que quedó en `archiveOpenSpecChangeWithCli` cubre bloqueos
  transitorios —un antivirus, el indexador—, no éste: los handles de un vigilante no se sueltan en
  1,2 segundos, están abiertos mientras la aplicación corra. Las dos salidas que sí resuelven el
  caso son acotar el vigilante del compilador (tarea 5.4) y soltar el vigilante propio durante la
  mudanza: cuál se elige, o si van las dos, se decide acá y se declara con su motivo.

- [ ] 5.4 **El compilador de desarrollo no tiene por qué vigilar el repositorio entero.** En
  `package.json`, `electron:dev` corre `npm run build:electron -- --watch` sin ruta, y `tsup.config.ts`
  no declara `watch`, así que el vigilante toma el árbol completo desde la raíz y pone handles sobre
  `openspec/changes/`, que no es código que compile. Acotarlo a lo que tsup construye saca de en
  medio a uno de los dos bloqueadores medidos en 5.3, y no cambia nada del ciclo de desarrollo.
  Comprobar después que un cambio en `electron/` sigue recompilando `dist/main.js`, porque si el
  vigilante queda mal acotado el síntoma es que la recompilación deja de dispararse, y eso ya costó
  media hora una vez.

- [ ] 5.5 **Auditoria del 2026-09-07: el acotado del vigilante quedo declarado en dos lugares que
  dicen cosas distintas, y gana el que deja fuera a `lib/`.**
  La tanda resolvio 5.4 por dos caminos a la vez: `package.json` pasa `--watch electron` por linea de
  comandos, y `tsup.config.ts` declara `watch: ['electron', 'types', 'lib']` en las dos entradas.
  Medido el 2026-09-07 corriendo `pnpm exec tsup --watch electron` y leyendo su propia salida: tsup
  imprime **`Watching for changes in "electron"`**, en singular. **El argumento de linea de comandos
  gana y la lista del archivo de configuracion se ignora.**
  Consecuencia medida: `lib/` no se vigila, y `lib/` **si se empaqueta** dentro de `dist/main.js`
  —las dos entradas declaran `bundle: true` y `noExternal` de todo salvo `electron`—. O sea que
  editar `lib/openspec-version.ts`, que es justo lo que va a tocar el grupo 9c, **no dispara
  recompilacion** en desarrollo. Lo mismo con `types/`.
  Es exactamente la trampa que la propia 5.4 advertia: «si el vigilante queda mal acotado el sintoma
  es que la recompilacion deja de dispararse». La comprobacion de la tanda uso `electron/main.ts`,
  que es la unica ruta en la que los dos declarantes coinciden, asi que no podia detectarlo.
  Resolver dejando **una sola declaracion**, no dos. Y comprobar la recompilacion con un archivo de
  `lib/` y otro de `types/`, no solo de `electron/`.

- [ ] 5.6 **Auditoria del 2026-09-07: si el vigilante no se puede volver a tomar, nadie se entera.**
  `withRepoWatcherPaused` en `electron/ipc/watchers.ts` restaura el vigilante en su `finally`, que es
  lo correcto, pero envuelve la restauracion en un `catch` vacio. Si falla, la aplicacion se queda
  **sin ver los cambios de ese repositorio** y no lo dice.
  Es el sintoma que la propia 5.3 anticipa: «un vigilante que queda suelto deja la aplicacion sin ver
  los cambios del repositorio y el sintoma aparece mucho despues». Un archivado que salio bien y dejo
  la aplicacion ciega es peor que uno que fallo, porque no hay nada que mirar.
  Informarlo cuando pasa. No hace falta bloquear nada: hace falta decirlo.

## 6. Instalación del motor

- [ ] 6.1 En `electron/pipeline/`, agregar la resolución del gestor de paquetes del sistema con canonicalización de ruta, resolviendo en cada uso y sin memorizar, con la misma estrategia de contención que `resolveOpenSpecExecutable` de `electron/pipeline/openspec-engine.ts`.
- [ ] 6.2 Agregar la ejecución de la instalación local al repositorio, no interactiva, con tope de tiempo y salida capturada, dejando manifiesto y bloqueo modificados sin confirmar y devolviendo la lista exacta de archivos tocados.
- [ ] 6.3 Agregar la ejecución de la instalación global, no interactiva, con tope de tiempo y salida capturada, devolviendo el comando ejecutado y las rutas resueltas para que el renderer las muestre.
- [ ] 6.4 Al terminar cualquiera de las dos, volver a resolver el ejecutable de OpenSpec y recalcular su estado desde el disco en lugar de asumir la versión pedida.
- [ ] 6.5 En `electron/__tests__/`, verificar que sin gestor resuelto no se invoca nada y se devuelve el código correspondiente; que el argv es exactamente el esperado para cada modo; y que ante fallo de permisos el estado del motor queda como estaba. Afirmar sobre el llamado, no sobre el valor devuelto.
- [ ] 6.6 Comprobar la resolución del gestor sobre la aplicación empaquetada e instalada, no sólo en desarrollo, y dejar el resultado escrito en el reporte. Es la pregunta abierta declarada en `design.md`. **La marca Alejandro.**

- [ ] 6.7 Ofrecer la actualización del motor con el mismo patrón con que GitCron se actualiza a sí mismo: un indicador junto a la versión, que al abrirse ofrece la acción y la ejecuta, sin que haya que ir a buscar nada. La maquinaria ya existe en `electron/ipc/app-window.ts`, que usa `electron-updater` con `autoDownload = false` y los eventos `update-available`, `download-progress` y `update-downloaded`. Las tareas 6.1 a 6.5 resuelven **cómo instalar**; ésta resuelve **cómo se ofrece**, que es lo que hoy no existe: un repositorio con el motor atrasado no tiene en pantalla ningún camino a actualizarlo.

- [ ] 6.8 **Medir que trae OpenSpec 1.12.0 antes de decidir si se adopta.** Pregunta de Alejandro del
  2026-09-07: el CLI publico la 1.12.0 y el sistema tiene la 1.11.0 instalada, medido con
  `openspec --version` en cero.
  El salto no es instalar un paquete. `lib/openspec-version.ts:17-22` declara
  `OPENSPEC_CYCLE_TARGET_VERSION = '1.11.0'` y el rango soportado `{ min: '1.5.0', max: '1.11.0' }`,
  y el encabezado de ese archivo explica por que: el JSON del CLI cambia entre minors —`status` gano
  `requires` en 1.7 e `isPlanningComplete` en 1.8—, asi que «se ejecuta» no implica «se soporta».
  Instalar 1.12.0 hoy, sin tocar nada mas, deja al motor **fuera del rango declarado** y la
  aplicacion lo va a clasificar `too-new`, que es exactamente lo que esta escrita para detectar.
  Medir, sin cambiar ninguna constante:
  - Que agrega, cambia o retira 1.12.0 respecto de 1.11.0, con la fuente citada.
  - Cuales de esos cambios tocan lo que GitCron **consume**: la forma del JSON de `status`,
    `instructions`, `validate`, `archive` y `sync`, y los workflows del perfil.
  - Que se rompe si el motor sube y la aplicacion no. En particular, la tarea 5.3 de este change esta
    anclada a las entrañas de `dist/core/archive.js` **de la 1.11**: declarar si esa medicion sigue
    valiendo en 1.12.
  **La decision de adoptarla o no la toma Alejandro**, sobre lo medido. No se cambia
  `OPENSPEC_CYCLE_TARGET_VERSION` ni `SUPPORTED_OPENSPEC_VERSIONS` en esta tarea.
  Nota de oportunidad: mientras la 1.12.0 siga sin instalarse, este repositorio tiene **una
  actualizacion real pendiente**, que es el caso de prueba vivo que la tarea 6.7 necesita para
  comprobar que el camino a actualizar existe en pantalla. Actualizar a mano antes de construir 6.7
  lo consume.

- [ ] 6.9 **Idea de Alejandro del 2026-09-07, y su dependencia declarada.** Que la comprobacion de
  version no se quede en «hay una nueva»: que entre a ver que cambio, juzgue si rompe algo de lo que
  GitCron consume, y si rompe, **proponga la estrategia** —que habria que modificar y en que orden—,
  explicada en criollo. Alejandro imagina resolver la explicacion con un modelo, preferentemente
  local.
  **Esa parte no se puede construir todavia, y el motivo esta medido.** Al 2026-09-07 la capa que
  llama a modelos esta partida en tres pilas que no se conocen entre si:
  - `electron/ai/providers/` — `claude.ts`, `openrouter.ts`, `index.ts`.
  - `electron/ai/carto/` — su propio `openrouter.ts`, su propio `lmstudio.ts` y su `provider.ts`.
  - `electron/ai/commit-message/` — su propio `local-provider.ts`, con SSE y bombeo de trozos aparte.
  La duplicacion es literal, no conceptual: `electron/ai/providers/openrouter.ts:20` y
  `electron/ai/carto/openrouter.ts:23` declaran **el mismo endpoint y la misma cabecera
  `http-referer`**; `electron/ai/carto/lmstudio.ts:25` y
  `electron/ai/commit-message/local-provider.ts:40` declaran **el mismo `http://localhost:1234`**. El
  segundo lo dice por escrito en su encabezado (`:7`): «El de Cartografia tiene
  `http://localhost:1234` escrito en el codigo».
  Construir la explicacion asistida sobre esto agrega **una cuarta pila**. Antes hay que unificar, y
  eso es otro change.
  **Distincion que la unificacion no puede borrar**, para que no se decida mal: son dos trabajos
  distintos.
  - **Runtimes que ejecutan trabajo sobre el repositorio** —Claude Code, Codex, OpenCode, Qwen, y LM
    Studio segun el change `add-lmstudio-agent-runtime`—: bucles de agente con herramientas que
    editan archivos, con su contrato propio (`launchable`, `modifiesRepo`) y su registro.
  - **Llamadas que producen texto** —mensajes de commit, respuestas de Cartografia, y esta
    explicacion—: una consulta, una respuesta, sin escribir en el repositorio.
  Lo que esta duplicado es lo segundo. Unificar lo primero con lo segundo mezclaria dos contratos que
  no son el mismo.
  Nota sobre las claves: Alejandro pidio «tokens de variables de entorno». El proyecto ya resuelve
  eso mejor y no hace falta cambiarlo: `electron/ai/key-store.ts` es un baul cifrado multi-proveedor
  con `safeStorage` de Electron —DPAPI en Windows—, donde la clave vive solo en el proceso principal
  y **nunca** se expone por IPC. No hay un solo `process.env` en toda la capa de IA, y es a
  proposito. Lo unico que lo ata hoy a una de las tres pilas es su tipo, que es
  `AIPredictionProvider['id']` de `types/temporal-agent`.
  Nota sobre Unsloth Desktop: **no existe ninguna referencia en el repositorio**, medido el
  2026-09-07. Y su forma —URL remota via Cloudflare mas token— es la misma que la de las otras dos
  configuraciones: LM Studio es URL local sin clave, OpenRouter es URL fija con clave. Las tres son
  «URL base mas clave opcional» sobre una API compatible con OpenAI. Eso es un argumento a favor de
  unificar, no tres integraciones distintas.
  **Que decide Alejandro:** si se abre el change de unificacion antes de esta tarea, y con que
  alcance. Mientras no exista, 6.8 se queda en medir y reportar, sin explicacion asistida.

## 7. Perfil de workflows

- [ ] 7.1 En `electron/pipeline/`, agregar la lectura de `openspec config list` devolviendo perfil y workflows habilitados como datos, sin enum cerrado en el código.
- [ ] 7.2 Agregar el canal de activación y desactivación de un workflow, y recalcular las acciones ofrecidas desde la configuración resultante.
- [ ] 7.3 En `electron/__tests__/`, verificar que un workflow ausente de la configuración no habilita su acción, usando una configuración con un nombre de workflow que el código no conoce.
- [ ] 7.4 Distinguir el workflow que el perfil no habilita del que el motor instalado no tiene. Son dos causas distintas con soluciones distintas: la primera se resuelve activándolo desde el panel de perfil, la segunda actualizando el motor. Caso comprobado el 2026-08-19: el motor 1.5.0 no expone `update`, que sí integra el conjunto básico de la 1.9.0, de modo que cambiar el perfil a `core` no lo habilita.
- [ ] 7.5 Cuando una operación no esté disponible por versión del motor, declarar cuál la habilitaría, apoyándose en el eje de novedad en npm que la tarjeta ya expone. No deducir la versión mínima de una tabla propia en el código: derivarla de lo que el motor y el registro informan.

## 8. Interfaz: tareas y artefactos

- [ ] 8.1 En `components/pipeline/`, construir la vista de lista de tareas con agregar, editar, reordenar, marcar y eliminar, consumiendo los canales de la sección 2, con confirmación al eliminar y al desmarcar.
- [ ] 8.2 Agregar la vista del texto del archivo de tareas, editable, que escribe sobre el mismo archivo y refleja lo hecho en la lista.
- [ ] 8.3 Escribir en `lib/` una función pura que detecte líneas que aparentan una tarea mal formada —empiezan con guion o numeración y su casilla no cumple el formato— sin señalar encabezados, párrafos ni notas, y cubrirla con una tabla de casos que incluya `## 1. Grupo`, `- [ ] 1.1 ok`, `- [] 1.2 rota`, `-[ ] 1.3 rota`, `- [x] 1.4 ok` y una línea de prosa suelta.
- [ ] 8.4 Señalar en ambas vistas las líneas que devuelve 8.3, sin impedir guardar.
- [ ] 8.5 Agregar a `components/DiffViewer.tsx` un modo de propuesta con acciones de aplicar y descartar por bloque, reutilizando `parseDiff` y la selección de líneas existentes, sin alterar el comportamiento de los modos `stage` y `unstage`.
- [ ] 8.6 Construir la revisión de una propuesta de agente sobre 8.5: aceptar y rechazar por bloque, editar el resultado, y escribir sólo al confirmar. La propuesta debe distinguirse visualmente de lo ya escrito, sin inventar una paleta propia: lo especulativo jamás puede confundirse visualmente con lo real.
- [ ] 8.7 Verificar con tests de componente que descartar una propuesta no invoca el canal de escritura, y que aceptar parcialmente escribe únicamente los bloques aceptados.

- [ ] 8.8 **Reordenar tareas arrastrando, pedido de Alejandro del 2026-09-07.** «Estaria bueno poder
  hacer un drag and drop de las tareas vigentes, para reordenar a la vista.»
  La parte de abajo ya esta planificada: `moveTaskLine` es una de las cuatro funciones puras que pide
  la tarea 2.1, y su canal IPC lo pide la 2.4. Esta tarea es **solo la superficie**: arrastrar una
  tarea de la lista y soltarla en su lugar nuevo, que escribe con ese canal.
  No traer dependencia nueva: el proyecto ya arrastra y suelta en cuatro lugares
  —`components/InteractiveRebasePanel.tsx`, `components/RepoSidebar.tsx`,
  `components/RepoSidebarParts.tsx` y `components/RepoTabs.tsx`—, medido el 2026-09-07. Medir cual de
  esos patrones sirve y adoptarlo, o declarar por que ninguno sirve.
  Reglas que no se negocian: se puede reordenar con teclado, no solo con el mouse; mientras el
  arrastre esta en curso nada mas de la pantalla se mueve; y si la escritura falla, la lista vuelve a
  como estaba y lo dice, en vez de quedar mostrando un orden que el archivo no tiene.

- [ ] 8.9 **La conversacion que abre un cambio, con cara de aplicacion.** Pedido de Alejandro del
  2026-09-07, mostrando la rutina del CLI: `/opsx:explore` pregunta que se quiere explorar, mira el
  proyecto, propone un camino y pregunta si se acota; `/opsx:propose` crea el cambio y declara que
  artefacto escribio y para que sirve cada uno; `/opsx:apply` va tildando; `/opsx:archive` cierra y
  dice adonde quedo.
  «Eso tendria que mostrarse con una interfaz linda y amena en GitCron, que es mas o menos lo que
  tenemos ahora cuando empezamos una task nueva.»
  Punto de partida medido el 2026-09-07: `components/pipeline/PipelineNewChangeFlow.tsx`, 414 lineas,
  que ya hace la primera pregunta.
  Lo que falta es que sea **un recorrido y no un formulario**: cada paso dice donde esta parado, que
  le contesto el motor y que sigue. Lo que el CLI ya devuelve se muestra; lo que no, se declara. No
  inventar pasos que el motor no tiene ni prometer que hara algo que no hace.
  Frontera: las palabras de cada paso las decide `explicar-el-ciclo-sin-tecnicismos`. Esta tarea
  decide el recorrido y su forma.

## 9. Interfaz: motor, sync, archivado y jerarquía

- [ ] 9.1 Reordenar `components/pipeline/OpenSpecUpdateReview.tsx` y `OpenSpecEngineCard.tsx` para que las acciones y el estado resumido en una línea precedan al diagnóstico, con el diagnóstico completo contraído por omisión y sin perder ninguna evidencia que hoy muestra.
- [ ] 9.2 Ofrecer las dos acciones de instalación del motor por separado, con la local oculta y explicada cuando el repositorio no tiene manifiesto.
- [ ] 9.3 Construir la confirmación de la instalación global mostrando comando literal, rutas resueltas del gestor y de Node, y la lista de repositorios abiertos que quedarían afectados.
- [ ] 9.4 Agregar el botón de sincronización con su vista previa, y el campo opcional de motivo en el archivado, destacado cuando queden tareas sin completar.
- [ ] 9.5 Presentar toda operación bloqueada como control deshabilitado con su motivo al lado, sin depender del desplazamiento, incluido el bloqueo sobre la rama principal para actualizar la integración y archivar.
- [ ] 9.6 **Ejecutar el comando que la aplicación ya muestra, sin salir de ella.** Cada operación
  del ciclo declara el comando que va a correr —el archivado muestra `openspec archive <id> --yes`—
  pero ese texto no se puede copiar ni ejecutar: cuando el botón falla hay que transcribirlo a mano
  en otra ventana. Caso real del 2026-09-02, con el archivado fallando por permisos de Windows.
  Se acota a comandos `openspec`: un intérprete libre es una superficie de riesgo con los permisos
  de quien usa la aplicación, y no hace falta para el caso que lo motiva. Ya existe
  `terminalOpen(repoPath)` en `types/electron.d.ts`, que abre una terminal externa y no ejecuta
  nada adentro: esto es distinto y no lo reemplaza.
  **Ojo con lo que NO resuelve**: el fallo que lo motivó viene de que la aplicación vigila el
  repositorio, así que el mismo comando lanzado desde acá fallaría igual. Lo que se arregla en 5.3
  es otra cosa y va primero.
- [ ] 9.7 Agregar a `lib/i18n.ts` las claves en ES, EN y ZH de todo lo anterior, mapeando cada código de error del proceso principal a su clave, sin armar claves por interpolación de plantilla y sin dejar ninguna clave sin consumidor.
- [ ] 9.8 Actualizar `components/pipeline/__tests__/pipeline-i18n.test.ts` con las claves nuevas y verificar la paridad en los tres idiomas.

## 9b. Una sola forma de llamar a un modelo

Alejandro decidio el 2026-09-07 que esto entra **en este change** y no en uno aparte: «metemos todo
aca, quiero terminar de una vez por todas». Se dejo constancia de que abrirlo aparte era la
alternativa; la decision es suya y esta tomada.

Estado medido el 2026-09-07: la capa que llama a modelos esta partida en tres pilas que no se
conocen entre si, y la duplicacion es literal.
- `electron/ai/providers/openrouter.ts:20` y `electron/ai/carto/openrouter.ts:23` declaran **el mismo
  endpoint y la misma cabecera `http-referer`**.
- `electron/ai/carto/lmstudio.ts:25` y `electron/ai/commit-message/local-provider.ts:40` declaran **el
  mismo `http://localhost:1234`**. El segundo lo dice por escrito en su encabezado (`:7`).

- [ ] 9b.1 Inventariar las tres pilas con archivo y linea: que hace cada una, que comparten y en que
  se diferencian de verdad. Declarar cual queda como base y por que. No empezar a mover codigo antes
  de esto.
- [ ] 9b.2 **Distincion que la unificacion no puede borrar.** Son dos trabajos distintos y solo uno
  se unifica aca: los **runtimes que ejecutan trabajo sobre el repositorio** —Claude Code, Codex,
  OpenCode, Qwen, y LM Studio segun el change `add-lmstudio-agent-runtime`— son bucles de agente con
  herramientas que editan archivos, con contrato propio (`launchable`, `modifiesRepo`) y registro
  propio. Lo que se unifica es lo otro: las **llamadas que producen texto** —mensaje de commit,
  respuestas de Cartografia, y la explicacion de la 9c—. Declararlo en el codigo, no solo aca.
- [ ] 9b.3 Una sola forma de declarar un proveedor de texto: **URL base mas clave opcional** sobre una
  API compatible con OpenAI. Las tres configuraciones que hay que cubrir caben en esa forma, medido el
  2026-09-07: LM Studio es URL local sin clave; Unsloth Desktop es URL remota por Cloudflare con
  token; OpenRouter es URL fija con clave. No son tres integraciones.
- [ ] 9b.4 Unsloth Desktop: **no existe ninguna referencia en el repositorio**, medido el 2026-09-07.
  Se agrega como una configuracion mas de 9b.3, no como pila propia.
- [ ] 9b.5 Las claves siguen en el baul que ya existe. `electron/ai/key-store.ts` cifra con
  `safeStorage` de Electron —DPAPI en Windows—, la clave vive solo en el proceso principal y **nunca**
  se expone por IPC. No hay un solo `process.env` en toda la capa de IA y es a proposito: **no se
  agregan variables de entorno para claves.** Lo unico que hay que despegar es su tipo, hoy atado a
  `AIPredictionProvider['id']` de `types/temporal-agent`.
- [ ] 9b.6 Migrar los consumidores actuales —mensaje de commit y Cartografia— a la forma unica, uno
  por vez, y **retirar la pila que queda sin consumidor**. Entregar la lista de lo retirado. La
  unificacion vale si borra codigo, no si agrega una capa encima de las tres.
- [ ] 9b.7 Cubrir con pruebas que las tres configuraciones se arman igual y que la clave no sale del
  proceso principal en ninguna de ellas. Afirmar sobre el pedido armado, no sobre el valor devuelto.

## 9c. La verificacion de version, con criterio

- [ ] 9c.1 Que la comprobacion no se quede en «hay una nueva»: que traiga que cambio, con la fuente
  citada, y si la fuente no esta disponible lo diga en vez de inventar una lista.
- [ ] 9c.2 Que juzgue si esos cambios tocan lo que GitCron **consume** —la forma del JSON de `status`,
  `instructions`, `validate`, `archive` y `sync`, y los workflows del perfil— y declare cada veredicto
  con su evidencia.
- [ ] 9c.3 Si algo rompe, **proponer la estrategia**: que habria que modificar, en que orden, y que se
  puede hacer sin tocar nada. Es una propuesta para que Alejandro decida, no una accion automatica.
- [ ] 9c.4 La explicacion en criollo se redacta con la capa unica de 9b, con modelo local por omision.
  Sin 9b terminada esta tarea no arranca: construirla antes agrega una cuarta pila.
- [ ] 9c.5 Lo que el modelo redacta se presenta **como redaccion**, separado de lo medido. Un veredicto
  sobre si algo rompe sale de la comparacion, no del modelo. Es la misma regla que ya rige a
  `PipelineArtifactGraph`, que declara no inventar estado derivandolo de otra cosa.
- [ ] 9c.6 Subir `OPENSPEC_CYCLE_TARGET_VERSION` y `SUPPORTED_OPENSPEC_VERSIONS` de
  `lib/openspec-version.ts` sigue siendo un acto deliberado con evidencia. **La decide Alejandro**,
  sobre lo medido. La comprobacion informa; no mueve el rango sola.

## 10. Cierre y validación

- [ ] 10.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 10.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 10.3 `openspec validate gestionar-ciclo-openspec-desde-gitcron --strict` en cero.
- [ ] 10.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [ ] 10.5 Revisión visual y funcional en la aplicación: acciones antes del diagnóstico, alta y edición de tareas, revisión de una propuesta por bloque distinguible de lo ya escrito, sincronización con su vista previa, motivo al archivar, e instalación del motor en sus dos modos. **La marca Alejandro.**
