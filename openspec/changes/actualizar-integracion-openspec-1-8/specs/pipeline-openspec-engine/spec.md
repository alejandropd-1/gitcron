## ADDED Requirements

### Requirement: GitCron detecta versión, procedencia y ruta efectiva del motor de OpenSpec
GitCron SHALL detectar la versión del CLI de OpenSpec que ejecuta (vía `openspec --version`) y su
procedencia —`global`, `local`, `managed` o `unknown`— y SHALL exponer al renderer un `displayPath`
canónico, informativo y de **sólo lectura** con la ruta efectiva. El renderer SHALL NOT poder enviar ese
`displayPath` de vuelta como ejecutable ni elegir una ruta arbitraria: toda ejecución SHALL usar el
runtime resuelto y autorizado por el proceso principal, con argumentos literales o validados.

El fundamento es que hoy GitCron ejecuta `openspec` sin saber qué versión ni de dónde sale
(`electron/pipeline/openspec-cli.ts:24-26` resuelve por nombre pelado). Mostrar la ruta es útil para
diagnosticar, pero devolverla como input reintroduciría el riesgo de shell/traversal que el
confinamiento de paths del repo ya blinda: el dato es para mostrar, no para ejecutar.

#### Scenario: CLI global detectado
- **WHEN** el CLI resuelto proviene del `PATH` global
- **THEN** la procedencia se declara `global` y el `displayPath` muestra la ruta efectiva, en sólo lectura

#### Scenario: displayPath informativo no ejecutable
- **WHEN** el renderer recibe el `displayPath`
- **THEN** no existe camino de IPC que lo acepte como ejecutable ni como ruta de operación

#### Scenario: CLI administrado por GitCron
- **WHEN** GitCron ejecuta un runtime que él mismo administra
- **THEN** la procedencia se declara `managed` con su versión y ruta interna

#### Scenario: CLI ausente
- **WHEN** no se encuentra ningún `openspec` ejecutable
- **THEN** la versión se declara desconocida y la procedencia `unknown`, sin trazar como error de Pipeline

### Requirement: GitCron declara un rango de versiones soportadas de OpenSpec
GitCron SHALL declarar un rango de versiones soportadas y SHALL clasificar la versión detectada como
`supported`, `too-old` o `too-new`. El rango SHALL viajar con el estado del motor.

El fundamento es que el JSON del CLI cambia entre minors —`status` ganó `requires` en 1.7,
`isPlanningComplete` en 1.8—, así que «ejecuta» no implica «soporta»: sin un rango declarado la
aplicación no distingue un CLI garantizado de uno experimental.

#### Scenario: Versión dentro del rango
- **WHEN** la versión detectada cae dentro del rango
- **THEN** el estado la declara `supported`

#### Scenario: CLI más viejo que el soportado
- **WHEN** la versión está por debajo del mínimo
- **THEN** el estado la declara `too-old` con el mínimo requerido

#### Scenario: CLI más nuevo que el soportado
- **WHEN** la versión está por encima del máximo
- **THEN** el estado la declara `too-new` sin bloquear el uso, declarando que no está garantizado

### Requirement: La consulta de versión disponible tiene timeout, caché y degradación offline
GitCron SHALL consultar la última versión estable de `@fission-ai/openspec` desde el proceso principal,
contra una fuente fija y controlada, con timeout, y SHALL guardarla en caché con su fecha. Sin conexión
SHALL usar la caché declarando que es en caché, SHALL permitir reintento manual, y SHALL NOT afirmar que
hay actualización sin evidencia de la versión remota. La indisponibilidad SHALL NOT bloquear Pipeline.

El fundamento es que declarar «desactualizado» sin haber consultado miente sobre el estado, y que una
consulta colgada o sin red no puede congelar la pantalla: es el mismo criterio por el que un valor
desconocido no se muestra como cero.

#### Scenario: Consulta exitosa
- **WHEN** la fuente responde dentro del timeout
- **THEN** se obtiene la última estable, se cachea con fecha y se declara fresca

#### Scenario: Sin conexión
- **WHEN** la fuente no responde o no hay red
- **THEN** se usa la caché declarando su fecha, o se declara «sin conexión» sin bloquear Pipeline

#### Scenario: Sin evidencia no se afirma desactualizado
- **WHEN** no se obtuvo la versión remota ni hay caché utilizable
- **THEN** la comparación se declara desconocida, no «actualización disponible»

#### Scenario: Fuente controlada
- **WHEN** se consulta
- **THEN** la fuente es fija (npm registry, `@fission-ai/openspec`) y el renderer no impone un registry

### Requirement: La configuración global se lee de forma minimizada y separada de la integración instalada
GitCron SHALL leer, desde el proceso principal y con el runtime autorizado, una **configuración global
efectiva** compuesta sólo por `rawProfile`, `delivery`, `configuredWorkflows` y el origen/timestamp de
lectura, con timeout y límite de salida. SHALL tolerar la salida real de OpenSpec 1.5 y 1.8, SHALL
degradar a `unknown` si no puede interpretarla, y SHALL mantener esta evidencia separada de los
`installedWorkflows` del repositorio. SHALL NOT transportar, loguear ni persistir `anonymousId`,
telemetría u otros campos ajenos, y SHALL NOT leer ni exponer el archivo global completo al renderer.

El fundamento es que la configuración global contiene datos que no le incumben a la integración del
repo (identificadores anónimos, telemetría) y que exponer el archivo entero multiplicaría la superficie
de datos sensibles transportados al renderer. Leer sólo lo que la tarjeta necesita, y separarlo de la
integración instalada, es lo que permite mostrar la divergencia sin mezclar fuentes.

#### Scenario: Campos mínimos leídos
- **WHEN** se lee la configuración global
- **THEN** se obtienen `rawProfile`, `delivery`, `configuredWorkflows` y origen/timestamp, y nada más

#### Scenario: Sin datos sensibles
- **WHEN** la configuración global contiene `anonymousId` o telemetría
- **THEN** esos campos no se transportan, loguean ni persisten

#### Scenario: Salida no interpretable
- **WHEN** la salida de 1.5 o 1.8 no puede parsearse
- **THEN** se declara `unknown`, sin romper la tarjeta

#### Scenario: Separada de la integración instalada
- **WHEN** se transporta la evidencia
- **THEN** la configuración global y los `installedWorkflows` del repo viajan como fuentes independientes

### Requirement: La configuración global y la integración instalada son dos fuentes independientes
GitCron SHALL transportar dos fuentes de evidencia separadas: la **configuración global efectiva** y el
**estado instalado en el repositorio** (tools/targets detectados, `installedWorkflows` por target,
`generatedBy`/version/markers, y archivos faltantes, legacy, personalizados o en conflicto). La tarjeta
SHALL poder declarar la divergencia entre ambas fuentes, y un cambio en cualquiera de las dos SHALL
invalidar la vista previa.

El fundamento es que la configuración global y lo instalado en el repo pueden desincronizarse por
caminos que nada anuncia: una selección de workflows que se instaló y después cambió globalmente, o un
repo generado por una versión anterior. Colapsarlas en una sola evidencia esconde justamente el caso en
que la integración ya no refleja la configuración.

#### Scenario: Divergencia global ↔ repo
- **WHEN** la configuración global declara workflows que el repo no tiene instalados (o viceversa)
- **THEN** la tarjeta declara la divergencia entre ambas fuentes

#### Scenario: Repo generado por una versión anterior
- **WHEN** los skills del repo declaran un `generatedBy` menor que el del CLI
- **THEN** la integración instalada se declara desactualizada respecto del motor

#### Scenario: Configuración global sin llamarla del repositorio
- **WHEN** se muestra la configuración global
- **THEN** se la rotula como configuración global efectiva, no como perfil del repositorio

### Requirement: La tarjeta de estado representa motor, repositorio e integración como evidencias independientes
GitCron SHALL computar y mostrar tres ejes independientes: el **motor** (ausente/global/local/
administrado/desconocido y versión soportada/demasiado vieja/más nueva que el rango), el **repositorio**
(no inicializado/inicializado/desconocido) y la **integración** (al día/desactualizada/requiere
regeneración/herramientas incompletas/personalizada o con conflictos/actualización parcial). La tarjeta
SHALL estar siempre visible, también cuando no hay CLI, cuando el repositorio no tiene `openspec/`,
cuando hay CLI pero falta la integración, sin conexión o todo al día. Podrá existir un estado resumido,
pero SHALL NOT colapsar las evidencias independientes en un único booleano.

El fundamento es que cada eje pide una acción distinta y sus causas no se solapan: un motor ausente no
se resuelve igual que un repo sin inicializar, y una integración con skills personalizados en conflicto
no se lee igual que una desactualizada. Colapsarlos en «ok/no-ok» obliga a adivinar, y hacer desaparecer
la tarjeta cuando todo está bien esconde justamente el dato que confirma que no hay nada que hacer.
`openspec doctor` puede aportar al diagnóstico pero SHALL NOT ser la única prueba de que skills e
instrucciones están actualizados.

#### Scenario: Sin motor y sin openspec/
- **WHEN** no hay CLI y el repo no tiene `openspec/`
- **THEN** la tarjeta muestra ambos ejes en su estado, sin colapsarlos

#### Scenario: Motor global sin integración
- **WHEN** hay CLI global pero el repo no está inicializado
- **THEN** la tarjeta declara motor presente e integración ausente, por separado

#### Scenario: Todo al día
- **WHEN** motor, repositorio e integración están consistentes
- **THEN** la tarjeta sigue visible declarando cada eje, no desaparece

### Requirement: El perfil y los workflows se modelan sobre los conjuntos oficiales 1.8 sin enum cerrado
GitCron SHALL transportar el `rawProfile` informado por OpenSpec (cuyos valores persistidos oficialmente
son `core` o `custom`), la lista de workflows y una **clasificación derivada** calculada por GitCron
sobre una fuente declarada (global o repo). Los conjuntos oficiales 1.8 son: **core** = `propose`,
`explore`, `apply`, `update`, `sync`, `archive`; **ampliado** = los seis anteriores más `new`,
`continue`, `ff`, `verify`, `bulk-archive`, `onboard` (doce en total). `expanded` SHALL ser una
clasificación derivada por GitCron cuando están presentes los doce workflows del conjunto ampliado, y
SHALL NOT presentarse como un tercer valor persistido por OpenSpec. Cualquier otra combinación SHALL
clasificarse `custom`, y cuando no pueda leerse, `unknown`. La **configuración global efectiva
observada** en este host SHALL declararse `custom` con cinco workflows (`propose`, `explore`, `apply`,
`sync`, `archive`); la **integración instalada legacy** en el repo SHALL declararse con cinco workflows
por target (`propose`, `explore`, `apply`, `sync`, `archive`) sobre skills en `.codex`/`.agent`, y
`.agents/skills` SHALL declararse con skills personalizados, no OpenSpec.

El fundamento es que `expanded` no existe como valor persistido: deriva de los workflows instalados, y
calcularlo sin decir sobre qué fuente lo hizo leería «expanded» sobre una configuración global cuando el
repo no tiene esos workflows.

#### Scenario: Perfil crudo transportado
- **WHEN** OpenSpec informa un `rawProfile`
- **THEN** se transporta su valor crudo (`core`/`custom`) junto a los workflows y a la clasificación derivada

#### Scenario: Perfil expandido derivado
- **WHEN** están presentes los doce workflows del conjunto ampliado
- **THEN** la clasificación derivada es `expanded`, sin que el CLI lo persista

#### Scenario: Configuración global observada
- **WHEN** se lee la configuración global efectiva de este host
- **THEN** se declara `custom` con cinco workflows, no `expanded`

#### Scenario: Perfil desconocido
- **WHEN** no puede leerse la fuente
- **THEN** la clasificación es `unknown`, sin romper la tarjeta

### Requirement: Pipeline soporta schemas dinámicos y un grafo de artefactos real
Pipeline SHALL transportar el `schemaName` de cada change y la lista dinámica de artefactos con su
estado, SHALL leer `requires` por artefacto y `applyRequires` devuelto por el CLI, y SHALL representar
las dependencias según el grafo real. SHALL NOT asumir que siempre existen `proposal`/`design`/`specs`/
`tasks` ni que `tasks` es el único gate de apply. Ante un schema o artefacto desconocido SHALL degradar
con un valor declarado en vez de romper. La etiqueta «Spec-Driven» hoy hardcodeada SHALL tratarse como
deuda de presentación, no como fuente del schema real.

El fundamento es que OpenSpec no garantiza un único schema: hoy sólo existe `spec-driven`, pero la
interfaz no puede asumirlo, y un custom schema con artefactos distintos dejaría de dibujarse. La noción
de «completado» además cambió: 1.8 introdujo `isPlanningComplete` (con `isComplete` como alias de
compatibilidad) y `requires` por artefacto, así que derivar el grafo de un modelo propio fijo vuelve a
mentir sobre el estado real.

#### Scenario: Schema de cada change
- **WHEN** se lista o abre un change
- **THEN** se transporta y muestra su `schemaName`, no uno asumido

#### Scenario: Grafo con requires
- **WHEN** el CLI devuelve `requires` por artefacto
- **THEN** Pipeline representa las dependencias según ese grafo

#### Scenario: Artefacto skipped
- **WHEN** un artefacto o etapa figura como `skipped`
- **THEN** se refleja como satisfecho sin escribir, sin marcarlo pendiente o fallido

#### Scenario: Schema o artefacto desconocido
- **WHEN** aparece un schema o artefacto que Pipeline no conoce
- **THEN** no se rompe y degrada con un valor declarado

### Requirement: El parsing soporta OpenSpec 1.8 y degrada ante campos desconocidos
GitCron SHALL adaptar el parsing del JSON de OpenSpec a 1.8 —`isPlanningComplete` (con `isComplete` como
alias de compatibilidad), metadata `skip_specs`, estados `skipped`, target `agents`, skills neutrales
bajo `.agents/skills` y `retire_capabilities`— manteniendo compatibilidad con 1.5. Ante un campo
desconocido SHALL degradar con un valor declarado en vez de romper la pantalla.

El fundamento es que OpenSpec evoluciona entre minors y GitCron consume su JSON; congelar el parsing en
1.5 haría que la actualización a 1.8 rompiera Pipeline. No reemplazar ciegamente `isComplete` por
`isPlanningComplete`: el parsing es compatible con ambas generaciones.

#### Scenario: Status de 1.8
- **WHEN** el CLI devuelve `isPlanningComplete`
- **THEN** Pipeline lo usa como estado de planificación y conserva compatibilidad con `isComplete`

#### Scenario: Metadata skip_specs
- **WHEN** un cambio declara `skip_specs`
- **THEN** Pipeline lo refleja sin marcar la etapa de specs como pendiente o fallida

#### Scenario: Campo desconocido
- **WHEN** el JSON trae un campo que GitCron no conoce
- **THEN** Pipeline no se rompe y degrada con un valor declarado

### Requirement: Los validadores de change-id siguen la gramática de OpenSpec 1.8
GitCron SHALL alinear todos sus validadores de change-id con la gramática real de OpenSpec 1.8: inicial
de letra o número; sólo minúsculas, números y guiones; sin guiones consecutivos ni finales; sin
espacios, mayúsculas, underscores, separadores ni `..`; respetando el límite máximo admitido por
OpenSpec; manteniendo la seguridad frente al shell y al traversal de paths. La alineación SHALL basarse
en verificar qué acepta hoy cada validador, no en aflojar uno sin inspeccionar el resto.

El fundamento es que hoy coexisten dos validadores que no coinciden con 1.8: `CHANGE_ID_PATTERN`
(`openspec-cli.ts:29`) acepta guiones consecutivos y finales, y `CHANGE_SLUG_PATTERN`
(`pipeline-next-action.ts:24`) exige letra inicial y por tanto rechaza los slugs numéricos válidos en
1.8.

#### Scenario: Slug con prefijo numérico
- **WHEN** se valida un slug con prefijo numérico válido en 1.8
- **THEN** se acepta en todos los validadores

#### Scenario: Guiones consecutivos o finales
- **WHEN** un slug tiene guiones consecutivos o un guion final
- **THEN** se rechaza, con el motivo declarado

#### Scenario: Límite y caracteres no admitidos
- **WHEN** un slug excede el límite o usa mayúsculas/underscores/`..`
- **THEN** se rechaza sin degradar la seguridad frente al shell y al traversal

### Requirement: Los outputs administrables se clasifican y los externos al repo se bloquean
GitCron SHALL clasificar cada output administrable por un `init`/`update` como `repo-local` o
`external-global` (p. ej. `minimax-code` escribe en `~/.minimax/skills/openspec-*`), SHALL incluir esa
clasificación en la vista previa y en la invalidación, y SHALL mostrar el target y el path externo sólo
como diagnóstico. En este change, cualquier operación que escribiría fuera del repositorio SHALL
bloquearse; el renderer SHALL NOT autorizar ni suministrar paths arbitrarios. Soportar mutaciones
globales SHALL requerir otro change, con consentimiento, backup y rollback propios. `.github` SHALL
tratarse como `repo-local` aunque tenga efectos posteriores en CI. Git, la rama y el working tree SHALL
NOT presentarse como protección de outputs globales, porque no los tocan.

El fundamento es que un target como `minimax-code` escribe fuera del repo, donde ni Git ni el working
tree alcanzan: ejecutarlo dentro de una operación pensada como repo-local mutaría el entorno global del
usuario sin la rama ni el rollback que sí protegen al repo. Clasificar y bloquear impide que esa
diferencia pase inadvertida; dejarla para otro change evita ampliar el alcance sin un contrato de
backup/rollback propio para lo global.

#### Scenario: Output externo detectado y bloqueado
- **WHEN** la operación intentaría escribir en un path `external-global` (p. ej. `minimax-code`)
- **THEN** se bloquea en este change y se muestra el target y el path sólo como diagnóstico

#### Scenario: Clasificación en preview e invalidación
- **WHEN** se construye la vista previa o el hash del plan
- **THEN** cada output lleva su clase `repo-local`/`external-global`, y un cambio de clase invalida el plan

#### Scenario: .github es repo-local
- **WHEN** la operación escribiría bajo `.github`
- **THEN** se trata como `repo-local` aunque sus efectos posteriores sean de CI

#### Scenario: Sin autorizar paths arbitrarios
- **WHEN** el renderer intenta suministrar un path externo
- **THEN** no se acepta como destino de operación

### Requirement: La vista previa distingue diagnóstico, preview parcial y preview exacta
GitCron SHALL producir tres niveles de vista previa. El **diagnóstico** del CLI actual y el inventario
de inputs/outputs administrables (con su clase `repo-local`/`external-global`) SHALL poder obtenerse
antes de la POC. La vista previa del resultado de la versión destino SHALL declararse `exacta` sólo
cuando se ejecuta con el **runtime destino exacto** —lo que requiere la POC aprobada y el runtime
preparado en staging—, y `parcial` o `no disponible` mientras la versión destino no pueda ejecutarse.
La vista previa y la ejecución real SHALL usar el mismo paquete, integridad, runtime, configuración,
tools y argumentos. SHALL NOT afirmarse que la vista previa destino «funciona con global/local» cuando
esos runtimes no coinciden con la versión destino.

El fundamento es que un preview «exacto» ejecutando una versión distinta de la destino miente sobre lo
que va a ocurrir: los archivos que `openspec update` genera cambian entre versiones, así que predecir
con 1.5 lo que hará 1.8 produce un alcance falso. Declarar el nivel de preview —y exigir el runtime
destino para el exacto— es lo que evita confirmar contra una predicción que no es la real.

#### Scenario: Diagnóstico antes de la POC
- **WHEN** todavía no hay runtime destino preparado
- **THEN** se puede ofrecer el diagnóstico del CLI actual y el inventario de inputs/outputs clasificados

#### Scenario: Preview parcial o no disponible
- **WHEN** la versión destino no puede ejecutarse todavía
- **THEN** la vista previa se declara `parcial` o `no disponible`, no `exacta`

#### Scenario: Preview exacta con el runtime destino
- **WHEN** la POC aprobó y el runtime destino está en staging
- **THEN** la vista previa se declara `exacta` y usa el mismo paquete/integridad/runtime/config/tools/args que la ejecución real

### Requirement: La copia de la vista previa es exhaustiva y declara su grado de certeza
Cuando la vista previa se ejecuta, SHALL hacerlo fuera del repositorio real, sobre una copia de todos
los inputs y outputs administrables —`openspec/`, `.agent`, `.agents`, `.claude`, `.codex`, `.opencode`,
las demás tools configuradas, los archivos raíz administrados por OpenSpec, `.github` cuando la
configuración lo habilite, las preferencias de profile/delivery/workflows y los archivos personalizados
que puedan entrar en conflicto— sin mutar la configuración global relevante. La copia SHALL preservar
tipo, contenido, permisos, symlinks (sin seguirlos fuera del ámbito), ausencia de archivos, nombres y
casing. La vista previa SHALL clasificar los archivos en creados, modificados, retirados y conflictivos,
y SHALL declarar si es `exacta`, `parcial` o `no disponible`, diciendo qué no pudo reproducir y por qué;
SHALL NOT usar «mejor esfuerzo» como excusa genérica.

El fundamento es que copiar sólo `openspec/` y algunos directorios deja fuera la mitad del alcance real
de `openspec update`. Declarar el grado de certeza permite decidir si confirmar con el dato honesto.

#### Scenario: Cobertura de todos los paths administrables
- **WHEN** se pide la vista previa
- **THEN** se copian y comparan todos los inputs/outputs administrables, no sólo `openspec/`

#### Scenario: Symlinks y permisos preservados
- **WHEN** la copia incluye symlinks o permisos relevantes
- **THEN** se preservan sin seguir los symlinks fuera del ámbito

#### Scenario: Grado de certeza declarado
- **WHEN** la vista previa no pudo reproducir algo
- **THEN** se declara `parcial` o `no disponible`, con qué faltó y por qué, no «mejor esfuerzo»

#### Scenario: Configuración global intacta
- **WHEN** se ejecuta la vista previa
- **THEN** la configuración global relevante se consulta pero no se muta

### Requirement: El plan invalida ante cualquier cambio relevante entre vista previa y ejecución
El plan SHALL transportar y, al ejecutar, recomprobar al menos: la ruta canónica del repo, la rama, el
HEAD, el estado del working tree, la ruta/procedencia/versión efectiva del CLI, la versión objetivo, la
integridad del paquete objetivo, la **configuración global** (`rawProfile`/`delivery`/`configuredWorkflows`
con su fecha/origen) y la **integración instalada** (tools/`installedWorkflows`/`generatedBy`/markers), la
**clase `repo-local`/`external-global`** de cada output, el schema/config relevante, la lista completa de
paths inspeccionados con su tipo y hash de contenido, los symlinks y los archivos ausentes relevantes.
Si cualquiera cambió desde la vista previa, el plan SHALL invalidarse y SHALL exigir otra revisión.

El fundamento es que un hash limitado a `generatedBy` y algunos archivos deja pasar cambios que alteran
el resultado real y permite ejecutar contra un estado que la persona ya no vio.

#### Scenario: Cambio de rama o HEAD
- **WHEN** la rama o el HEAD variaron desde la vista previa
- **THEN** el plan se invalida

#### Scenario: Cambio de CLI o de paquete objetivo
- **WHEN** la versión/procedencia del CLI o la integridad del paquete objetivo variaron
- **THEN** el plan se invalida

#### Scenario: Cambio de fuentes o de clase de output
- **WHEN** la configuración global, la integración instalada o la clase de un output variaron
- **THEN** el plan se invalida

### Requirement: El runtime administrado es durable, concurrentemente seguro y recuperable
La actualización integral del motor SHALL gestionar el runtime con un protocolo durable cuyas
propiedades son observables: **directorios de versiones inmutables**; un **manifiesto/puntero persistido
bajo `userData`** que registra la versión activa y la anterior recuperable; **escritura temporal y
reemplazo atómico** del puntero; un **health check** antes de activar; un **lock/mutex de proceso** que
impide que un segundo clic, dos ventanas o dos repositorios activen a la vez; **recuperación al iniciar**
si quedó staging o un manifiesto incompleto; SHALL NOT limpiar jamás la versión activa ni la anterior
recuperable; el **rollback** SHALL ser durable y sobrevivir a reinicio/crash; y SHALL validar que la ruta
resuelta continúa confinada a `userData/openspec-runtimes`. La API concreta puede fijarla la POC; estas
propiedades SHALL exigirse desde la planificación.

El fundamento es que un «puntero interno» en memoria se pierde ante un crash o un reinicio justo cuando
el staging quedó a medias, dejando un runtime roto como activo o dos operaciones pisándose. Hacer el
protocolo durable —versiones inmutables, manifiesto persistido, reemplazo atómico, lock y
recuperación— es lo que vuelve real la promesa de atomicidad y rollback.

#### Scenario: Activación atómica durable
- **WHEN** se activa una nueva versión
- **THEN** se escribe en staging y el puntero persistido se reemplaza atómicamente, con la versión anterior recuperable

#### Scenario: Concurrencia impedida
- **WHEN** un segundo clic, una segunda ventana o un segundo repo intentan activar a la vez
- **THEN** el lock de proceso lo impide

#### Scenario: Recuperación al iniciar tras crash
- **WHEN** al arrancar quedó staging o un manifiesto incompleto
- **THEN** se recupera sin dejar un runtime roto como activo

#### Scenario: Rollback durable
- **WHEN** se revierte y la app se reinicia o crashea
- **THEN** el puntero sigue apuntando a la versión restaurada y se reverifica qué versión responde

#### Scenario: Confinamiento del puntero
- **WHEN** se resuelve la ruta activa
- **THEN** permanece bajo `userData/openspec-runtimes`

### Requirement: La operación administrada neutraliza el auto-upgrade lateral de OpenSpec
Dentro de la operación administrada, el preview, `init`/`update` y las validaciones SHALL ejecutarse en
un entorno no interactivo y controlado que impida que OpenSpec consulte el registry o actualice el CLI
por su cuenta. SHALL desactivarse el chequeo interno de versión con `OPENSPEC_NO_UPDATE_CHECK=1` y la
telemetría con `OPENSPEC_TELEMETRY=0` o `DO_NOT_TRACK=1`; el proceso SHALL NOT recibir TTY interactiva
ni poder ejecutar un `npm install -g` inesperado. La consulta de versión disponible SHALL seguir siendo
responsabilidad separada del motor GitCron.

El fundamento es que OpenSpec 1.8 puede, desde el propio `openspec update`, consultar el registry y
ofrecer actualizar el CLI; si eso ocurre dentro de la operación administrada, evade la versión objetivo
confirmada, la integridad verificada, el preview, la activación atómica y el rollback. La versión que se
ejecuta la decide GitCron, no el CLI por su cuenta.

#### Scenario: Chequeo de versión desactivado
- **WHEN** se ejecuta preview, init o update dentro de la operación administrada
- **THEN** el entorno lleva `OPENSPEC_NO_UPDATE_CHECK=1` y la telemetría desactivada

#### Scenario: Sin TTY interactiva ni npm global lateral
- **WHEN** se ejecuta la operación administrada
- **THEN** el proceso no recibe TTY interactiva y no puede disparar un `npm install -g` fuera de control

#### Scenario: Versión objetivo respetada
- **WHEN** la operación administrada ejecuta OpenSpec
- **THEN** lo hace con el runtime objetivo exacto, sin que el CLI lo cambie por su cuenta

### Requirement: Un solo botón orquesta la operación oficial que corresponde, con revisión y confirmación
La interfaz SHALL ofrecer un único botón principal, «Actualizar OpenSpec», cuyo primer clic SHALL abrir
una revisión sin modificar nada y SHALL ejecutar sólo tras confirmación explícita. La operación
confirmada SHALL decidirse según la matriz: repo sin `openspec/` → `openspec init` con tools
allowlisted y confirmadas, perfil `core`/`custom` explícito y flags para evitar prompts implícitos
(nunca `update` como sustituto); repo inicializado → `openspec update` (1.8 no ofrece `--tools` para
`update`, así que SHALL NOT inventarse ese flag); motor ausente o desactualizado → preparar, verificar y
activar primero el runtime administrado objetivo y ejecutar después `init` o `update` con ese runtime
exacto; motor actualizado con integración desactualizada → sólo la regeneración necesaria con el runtime
autorizado; todo al día → no mutar y mostrar ese resultado. La revisión SHALL declarar la operación
oficial real (`init`, `update`, `upgrade+init`, `upgrade+update` o ninguna), los archivos que se
crearán/modificarán/moverán/retirarán, los conflictos con personalizados, las validaciones previstas y
el mecanismo de recuperación. La persona SHALL NOT ejecutar dos actualizaciones separadas, y SHALL NOT
simularse slash commands de chat como comandos terminales.

El fundamento es que ejecutar la operación oficial equivocada (por ejemplo, `update` sobre un repo sin
inicializar, o un `--tools` que 1.8 no acepta) produce un error opaco o un resultado parcial. Declarar la
operación real antes de confirmar es lo que deja decidir con el dato honesto.

#### Scenario: Primer clic abre revisión
- **WHEN** se activa el botón por primera vez
- **THEN** se abre la revisión y no se modifica nada

#### Scenario: Repositorio sin inicializar
- **WHEN** el repo no tiene `openspec/`
- **THEN** la operación declarada es `init` (o `upgrade+init` si además falta el motor), nunca `update`

#### Scenario: Repositorio inicializado
- **WHEN** el repo ya tiene `openspec/`
- **THEN** la operación declarada es `update` (o `upgrade+update`), sin inventar `--tools`

#### Scenario: Todo al día
- **WHEN** motor e integración están consistentes
- **THEN** no se muta y se muestra ese resultado

#### Scenario: Operación oficial declarada, no slash de chat
- **WHEN** se revisa el alcance
- **THEN** se declara `init`/`update`/`upgrade+init`/`upgrade+update`/ninguna, sin simular slash commands

### Requirement: El contrato init es no interactivo y decide sus argumentos
Cuando la operación sea `init`, el plan SHALL decidir y mostrar los argumentos exactos: path canónico
del repo; `--tools <allowlist confirmada>`; `--profile core|custom`; `--no-animation`; y la decisión
explícita `--copilot-cloud` o `--no-copilot-cloud`. `--force` SHALL usarse sólo si el preview mostró
exactamente la limpieza legacy y una persona lo confirmó; SHALL NOT aplicarse de forma automática. El
proceso SHALL correr sin TTY, con el chequeo de versión y la telemetría desactivados.

El fundamento es que `openspec init` es interactivo por defecto y, sin cerrar cada prompt con un flag,
se cuelga esperando una respuesta que en un proceso administrado nunca llega —o peor, toma una decisión
por defecto que la persona no vio. Que `--force` quede detrás de una confirmación humana responde a que
limpia archivos legacy, y borrarlos sin mostrar exactamente cuáles es la clase de acción que este
proyecto exige confirmar.

#### Scenario: Argumentos decididos y mostrados
- **WHEN** la operación es `init`
- **THEN** el plan muestra path, `--tools`, `--profile`, `--no-animation` y `--copilot-cloud`/`--no-copilot-cloud`

#### Scenario: --force sólo con confirmación
- **WHEN** se considera `--force`
- **THEN** se aplica sólo si el preview mostró exactamente la limpieza legacy y una persona la confirmó

#### Scenario: init no interactivo
- **WHEN** se ejecuta `init`
- **THEN** corre sin TTY y con `OPENSPEC_NO_UPDATE_CHECK=1` y telemetría desactivada

### Requirement: La regeneración de la integración preserva personalizaciones y resuelve .codex/.agents
Cuando la operación incluya `update`, SHALL ejecutar con el runtime objetivo el `openspec update`
oficial para las tools configuradas, SHALL comprobar versión, perfil, herramientas, skills, rutas,
validación y diff, y SHALL NOT eliminar archivos personalizados por omisión. SHALL detectar los skills
OpenSpec viejos en `.codex`, los nuevos en `.agents`, distinguirlos de los skills personalizados ya
presentes en `.agents` (que hoy existen en este repositorio), no borrarlos ni sobrescribirlos, declarar
qué archivos OpenSpec se migran/conservan/retiran, detectar colisiones de nombres y usar `generatedBy`
sin que sea la única prueba de integridad.

El fundamento es que 1.8 migra los skills de Codex a `.agents/skills` preservando personalizaciones, y
este repositorio ya tiene skills propios bajo `.agents`: una regeneración que no los distinga los
borraría.

#### Scenario: Skills OpenSpec viejos y nuevos detectados
- **WHEN** se inspecciona la integración
- **THEN** se detectan los skills OpenSpec en `.codex` y los nuevos en `.agents`, distintos de los personalizados

#### Scenario: Personalizados conservados
- **WHEN** `.agents` ya tiene skills no OpenSpec
- **THEN** la regeneración no los borra ni sobrescribe

#### Scenario: Migración declarada
- **WHEN** la versión destino migra skills
- **THEN** se declara qué se migra, conserva y retira, y se detectan colisiones de nombres

### Requirement: Una actualización parcial no se declara como éxito completo
Si la actualización del motor funciona pero la del repositorio falla (o viceversa), el estado SHALL
declararse `update-incomplete`, SHALL conservar evidencia de qué se actualizó y qué no, y SHALL ofrecer
reintento o rollback. El éxito completo SHALL declararse sólo cuando motor e integración quedan
consistentes y la validación pasa.

El fundamento es que declarar éxito cuando la mitad falló deja un repositorio inconsistente que se lee
como actualizado. Es la misma regla que para el archivado: el fin del proceso no es prueba de resultado.

#### Scenario: Motor ok, repo falla
- **WHEN** el motor se actualizó y la regeneración falló
- **THEN** el estado es `update-incomplete`, se conserva evidencia y se ofrece reintento o rollback

#### Scenario: Éxito completo
- **WHEN** motor e integración quedan consistentes y la validación pasa
- **THEN** el estado es `up-to-date` y se declara explícitamente

### Requirement: La actualización es segura respecto de Git y de la política operativa de GitCron
La actualización del repositorio SHALL ejecutarse sobre una rama segura y nunca sobre `main`, SHALL
exigir un working tree compatible, SHALL detectar cambios locales ajenos y SHALL bloquearse o pedir
resolución cuando haya riesgo. SHALL NOT ejecutar `git add`, commit, push, PR, archive, merge ni borrar
ramas. Al finalizar SHALL mostrar el diff y ofrecer el circuito normal de «Preparar commit». Estas
reglas protegen los outputs `repo-local`; SHALL NOT presentarse como protección de outputs
`external-global`, porque Git no los toca.

El fundamento es que la actualización deja archivos en el árbol, y confirmarlos en Git queda en la
persona. Estas reglas son política de GitCron (capa C), no comportamiento nativo de OpenSpec; y su
alcance se limita al repo.

#### Scenario: Intento desde main
- **WHEN** se intenta actualizar estando en `main`
- **THEN** se bloquea o se pide una rama segura, sin ejecutar sobre `main`

#### Scenario: Working tree sucio
- **WHEN** el working tree tiene cambios locales ajenos
- **THEN** se bloquea o se pide resolución antes de ejecutar

#### Scenario: Sin operaciones de Git
- **WHEN** se completa la actualización
- **THEN** no se hizo `add`/commit/push/PR/merge/archive ni se borraron ramas, y se ofrece «Preparar commit»

### Requirement: El progreso y los errores de la actualización son comprensibles y recuperables
Durante la actualización la interfaz SHALL mostrar etapas comprensibles (comprobando versión,
preparando runtime, verificando descarga, calculando cambios, actualizando integración, validando,
completado, requiere atención, revirtiendo). Ante un error SHALL indicar qué etapa falló, qué sí se
actualizó, qué no se modificó, si se restauró la versión anterior y qué acción segura puede tomar la
persona, y SHALL NOT mostrar comandos crudos como única explicación. El botón SHALL NOT modificar tipos
TypeScript ni código de GitCron: la compatibilidad con 1.8 vive en el código de GitCron, no en la
operación del botón.

El fundamento es que una actualización con muchas etapas que falla sin decir dónde deja sin forma de
recuperar más que leyendo un log. Que el botón no toque código de GitCron responde a que esa
compatibilidad se distribuye con la aplicación, no se ejecuta por un usuario en su repo.

#### Scenario: Etapas visibles
- **WHEN** la actualización está en curso
- **THEN** se muestra la etapa actual con su nombre comprensible

#### Scenario: Error con contexto recuperable
- **WHEN** una etapa falla
- **THEN** se indica etapa, qué se actualizó, qué no, si hubo rollback y qué acción segura tomar, sin comandos crudos como única explicación

#### Scenario: El botón no cambia código de GitCron
- **WHEN** se ejecuta la actualización
- **THEN** no se modifican tipos TypeScript ni código de la aplicación; sólo el motor y los archivos administrados del repo
