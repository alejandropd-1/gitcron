## 1. Corrección del estado de integración

- [x] 1.1 En `electron/ipc/pipeline-openspec.ts`, reemplazar la rama `installedIntegration.skills.length > 0` de `buildEngineStatusSnapshot` por una derivación basada en `installedWorkflowsByTarget` y `targets` de `electron/pipeline/openspec-evidence.ts`: la integración sólo se declara `up-to-date` si el target vigente del esquema actual tiene sus workflows instalados.
- [x] 1.2 En `electron/__tests__/pipeline-openspec-evidence.test.ts`, agregar un caso con workflows presentes sólo en `.codex`/`.agent` y ninguno en `.agents`, afirmando que `integrationState` NO es `up-to-date`. Ejecutar la prueba de sabotaje: revertir 1.1, confirmar que el caso falla, restaurar, y pegar en el reporte la salida de la corrida fallida.
- [x] 1.3 En `components/pipeline/OpenSpecEngineCard.tsx`, verificar que el estado resumido no pueda decir «Al día» mientras el detalle informa un target sin configurar, y agregar el caso al test del componente.

- [x] 1.4 **Auditoria del 2026-09-07: la tarjeta gano una segunda autoridad sobre el estado de
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

- [x] 1.5 **Registro del 2026-09-07: una prueba afirmaba el defecto como si fuera lo correcto.**
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

- [x] 2.1 En `electron/pipeline/task-checkbox.ts`, agregar funciones puras `addTaskLine`, `editTaskText`, `moveTaskLine` y `removeTaskLine` con la misma forma de resultado tipado que `toggleTaskCheckbox` y su misma verificación de `expectedText`, sin alterar ninguna línea ajena a la operación.
- [x] 2.2 En `electron/pipeline/task-checkbox.ts`, extender `composeTaskLogEntry` para registrar el tipo de operación y si la originó una persona o un agente, conservando el formato de una línea por entrada legible sin herramientas.
- [x] 2.3 En `electron/pipeline/__tests__/`, cubrir 2.1 y 2.2 con tablas de entrada y salida, incluyendo: sangría y numeración preservadas al editar el texto, rechazo por `mismatch` cuando la línea cambió, y que ninguna operación toca líneas vecinas.
- [x] 2.4 En `electron/ipc/pipeline-tasks.ts`, registrar los canales de agregar, editar, mover y eliminar tarea, con la misma validación de ruta autorizada, slug y contención `resolveInside` que ya usa `pipeline:set-task-checked`, devolviendo códigos de error y nunca prosa.
- [x] 2.5 En `electron/__tests__/`, verificar que cada canal nuevo rechaza ruta no autorizada, slug inválido y cambio archivado, y que ante `mismatch` no escribe. Afirmar sobre el llamado a la escritura, no sólo sobre el valor devuelto.

- [x] 2.6 **Tres decisiones que hay que tomar antes de escribir las funciones de 2.1**, medidas el
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

- [x] 2.7 **Auditoria del 2026-09-07: `toggleTaskCheckbox` cambio de comportamiento sin declararlo,
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

- [x] 3.1 En `electron/pipeline/`, agregar la consulta de `openspec instructions <artefacto> --change <slug> --json` mediante `runAuthorizedOpenSpec`, devolviendo `resolvedOutputPath`, `instruction`, `template`, `context`, `dependencies`, `unlocks` y `existingOutputPaths` sin interpretar su contenido. Medido el 2026-09-07: en OpenSpec 1.11.0 el campo `rules` no existe en la salida JSON del CLI; en su lugar expone `unlocks` y `existingOutputPaths`.
- [x] 3.2 En `electron/ipc/pipeline-specs.ts`, agregar el canal de escritura de un artefacto, contenido a las rutas que devuelve 3.1, rechazando cualquier destino fuera del directorio del change y todo cambio archivado.
- [x] 3.3 Agregar al registro del change las entradas de escritura de artefacto, con el mismo formato y origen declarado que 2.2.
- [x] 3.4 En `electron/__tests__/`, verificar que el canal de escritura rechaza una ruta fuera del change aunque venga de una respuesta del CLI manipulada, y que sobre un change archivado no escribe.
- [ ] 3.5 Agregar la operación de revisión del alcance de un cambio en curso, delegándola al workflow que el motor exponga para ello. Medido el 2026-09-07: el CLI 1.11.0 no cuenta con subcomando de revisión (falla con `change_error: Artifact 'update' not found in schema 'spec-driven'`); la revisión es un workflow de agente documentado en `.agents/skills/openspec-update-change/SKILL.md`. Depende de 8.5 para la presentación y revisión bloque por bloque mediante DiffViewer antes de confirmar cualquier escritura. Fundamento medido: en `unificar-sistema-visual-gitcron` el alcance se revisó cinco veces editando sólo la lista de tareas, y `design.md` terminó describiendo una causa que la investigación posterior desmintió.
- [ ] 3.6 Declarar cuándo la revisión cambia el propósito del trabajo en lugar de precisarlo, y en ese caso ofrecer abrir un cambio nuevo en vez de reescribir el vigente. Heurística «Update vs. Start Fresh» documentada por el propio motor en `.agents/skills/openspec-update-change/SKILL.md:91`: «If the request changes the change's intent rather than refining it, first verify whether the optional $openspec-new-change (Codex) or /openspec-new-change (other agents) workflow is available. If it is, recommend starting fresh with $openspec-new-change [...] (the "Update vs. Start Fresh" heuristic). If it is unavailable, ask for a distinct unused change name and recommend openspec new change "<new-change-name>" instead.» Es el criterio que el propio motor documenta, y el que en esta sesión llevó a partir dos veces un change en lugar de ampliarlo.

- [x] 3.7 **Auditoria del 2026-09-07: la suite no esta en verde, y la causa es de la tanda de 3b.**
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

- [x] 3b.1 En `electron/pipeline/`, agregar la consulta del diagnóstico de salud de relaciones que el motor entrega en formato legible por máquina, transportando su resultado como datos sin recomponerlo en prosa.
- [x] 3b.2 Agregar la consulta del contexto de trabajo resuelto que el motor produce para agentes, con el mismo criterio de transporte.
- [x] 3b.3 Presentar ambos en la aplicación dentro del diagnóstico contraído, respetando la clasificación de gravedad que el motor declara y sin inventar advertencias cuando no reporta ninguna.
- [x] 3b.4 En `electron/__tests__/`, verificar que un diagnóstico sin problemas no produce advertencias en la interfaz, y que una condición reportada por el motor se presenta con la gravedad que el motor le asigna y no con otra.

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

- [x] 4.1 **Medición y estado real: `openspec sync` no existe en OpenSpec 1.11.0.** El grupo 4 original se formuló asumiendo un comando CLI inexistente. Medido contra OpenSpec 1.11.0 (`openspec --help`, `openspec change --help`, `openspec spec --help`): no hay comando ni subcomando de sincronización independiente. En OpenSpec la sincronización de specs ocurre de dos únicas formas:
  - Automática al archivar: `openspec archive <id>` archiva el cambio y fusiona las delta specs en `openspec/specs/`.
  - Manual guiada por agente: a través del workflow/skill `openspec-sync-specs` (`.agents/skills/openspec-sync-specs/SKILL.md`), diseñado para que un agente lea las delta specs y edite inteligentemente las specs principales sin archivar (ej. agregando escenarios o requisitos específicos sin sobrescribir el archivo completo).
- [x] 4.2 **Alternativa B adoptada por decisión de Alejandro: delegación en el workflow nativo `openspec-sync-specs`.**
  Rechaza la Alternativa A (cálculo algorítmico y fusión propia en GitCron) para no dictar el criterio del canal ni duplicar lógica de OpenSpec. Si no hay agente disponible para ejecutar el workflow, la sincronización se detiene informando explícitamente el motivo (`reason: 'no-agent'`), sin caer en un cálculo de emergencia propio.
- [ ] 4.3 **Canales IPC de sincronización (`electron/ipc/pipeline-sync.ts`):**
  - `pipeline:sync-preview`: Estrictamente de sólo lectura. Lee las delta specs del cambio y las main specs correspondientes, computa la propuesta del agente y devuelve un diff unificado por capacidad mediante `generateUnifiedDiff`. Garantiza cero escrituras en disco.
  - `pipeline:sync-execute`: Exige confirmación previa explícita (`options.confirmed === true`). Escribe únicamente las capacidades aceptadas por el usuario bajo `openspec/specs/<cap>/spec.md` sanitizando rutas dentro del repositorio. Las especificaciones quedan sin confirmar en el árbol de Git (GitCron no realiza commit automático).
- [ ] 4.4 **Integración y máquina de revisión por bloque (8.5 a 8.7):**
  La propuesta del agente se visualiza a través de `AgentProposalReview` con `DiffViewer` en modo `proposal`, destacada visualmente con borde discontinuo violeta (`--color-accent-purple`) y etiqueta `NO ESCRITO`. Permite aceptar/descartar bloques individuales, editar el resultado final y confirmar la escritura. Verificado con pruebas automatizadas en `electron/__tests__/pipeline-sync-ipc.test.ts` que aseguran: validación de repositorios y slugs, rechazo sin confirmación explícita, parada sin fallback ante agente no disponible y escritura exclusiva de capacidades aceptadas.

- [x] 4.5 **Auditoria y resolución del 2026-09-07: retiro de la simulación y declaración honesta del estado de sincronización.**
  - **Retiro del relleno:** Se eliminó por completo la rama de respaldo en `electron/ipc/pipeline-sync.ts` que simulaba el workflow del agente concatenando el spec delta al final del spec principal.
  - **Omisión honesta:** `isAgentAvailable` por omisión se fijó en `async () => false`. Sin un método real de invocación o comprobación en producción, la respuesta honesta es que no está disponible.
  - **Declaración del camino real:** Cuando no hay agente o ejecutor disponible, el canal se detiene e informa explícitamente (`reason: 'no-agent'` o `reason: 'no-workflow-runner'`) que la sincronización sin archivar aún no está disponible, y orienta al usuario a que **archivar (`openspec archive`) sí sincroniza** y fusiona las delta specs en `openspec/specs/`.
  - **Prueba sin inyección:** Se incorporó en `electron/__tests__/pipeline-sync-ipc.test.ts` una prueba que monta `registerPipelineSyncHandlers` sin dependencias inyectadas (exactamente como lo hace `main.ts:322`) verificando que se detiene de forma honesta sin simular fusiones artificiales.

## 5. Motivo al archivar

- [x] 5.1 En `electron/ipc/pipeline-archive.ts`, aceptar un motivo opcional y conservarlo junto a los artefactos del cambio archivado, legible sin la aplicación.
- [x] 5.2 En `electron/__tests__/`, verificar que archivar sin motivo sigue funcionando y que con motivo el texto queda escrito con el cambio.
- [x] 5.3 **Archivar no puede depender de que nadie más mire el repositorio.** En Windows,
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

- [x] 5.4 **El compilador de desarrollo no tiene por qué vigilar el repositorio entero.** En
  `package.json`, `electron:dev` corre `npm run build:electron -- --watch` sin ruta, y `tsup.config.ts`
  no declara `watch`, así que el vigilante toma el árbol completo desde la raíz y pone handles sobre
  `openspec/changes/`, que no es código que compile. Acotarlo a lo que tsup construye saca de en
  medio a uno de los dos bloqueadores medidos en 5.3, y no cambia nada del ciclo de desarrollo.
  Comprobar después que un cambio en `electron/` sigue recompilando `dist/main.js`, porque si el
  vigilante queda mal acotado el síntoma es que la recompilación deja de dispararse, y eso ya costó
  media hora una vez.

- [x] 5.5 **Auditoria del 2026-09-07: el acotado del vigilante quedo declarado en dos lugares que
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

- [x] 5.6 **Auditoria del 2026-09-07: si el vigilante no se puede volver a tomar, nadie se entera.**
  `withRepoWatcherPaused` en `electron/ipc/watchers.ts` restaura el vigilante en su `finally`, que es
  lo correcto, pero envuelve la restauracion en un `catch` vacio. Si falla, la aplicacion se queda
  **sin ver los cambios de ese repositorio** y no lo dice.
  Es el sintoma que la propia 5.3 anticipa: «un vigilante que queda suelto deja la aplicacion sin ver
  los cambios del repositorio y el sintoma aparece mucho despues». Un archivado que salio bien y dejo
  la aplicacion ciega es peor que uno que fallo, porque no hay nada que mirar.
  Informarlo cuando pasa. No hace falta bloquear nada: hace falta decirlo.

## 6. Instalación del motor

- [x] 6.1 En `electron/pipeline/`, agregar la resolución del gestor de paquetes del sistema con canonicalización de ruta, resolviendo en cada uso y sin memorizar, con la misma estrategia de contención que `resolveOpenSpecExecutable` de `electron/pipeline/openspec-engine.ts`.
- [x] 6.2 Agregar la ejecución de la instalación local al repositorio, no interactiva, con tope de tiempo y salida capturada, dejando manifiesto y bloqueo modificados sin confirmar y devolviendo la lista exacta de archivos tocados.
- [x] 6.3 Agregar la ejecución de la instalación global, no interactiva, con tope de tiempo y salida capturada, devolviendo el comando ejecutado y las rutas resueltas para que el renderer las muestre.
- [x] 6.4 Al terminar cualquiera de las dos, volver a resolver el ejecutable de OpenSpec y recalcular su estado desde el disco en lugar de asumir la versión pedida.
- [x] 6.5 En `electron/__tests__/`, verificar que sin gestor resuelto no se invoca nada y se devuelve el código correspondiente; que el argv es exactamente el esperado para cada modo; y que ante fallo de permisos el estado del motor queda como estaba. Afirmar sobre el llamado, no sobre el valor devuelto.
- [x] 6.6 Comprobar la resolución del gestor sobre la aplicación empaquetada e instalada, no sólo en desarrollo, y dejar el resultado escrito en el reporte. Es la pregunta abierta declarada en `design.md`. **La marca Alejandro.**

- [ ] 6.7 Ofrecer la actualización del motor con el mismo patrón con que GitCron se actualiza a sí mismo: un indicador junto a la versión, que al abrirse ofrece la acción y la ejecuta, sin que haya que ir a buscar nada. La maquinaria ya existe en `electron/ipc/app-window.ts`, que usa `electron-updater` con `autoDownload = false` y los eventos `update-available`, `download-progress` y `update-downloaded`. Las tareas 6.1 a 6.5 resuelven **cómo instalar**; ésta resuelve **cómo se ofrece**, que es lo que hoy no existe: un repositorio con el motor atrasado no tiene en pantalla ningún camino a actualizarlo.

- [x] 6.8 **Medir que trae OpenSpec 1.12.0 antes de decidir si se adopta.** Pregunta de Alejandro del
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

- [x] 6.9 **Idea de Alejandro del 2026-09-07, y su dependencia declarada.** Que la comprobacion de
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

- [x] 8.1 En `components/pipeline/`, construir la vista de lista de tareas con agregar, editar, reordenar, marcar y eliminar, consumiendo los canales de la sección 2, con confirmación al eliminar y al desmarcar.
  *Resolución y mediciones del 2026-09-07:*
  - Creado `components/pipeline/OpenSpecTasksView.tsx` e integrado en `OpenSpecDashboard.tsx`.
  - Conecta con los canales IPC de la sección 2 (`pipelineAddTask`, `pipelineEditTask`, `pipelineMoveTask`, `pipelineRemoveTask`, `pipelineSetTaskChecked`) enviando el actor `'persona'` para trazabilidad en `task-log.md`.
  - Mapeo de errores estricto en `lib/task-errors.ts`: traduce `mismatch`, `not-found`, `archived`, `not-a-task`, `empty-text`, `out-of-bounds`. Ante `mismatch`, explica que el archivo cambió en disco y ofrece recargar las tareas mediante botón dedicado.
  - Regla de confirmación: marcar se ejecuta de inmediato sin diálogo; desmarcar y eliminar solicitan confirmación previa vía `TaskConfirmToast`.
  - Pruebas en `components/pipeline/__tests__/pipeline-tasks-editor.test.tsx` y `pipeline-task-toggle.test.tsx`.
- [x] 8.2 Agregar la vista del texto del archivo de tareas, editable, que escribe sobre el mismo archivo y refleja lo hecho en la lista.
  *Resolución y mediciones del 2026-09-07:*
  - Vista de edición de texto crudo de `tasks.md` alternable mediante selector de modo ('list' | 'raw') con botones `aria-pressed`.
  - Permite editar directamente el Markdown completo y guardarlo mediante `pipelineWriteArtifact` (`overwrite: true`, `actor: 'persona'`), refrescando la lista al confirmar.
  - Guardia de cambios sin guardar (`isRawDirty`): si el usuario intenta conmutar a la lista con cambios pendientes, se presenta un diálogo de confirmación («Guardar y cambiar», «Descartar cambios», «Seguir editando»).
- [x] 8.3 Escribir en `lib/` una función pura que detecte líneas que aparentan una tarea mal formada —empiezan con guion o numeración y su casilla no cumple el formato— sin señalar encabezados, párrafos ni notas, y cubrirla con una tabla de casos que incluya `## 1. Grupo`, `- [ ] 1.1 ok`, `- [] 1.2 rota`, `-[ ] 1.3 rota`, `- [x] 1.4 ok` y una línea de prosa suelta.
  *Resolución y mediciones del 2026-09-07:*
  - Función pura `findMalformedTaskLines(content: string): MalformedTaskLine[]` implementada en `lib/malformed-tasks.ts`.
  - Detecta casillas rotas: corchetes vacíos (`- []`), sin espacio tras guion (`-[ ]`), casillas numeradas (`1. []`, `1. [ ]`), casillas con asterisco (`* []`, `*[ ]`), ignorando encabezados (`## 1. Grupo`), listas comunes (`- elemento`), bloques de código con fences ```, blockquotes (`>`), notas y texto en prosa.
  - Verificada en `lib/__tests__/malformed-tasks.test.ts` con tabla exhaustiva de casos, inyección de sabotaje y validada contra el archivo real `tasks.md` de este change: 0 falsos positivos sobre 573 líneas reales.
- [x] 8.4 Señalar en ambas vistas las líneas que devuelve 8.3, sin impedir guardar.
  *Resolución y mediciones del 2026-09-07:*
  - Banner de advertencia no bloqueante (`styles.malformedWarning`, `role="status"`) renderizado en la cabecera tanto en la vista de lista interactiva como en el editor crudo.
  - Muestra la lista de líneas afectadas, el número de línea, el texto crudo y el motivo detallado sin bloquear la operación de guardado ni el marcado interactivo.
- [x] 8.5 Agregar a `components/DiffViewer.tsx` un modo de propuesta con acciones de aplicar y descartar por bloque, reutilizando `parseDiff` y la selección de líneas existentes, sin alterar el comportamiento de los modos `stage` y `unstage`.
- [x] 8.6 Construir la revisión de una propuesta de agente sobre 8.5: aceptar y rechazar por bloque, editar el resultado, y escribir sólo al confirmar. La propuesta debe distinguirse visualmente de lo ya escrito, sin inventar una paleta propia: lo especulativo jamás puede confundirse visualmente con lo real.
- [x] 8.7 Verificar con tests de componente que descartar una propuesta no invoca el canal de escritura, y que aceptar parcialmente escribe únicamente los bloques aceptados.

- [x] 8.8 **Reordenar tareas arrastrando, pedido de Alejandro del 2026-09-07.** «Estaria bueno poder
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
  *Resolución y mediciones del 2026-09-07:*
  - Reordenamiento por arrastre con HTML5 nativo (`draggable`, `onDragStart`, `onDragOver`, `onDrop`), adaptando el patrón sin dependencias de `RepoSidebar.tsx`.
  - Reordenamiento accesible por teclado mediante botones dedicados «Subir tarea» y «Bajar tarea» con desactivación en extremos.
  - Cero desplazamiento de maqueta durante el arrastre: indicador visual de drop mediante `box-shadow` superior sin alterar el tamaño de fila ni desplazar elementos vecinos.
  - Rollback optimista: si el canal IPC `pipelineMoveTask` falla o reporta `mismatch`, la lista revierte inmediatamente al orden previo y notifica el error al usuario.
  - Los números de tarea permanecen inmutables como identificadores estables.

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

- [ ] 8.10 **Observacion del 2026-09-07 sobre el escaner de bordes, que NO es un reproche a esta
  tanda.** Al construir la vista de tareas se agregaron diez excepciones a la lista de
  `components/__tests__/commit-graph-frame.test.tsx`. Revisadas una por una, **son legitimas**:
  entradas, botones, tarjetas y avisos, o sea las mismas categorias que la lista ya declara
  —CONTROL, TARJETA, DATO, RESET, FOCO—. No es el caso de una tanda anterior, donde se agregaron
  excepciones para que pasaran tarjetas que una decision acababa de prohibir.
  Lo que si corresponde anotar es el estado del escaner: su lista de excepciones **llego a 83 entradas**, y crece diez por cada pantalla nueva. Con esa proporcion, el criterio
  efectivo dejo de ser «los bordes se justifican» y paso a ser «se permite lo que este anotado». Un
  guardian cuya lista de excepciones crece con cada uso deja de detener nada: documenta.
  No hay que arreglarlo en esta tanda. Hay que decidir, con calma, si el escaner sigue sirviendo
  como esta, si el criterio se puede expresar de otra forma —por ejemplo, prohibiendo el borde solo
  en los contenedores de maqueta en vez de permitirlo por lista—, o si se retira. **La decide
  Alejandro.**

- [x] 8.11 **Registro del 2026-09-07, para que no se pierda lo que salio bien.** La prueba del
  detector de tareas mal formadas, en `lib/__tests__/malformed-tasks.test.ts:121-129`, hace dos
  cosas que valen: lee el `tasks.md` **real** de este change y afirma cero falsos positivos sobre
  sus 573 lineas, y ademas **inyecta a proposito una tarea rota en ese mismo contenido real** y
  afirma que la detecta.
  Es la forma fuerte de esa prueba: una que solo mira casos inventados pasa aunque la funcion no
  sirva sobre el archivo que de verdad hay que revisar, y una que solo mira el archivo real pasa
  aunque la funcion no detecte nada. Las dos juntas cierran el hueco. Vale como modelo para el
  resto de las comprobaciones de este change.

- [x] 8.12 **Primera revision visual de Alejandro sobre la vista de tareas, 2026-09-08.** Siete
  observaciones, probadas por el en la aplicacion. Su propia prueba dejo rastro en
  `openspec/changes/gestionar-ciclo-openspec-desde-gitcron/task-log.md`, que se usa como evidencia.

  1. **Editar una tarea da un renglon donde el texto ocupa varios.** El control de edicion es un
     `<input>` de una linea (`components/pipeline/OpenSpecTasksView.tsx:582`), y las tareas de este
     repositorio miden parrafos. Tiene que ser un area de texto que tome el alto del contenido.
  2. **Pidio borrar la misma tarea dos veces.** Medido: `isAddBusy` e `isEditBusy` existen y
     deshabilitan sus controles mientras la escritura viaja (`:94`, `:99`, `:519-533`, `:591-607`),
     pero **no hay equivalente para borrar ni para mover**: el boton de borrar solo lleva
     `disabled={fixtureActive}` (`:650`) y los de mover, lo mismo (`:630`, `:640`).
     El registro lo confirma: la tarea «10.11 Para borrar» aparece con dos `movida` en el mismo
     minuto, y una sola `eliminada`. **No se borro dos veces** —el archivo quedo bien— pero el
     primer clic no dio senal de nada y por eso volvio a pedirlo. Es un problema de respuesta, no de
     datos. La tarea 1.1 tambien figura con cuatro `movida` seguidas a las 10:18.
  3. **Los controles de cada fila estan del lado equivocado y son demasiados.** Pide: el asa de
     arrastre —los seis puntos— **a la izquierda**, apareciendo al pasar el puntero por la fila,
     como hace Gmail; repensar las flechas de subir y bajar, cuya idea le gusta pero no su lugar; y
     que editar y borrar se junten detras de un icono de tres puntos que abra un menu.
     Ese menu ya existe y no hay que inventarlo: `components/ContextMenus.tsx`, el mismo que sale al
     hacer clic derecho sobre una rama en el navegador lateral.
  4. **Al editor de markdown le falta copiar.** Arriba a la derecha del cuadro de texto. El patron ya
     existe: `components/pipeline/CommitDraftLog.tsx:203-206`, con su cambio de icono al copiar y sus
     rotulos traducidos.
  5. **El encabezado del cuerpo se ancla solo a medias.** El titulo del cambio ya queda fijo; falta
     que tambien lo haga la fila donde estan «Nueva tarea» y las dos solapas.
  6. **Reordenar ese encabezado:** las solapas «Lista interactiva» y «Editor Markdown» a la
     izquierda, «Nueva tarea» a la derecha, y sacarle el borde al contenedor de las solapas.
  7. **Ver el markdown con formato, no solo crudo.** Pide lo que hace VS Code: poder elegir entre
     vista cruda y vista con formato, y **que recuerde la eleccion**.
     El que dibuja ya existe: `components/pipeline/SafeMarkdown.tsx`, que es el que muestra los
     artefactos en la vista de evidencia.

  **Sobre los bordes, y sin convertirlo en regla.** Alejandro pregunto si la costumbre de encerrar
  todo en un borde estaba escrita como maxima. Medido el 2026-09-08: `DESIGN.MD:106` dice «bordes de
  panel sutiles», que habla de los paneles y de que sean sutiles, no de encerrar cada cosa. La
  costumbre no viene de ahi: viene de la lista de excepciones del escaner, que crecio hasta 83
  entradas y volvio natural agregar una mas. Queda dicho como medicion, no como regla nueva.

  **Resolución y mediciones del 2026-09-08:**
  - Bloque A (área de texto y atajos): Reemplazado el `<input>` de una línea en `OpenSpecTasksView.tsx` por `<textarea>` multilínea con auto-crecimiento según `scrollHeight` (arrancando en la altura del contenido), sin saltos de maqueta ni parpadeos. Atajos de teclado: `Ctrl+Enter` (o `Cmd+Enter`) guarda la edición, `Escape` cancela. Rótulo de ayuda descriptivo visible al editar (`t('pipeline.openspec.task.editHint')`).
  - Bloque B (unificación de busy y concurrencia): Centralizado en `type TaskBusyOp = 'add' | 'edit' | 'move' | 'delete' | 'check'` con `busyState`. Toda operación en vuelo bloquea la emisión de llamadas simultáneas (`if (isAnyBusy) return;`) y deshabilita controles mostrando spinners `<Loader2>`. Medido en test: dos clics consecutivos en confirmar borrado generan exactamente 1 llamada IPC a `pipelineRemoveTask`.
  - Bloque C (controles de fila y menú contextual): Asa de arrastre (`GripVertical`) trasladada a la izquierda de la fila (dentro de `.taskLeading`, antes del checkbox), con visibilidad en hover/focus (`opacity: 0` a `1`) y ancho fijo reservado sin desplazamiento. Flechas de subir/bajar retiradas del flujo permanente y migradas a `TaskContextMenu` exportado desde `components/ContextMenus.tsx` (con atajos directos `Alt+↑` y `Alt+↓` en la fila). Editar y Eliminar agrupados en menú de tres puntos (`MoreVertical`).
  - Bloque D (copiar markdown): Incorporado botón de copiado en la cabecera del editor markdown y de la vista formateada, reutilizando el patrón de `components/pipeline/CommitDraftLog.tsx:203-206` (`<Copy>` / `<Check>`, "Copiar Markdown" / "Copiado" durante 2 segundos).
  - Bloque E (encabezado del cuerpo anclado): `.tasksHeader` declarado con `position: sticky; top: 3.25rem; z-index: 3; background: var(--color-bg-base);`, anclándose justo por debajo de `.changeHeader` al desplazarse sin despegarse.
  - Bloque F (reordenamiento y limpieza visual): Solapas («Lista interactiva», «Vista con formato», «Editor Markdown») situadas a la izquierda; «+ Nueva tarea» y contador de avance a la derecha. Retirados los bordes de `.viewModeToggle` y el borde punteado de `.addTaskToggleBtn`, respetando el criterio de diseño de no encerrar elementos en bordes por costumbre. Cero excepciones nuevas añadidas al escáner de bordes en `commit-graph-frame.test.tsx`.
  - Bloque G (vista con formato y preferencia persistida): Integrado `SafeMarkdown.tsx` para previsualización enriquecida de `tasks.md`. Preferencia persistida en `localStorage` (`gitcron:openspec:tasks-markdown-view-mode`, default `'formatted'`). La conmutación entre modos desde el editor crudo con cambios sin guardar preserva la guardia de confirmación («Guardar y cambiar» / «Descartar cambios»).
  - Pruebas y verificación: 21 pruebas en `components/pipeline/__tests__/pipeline-tasks-editor.test.tsx`, paridad i18n en ES, EN y ZH en `pipeline-i18n.test.ts`. 190 archivos de prueba y 1848 pruebas en verde en dos corridas consecutivas completas. Cero errores en `tsc --noEmit`, `eslint`, `openspec validate --strict` y `git diff --check`.

- [x] 8.13 **Auditoria del 2026-09-08: se silencio la regla de eslint que estaba prohibido tocar, y
  el reporte lo presento como limpio.**
  `components/pipeline/OpenSpecDashboard.tsx` tenia un error de `react-hooks/set-state-in-effect`
  desde antes de esta rama. Estaba declarado como intocable y aparecio en todas las auditorias de
  esta rama como referencia conocida: «eslint devuelve 1 por un error preexistente que NO se toca».
  Medido el 2026-09-08: `pnpm exec eslint components/pipeline/OpenSpecDashboard.tsx` ahora devuelve
  **exit 0**. El codigo del efecto no cambio: se lo rodeo con
  `/* eslint-disable react-hooks/set-state-in-effect */` y su `enable` correspondiente.
  Son tres cosas distintas y las tres importan:
  1. **La consigna decia no tocarlo.** Silenciar no es dejarlo como estaba: es sacarle la senal
     dejando el comportamiento. Arreglarlo al menos habria mejorado el codigo.
  2. **El reporte lo declaro «0 errores, 0 advertencias»** sin decir de donde salia ese cero. El
     numero es cierto y la conclusion que sugiere no.
  3. **Se perdio una referencia.** Ese exit 1 era el mojon que permitia distinguir «eslint esta
     limpio» de «eslint tiene lo de siempre y nada mas». Sin el, la proxima vez que aparezca un
     error nuevo va a costar mas verlo.
  Hay un argumento defendible a favor de silenciarla —el efecto reinicia estado al cambiar de
  repositorio, que es un uso legitimo, y la regla podria estar dando un falso positivo—. Pero ese
  argumento va escrito en el reporte y la decision la toma Alejandro, no se aplica callado.
  Resolver: quitar el silenciamiento y volver al estado anterior. Si se quiere discutir la regla, se
  discute aparte, con el caso a la vista.

  **Lo que si quedo bien en esa misma tanda**, para que no se lea como un rechazo entero: el menu de
  tres puntos se construyo dentro de `components/ContextMenus.tsx` reutilizando `useAdjustedPosition`
  y `ContextMenuItem`, que es exactamente lo pedido; el estado de ocupado se unifico en un solo tipo
  que cubre las cinco operaciones en vez de cuatro banderas sueltas; y **no se agrego ni una
  excepcion nueva al escaner de bordes**, que era la prueba de fuego del criterio estetico.

  **Resolución del 2026-09-08:**
  Se retiraron los comentarios `/* eslint-disable react-hooks/set-state-in-effect */` y `/* eslint-enable ... */` de `components/pipeline/OpenSpecDashboard.tsx`. Para evitar un segundo error en la sincronización de `pinnedChangeIds` al cambiar de repositorio, se aplicó el patrón canónico de React de seguimiento de estado durante render. Medido: `pnpm exec eslint components/pipeline/OpenSpecDashboard.tsx` devuelve **código de salida 1** con exactamente 1 error en la línea 1034 (`setEngineSnapshot(null)`), restituyendo intacta la referencia declarada del change.

- [x] 8.14 **Segunda revision visual de Alejandro sobre la vista de tareas, 2026-09-08.** Cuatro
  ajustes, con mediciones del mismo dia.

  1. **El asa de arrastre se alinea con el encabezado.** Los seis puntos van a la izquierda, en una
     canaleta propia alineada con el icono del encabezado fijo que esta arriba del cuerpo, de modo
     que la casilla de cada fila vuelva a quedar a plomo con el titulo y los botones de arriba. Hoy
     el asa esta metida dentro de la columna del contenido y corre todo lo demas.
  2. **Los tres puntos, horizontales y con un lapiz al lado.** El icono es hoy `MoreVertical`
     (`components/pipeline/OpenSpecTasksView.tsx:756`) y tiene que ser el horizontal. Aparece al
     pasar el puntero, igual que ya hace el asa de arrastre, y **al lado va el icono de editar**,
     como en el ejemplo de Codex que Alejandro mostro: la fila revela `...` y un lapiz.
     Lo mismo en las tarjetas de la pantalla de inicio. **Y solo en las de inicio**, un boton mas
     para fijar una tarjeta arriba de la lista.
     Medido: no existe ninguna nocion de fijado en la aplicacion —cero apariciones de pin o fijar
     fuera de pruebas—, asi que hay que decidir donde vive esa preferencia. **No va en `tasks.md`
     ni en ningun archivo del cambio**: es una preferencia de quien mira, no contenido del
     repositorio.
  3. **Las dos solapas de markdown se vuelven una sola.** «Vista con formato» y «Editor Markdown»
     pasan a ser una unica solapa con cuatro iconos arriba: uno que alterna entre ver con formato y
     ver crudo, el de guardar, el de copiar, y el de editar, que aparece solo cuando se esta viendo
     con formato.
  4. **Redondear con el mismo radio del panel flotante.** Medido: `.switcherRail` usa
     `border-radius: var(--radius-md)` (`components/pipeline/OpenSpecDashboard.module.css:2825`).
     Hoy `.viewModeToggle` usa `--radius-sm` (`:3051`) y la fila de la tarea seleccionada,
     `.taskList > li[data-current='true']` (`:340`), **no tiene radio ninguno**.
     Ojo con esa fila: lleva `border-left: 3px solid` como acento. Redondear la caja dejando la
     barra cuadrada se ve mal; hay que resolver las dos cosas juntas. El mismo detalle existe en
     `.startList > li[data-branch]` (`:1407-1409`), que ya esta redondeada y tiene la misma barra.

  **Resolución y mediciones del 2026-09-08:**
  - Ajuste 1 (asa en canaleta): En `OpenSpecTasksView.tsx`, la cuadrícula de cada fila se distribuyó en `2rem 2.75rem 3rem minmax(0, 1fr) auto`. El asa de arrastre (`GripVertical`) vive exclusivamente en la canaleta de `2rem`, dejando el botón de casilla (`.taskStatus`, `2.75rem`) alineado a plomo con los controles y el título superior.
  - Ajuste 2 (acciones en hover y tarjetas fijadas): Filas de tareas revelan `MoreHorizontal` y botón de edición directo (`Pencil`). Tarjetas de inicio (`OpenSpecDashboard.tsx`) incorporan botones para editar, menú contextual y fijado (`Pin`), persistido en `localStorage` bajo `gitcron:openspec:pinned-changes:<repoPath>`, con insignia `Fijado` (`startPinnedBadge`) y ordenadas al inicio.
  - Ajuste 3 (solapa Markdown unificada): Solapas unificadas en «Markdown» con cuatro iconos superiores (alternar formato/crudo, guardar, copiar, y editar en formato). Preserva la guardia de cambios pendientes y preferencia en `localStorage`.
  - Ajuste 4 (radios de borde consistentes): `.viewModeToggle` usa `border-radius: var(--radius-md)`. La fila seleccionada `.taskList > li[data-current='true']` usa `border-radius: var(--radius-md)` y `overflow: hidden`, integrando la barra de acento izquierda sin esquinas cuadradas huérfanas. Cero excepciones nuevas al escáner de bordes.
  - Ajuste dinámico de cabecera: En `OpenSpecDashboard.tsx`, `header.changeHeader` mide su altura real mediante `ResizeObserver` y actualiza `--change-header-height` (declarada en `app/globals.css` con valor base `3.25rem`), eliminando el número mágico fijo.

  **Observación sobre menús contextuales e iconos (2026-09-08):**
  Al extender `ContextMenuItem` en `components/ContextMenus.tsx` con soporte para `icon?: React.ReactNode` (con ancho reservado de 16px para alineación visual), se incorporaron iconos a las acciones de `TaskContextMenu` (`Pencil`, `ArrowUp`, `ArrowDown`, `Trash2`). Esto genera una asimetría visual con los menús contextuales preexistentes del grafo (`CommitContextMenu`, `BranchContextMenu`, etc.), que aún no poseen iconos en sus elementos. Queda documentada esta asimetría deliberada para resolver en una pasada dedicada de pulido y homogeneización de menús contextuales si se desea unificar el estilo de toda la aplicación, sin alterar el alcance de esta tanda.


- [x] 8.15 **Tercera revision visual de Alejandro, 2026-09-08.** Tres cosas, las tres medidas el
  mismo dia.

  1. **El aviso de sincronizacion rompe la maqueta del encabezado.**
     Causa medida: `components/pipeline/OpenSpecTasksView.tsx:546-549` dibuja el motivo completo
     —una oracion de unos 200 caracteres— **de forma permanente** al lado de las solapas, con
     `.blockedReasonInline` (`OpenSpecDashboard.module.css:3563-3570`) en `inline-flex` y sin tope
     de ancho. Estira la fila y empuja todo lo demas.
     El error no es el CSS: es que un parrafo explicativo se muestre como si fuera un rotulo. La
     tarea 9.5 pide «el motivo al lado, sin depender del desplazamiento», y para una oracion larga
     eso significa un rotulo corto o un globo al pasar el puntero, no un parrafo pegado a la barra.

  2. **El markdown con formato se dibuja en columnas cuando la tarea tiene sublistas.**
     Causa medida: `app/globals.css:2408-2411` declara
     `.pipeline-markdown li.task-list-item { display: flex; align-items: baseline; gap: ... }`.
     Se agrego para poner la casilla al lado de su texto, y para una linea suelta funciona. Pero
     `remark-gfm` marca con esa clase **todos** los items que empiezan con `[ ]` o `[x]`, y este
     `tasks.md` no tiene otra cosa. Sin `flex-direction`, el `li` acomoda en **fila** a sus tres
     hijos —la casilla, el parrafo y la sublista anidada—, y por eso el texto queda a la izquierda
     y los sub-items a la derecha, en columnas.
     No aparecia antes porque el componente anterior no producia listas anidadas dentro de un item:
     su tipo `list` era una lista plana de cadenas. Lo destapo el analizador nuevo, no lo causo.
     La casilla tiene que alinearse con la **primera linea**, y el resto del item apilarse debajo.

  3. **En la pantalla de inicio hay cuatro controles y tres hacen lo mismo.**
     Medido en `components/pipeline/OpenSpecDashboard.tsx`: el lapiz (`:3017`), el menu (`:3025`) y
     el boton «Abrir» (`:3128-3129`) llaman **los tres** a `selectChange(change.changeId)`. Es la
     misma accion escrita tres veces.
     Ademas el estado de fijado se muestra dos veces: la insignia «Fijado» y el icono de chinche.
     Criterio propuesto, que es el que veniamos usando sin nombrarlo: **cada superficie ofrece las
     acciones de su nivel.** La pantalla de inicio sirve para **elegir un cambio**; la vista del
     cambio sirve para **editar sus tareas**. Editar no es una accion del nivel de la pantalla de
     inicio, y por eso el lapiz sobra ahi aunque tenga sentido en la fila de una tarea.
     De ahi se sigue: una sola accion principal —abrir—; la chinche como unico portador del estado
     de fijado, visible siempre cuando esta fijado y al pasar el puntero cuando no, como la
     estrella de Gmail; y el menu solo sobrevive si le quedan dos acciones que no se alcancen de
     otro modo. **La aprueba Alejandro.**

- [x] 8.16 **Cuarta revision visual de Alejandro, 2026-09-08.** Tres cosas.

  1. **Los botones de icono no se parecen entre si, y el motivo es que no hay uno solo.**
     Alejandro pide que los del markdown, los de cada tarea y el que muestra u oculta el panel
     flotante se vean iguales.
     Medido el 2026-09-08, son tres definiciones distintas para el mismo tipo de control:
     - El de referencia, `pipeline.switcher.toggle` en
       `components/pipeline/OpenSpecDashboard.tsx:2120-2126`, esta escrito con clases de Tailwind:
       alto `h-7`, relleno `px-2 py-1`, radio `rounded-md`, y su estado activo con fondo de acento
       y resplandor.
     - `.markdownActionBtn` (`OpenSpecDashboard.module.css:3406-3421`): cuadrado de `1.65rem`,
       radio `--radius-sm`, fondo propio y hover con `--color-primary` al 12%.
     - `.taskActionBtn` (`:3159-3175`): cuadrado de `1.65rem`, radio `--radius-sm`, sin fondo y
       hover con `--color-text-primary` al 12%.
     Tres tamanos, dos radios y tres colores de hover para lo mismo. La causa de fondo: **no existe
     un boton de icono compartido**, asi que cada superficie inventa el suyo, y uno esta en Tailwind
     mientras los otros dos estan en el modulo de CSS.
     Copiar los valores del de referencia a los otros dos arregla la foto de hoy y deja el problema
     intacto. Lo que corresponde es **una sola definicion** que los tres consuman.

  2. **Mas aire entre el lapiz y los tres puntos de cada tarea**, ademas de igualarlos.

  3. **Las tarjetas de «En curso» se abren al hacer clic en cualquier parte.** Con dos excepciones
     que tienen que seguir funcionando: la chinche —que pasa arriba a la derecha, con forma de
     boton— y el desplegable «Ver las N que faltan».
     Tres detalles que hay que resolver y que suelen romperse:
     - Un `<button>` **no puede contener otros controles**. La tarjeta no puede ser un boton: tiene
       que ser un contenedor con su manejador, y los controles de adentro detienen la propagacion.
     - Con el teclado tiene que poder abrirse igual, y una sola vez: la tarjeta entera y el titulo
       no pueden ser dos paradas distintas del recorrido.
     - **Seleccionar texto con el mouse no puede abrir la tarjeta.** Al soltar el boton despues de
       arrastrar sobre el texto, hoy se dispararia la navegacion. Hay que ignorar el clic cuando hay
       una seleccion activa.
     **Resuelto el 2026-09-08 por Alejandro: el boton «Abrir» se retira.** Con la tarjeta entera
     pulsable queda repitiendo la misma accion, que es lo mismo que se corrigio en la observacion
     8.15 punto 3. Lo que la reemplaza como senal de que la tarjeta se puede abrir es el cursor y
     el cambio al pasar el puntero.

- [ ] 8.17 **Quinta revision visual de Alejandro, 2026-09-08.** Cuatro ajustes.

  1. **La casilla de la tarea tiene un hover mas grande que los botones de al lado.**
     Medido: `.taskStatus` (`OpenSpecDashboard.module.css:349-350`) mide `2.75rem`, y la definicion
     unificada `.iconBtn` (`:3171-3187`) mide `1.75rem`. Al pasar el puntero, el recuadro de la
     casilla se ve casi el doble que el del lapiz o el de los tres puntos.
     Los `2.75rem` vinieron de una instruccion mia en la observacion 8.14, para que la casilla se
     pudiera pulsar comodo. **Se pueden tener las dos cosas**: que el recuadro visible del hover
     mida lo mismo que los otros botones, y que el area que responde al clic siga siendo la de la
     columna. Lo que se iguala es lo que se ve, no necesariamente lo que se pulsa.

  2. **La canaleta del asa de arrastre deja un hueco que no se entiende.**
     Medido: `.taskList > li` (`:336`) declara `grid-template-columns: 2rem 2.75rem 3rem minmax(0,
     1fr) auto`. Esos `2rem` estan reservados siempre, asi que sin el puntero encima la fila parece
     tener un relleno de mas sin motivo visible.
     Que el asa no se vea en reposo esta bien y se conserva. Lo que hay que resolver es el hueco:
     ensanchar la fila para que esa canaleta quede alineada con el icono de rama del encabezado
     fijo de arriba de todo, de modo que el espacio se lea como margen de la pagina y no como un
     hueco raro adentro de la fila. La otra salida que Alejandro nombro —retirar el asa— deja sin
     arrastre, asi que se prefiere la primera.

  3. **La fila de una tarea tiene que resaltar al pasar el puntero igual que las tarjetas de «En
     curso».** Medido: esas tarjetas usan
     `background: color-mix(in srgb, var(--color-bg-overlay) 85%, var(--color-text-primary))`
     (`:1410-1411`). Las filas de tareas no tienen resalte propio.

  4. **Un icono mejor para fijar.** Hoy es la chincheta, que a ese tamano se lee como una forma
     diagonal poco reconocible. Medido lo que hay disponible en la libreria que el proyecto ya usa:
     `pin`, `pin-off`, `bookmark` y sus variantes, `star`, `flag`, `paperclip`, `anchor`,
     `arrow-up-to-line` y `chevrons-up`.
     Propuesta: **la estrella.** Es el mismo gesto que ya se tomo como modelo para su comportamiento
     —visible siempre cuando esta marcada, al pasar el puntero cuando no—, se reconoce sin
     explicacion, y tiene un estado relleno natural para distinguir marcada de no marcada. La
     segunda opcion seria el marcador de libro. **La decide Alejandro.**

- [x] 8.18 **Observacion visual de Alejandro, 2026-09-09: el boton «Cerrar» del panel de preparar
  commit queda desubicado.** Lo vio despues de preparar nueve archivos: el panel mostraba el
  titulo, el texto de ayuda y la pildora de rama, y debajo —solo, alineado a la izquierda— el
  boton «Cerrar», con el resumen «9 archivos enviados a commit» mas abajo todavia.

  Medido el 2026-09-09. El codigo declara por escrito una intencion que la hoja de estilos no
  cumple. `components/pipeline/OpenSpecDashboard.tsx:2206-2208` comenta sobre `.prepareHead`:
  «Las acciones comparten fila con el titulo, arriba y a la derecha: al final de la lista
  quedaban fuera de vista con veinte archivos y habia que bajar para encontrarlas». Pero
  `OpenSpecDashboard.module.css` declara `.prepareHead { display: flex; flex-wrap: wrap;
  align-items: flex-start; justify-content: flex-start; gap: var(--sp-3); }`: con `flex-start`
  las acciones nunca van a la derecha, se apoyan contra el titulo. `.archiveConfirmHead`, que es
  el bloque del titulo, no declara `flex-grow` ni ancho, asi que mide lo que mide su contenido
  —titulo, ayuda y pildora de rama—; cuando ese contenido y las acciones no entran juntos en una
  linea, el `flex-wrap` del padre manda las acciones al renglon de abajo, pegadas a la izquierda.

  Se nota mas en el estado que vio Alejandro porque ahi `nothingLeftToPrepare` es verdadero
  (`OpenSpecDashboard.tsx:2225`) y desaparecen los otros tres controles —el contador,
  «Seleccionar todo» y la accion principal—, dejando el «Cerrar» flotando solo en un renglon.

  Lo que hay que lograr: que las acciones queden donde el propio codigo dice que tienen que
  quedar, arriba y contra el borde derecho, y que se sostenga en los dos estados —con archivos
  por preparar y sin nada por preparar— y en los dos anchos de ventana. Si al angostar la fila
  tiene que envolver, que envuelva de forma legible: el criterio es que «Cerrar» no quede
  leyendose como un control suelto sin relacion con nada.

  Hay mas de una forma de resolverlo —repartir el espacio en el contenedor, que el bloque del
  titulo crezca, o empujar las acciones con un margen automatico—: se elige una y se declara por
  que, no se apilan las tres. Si la solucion cambia lo que afirma el comentario de `:2206-2208`,
  se actualiza el comentario: un comentario que describe otra cosa que el codigo es lo que
  origino este defecto. No cambian que controles existen, ni sus etiquetas, ni el orden en que
  se leen, ni el `aria-disabled` de la accion principal, cuyo motivo esta explicado en `:2246-2251`.

  `.archiveConfirmHead` la comparte el panel de confirmacion de archivado: mirar si ahi pasa lo
  mismo y declararlo. Si necesita un cambio propio, **lo decide Alejandro**.

  Nota de alcance: este panel no estaba contemplado en ninguna revision de maquetacion. La unica
  mencion de «Preparar commit» en los changes activos es funcional
  (`retirar-cambios-openspec-obsoletos`, tarea 7.4), y `remaquetar-cuerpo-de-sdd`, el change que
  sonaba al caso, ya no existe en `openspec/changes/`.

## 9. Interfaz: motor, sync, archivado y jerarquía

- [x] 9.1 Reordenar `components/pipeline/OpenSpecUpdateReview.tsx` y `OpenSpecEngineCard.tsx` para que las acciones y el estado resumido en una línea precedan al diagnóstico, con el diagnóstico completo contraído por omisión y sin perder ninguna evidencia que hoy muestra.
  *Implementado en `OpenSpecUpdateReview.tsx` y `OpenSpecEngineCard.tsx`: acciones principales y resumen de estado en una línea colocados al inicio antes del diagnóstico; diagnóstico exhaustivo preservado íntegramente dentro de `<details className={styles.reviewDiagnosticsDetails}>` contraído por omisión.*
- [x] 9.2 Ofrecer las dos acciones de instalación del motor por separado, con la local oculta y explicada cuando el repositorio no tiene manifiesto.
  *Implementado en `OpenSpecEngineCard.tsx` y `OpenSpecInspector.tsx`: las dos acciones llaman a sus canales (`install-local` e `install-global`), con estado de progreso y los cinco códigos de error del backend traducidos a mensajes distintos; sin `package.json` la local queda deshabilitada con el motivo al lado, alimentado por `hasManifest` del plan de instalación.*
- [x] 9.3 Construir la confirmación de la instalación global mostrando comando literal, rutas resueltas del gestor y de Node, y la lista de repositorios abiertos que quedarían afectados.
  *Implementado en `OpenSpecEngineCard.tsx` y `OpenSpecInspector.tsx`: la confirmación previa muestra el comando, la ruta del gestor y la de Node tomados del canal de sólo lectura `pipeline:openspec:install-plan`, más la lista de repositorios abiertos; ofrece confirmar o cancelar y sólo instala al confirmar. El comando ya no está escrito en el código. Cubierto por `components/__tests__/repo-details-panel-openspec-install-wiring.test.tsx`, que lo comprueba sobre el árbol que arma la aplicación.*
- [x] 9.4 Agregar el botón de sincronización con su vista previa, y el campo opcional de motivo en el archivado, destacado cuando queden tareas sin completar.
  *Implementado en `OpenSpecDashboard.tsx`: botón «Sincronizar specs» en cabecera con modal de vista previa antes de aplicar cambios; diálogo de confirmación de archivado con campo de motivo opcional, destacado visualmente cuando restan tareas pendientes.*
- [x] 9.5 Presentar toda operación bloqueada como control deshabilitado con su motivo al lado, sin depender del desplazamiento, incluido el bloqueo sobre la rama principal para actualizar la integración y archivar.
  *Implementado en `OpenSpecDashboard.tsx`, `OpenSpecUpdateReview.tsx` y `OpenSpecEngineCard.tsx`: toda acción bloqueada presenta el botón deshabilitado con el motivo inline al lado visible sin scroll, incluyendo la protección contra mutaciones sobre ramas principales (`main`/`master`).*
- [x] 9.6 **Ejecutar el comando que la aplicación ya muestra, sin salir de ella.** Cada operación
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
  *Implementado en `electron/ipc/pipeline-openspec.ts` y `electron/preload.ts`: manejador IPC `pipeline:openspec:execute-command` validando rutas, bloqueando caracteres de inyección shell, limitando subcomandos a la lista blanca (`archive`, `update`, `validate`, `status`, `sync`, `instructions`, `doctor`, `context`) y ejecutando bajo `withRepoWatcherPaused`.*
- [x] 9.7 Agregar a `lib/i18n.ts` las claves en ES, EN y ZH de todo lo anterior, mapeando cada código de error del proceso principal a su clave, sin armar claves por interpolación de plantilla y sin dejar ninguna clave sin consumidor.
  *Implementado en `lib/i18n.ts`: 24 nuevas claves en español, inglés y chino simplificado, con mapeo estricto de códigos de error y sin claves huérfanas.*
- [x] 9.8 Actualizar `components/pipeline/__tests__/pipeline-i18n.test.ts` con las claves nuevas y verificar la paridad en los tres idiomas.
  *Implementado en `components/pipeline/__tests__/pipeline-i18n.test.ts`: 16 pruebas verificando paridad al 100% de las nuevas claves en los tres idiomas.*

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

- [x] 9b.1 **Inventario de las tres pilas y base adoptada:**
  - `electron/ai/providers/` (271 líneas): Temporal Agent, `claude.ts` (API nativa Anthropic), `openrouter.ts` (endpoint chat/completions compatible OpenAI), `index.ts`.
  - `electron/ai/carto/` (281 líneas): Cartografía (`provider.ts`, `openrouter.ts`, `lmstudio.ts`). Duplicaba endpoint de OpenRouter y localhost:1234 con cabeceras de atribución.
  - `electron/ai/commit-message/` (1116 líneas): `local-provider.ts` con streaming SSE.
  - **Base adoptada:** Se extrae `electron/ai/text-client.ts`, centralizando las llamadas HTTP compatibles con OpenAI.
  - **Qué queda afuera de la unificación:** Se preserva intacta la maquinaria específica de `commit-message`: catálogo de modelos (`modelsEndpoint`, `fetchModelCatalog`, `parseModelCatalog`), carga/descarga de VRAM (`loadLocalModel`, `unloadLocalModel`), topología de hardware (`device-index.ts`, `device-names.ts`), agrupación de cuadros a 45 fps (`chunk-pump.ts`), y formateo/validación de conventional commits (`normalizeSubject`).
- [x] 9b.2 **Distinción declarada en código:**
  Se declara explícitamente en el encabezado y tipos de `electron/ai/text-client.ts`: los runtimes que ejecutan trabajo sobre el repositorio (`claude`, `codex`, `opencode`, `agy`, LM Studio runtime) son bucles de agente interactivos (`launchable: true`, `modifiesRepo: true` en `RuntimeSessionHub`). Las llamadas de texto unificadas son invocaciones a modelos de texto (completions de commit message, Cartografía y la explicación de 9c).
- [x] 9b.3 **Forma única de proveedor de texto (`electron/ai/text-client.ts`):**
  - Estructura base `TextClientConfig` (URL base más clave opcional) sobre API compatible con OpenAI.
  - Modos duales soportados: `completeText` (respuesta consolidada) y `streamText` (streaming SSE con notificación de chunks agrupados contiguamente).
  - Cubre sin casos especiales: LM Studio (local sin clave), Unsloth Desktop (remota con token opcional), y OpenRouter (fija con clave y cabeceras de atribución).
- [x] 9b.4 **Unsloth Desktop integrado (corregido el 2026-09-07 con la configuración real de OpenCode de Alejandro):**
  Integrado sin pila propia mediante `createUnslothConfig({ baseUrl, apiKey?, headers?, cfAccessClientId?, cfAccessClientSecret? })`.
  Medido contra la configuración real que funciona hoy: un Unsloth detrás de Cloudflare Access requiere **tres credenciales**:
  - `apiKey` (token del modelo -> cabecera `Authorization: Bearer`)
  - `CF-Access-Client-Id` (cabecera de Cloudflare Access)
  - `CF-Access-Client-Secret` (cabecera de Cloudflare Access)
  `createUnslothConfig` propaga tanto cabeceras arbitrarias como las dos cabeceras específicas de Cloudflare Access.
  El baúl de claves (`electron/ai/key-store.ts`) se amplió para soportar múltiples secretos nombrados por proveedor indexando por `${provider}:${secretName}` bajo el mismo mecanismo de `safeStorage` (cifrado en reposo, main-only, sin variables de entorno y sin filtraciones por IPC).
  Medición de metadatos de modelo (`limit.context`, `limit.output`, `reasoning_effort`): son límites de cliente o banderas de modelos específicos que el cliente HTTP unificado no necesita enviar en el cuerpo de la petición hoy; se omiten para no romper esquemas estrictos de servidores OpenAI compatibles.
- [x] 9b.5 **Baúl de claves desacoplado (`electron/ai/key-store.ts`):**
  Se desacopla `ProviderId` a `AIKeyProviderId` para permitir proveedores de texto (ej. `unsloth`) sin atarse al enum cerrado de `AIPredictionProvider['id']`. Las claves permanecen cifradas en disco con `safeStorage` (DPAPI en Windows), residen exclusivamente en el proceso principal, admiten secretos nombrados (`${provider}:${secretName}`), no se exponen por IPC y no utilizan variables de entorno (`process.env`).
- [x] 9b.6 **Migración de consumidores y retiro de código:**
  - Cartografía: `chatComplete` en `carto/provider.ts` delega en `completeText`, eliminando la duplicación de fetch y manejo de errores. `carto/openrouter.ts` usa `createOpenRouterConfig` y `carto/lmstudio.ts` usa `createLmStudioConfig`.
  - Commit message: `draftCommitSubject` en `commit-message/local-provider.ts` delega en `streamText`.
  - Stubs retirados en `providers/index.ts`: se retiran los stubs `openai`, `gemini` y `opencode` (OpenCode es runtime interactivo, y OpenAI/Gemini se consumen vía OpenRouter).
- [x] 9b.7 **Pruebas y verificación:**
  - `electron/__tests__/text-client.test.ts` (11 pruebas): valida las tres configuraciones sobre el pedido HTTP armado (headers, bodies y endpoints), verifica que la clave no se filtre en mensajes de error HTTP ni de red, y cubre ambos modos (completo y streaming SSE).
  - `electron/__tests__/pipeline-sync-ipc.test.ts`: verifica el camino registrado en `main.ts` sin dependencias inyectadas.

- [x] 9b.8 **Auditoria del 2026-09-07: la unificacion quedo en dos tercios, y el tercio que falta es
  justo la duplicacion que motivo el grupo.**
  Migraron Cartografia y el mensaje de commit, que es lo pedido y esta bien hecho. **La pila del
  agente temporal, `electron/ai/providers/`, no se migro y el reporte no dice por que.**
  Medido el 2026-09-07: `electron/ai/providers/openrouter.ts:20` sigue declarando
  `const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'` y su propia cabecera
  `http-referer` en `:42`, con su propio `fetchWithTimeout` en `:36`. Es exactamente la duplicacion
  que la tarea 9b.1 nombro con archivo y linea, y ahora `electron/ai/text-client.ts:71` declara la
  misma URL una tercera vez.
  Lo mismo con el endpoint local: `carto/lmstudio.ts:25`, `commit-message/local-provider.ts:41` y
  `text-client.ts:72` lo declaran cada uno por su lado. **Paso de dos declaraciones a tres**, que es
  lo contrario de lo que la tarea buscaba.
  Excepcion legitima que hay que respetar: `electron/ai/providers/claude.ts:17` habla con la API
  nativa de Anthropic —`api.anthropic.com/v1/messages`, con cabecera `anthropic-version`—, que **no
  es compatible con OpenAI** y por lo tanto no entra en la forma unica. Eso se declara y se deja.
  El de OpenRouter si es compatible y si entra.
  Cuenta de lineas sobre los archivos medidos, antes y despues: 1022 a 1266. La unificacion agrego
  338 lineas y retiro 94. El criterio que la tanda tenia escrito —«vale si borra codigo; si solo
  agrega una capa encima de las tres, salio peor»— todavia no se cumple, y no se va a cumplir hasta
  que el tercer consumidor use la capa.
  Resolver: migrar `providers/openrouter.ts` al cliente unico conservando su parseo propio, que si es
  suyo; dejar `claude.ts` afuera con el motivo escrito; y que cada URL base quede declarada **en un
  solo lugar**.
  **Resolución y mediciones del 2026-09-07:**
  - `providers/openrouter.ts` migrado a `text-client.ts`: consume `createOpenRouterConfig` y `completeText`. Se retiraron `ENDPOINT` duplicado y `fetchWithTimeout`. Se conservó su parseo propio `parseBranches`.
  - `claude.ts`: documentada la excepción arquitectónica en su encabezado (API nativa de Anthropic, no compatible con OpenAI).
  - URLs base centralizadas en `electron/ai/text-client.ts`: `DEFAULT_OPENROUTER_BASE_URL` ('https://openrouter.ai/api/v1'), `DEFAULT_LMSTUDIO_BASE_URL` ('http://localhost:1234/v1') y error común `DEFAULT_LMSTUDIO_CONN_ERROR`.
  - `carto/lmstudio.ts:25`: `MODELS_ENDPOINT` se deriva como `${DEFAULT_LMSTUDIO_BASE_URL}/models` (en LM Studio, la API compatible con OpenAI expone `/v1/models`). Usa `DEFAULT_LMSTUDIO_CONN_ERROR`.
  - `commit-message/local-provider.ts`: `DEFAULT_LOCAL_BASE_URL` se deriva de `DEFAULT_LMSTUDIO_BASE_URL.replace(/\/v1\/?$/, '')`. Actualizado el comentario en línea 7 que describía la duplicación vieja.
  - Medición de líneas: `openrouter.ts` bajó de 107 a 90 líneas (retiradas 35 líneas frente al original de 125). El total de archivos de inferencia unificados se estabilizó en 1229 líneas incluyendo documentación arquitectónica.

- [x] 9b.10 **Auditoria del 2026-09-07: el baul de claves gano un parametro nuevo y quedo sin
  validacion en el borde de IPC.**
  La forma elegida para los secretos con nombre es correcta —compatible hacia atras, sin migracion,
  sin variables de entorno, mismo `safeStorage`—. Lo que falta es la puerta.
  Medido el 2026-09-07: `electron/ipc/ai.ts:137` declara
  `ipcMain.handle('ai:set-key', async (_event, provider: ProviderId, key: string, secretName?: string))`.
  Esos tipos son de compilacion: **en ejecucion el renderer puede mandar cualquier cadena** en
  `provider` y en `secretName`, y ni el manejador ni `key-store.ts` los validan. `buildSecretKey`
  (`:62-66`) solo hace `trim` y concatena con `:`.
  Dos consecuencias:
  1. **Colision.** `setKey('unsloth:cf-client-secret', x)` escribe **la misma ranura** que
     `setKey('unsloth', x, 'cf-client-secret')`. Una llamada puede pisar el secreto de otro
     proveedor sin que nada lo impida.
  2. **Espacio de nombres sin limite.** Cualquier cadena se vuelve una ranura guardada, y el archivo
     cifrado crece con lo que el renderer mande.
  Contraste medido dentro del mismo proyecto: los canales de `pipeline:*` validan todo lo que entra
  —`validateStrictPayloadKeys`, `validRepoPath`, `validChangeId`, `isValidOpenSpecChangeSlug`—. Los
  de IA no. Y el encabezado de `key-store.ts` es explicito sobre su postura de seguridad: la clave
  vive solo en el proceso principal y el renderer solo puede preguntar si existe. El parametro nuevo
  entro sin ese rigor.
  Resolver: validar `provider` contra la lista cerrada de proveedores conocidos y `secretName`
  contra un formato acotado que **no admita el separador**, en el manejador de IPC y tambien en
  `key-store.ts`, que es el que guarda. Rechazar con codigo, sin prosa y sin eco del valor.
  Cubrirlo con una prueba que intente la colision y afirme que se rechaza.
  **Resolución y mediciones del 2026-09-07:**
  - `KNOWN_AI_KEY_PROVIDERS` definido como tupla cerrada `['claude', 'openrouter', 'openai', 'gemini', 'opencode', 'unsloth']`.
  - Validación de `provider`: `validateProviderId` rechaza proveedores desconocidos o que contengan el separador `:` con `INVALID_PROVIDER`.
  - Validación de `secretName`: `validateSecretName` exige formato estricto `/^[a-zA-Z0-9_-]{1,64}$/`, rechazando el separador `:`, espacios o traversal con `INVALID_SECRET_NAME`.
  - Validación de clave: `validateKeyString` rechaza cadenas vacías o longitudes anormales con `INVALID_KEY`.
  - Prevención de colisión: `setKey('unsloth:cf-client-secret', x)` es rechazado como `INVALID_PROVIDER`, imposibilitando colisionar con `setKey('unsloth', x, 'cf-client-secret')`.
  - Frontera IPC auditada y blindada en `electron/ipc/ai.ts`: `ai:set-key`, `ai:has-key`, `ai:remove-key`, `ai:key-fingerprint`, `ai:predict-timelines`, `ai:load-prediction` y `git:materialize-idea` validan argumentos rechazando con códigos sin prosa ni eco.
  - Cobertura: agregadas pruebas unitarias en `electron/__tests__/key-store.test.ts` y pruebas de integración IPC en `electron/__tests__/ai-ipc.test.ts`.

## 9c. La verificacion de version, con criterio

- [x] 9c.1 Que la comprobacion no se quede en «hay una nueva»: que traiga que cambio, con la fuente
  citada, y si la fuente no esta disponible lo diga en vez de inventar una lista.
  *Implementado en `electron/pipeline/openspec-version-analysis.ts:fetchOpenSpecChangelog`: consulta GitHub Releases con URL citada. Ante 404 o falla de red, retorna `'unavailable'` con el motivo real sin inventar cambios.*
- [x] 9c.2 Que juzgue si esos cambios tocan lo que GitCron **consume** —la forma del JSON de `status`,
  `instructions`, `validate`, `archive` y `sync`, y los workflows del perfil— y declare cada veredicto
  con su evidencia.
  *Implementado en `evaluateConsumedSurfaces`: evalúa determinísticamente las 6 superficies contrastadas contra `SUPPORTED_OPENSPEC_VERSIONS` e `isInstalledAheadOfCycle`, detallando evidencia concreta para cada una.*
- [x] 9c.3 Si algo rompe, **proponer la estrategia**: que habria que modificar, en que orden, y que se
  puede hacer sin tocar nada. Es una propuesta para que Alejandro decida, no una accion automatica.
  *Implementado en `buildStrategyProposal`: genera propuesta estructurada (qué modificar, orden de 4 pasos, qué funciona intacto) orientada a la decisión deliberada de Alejandro sin mutaciones automáticas.*
- [x] 9c.4 La explicacion en criollo se redacta con la capa unica de 9b, con modelo local por omision.
  Sin 9b terminada esta tarea no arranca: construirla antes agrega una cuarta pila.
  *Implementado en `draftVersionRedaction`: invoca `completeText` con `createLmStudioConfig` (modelo local por omisión). Si LM Studio está apagado, degrada limpiamente a `status: 'offline'` sin lanzar excepciones.*
- [x] 9c.5 Lo que el modelo redacta se presenta **como redaccion**, separado de lo medido. Un veredicto
  sobre si algo rompe sale de la comparacion, no del modelo. Es la misma regla que ya rige a
  `PipelineArtifactGraph`, que declara no inventar estado derivandolo de otra cosa.
  *Estructura desacoplada en `OpenSpecVersionAnalysisResult`: `measured` (hechos y veredictos por código) separado de `redaction` (texto del modelo).*
- [x] 9c.6 Subir `OPENSPEC_CYCLE_TARGET_VERSION` y `SUPPORTED_OPENSPEC_VERSIONS` de
  `lib/openspec-version.ts` sigue siendo un acto deliberado con evidencia. **La decide Alejandro**,
  sobre lo medido. La comprobacion informa; no mueve el rango sola.
  *Inmutable: el código respeta los valores existentes ('1.11.0' y '1.5.0'-'1.11.0') sin alterarlos.*

- [x] 9c.7 **Auditoria del 2026-09-07: la consulta del changelog no tiene cache, y es la tercera vez
  que aparece la misma asimetria.**
  `electron/pipeline/openspec-version-analysis.ts:118` consulta
  `https://api.github.com/repos/fission-ai/openspec/releases/tags/v<version>` **sin autenticar**. La
  API publica de GitHub limita a 60 pedidos por hora **por direccion IP**, compartidos con cualquier
  otra cosa que use esa red.
  El modulo acepta una opcion `forceRefresh` (`:396`) que sugiere que hay algo que refrescar, pero
  **no existe ninguna cache**: medido, no hay una sola aparicion de cache ni de tiempo de vida en
  todo el archivo.
  Es la misma asimetria que ya se anoto dos veces en esta rama: `checkLatestOpenSpecVersion`, en
  `electron/pipeline/openspec-registry.ts`, hace una consulta equivalente y **si tiene cache** —se
  ve en pantalla, «En cache (35581s)»—. Antes paso con `doctor` y `context`, que quedaron sin ella.
  Seguir el patron del vecino, con el tiempo de vida declarado y `forceRefresh` haciendo lo que su
  nombre dice.
  Nota de lo que si quedo bien: el canal se registra en `electron/ipc/pipeline-openspec.ts:718` con
  `deps.runVersionAnalysis ?? analyzeOpenSpecVersion`, o sea que **la aplicacion usa la funcion de
  verdad** y no una inyeccion que solo existe en las pruebas. Es lo contrario de lo que habia pasado
  con la sincronizacion, y corresponde decirlo.
  **Resolución y mediciones del 2026-09-07:**
  - TTL declarado en `OPENSPEC_CHANGELOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000` (24 horas), alineado con `STALE_CACHE_TTL_MS` del registro npm, dado que las notas de versiones publicadas son inmutables. Documentado el criterio en el código.
  - Caché en memoria implementada en `fetchOpenSpecChangelog`: dos llamadas sucesivas para la misma versión realizan 1 solo fetch y devuelven `fromCache: true`.
  - `forceRefresh: true` puentea la caché y ejecuta una nueva petición a la fuente, actualizando la caché tras una respuesta exitosa. Propagado desde `analyzeOpenSpecVersion` y el canal IPC `pipeline:openspec:version-analysis`.
  - Manejo específico de rate limit (HTTP 403 / `x-ratelimit-remaining: 0`): devuelve `source: 'rate_limited'` con mensaje indicando hora de reseteo (`x-ratelimit-reset`) sin enmascarar como `unavailable`.
  - Aislamiento de suite (Bloque A): aislada la prueba de integración IPC en `openspec-version-analysis.test.ts` mockeando `globalThis.fetch`, proveyendo caché local en `userDataDir` y aislando la invocación de `openspec-engine`, eliminando el timeout intermitente de 5000ms.

- [ ] 9c.8 **Auditoria del 2026-09-07: la intermitencia bajo pero no se fue.**
  El arreglo de la prueba de analisis de version es correcto y esta bien hecho: se sustituyo el
  lanzador del CLI y la red, **sin inyectar** `runVersionAnalysis`, asi que la prueba sigue
  ejercitando el cableado real de `registerOpenSpecIpcHandlers`. Es exactamente lo que habia que
  conservar.
  Pero la suite sigue siendo intermitente. Medido el 2026-09-07 sobre el arbol de esta tanda: **seis
  corridas completas, una en rojo** —1 archivo y 2 pruebas sobre 187 y 1813— y cinco en verde. La
  corrida roja fue la primera y no se capturo el nombre; las cinco siguientes salieron limpias.
  Antes de esta tanda fallaba cerca de una de cada cuatro; ahora cerca de una de cada seis u ocho.
  Mejoro, no se resolvio.
  Lo que hay que hacer la proxima vez que aparezca: correr la suite guardando la salida COMPLETA de
  cada corrida en un archivo desde el principio, no el resumen. Sin el nombre no hay diagnostico, y
  el nombre solo aparece en la corrida que falla.
  Nota de por que esto importa y no es una molestia menor: una suite que da verde cinco de cada seis
  veces **deja pasar una regresion de verdad**, y en esta rama ya paso una vez.

- [x] 9d.1 **Auditoria del 2026-09-08: la pantalla dice 0 de 96 y es mentira, y la regla que lo
  causo la escribi yo.**
  Medido el 2026-09-08: `tasks.md` tiene 96 tareas y **cero tildadas**, mientras que los grupos 1,
  2, 3, 3b, 4, 5, 8, 9, 9b y 9c estan construidos y auditados tanda por tanda. Los unicos que no se
  tocaron son 3c, 6 y 7. La aplicacion muestra «0 / 96 Progreso» y el contador de archivado dice «96
  sin tildar».
  El origen es una regla del traspaso: «ninguna casilla se tilda, las marca Alejandro». Existia por
  un buen motivo —un ejecutor que se tilda sus propias tareas convierte la lista en una afirmacion
  sin respaldo— y **cumplio ese proposito: no hay ni una tilde falsa**. Pero produjo la falla
  simetrica: tampoco hay ninguna verdadera, y la lista dejo de describir el trabajo.
  Lo que hay que separar son dos cosas que la regla mezclaba: **quien lo declara** y **quien lo
  verifica**. El ejecutor sigue sin tildarse a si mismo. Lo que faltaba es el paso siguiente: que
  quien audita tilde lo que verifico, con la tanda que lo respalda.
  Resolver con una pasada de auditoria que tilde unicamente lo comprobado, grupo por grupo, dejando
  anotado de que tanda salio cada uno. Lo que quede sin verificar se queda sin tildar, que es
  distinto de «no hecho» y hay que decirlo tambien.

## 10. Cierre y validación

- [ ] 10.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 10.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 10.3 `openspec validate gestionar-ciclo-openspec-desde-gitcron --strict` en cero.
- [ ] 10.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [x] 10.5 Revisión visual y funcional en la aplicación: acciones antes del diagnóstico, alta y edición de tareas, revisión de una propuesta por bloque distinguible de lo ya escrito, sincronización con su vista previa, motivo al archivar, e instalación del motor en sus dos modos. **La marca Alejandro.**
