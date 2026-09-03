# pipeline-openspec-engine Specification

## Purpose
TBD - created by archiving change actualizar-integracion-openspec-1-8. Update Purpose after archive.

## Requirements

### Requirement: GitCron detecta versión, procedencia y ruta efectiva del motor de OpenSpec
GitCron SHALL detectar la versión del CLI de OpenSpec que ejecuta (vía `openspec --version`) y su
procedencia —`local`, `global`, `managed` (declarada no disponible) o `unknown`— y SHALL exponer al
renderer un `displayPath` canónico, informativo y de **sólo lectura** con la ruta efectiva. El renderer
SHALL NOT poder enviar ese `displayPath` de vuelta como ejecutable ni elegir una ruta arbitraria: toda
ejecución SHALL usar el runtime resuelto y autorizado por el proceso principal, con argumentos literales
o validados.

El fundamento es que hoy GitCron ejecuta `openspec` sin saber qué versión ni de dónde sale
(`electron/pipeline/openspec-cli.ts:24-26` resuelve por nombre pelado). Mostrar la ruta es útil para
diagnosticar, pero devolverla como input reintroduciría el riesgo de shell/traversal que el
confinamiento de paths del repo ya blinda: el dato es para mostrar, no para ejecutar.

#### Scenario: CLI local al proyecto detectado
- **WHEN** el CLI resuelto proviene de `node_modules/.bin/openspec` dentro del repositorio
- **THEN** la procedencia se declara `local` con precedencia sobre cualquier instalación global

#### Scenario: CLI global detectado
- **WHEN** no hay CLI local en el repositorio y se resuelve desde el `PATH` del sistema
- **THEN** la procedencia se declara `global` y el `displayPath` muestra la ruta efectiva, en sólo lectura

#### Scenario: Procedencia managed declarada no disponible
- **WHEN** se consulta el estado de procedencia administrada
- **THEN** el contrato tipa `managed` pero se declara como no disponible en esta versión

#### Scenario: CLI ausente
- **WHEN** no se encuentra ningún `openspec` ejecutable
- **THEN** la versión se declara desconocida y la procedencia `unknown`, sin trazar como error de Pipeline

#### Scenario: displayPath informativo no ejecutable
- **WHEN** el renderer recibe el `displayPath`
- **THEN** no existe camino de IPC que lo acepte como ejecutable ni como ruta de operación

### Requirement: GitCron declara un rango de versiones soportadas de OpenSpec
GitCron SHALL declarar un rango de versiones soportadas que abarca desde 1.5.0 hasta 1.9.0 inclusive, y
SHALL clasificar la versión detectada como `supported`, `too-old` o `too-new`. El rango SHALL viajar con
el estado del motor.

El fundamento es que OpenSpec 1.9.0 conserva total retrocompatibilidad con las estructuras y esquemas de
1.8.0 requeridos por GitCron (`spec-driven`, JSON de `status`, comandos de `update` y `validate`), por lo
que ampliar el soporte a 1.9.0 garantiza el funcionamiento con la versión oficial vigente sin riesgos de
incompatibilidad.

#### Scenario: Versión dentro del rango 1.5.0 a 1.9.0
- **WHEN** la versión detectada está entre 1.5.0 y 1.9.0 inclusive
- **THEN** el estado la declara `supported`

#### Scenario: CLI más viejo que el soportado
- **WHEN** la versión es inferior a 1.5.0
- **THEN** el estado la declara `too-old` con el mínimo requerido 1.5.0

#### Scenario: CLI más nuevo que el soportado
- **WHEN** la versión es superior a 1.9.0
- **THEN** el estado la declara `too-new` indicando que supera el rango probado

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
administrado declarado no disponible/desconocido y versión soportada/demasiado vieja/más nueva que el rango),
el **repositorio** (no inicializado/inicializado/desconocido) y la **integración** (al día/desactualizada/requiere
regeneración/herramientas incompletas/personalizada o con conflictos/actualización parcial). La tarjeta
SHALL estar siempre visible, también cuando no hay CLI, cuando el repositorio no tiene `openspec/`,
cuando hay CLI pero falta la integración, sin conexión o todo al día. Podrá existir un estado resumido,
pero SHALL NOT colapsar las evidencias independientes en un único booleano.

El fundamento es que cada eje pide una acción distinta y sus causas no se solapan: un motor ausente no
se resuelve igual que un repo sin inicializar, y una integración con skills personalizados en conflicto
no se lee igual que una desactualizada. Colapsarlos en «ok/no-ok» obliga a adivinar, y hacer desaparecer
la tarjeta cuando todo está bien esconde justamente el dato que confirma que no hay nada que hacer.

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

### Requirement: La vista previa ofrece diagnóstico del CLI e inventario clasificado de inputs y outputs
GitCron SHALL producir una vista previa de diagnóstico del CLI actual e inventario clasificado de
inputs/outputs administrables (`repo-local`/`external-global`). La vista previa destino SHALL declararse
como `parcial` o `no disponible` informando con honestidad el grado de certeza. La vista previa SHALL
analizar la estructura sin ejecutar mutaciones automáticas en el repositorio.

El fundamento es que sin runtime destino autodescargado (tras la decisión de Fase 4), la vista previa no
puede simular una ejecución `exacta` con un binario no presente en disco. Declarar `parcial` o `no disponible`
comunica honestamente qué se puede diagnosticar y qué depende de la ejecución real por el usuario.

#### Scenario: Diagnóstico del CLI e inventario
- **WHEN** se solicita la vista previa
- **THEN** se ofrece el diagnóstico del CLI actual y el inventario de inputs/outputs clasificados

#### Scenario: Preview parcial declarada
- **WHEN** la versión destino no está instalada en el entorno
- **THEN** la vista previa se declara `parcial` o `no disponible`, no `exacta`

### Requirement: La inspección diagnóstica es exhaustiva y declara su grado de certeza
La inspección diagnóstica SHALL cubrir todos los inputs y outputs administrables —`openspec/`, `.agent`,
`.agents`, `.claude`, `.codex`, `.opencode`, las demás tools configuradas, los archivos raíz administrados
por OpenSpec, `.github` cuando la configuración lo habilite, las preferencias de profile/delivery/workflows
y los archivos personalizados que puedan entrar en conflicto— sin mutar la configuración global. SHALL
preservar la distinción de tipo, permisos, symlinks (sin seguirlos fuera del ámbito), ausencia de archivos,
nombres y casing.

El fundamento es que revisar sólo `openspec/` deja fuera los targets de skills y los archivos de configuración
reales. Declarar el grado de certeza permite decidir si ejecutar la actualización con el dato honesto.

#### Scenario: Cobertura de todos los paths administrables
- **WHEN** se realiza la inspección
- **THEN** se comparan todos los inputs/outputs administrables, no sólo `openspec/`

#### Scenario: Symlinks y permisos no seguidos fuera de ámbito
- **WHEN** la inspección encuentra symlinks
- **THEN** se analizan sin seguirlos fuera del ámbito del repositorio

#### Scenario: Configuración global intacta
- **WHEN** se ejecuta la inspección
- **THEN** la configuración global relevante se consulta pero no se muta

### Requirement: El plan invalida ante cualquier cambio relevante en el estado
El plan SHALL transportar y recomprobar: la ruta canónica del repo, la rama, el HEAD, el estado del
working tree, la ruta/procedencia/versión efectiva del CLI, la versión objetivo, la **configuración global**
(`rawProfile`/`delivery`/`configuredWorkflows` con su fecha/origen) y la **integración instalada**
(tools/`installedWorkflows`/`generatedBy`/markers), la **clase `repo-local`/`external-global`** de cada output,
el schema/config relevante, los symlinks y los archivos ausentes relevantes. Si cualquiera cambió, el plan
SHALL invalidarse y exigir una nueva revisión diagnóstica.

El fundamento es que si el usuario o un proceso externo modifica el árbol o la configuración mientras la
tarjeta está abierta, el diagnóstico mostrado dejaría de coincidir con la realidad.

#### Scenario: Cambio de rama o HEAD
- **WHEN** la rama o el HEAD variaron desde la revisión
- **THEN** el plan se invalida

#### Scenario: Cambio de CLI o de configuración
- **WHEN** la versión/procedencia del CLI o la configuración global variaron
- **THEN** el plan se invalida

### Requirement: La resolución del CLI sigue una estrategia de precedencia local sobre global
GitCron SHALL resolver el ejecutable de OpenSpec siguiendo un orden de precedencia determinístico:
1. **Local al proyecto (`local`):** si existe `node_modules/.bin/openspec` (o `.cmd` en Windows) en el
   repositorio, se utiliza con prioridad máxima.
2. **Global del sistema (`global`):** si no hay binario local, se busca `openspec` en el `PATH` del sistema.
3. **Administrado (`managed`):** el contrato conserva tipada la procedencia pero se declara no disponible.
El renderer SHALL NOT elegir ejecutables ni paths libres: toda ejecución o lectura corre a través del
runtime resuelto por el proceso principal.

El fundamento es que en proyectos Node/TypeScript la versión fijada en el lockfile del repositorio es la
fuente de verdad reproducible, evitando divergencias con CLIs globales desactualizados o incompatibles.

#### Scenario: Precedencia local sobre global
- **WHEN** coexisten un `openspec` en `node_modules/.bin` del repo y uno global en el sistema
- **THEN** GitCron selecciona el binario local y declara procedencia `local`

#### Scenario: Fallback a global
- **WHEN** no existe `openspec` en `node_modules/.bin` pero sí en el `PATH`
- **THEN** GitCron selecciona el binario global y declara procedencia `global`

### Requirement: Las consultas diagnósticas neutralizan el auto-upgrade lateral de OpenSpec
Durante las lecturas de versión y diagnóstico del motor, el proceso SHALL ejecutarse en un entorno no
interactivo con `OPENSPEC_NO_UPDATE_CHECK=1` y telemetría desactivada (`OPENSPEC_TELEMETRY=0` o
`DO_NOT_TRACK=1`), sin TTY interactiva. La consulta de versión disponible en el registry SHALL seguir
siendo responsabilidad separada del motor GitCron.

El fundamento es que OpenSpec no debe disparar chequeos de red ocultos ni telemetría no consentida
mientras GitCron lee el estado diagnóstico del CLI.

#### Scenario: Chequeo interno desactivado
- **WHEN** GitCron ejecuta `openspec --version` o inspecciones diagnósticas
- **THEN** el proceso lleva `OPENSPEC_NO_UPDATE_CHECK=1` y telemetría desactivada

### Requirement: La tarjeta ofrece revisión diagnóstica y declara la operación oficial que corresponde
La interfaz SHALL ofrecer un punto de entrada de revisión en la tarjeta de OpenSpec cuyo primer clic SHALL
abrir un modal o panel de diagnóstico sin mutar nada en el repositorio. La revisión SHALL determinar y
declarar la operación oficial según la matriz:
- Repo sin `openspec/` → declara `openspec init` (con tools allowlisted y flags anti-prompt sugeridos).
- Repo inicializado → declara `openspec update`.
- Todo al día → declara no requerir mutaciones.
La revisión SHALL mostrar al usuario el **comando terminal exacto** que puede copiar y ejecutar en su
entorno, detallando los archivos que creará, modificará o retirará. SHALL NOT ejecutar mutaciones automáticas
ni simular slash commands de chat como comandos de terminal.

El fundamento es que al no contar con un gestor de paquetes interno para un runtime administrado, guiar al
usuario con el comando oficial exacto y los argumentos validados le permite ejecutar la actualización
de forma transparente y bajo su propio control.

#### Scenario: Primer clic abre revisión diagnóstica
- **WHEN** se activa la revisión en la tarjeta
- **THEN** se abre el detalle diagnóstico y no se modifica ningún archivo en disco

#### Scenario: Repositorio sin inicializar declara init
- **WHEN** el repositorio no tiene `openspec/`
- **THEN** la revisión declara `init` y muestra el comando `openspec init --tools ...`

#### Scenario: Repositorio inicializado declara update
- **WHEN** el repositorio ya tiene `openspec/`
- **THEN** la revisión declara `update` y muestra el comando `openspec update`

#### Scenario: Todo al día
- **WHEN** motor e integración están consistentes
- **THEN** la revisión declara que no se requieren cambios

### Requirement: La guía para init muestra los argumentos recomendados
Cuando la operación sugerida sea `init`, la revisión SHALL decidir y mostrar los argumentos recomendados:
path canónico del repo; `--tools <allowlist confirmada>`; `--profile core|custom`; `--no-animation`; y la
opción `--copilot-cloud` o `--no-copilot-cloud`. SHALL advertir explícitamente que `--force` sólo debe usarse
si el usuario desea limpiar archivos legacy preexistentes.

El fundamento es que `openspec init` por defecto es interactivo y requiere flags explícitos para no
detenerse ante prompts. Mostrar la línea de comandos completa facilita la ejecución no interactiva.

#### Scenario: Argumentos recomendados mostrados
- **WHEN** se sugiere `init`
- **THEN** la guía muestra `--tools`, `--profile`, `--no-animation` y opciones aplicables

#### Scenario: Advertencia sobre --force
- **WHEN** se analiza la limpieza de archivos legacy
- **THEN** se advierte que `--force` limpia archivos legacy y debe evaluarse con confirmación humana

### Requirement: El diagnóstico de integración preserva personalizaciones y analiza convivencia .codex/.agents
La inspección diagnóstica de la integración SHALL detectar los skills OpenSpec viejos en `.codex`, los
nuevos en `.agents`, distinguirlos de los skills personalizados ya presentes en `.agents` (que existen en
este repositorio), declarar qué archivos OpenSpec se migran/conservan/retiran y detectar colisiones de
nombres, sin sugerir el borrado de personalizaciones.

El fundamento es que 1.8 migra los skills de Codex a `.agents/skills` y este repositorio ya tiene skills
propios bajo `.agents`: un diagnóstico claro previene que el usuario borre por error personalizaciones vivas.

#### Scenario: Detección y preservación diagnóstica
- **WHEN** se inspecciona `.agents` con skills personalizados preexistentes
- **THEN** se identifican como personalizados y se declara que deben conservarse

### Requirement: GitCron distingue la compatibilidad del motor de la disponibilidad de versiones más recientes en el registro
GitCron SHALL evaluar de manera independiente la compatibilidad del CLI local/global respecto al rango
soportado (`supported`, `too-old`, `too-new`, `absent`) y la existencia de versiones más nuevas en el
registro npm (`cli-up-to-date`, `cli-upgrade-available`, `offline`). GitCron SHALL NOT etiquetar un motor
como «Desactualizado» de forma alarmista cuando su versión instalada está dentro del rango soportado.

El fundamento es que un CLI 1.5.0 es plenamente compatible y funcional para trabajar con las specs del
repositorio. Tratarlo como un error o una desactualización crítica sólo porque en npm existe la versión
1.9.0 confunde al usuario y provoca diagnósticos circulares en la matriz.

#### Scenario: Motor en versión soportada con versión más nueva en npm
- **WHEN** el CLI resuelto tiene versión 1.5.0 y en npm la última publicada es 1.9.0
- **THEN** el motor se clasifica como `supported` en compatibilidad y `cli-upgrade-available` en novedad, indicando claramente que es compatible y que existe una versión superior opcional

#### Scenario: Motor en versión obsoleta
- **WHEN** el CLI resuelto tiene versión 1.4.9 (menor al mínimo 1.5.0)
- **THEN** el motor se clasifica como `too-old` y la matriz requiere actualización del motor antes de operar

### Requirement: GitCron no muta paquetes del sistema operativo y expone comandos de actualización del motor en modo de sólo lectura
GitCron SHALL NOT ejecutar comandos de instalación global de paquetes (`npm install -g`, `pnpm add -g`,
`brew`, etc.) en el sistema operativo del usuario. GitCron SHALL exponer el comando exacto no traducido
en la tarjeta del motor y en la revisión de actualización con un botón de copiado al portapapeles.

El fundamento es que el entorno de Electron empaqueta Node.js pero no npm, y ejecutar gestores globales
requiere privilegios elevados en el host que escapan a la autoridad del repositorio. Guiar al usuario con
el comando exacto previene fallos de permisos y corrupción de entornos de Node.

#### Scenario: Exposición del comando oficial de actualización del CLI
- **WHEN** el usuario consulta cómo actualizar el motor OpenSpec en su sistema
- **THEN** GitCron muestra `npm i -g @fission-ai/openspec@latest` con un botón de copiado al portapapeles y no ejecuta llamadas a gestores de paquetes

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
