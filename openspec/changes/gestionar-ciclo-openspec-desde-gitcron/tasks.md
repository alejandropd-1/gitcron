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

- [x] 6.7 Ofrecer la actualización del motor con el mismo patrón con que GitCron se actualiza a sí mismo: un indicador junto a la versión, que al abrirse ofrece la acción y la ejecuta, sin que haya que ir a buscar nada. La maquinaria ya existe en `electron/ipc/app-window.ts`, que usa `electron-updater` con `autoDownload = false` y los eventos `update-available`, `download-progress` y `update-downloaded`. Las tareas 6.1 a 6.5 resuelven **cómo instalar**; ésta resuelve **cómo se ofrece**, que es lo que hoy no existe: un repositorio con el motor atrasado no tiene en pantalla ningún camino a actualizarlo.

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

- [x] 6.10 **Decision de Alejandro, 2026-09-14, al ver el punto de la 6.7 en pantalla:** «no me
  importa que avise que se paso del rango desde-hasta; me tiene que decir que hay una version nueva
  y chau, actualiza y punto». Deprecada con causa la regla de «maximo probado»: el rango pasa a
  tener **solo minimo**. Aclaracion del mismo dia, textual: «no estoy diciendo que es una regla
  inquebrantable lo de la version; no se para que sirve que me diga desde-hasta. Me tiene que decir
  si hay una actualizacion nueva, de que version a que version pasaria. El aviso visual de color,
  que te dice que ya la version es vieja, esta perfecto. El aviso tiene que saltar porque hay una
  version nueva, como hace GitCron cuando actualizamos la version.» **Regla resultante:** el aviso
  (punto + pildora ambar + titulo «de vX a vY») se dispara unicamente por `installed < latest`
  (`getOpenSpecEngineUpgrade`, `pipeline-domain.ts`), nunca por rango. La 6.7-B habia dejado el
  punto sin ambar; se corrige aqui: `engineAttention` incluye `upgrade !== null`. Medido: las reglas
  de rango que existian no eran de Alejandro —nacieron en el commit 4f64caa9 (16/08/26) y en el
  change actualizar-integracion-openspec-1-8— y estaban en la spec consolidada
  (`openspec/specs/pipeline-openspec-engine/spec.md:41-61`), en el delta de este change, en
  `lib/openspec-version.ts` y en la memoria del auditor. `too-new` desaparece de `OpenSpecVersionClass` (`lib/openspec-version.ts:25`
  y `:70`), y con el se van `isInstalledAheadOfCycle` (`:78`), `hasOpenSpecCycleMismatch`
  (`OpenSpecEngineCard.tsx:79`), el aviso `versionAheadOfCycle` de la pildora
  (`OpenSpecDashboard.tsx:2040-2044`) y de la tarjeta (`OpenSpecEngineCard.tsx:850-859`), el
  `needs-attention` por `too-new` (`:391`), el texto `hostUpgrade.beyondTested` de la 6.7-A
  (`:588-594`, y `beyondTested` en `pipeline-domain.ts:305-323`), y en
  `electron/pipeline/openspec-version-analysis.ts` el `isTooNew` que contaba como «rompe» (`:272`) y
  el `aheadOfCycle` (`:369`, `:548`). `too-old` y `isInstalledBehindCycle` se quedan: un motor
  viejo no tiene los comandos. Delta MODIFIED de `pipeline-openspec-engine` reescrito: minimo 1.5.0,
  clases `supported | too-old | unknown`, sin escenario «mas nuevo».
  **Lo que Alejandro delega, textual:** «te estoy delegando la responsabilidad de saber si cuando se
  actualiza, rompe todo o no. O se hace el programa a prueba de fallos, o se agrega una IA que este
  mirando que pasa si se actualiza». Medido el 2026-09-14: la IA que mira **ya existe** —es el grupo
  9c, `pipeline:openspec:version-analysis` (`electron/ipc/pipeline-openspec.ts:736`): trae el
  changelog de GitHub Releases con la fuente citada, juzga las seis superficies que GitCron consume
  y redacta la explicacion con LM Studio— pero **nunca llego a la pantalla**: no tiene binding en
  `electron/preload.ts` y ningun componente lo llama. Y su veredicto «rompe» hoy sale del numero de
  version (salto de major o `too-new`), no de lo que la version cambia. A prueba de fallos, en dos
  partes que se pueden hacer por separado:
  (a) **Vuelta atras.** Antes de instalar se recuerda la version instalada; despues, el estado se
  relee solo (6.4 ya lo hace). Si el motor dejo de responder como se espera —version ilegible,
  `doctor --json` que no parsea, `config list` fallido— la tarjeta lo dice y ofrece «Volver a
  vX.Y.Z», que reinstala esa version por el canal `install-global` con `targetVersion` (ya valida
  semver estricto). Toda actualizacion tiene camino de vuelta.
  (b) **Lo que trae la version nueva, antes de confirmar.** La confirmacion de «Actualizar el
  motor» muestra el resultado de 9c —changelog con su fuente, veredictos medidos, y la redaccion
  del modelo local si esta encendido— como informacion, nunca como bloqueo. Cablear el canal al
  preload y a `OpenSpecGlobalInstallConfirm`. Pendiente aparte: que el veredicto de 9c compare
  salidas reales (`status --json`, `doctor --json`) de la version nueva y no solo el numero.
  **Pedido de Alejandro del 2026-09-14 para la redaccion:** usar Unsloth Desktop —«va a buscar las
  IA que tengo en casa instaladas, con Cloudflare, como esta andando fehacientemente OpenCode»— en
  vez de LM Studio. Medido: la capa 9b ya lo contempla (`electron/ai/text-client.ts:29`
  «Unsloth Desktop: baseUrl remota, apiKey opcional»; `createUnslothConfig` en `:342`;
  `getUnslothCredentials` en `electron/ai/key-store.ts:168`). Lo que falta es que
  `draftVersionRedaction` (`openspec-version-analysis.ts:383`) deje de fijar `createLmStudioConfig`
  y elija: Unsloth si hay credenciales guardadas, LM Studio si no, y que lo diga en `redaction`.
  **Ampliado el 2026-09-14 con la configuracion de OpenCode que mostro Alejandro
  (`~/.config/opencode/opencode.json`):** dos proveedores con la misma forma —`unslothpc`
  (`https://llm.aledesign.dev/v1`, por tunel Cloudflare, con `apiKey` y cabeceras
  `CF-Access-Client-Id`/`CF-Access-Client-Secret`) y `unslothpclocal`
  (`http://192.168.0.12:8888/v1`, misma clave y cabeceras)—, y la regla: «si estoy en la notebook,
  acceder remotamente a mi PC, como hace OpenCode; si estoy en la PC, los modelos locales». Medido
  lo que falta para eso, y es mas que cambiar una linea: (1) `createUnslothConfig` ya arma las
  cabeceras CF pero **nadie la llama**; (2) no existe ningun lugar donde guardar las dos URL (el
  key-store solo guarda apiKey y los dos secretos CF); (3) el preload no deja guardar secretos con
  nombre: `setKey: (provider, key)` (`electron/preload.ts:437`) descarta el tercer argumento que
  `ai:set-key` si acepta (`electron/ipc/ai.ts:157`); (4) no hay pantalla de ajustes para
  Unsloth (la unica de proveedores es `CartoAISettings.tsx`, solo OpenRouter). Diseno: un unico
  `resolveTextProvider()` en `electron/ai/` que sondea primero la URL local (`GET /models`, tope
  1,5 s), si responde la usa, si no la del tunel, y si tampoco, LM Studio; devuelve la config y una
  etiqueta («Unsloth local», «Unsloth remoto», «LM Studio») que la redaccion declara. Lo consumen
  los tres usos de modelo de la app (cartografia, mensaje de commit, verificacion de version). Es
  el change de unificacion que la 6.8 dejo pendiente de decision. **Decidido por Alejandro el
  2026-09-14: change aparte** (`modelos-en-casa`), fuera de este. Mientras tanto, 6.10 (b) cablea
  9c a la confirmacion con el changelog y los veredictos medidos, y la redaccion sale por la capa
  actual (LM Studio); cuando exista `resolveTextProvider()`, la usa sin tocar 9c.
  *Progreso 2026-09-14 (partes 1 y 2, auditadas):* `too-new`, el maximo del rango,
  `isInstalledAheadOfCycle`, `hasOpenSpecCycleMismatch` y los avisos «supera el ciclo» eliminados de
  codigo, i18n y pruebas; pildora ambar + punto con version nueva; delta en forma valida (REMOVED del
  requisito viejo + ADDED «GitCron declara una version minima soportada de OpenSpec»). Suite: 1997.
  Faltan (a) vuelta atras y (b) lo que trae la version nueva, con Unsloth.

- [x] 6.11 **Defecto vivo medido el 2026-09-14 en la captura de Alejandro:** el panel derecho decia
  «Motor OpenSpec: Version no clasificada», «Global: unknown», «Sin datos de perfil (configuracion
  global no leida)», mientras la pildora del encabezado decia «OpenSpec v1.12.0» con el punto de la
  6.7. Por eso la tarjeta no mostraba la oferta «Actualizar el motor» de la 6.7-A: su `status` tenia
  `runtimeVersion: null`. Causa: el encabezado (`OpenSpecDashboard.tsx:1042`) y el panel derecho
  (`OpenSpecInspector.tsx:145`) piden `getEngineStatus(repoPath)` **cada uno por su cuenta**; cada
  pedido lanza siete procesos del CLI (`--version`, cuatro lecturas de config, `doctor`, `context`;
  `pipeline-openspec.ts:180-260`, `openspec-global-config.ts:173`) con timeouts de 10 s. Con seis
  pestanas abiertas al arrancar, el pedido del panel derecho vencio, quedo con la version en null y
  **nadie lo reintenta**: solo se relee tras un cambio (`engineChangeToken`). Que hacer: una sola
  lectura por repositorio compartida entre los dos consumidores (dedupe del pedido en vuelo en
  `lib/pipeline-store.ts`, donde ya vive `notifyEngineChanged`), reintento automatico cuando el
  snapshot trae `cli.installed && runtimeVersion === null` o `profileState !== 'read'`, y un boton
  «Releer estado» visible en la tarjeta (ya existe `onChanged` → `refetchEngineStatus`, solo falta
  el boton). Mientras tanto, cerrar y abrir la pestana fuerza la relectura.

## 7. Perfil de workflows

- [x] 7.1 En `electron/pipeline/`, agregar la lectura de `openspec config list` devolviendo perfil y workflows habilitados como datos, sin enum cerrado en el código.
- [x] 7.2 Agregar el canal de activación y desactivación de un workflow, y recalcular las acciones ofrecidas desde la configuración resultante.
- [x] 7.3 En `electron/__tests__/`, verificar que un workflow ausente de la configuración no habilita su acción, usando una configuración con un nombre de workflow que el código no conoce.
- [ ] 7.4 Distinguir en pantalla, para cada workflow que un agente no tiene, cual de las dos causas que hoy se pueden medir aplica: **el perfil global no lo habilita** (esta fuera de `resolvedWorkflows`; se resuelve activandolo desde el panel de perfil) o **la integracion de ese agente esta desactualizada** (el perfil lo habilita pero el agente no lo tiene instalado; se resuelve con `openspec update`). Cada causa con su accion al lado, no una recomendacion generica. **Medido el 2026-09-11:** la tercera causa —que el motor instalado no traiga ese workflow— no se puede distinguir porque el CLI 1.12.0 no expone de forma no interactiva la lista de workflows disponibles; la constante existe (`ALL_WORKFLOWS`, doce nombres, en `dist/commands/config.js` del paquete) pero solo se muestra en el menu interactivo de `config profile`, y por script falla a proposito. Se pidio a OpenSpec via feedback. No se lee del codigo compilado del paquete: ese anclaje ya costo en la 5.3. Caso comprobado el 2026-08-19 que motivo esta tarea: el motor 1.5.0 no expone `update`, que si integra el conjunto basico de la 1.9.0, de modo que cambiar el perfil a `core` no lo habilita.
  *Hecha el 2026-09-17 y auditada:* `ProfileWorkflowRow` gana `missingByIntegration` y `missingByProfile`; la tarjeta arma el mapa desde `targetConvergences` (incluye agentes presentes sin workflows) y muestra por fila la causa con su accion («Actualizar» lleva a la seccion Actualizacion; «Activar X» o «Cambiar a custom» segun el perfil). Pruebas: perfil 23, tarjeta 46. Pendiente de que Alejandro lo tilde.
- [x] 7.5 Cuando la causa sea «la integracion esta desactualizada», declarar que `openspec update` la resuelve y ofrecerlo desde ahi. La version del motor que habilitaria un workflow ausente queda **pendiente de que el CLI exponga la lista de workflows disponibles** (feedback enviado el 2026-09-11); cuando exista, derivarla de lo que el motor y el registro de npm informan, no de una tabla propia en el codigo. La tarjeta ya expone la version instalada, la objetivo y la ultima en npm (`OpenSpecEngineCard.tsx:279, 287, 338`).
- [x] 7.6 **Medido el 2026-09-11 con el switch ya funcionando:** bajo el perfil `core` —el de esta maquina— el toggle escribe `workflows` en el archivo global (comprobado: `config.json` cambio a las 09:13 con un array valido) pero **no tiene efecto visible**, porque el motor solo usa la lista escrita cuando el perfil es `custom` (`dist/core/profiles.js:35-37` del paquete: `getProfileWorkflows(profile, customWorkflows)` devuelve el preset fijo salvo que `profile === 'custom'`). El panel muestra lo resuelto, asi que todo sigue «Habilitado». Que hacer: cuando el perfil no sea `custom`, los switches se muestran deshabilitados con el motivo al lado —el perfil fija los workflows— y se ofrece cambiar a `custom` desde ahi. Al cambiar, primero se escribe `workflows` con la lista que el perfil resolvia hasta ese momento, y recien despues `profile`, para que el cambio no deje al usuario con una lista vacia. Nada de esto se adivina: la lista sale de `resolvedWorkflows` ya leida.
  *Resolucion medida el 2026-09-14, decidida por Alejandro:* la pantalla esta como se pidio (`OpenSpecEngineCard.tsx:440-451` bloquea los switches con el motivo; el candado `profileLockBtn` cambia el perfil). La escritura se aparta del texto de arriba a proposito: `setOpenSpecProfile` (`electron/pipeline/openspec-global-config.ts:396-426`) escribe `workflows` con la lista resuelta **solo si la lista escrita esta vacia**; si ya hay una, la respeta como memoria de `custom`, y al volver a `core` no la toca. Asi abrir y cerrar el candado no pierde lo elegido (el tooltip `lockOpenTitle` lo declara). Riesgo aceptado: una memoria vieja sin `update` deja ese workflow «Deshabilitado por el perfil» al abrir; visible, no silencioso. Pruebas en `electron/__tests__/pipeline-openspec-global-config.test.ts` (custom con lista escrita → un solo `config set profile custom`; con lista vacia → dos escrituras en orden).

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

- [x] 8.17 **Quinta revision visual de Alejandro, 2026-09-08.** Cuatro ajustes.

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

- [x] 8.19 **Observacion visual de Alejandro, 2026-09-14: el pie del panel derecho («269 requisitos ·
  0 reportes») se dibuja encima del texto de ayuda del perfil de workflows al scrollear.** Medido: el
  panel es `.activityRail` (`OpenSpecDashboard.module.css:1073-1081`), columna flex con
  `overflow-y: auto`, o sea que el que scrollea es el panel entero. Adentro, `.railSections`
  (`:4054-4060`) declara `min-height: 0`: como item flex puede encogerse por debajo de su contenido,
  asi que las secciones se achican al alto visible, el contenido desborda (overflow visible por
  omision) y se pinta sobre el `<footer className={styles.railMeta}>`
  (`OpenSpecInspector.tsx:393-396`), que no es sticky ni tiene fondo (`:1327`). El pie queda a la
  altura del borde inferior visible del panel y al scrollear sube con el contenido. Arreglo mas
  quirurgico: en `.railSections` reemplazar `min-height: 0` por `flex: 0 0 auto`, para que las
  secciones midan lo que miden, el panel scrollee todo y el pie quede al final. No hace falta
  fondo ni sticky.

- [ ] 8.20 **Pedido de Alejandro, 2026-09-14: la pestaña SDD tarda en cargar y muestra «Cargando…».**
  *Hecha el 2026-09-17 y auditada:* (a) `electron/ipc/pipeline.ts` conserva el ultimo snapshot por clave 15 s y lo devuelve al instante mientras revalida de fondo (empuja `pipeline:snapshot-updated` solo si cambio); canal `pipeline:prewarm` que `RepoMainView` llama al montar cada repositorio. (b) `PipelineEmptyState` dibuja la silueta con `animate-pulse` y `aria-label`, sin texto visible. Pruebas: ipc 13 (+4), workspace 3 (+1). Vigilar: con muchas pestanas el precalentado lanza una lectura por repo al arrancar. Pendiente de que Alejandro lo tilde.
  Textual: «cuando inicio GitCron va directo a Graph, pero cuando elijo SDD tarda y aparece un aviso
  de cargando. ¿No hay forma de acelerar eso, con un precacheo o algo anterior? Y si es inevitable
  que tarde, que aparezca como se hace hoy en dia: figuras de la maqueta que aparecen y desaparecen
  en transicion hasta que se vea la vista final.» Medido:
  - La lectura de SDD arranca recien cuando la pestana se monta: `RepoMainView.tsx:276-292` solo
    renderiza `PipelineWorkspace` con la pestana Pipeline activa, y el `useEffect` de
    `PipelineWorkspace.tsx:110-127` dispara `pipelineGetSnapshot` al montar. En Graph no se lee
    nada de SDD.
  - Esa lectura «cuesta segundos» por diseno declarado (`electron/ipc/pipeline.ts:32-36`): el
    proceso principal dedupe lecturas en vuelo por repo y seleccion, pero **no guarda el ultimo
    snapshot**: cada montaje paga la lectura entera (`PipelineService.refresh`,
    `pipeline-service.ts:42-49`). Ya existe el canal de empuje `pipeline:snapshot-updated`
    (`electron/preload.ts:403`) que serviria para revalidar de fondo.
  - Al montar, ademas, el Dashboard y el Inspector piden el estado del motor (siete procesos del
    CLI; desde la 6.11 una sola vez por repositorio), la ultima version de npm y el plan de
    instalacion.
  - El aviso es un solo parrafo: `PipelineEmptyState.tsx:21-27` renderiza `<p>{t('pipeline.loading')}</p>`
    («Cargando evidencia de SDD…», `lib/i18n.ts:779`). No hay esqueleto; la app ya usa la utilidad
    `animate-pulse` de Tailwind en otros lados (`app/page.tsx:1453`, `RepoSidebarParts.tsx:152`).
  Que hacer, en dos partes:
  (a) **Precalentar.** Al abrir un repositorio (no al elegir la pestana), pedir de fondo el snapshot
  de SDD y el estado del motor. El proceso principal conserva el ultimo snapshot por repo y
  seleccion y lo devuelve de inmediato mientras revalida (stale-while-revalidate), empujando el
  nuevo por `pipeline:snapshot-updated`; el lector del motor de la 6.11 ya dedupe, le falta un
  «resultado reciente» que el segundo consumidor pueda reutilizar sin volver a lanzar procesos.
  Medir antes: cuanto tarda hoy `pipelineGetSnapshot` en este repositorio, en frio y en caliente.
  (b) **Esqueleto.** Mientras no hay snapshot, `PipelineEmptyState` dibuja la silueta de la vista
  final —franja de encabezado, dos o tres tarjetas de «En curso», el panel derecho— con
  `animate-pulse`, y el contenido real la reemplaza sin salto de layout. Sin texto «Cargando».

- [x] 8.21 **Observacion visual de Alejandro, 2026-09-14, con la revision y la tarjeta abiertas a la
  vez:** «¿son 4 botones para hacer que? Es una mala UX. Ademas no se si respetan la estetica que
  veniamos manejando, son grandes o me parece a mi.» Medido sobre sus capturas:
  - **Seis botones para dos acciones y un cierre.** Con la revision abierta en el centro y la tarjeta
    en el panel derecho se ven a la vez: en la revision «Actualizar integracion del repositorio»
    (`OpenSpecUpdateReview.tsx:255`), «Cerrar» (`:286`) y «Actualizar el motor» (`:416`); en la
    tarjeta «Cerrar revision» (`OpenSpecEngineCard.tsx:559`), «Actualizar el motor» (bloque de la
    6.7-A, `:567`) y, en el aviso de divergencia, «Actualizar la integracion» (`:1042-1050`), que
    abre la revision **que ya esta abierta**. Las mismas dos acciones, dos veces cada una.
    Que hacer: una accion, un lugar. Con la revision abierta (`isReviewOpen`), la tarjeta no ofrece
    acciones: oculta el bloque «Actualizar el motor» y el bloque «Como resolverlo» de la divergencia
    (titulo, boton y comando), y deja solo el diagnostico y el conmutador «Cerrar revision». Con la
    revision cerrada, la tarjeta ofrece las dos acciones (es el camino pildora → tarjeta → accion de
    la 6.7). **Decision de Alejandro, 2026-09-14: un solo «Cerrar».** Queda el de la revision
    (`OpenSpecUpdateReview.tsx:286`): se cierra donde uno esta, y sigue disponible con el panel
    derecho colapsado. El conmutador de la tarjeta (`OpenSpecEngineCard.tsx:552-563`) solo ofrece
    «Revisar actualizacion» con la revision cerrada; con la revision abierta no se muestra. La clave
    `engine.closeReviewAction` queda sin uso y se retira.
    *Hecho el 2026-09-14/15 (auditado):* dedupe de acciones, escala de botones a 1.75rem y cierre
    unico (el de la revision). Superada por la 8.22 en lo que toca a la tarjeta.

- [x] 8.22 **Decision de Alejandro, 2026-09-15: la actualizacion de OpenSpec se hace como la de
  GitCron.** Textual: «Cuando actualizo GitCron me avisa abajo a la izquierda en el numero de
  version que hay una nueva. Solo le doy a actualizar y se actualiza. Tiene que ser lo mismo aca:
  si hay una version nueva, que me avise como hace ahora, y luego si hago click que en el
  contenedor del medio aparezcan datos relevantes a la actualizacion. No necesito saber que cosas
  se tocan ni que archivos se modifican. Esta bien que me detalle si quiero usar linea de comandos,
  pero hay demasiada informacion desperdigada por el sidebar y luego el contenido del medio. Todo
  lo que concierne a la instalacion tiene que pasar al medio, mas resumido, con datos certeros y
  menos redundancia. Es actualizar: tengo que actualizar y seguir trabajando, sin que se rompa nada
  obvio.» Medido sobre sus capturas del 2026-09-15:
  - Con la revision abierta hay siete secciones en el centro (encabezado con «Actualizar
    integracion del repositorio», tarjeta de diagnostico, «Actualizacion del motor en el sistema
    host», matriz, guia, convivencia, outputs; `OpenSpecUpdateReview.tsx:173-695`) y ninguna dice
    que trae la version nueva. El panel derecho repite «Actualizar el motor» (bloque 6.7-A) y
    «Actualizar la integracion» (aviso de divergencia).
  - La confirmacion de instalacion global no entra en los 340 px del panel derecho: la ruta del
    gestor y la lista de siete repositorios se cortan (captura).
  - El rotulo «npm:» esta cableado (`OpenSpecGlobalInstallConfirm.tsx:262`,
    `OpenSpecEngineCard.tsx:767`) aunque el gestor detectado es pnpm (`package-manager.ts:171`,
    preferencia `pnpm, npm, yarn, bun`; el comando mostrado ya dice `pnpm add -g`).
  - La pildora del encabezado abre la seccion Herramientas del panel derecho
    (`OpenSpecDashboard.tsx:2062-2064`), no el centro.
  Que hacer, en tres tandas:
  (a) **La pildora abre el centro y el panel deja de ofrecer acciones.** Clic en la pildora →
  `setReviewOpen(true)` del store (ya existe, `lib/pipeline-store.ts:61`). La tarjeta del panel
  pierde para siempre el bloque «Actualizar el motor» y el bloque «Como resolverlo» de la
  divergencia (quedan el diagnostico, el texto de divergencia y «Revisar actualizacion»). El rotulo
  del gestor muestra el nombre detectado. Con eso se va tambien el texto roto.
  (b) **El centro se resume.** Arriba, un solo bloque «Actualizacion de OpenSpec» con dos hechos
  —motor: «v1.12.0 → v1.13.0 disponible» o «al dia»; integracion de este repositorio:
  «desactualizada» o «al dia»— y un solo boton «Actualizar» que ejecuta en orden lo que
  corresponda: primero el motor (si hay version nueva; instalacion global, con el aviso de que
  afecta a toda la maquina), despues `openspec update` en este repositorio (si la integracion esta
  desactualizada; con los avisos inline de arbol sucio y rama main que ya existen). Progreso por
  paso, resultado final («Listo: motor v1.13.0 · integracion al dia») y la vuelta atras de la
  6.10 (a) si el motor no responde. Si no hay nada que hacer, el boton dice «Todo al dia» y esta
  deshabilitado. «Desde la terminal» plegado con los dos comandos. Todas las demas secciones
  (diagnostico, matriz, guia, convivencia, outputs, opcion de fuerza) van dentro de un plegable
  «Detalle tecnico», cerrado por omision. Cuando el motor no esta instalado, el mismo bloque ofrece
  «Instalar» (la instalacion local y global de la tarjeta, 9.2/9.3, se mudan al centro).
  (c) **Que trae la version nueva** = 6.10 (b): debajo de los dos hechos, tres o cuatro lineas del
  changelog con su fuente (9c ya lo baja de GitHub Releases) y los veredictos medidos; nunca un
  bloqueo.
  *Progreso, auditado:* (a) hecha el 2026-09-15 (pildora → centro; tarjeta sin acciones; rotulo
  del gestor). (b1) hecha el 2026-09-15: bloque superior con los dos hechos y las acciones,
  «Desde la terminal» y «Detalle tecnico» plegados y cerrados por omision; la seccion «Actualizacion
  del motor en el sistema host» desaparecio como seccion. Suite 2033. Falta (b2): el boton unico
  «Actualizar» que encadena motor → integracion con progreso, resultado y vuelta atras, en dos
  mitades: el ejecutor de pasos como componente propio con sus pruebas, y despues su cableado en la
  revision reemplazando los dos botones y el reporte de archivos (la lista de archivos va a
  «Detalle tecnico»). *(b2, primera mitad) hecha el 2026-09-15 y auditada:*
  `components/pipeline/OpenSpecUpdateRunner.tsx` (556 lineas, 9 pruebas propias: orden motor →
  integracion comprobado, avisos solo para la integracion, motor roto detiene la integracion y
  ofrece la vuelta atras, notifyEngineChanged una sola vez al final). *(b2, segunda mitad) hecha
  el 2026-09-16 y auditada:* la revision monta el ejecutor; desaparecen «Actualizar el motor» y
  «Actualizar integracion del repositorio» y el reporte de archivos (la lista va a «Detalle
  tecnico» como «Archivos tocados por la ultima actualizacion»); la revision baja de 721 a 560
  lineas. Suite 2043.
  (d) **Prueba en vivo de Alejandro, 2026-09-16: actualizo el motor a 1.13.0 con el boton y
  encontro cuatro cosas.** Medidas:
  1. *«Los textos estan como vienen, sin maquetacion; los botones dispersos, sin contenedor».*
     `.reviewUpfrontSummary` (`OpenSpecDashboard.module.css:3768`) es una fila flex: los dos hechos
     quedan lado a lado, el primero sin rotulo y el segundo con rotulo en mayusculas
     (`.reviewFactItem`, `:2460`, pensado para la grilla de diagnostico). `.reviewUpfrontActions`
     (`:3775`) es una fila con wrap: el ejecutor (boton + linea de plan) y «Cerrar» comparten fila
     y «Cerrar» flota a mitad de altura. Que hacer: «Cerrar» va al encabezado de la revision
     (`.reviewHead` ya es `space-between`, `:2365`); los dos hechos son dos lineas iguales, rotulo +
     valor («Motor» / «Integracion de este repositorio»); las acciones en columna, el ejecutor a
     todo el ancho.
  2. *«Al hacer clic en la pildora se cierra el sidebar flotante y queda activado su boton».* El
     «sidebar flotante» es el `ViewSwitcherRail` del centro, visible cuando el panel derecho esta
     cerrado (`isSwitcherVisible = isSwitcherOpen && !rightOpen`, `OpenSpecDashboard.tsx:498`). Se
     renderiza en las ramas de especificacion, change, archivo e inicio (`:2189`, `:2663`,
     `:2887`, `:3192`) pero **no en la rama de la revision** (`:2211-2228`), asi que al abrirse la
     revision el riel desaparece mientras su boton sigue marcado. Que hacer: la rama de la revision
     tambien monta el riel, con las vistas del contexto de fondo (changeViews si hay change
     elegido, startViews si no), sin vista activa, y elegir una vista cierra la revision y aplica
     el cambio de vista.
  3. *«No hubo toast ni resumen de lo que se actualizo».* El resumen existia y se borro solo: al
     terminar, `notifyEngineChanged()` hace releer el motor, `engine` pasa a null e `integration`
     a false, y el ejecutor entra en la rama «Todo al dia» (`OpenSpecUpdateRunner.tsx:78-90`), que
     tapa el progreso y el banner «Listo». Que hacer: esa rama solo antes de la primera corrida
     (`!hasRun`). Y un toast al terminar bien, por el mismo canal que usan las operaciones de Git
     (`useGitStore.getState().setSuccess(...)`, `lib/git-store.ts:142`, lo muestra `PageToasts`).
  4. *«Al darle otra vez, error rojo raro: global-config-changed».* Es la salvaguarda de
     integridad del plan (`openspec-preview.ts:171`, `validatePlanIntegrity`): el plan se pide una
     sola vez al abrir la revision (`OpenSpecDashboard.tsx:422-433`, dependencias `[reviewOpen,
     repoPath]`); tras cambiar el motor, la huella de la configuracion global ya no coincide y el
     proceso principal se niega, con razon, a ejecutar un plan viejo. Que hacer: el plan se vuelve
     a pedir tambien cuando cambia `engineChangeToken`; el ejecutor no pasa plan a la integracion
     si en la misma corrida acaba de cambiar el motor (el proceso principal lo calcula al momento);
     y si igual llega un codigo de integridad, se muestra en criollo («el plan quedo viejo, volve
     a pulsar Actualizar»), nunca el codigo pelado.
  Ademas, sigue faltando (c): el changelog oficial.
  (e) **Segunda prueba en vivo, 2026-09-16, con (d) aplicada: «sigue sin andar» y «la maqueta
  queda angosta y al actualizar se estira».** Causa de fondo del fallo, medida: la huella de la
  configuracion global del plan se calcula sobre el objeto entero
  (`electron/pipeline/openspec-preview.ts:84`, `computeFingerprint(engineStatus.globalConfig)`) y
  ese objeto lleva `readAt = new Date().toISOString()` (`openspec-global-config.ts:150`), asi
  que dos lecturas nunca coinciden y **todo plan falla `validatePlanIntegrity`** con
  `global-config-changed` (ayer asomo el codigo; hoy lo tapo el mensaje en criollo). La prueba
  existente (`electron/__tests__/pipeline-openspec-preview.test.ts:73`) compara un plan consigo
  mismo y no lo detecta. Que hacer: la huella se calcula sobre los campos con significado
  (rawProfile, delivery, configuredWorkflows, resolvedWorkflows y sus estados), nunca sobre
  marcas de tiempo, con una prueba que genere dos previews de dos lecturas distintas en el tiempo
  y exija que el plan valide; el ejecutor de pasos no envia plan a `runUpdate` (el proceso
  principal lo calcula al momento; el plan es diagnostico); y el mensaje en criollo conserva el
  codigo entre parentesis, porque taparlo costo una vuelta. Maqueta: `.reviewView` tiene
  `flex: 0 0 auto` (`OpenSpecDashboard.module.css:2358`): ni llena el centro ni cede ante un
  texto largo; pasa a `flex: 1 1 auto; min-width: 0` como `.startScreen`. «Cerrar» quedo debajo
  del titulo porque `.reviewHead` no es fila; el boton va dentro de `.reviewHeadTopRow` (`:2370`),
  que si lo es. *(d) y (e) hechas y auditadas el 2026-09-16, confirmadas en e887d65; probadas en
  vivo por Alejandro: la integracion de gitCronos paso a «Al dia» con el boton. Suite 2049.*

- [ ] 8.23 **Decision de Alejandro, 2026-09-16: la configuracion de OpenSpec es una vista del
  centro, y esta en el riel.** Textual: «Lo que te recuadre en rojo [la lista de agentes del panel
  derecho], que pase al cuerpo de actualizacion, pero en realidad va a pasar a ser configuracion
  de OpenSpec: todo lo que te muestro en captura [tarjeta del motor, perfil y workflows, outputs,
  doctor, contexto, agentes] que pase al cuerpo; se van a ver todas las features de OpenSpec, entre
  ellas la actualizacion. Esta nueva feature de ver y configurar SDD tiene que aparecer en el
  sidebar flotante tambien: el sidebar se va haciendo contextual.» Medido:
  - Hoy en el panel derecho, seccion «Herramientas» (`OpenSpecInspector.tsx:352-395`):
    `OpenSpecEngineCard` (estado, «Ver diagnostico avanzado» con ruta, perfil y workflows con
    switches y candado, aviso de divergencia, outputs, doctor, contexto) y `OpenSpecToolList`
    (agentes configurados e `init`; `OpenSpecReadiness.tsx:50`). En el centro, la revision
    (`OpenSpecUpdateReview.tsx`) ya tiene el bloque de actualizacion, «Desde la terminal» y
    «Detalle tecnico» (que repite la tarjeta de diagnostico, la matriz, la guia, la convivencia y
    los outputs). Es decir: la misma informacion vive dos veces, una angosta y otra plegada.
  - El riel (`ViewSwitcherRail.tsx`) tiene cinco ranuras de vistas (`VIEW_SWITCHER_SLOTS`, `:5`) y
    un bloque «Acciones» (`environmentSlot`) que hoy solo llevan las vistas de change
    (`OpenSpecDashboard.tsx:1817`, `:2232`, `:2702`).
  Que hacer, en tandas:
  (a) **La vista «Configuracion de OpenSpec».** La revision se convierte en esa vista: mismo
  estado del store (`reviewOpen`), titulo nuevo, y secciones en este orden: 1. Actualizacion (lo
  que ya esta: dos hechos, «Actualizar», «Desde la terminal»); 2. Motor y agentes (la tarjeta del
  motor completa, `compact={false}`, mas la lista de agentes con `init`, ambas movidas del panel);
  3. «Detalle tecnico» plegado (lo que ya esta, sin repetir la tarjeta que ahora esta en 2). El
  panel derecho conserva la seccion «Herramientas» con una sola linea de estado («Motor v1.13.0 ·
  integracion al dia · 4 agentes», con su icono de atencion) y un boton «Abrir configuracion de
  OpenSpec» que abre la vista; nada mas. La pildora del encabezado sigue abriendo la vista. En el
  riel, un bloque «OpenSpec» siempre presente (por `environmentSlot`, en todos los contextos: inicio,
  change, especificacion, archivo y la propia vista) con la entrada «Configuracion»; en el contexto
  de change se suma a las acciones que ya hay.
  (b) **Reflujo de la tarjeta para el centro.** La tarjeta esta maquetada para 340 px (columna
  unica); en el centro va en rejilla de dos columnas (estado y perfil a la izquierda, outputs y
  diagnostico a la derecha) sin cambiar su contenido ni sus pruebas de conducta.
  (c) **Que trae la version nueva** (= 6.10 b) dentro de la seccion 1, y **7.4** (causa por
  workflow y por agente) dentro de la seccion 2, ya sobre la vista nueva.
  Deprecacion con causa: 9.1 y 9.5 pedian «acciones al frente en la tarjeta del panel»; desde la
  8.22 las acciones viven en el centro y la tarjeta solo informa. Queda registrado aqui.
  *Decision de Alejandro, 2026-09-16:* el bloque «OpenSpec → Configuracion» del riel va **siempre**,
  en todos los contextos. *(a1) hecha el 2026-09-17 y auditada:* vista con las tres secciones, hook
  `useOpenSpecInit` compartido, «Detalle tecnico» sin la tarjeta repetida. Suite 2056.
  *(a2) hecha el 2026-09-17 y auditada:* el panel derecho quedo con una linea de estado
  («Motor vX · Integracion: … · N agentes») y «Abrir configuracion de OpenSpec»; el riel muestra
  «OpenSpec → Configuracion» en los cinco contextos; la prueba «del arbol real» de la instalacion
  (9.3) se convirtio al arbol nuevo (renderiza el Dashboard con la vista abierta). Suite 2058.
  Faltan (b) reflujo de la tarjeta a dos columnas y (c).
  *Decision de Alejandro, 2026-09-17:* de acuerdo con el orden (c) → (b) → 7.4 → 8.20 → 3c →
  decisiones 8.9/8.10 → grupo 10, y delega las decisiones de diseno al auditor con el criterio
  ya fijado: escalable y mantenible, sin hacer y deshacer.
  *Diseno de (c), medido:* el canal `pipeline:openspec:version-analysis` ya devuelve
  `measured.changelog` ({ source, sourceUrl, fetched, rawText }), `consumedSurfaces`,
  `breakingChangesDetected` y `redaction` ({ provider, status, text }); le falta el puente al
  renderer (`electron/preload.ts:482-484`, `types/electron.d.ts:666`). El bloque «Que trae la
  vX» es un componente propio (`OpenSpecReleaseNotes`) alimentado por un hook
  (`useOpenSpecVersionAnalysis`) y un resumidor puro del markdown de GitHub Releases
  (`lib/release-notes-summary.ts`: titulo, primer parrafo, hasta cuatro vinetas sin marcas), asi
  la vista no crece y el resumen se prueba solo. Nunca bloquea el boton «Actualizar».
  *(c1) hecha el 2026-09-17 y auditada:* tipos del analisis mudados a `types/pipeline`, puente
  `versionAnalysis` en preload y d.ts, resumidor + hook + componente con 15 pruebas propias.
  Suite 2073 en 200 archivos. *(c2) hecha el 2026-09-17 y auditada:* montado en Actualizacion solo
  con version nueva; tres pruebas de integracion (con notas reales, sin upgrade no se pide, y el
  boton no se bloquea mientras carga); fixture del resumidor con el texto real. Suite 2076. Con
  esto 6.10 (b) queda cumplida. Caso vivo: aparece cuando npm tenga algo mas nuevo que lo
  instalado (o bajando el motor a 1.12.0 a proposito).
  *Diseno de (b), medido:* la tarjeta se maqueta sola por el ancho de su contenedor (el modulo ya
  usa `container-type: inline-size` y `@container`), sin prop de layout ni duplicar markup: el
  area avanzada pasa a dos columnas por container query (izquierda: ejes y perfil de workflows;
  derecha: divergencia, outputs, doctor y contexto) envolviendo los bloques en dos columnas del
  DOM; en 340 px sigue en una. En el centro el area avanzada arranca abierta (prop
  `defaultAdvancedOpen`), porque ahi es la configuracion, no un detalle.
  *(b) hecha el 2026-09-17 y auditada:* dos columnas por container query (≥ 640 px) con dos
  envoltorios en el DOM, `container-type` en la tarjeta, abierta de entrada en el centro. Suite
  2078. Pendiente de que Alejandro la vea en pantalla.
  *Modo de trabajo desde el 2026-09-17 (pedido de Alejandro por falta de ventana):* los prompts de
  7.4 y 8.20 se entregan juntos y se ejecutan en serie; la auditoria se hace sobre el arbol final
  con la suite completa.
  - **Si, son grandes, y esta medido.** `.primaryAction, .secondaryAction`
    (`OpenSpecDashboard.module.css:442-458`) miden `min-height: 2.65rem` (42 px) con relleno
    `--space-3 --space-4` y peso 700; `.headerActions .primaryAction` (`:278`) 2.5rem;
    `.reviewPrimaryActionBtn` (`:2637-2642`) relleno `--sp-1 --sp-4` y peso 650. La referencia de
    la app es el boton «Preparar commit» del encabezado (`OpenSpecDashboard.tsx:2142`): `h-7`
    (1.75rem = 28 px), relleno 10 px, peso 600, `rounded-md`; y los botones de icono del mismo
    modulo, `.iconBtn` (`:3294`), tambien 1.75rem. Los 42 px vienen del token `--control-min:
    2.75rem` (`:66-69`), pensado para las filas de tareas por WCAG 2.2, que pide 24 px de objetivo:
    28 px lo cumple. Que hacer: las tres reglas de botones de accion pasan a `min-height: 1.75rem`,
    relleno `var(--space-1) var(--space-3)`, peso 600 y `border-radius: var(--radius-md)`; el
    relleno del boton primario lleno se conserva en color. `--control-min` y las filas
    (`.taskStatus`, `.artifactRow`, `.groupToggle`, `.tabsRow`) no se tocan: son controles de fila,
    no botones.

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

- [x] 9c.8 **Auditoria del 2026-09-07: la intermitencia bajo pero no se fue.**
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
