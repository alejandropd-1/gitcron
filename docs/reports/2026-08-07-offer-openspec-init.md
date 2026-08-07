# El panel muestra el estado de OpenSpec y ofrece inicializarlo

**Change:** `offer-openspec-init` · **Fecha:** 2026-08-07 · **Tareas:** 39/40 (falta la validación visual
de Ale)

## Qué se hizo

El panel declara si el repositorio tiene OpenSpec y qué herramientas lo tienen configurado; lo avisa
antes de empezar un cambio sin impedirlo; y ofrece inicializar desde una sola acción, que pide elegir
herramienta cuando el CLI no puede detectar ninguna.

## El hallazgo que ordenó todo el cambio

El motivo no era «falta OpenSpec». Era un estado peor y menos visible: un repositorio **correctamente
inicializado** que aun así deja a un ejecutor trabajando a ciegas.

OpenSpec instala, por herramienta, skills que le enseñan al ejecutor a pedir `openspec instructions`. La
de `openspec-propose` dice textual «Follow the `instruction` field from `openspec instructions`» y que
`context` y `rules` son restricciones para él. Sin ese archivo, un agente no sabe que el canal existe: el
canal está lleno y nadie lo abre.

Medido sobre `C:\www\odontoPau`: tenía `.codex/skills/openspec-*` y **ningún `.agent/`**, que es donde
van los de Antigravity. Codex recibía el método y Antigravity no. Nadie lo vio hasta que un artefacto
salió mal, y diagnosticarlo exigió comparar directorios a mano. Se corrigió con
`openspec init --tools antigravity`: ahora recibe 957 caracteres de contexto y tres reglas.

Por eso el cambio es, ante todo, **estado visible**. Inicializar es la salida que se ofrece a partir de
eso, no el punto. Un botón solo no habría mostrado el caso de `odontoPau`.

## Las sondas, que son la evidencia de las decisiones

Se midió `openspec` en vez de suponerlo. Cada una de estas sondas descartó una alternativa:

- `openspec new change` **funciona sin inicializar**, pero deja un `config.yaml` de una línea y
  `openspec instructions` devuelve contexto vacío y cero reglas. → Por eso no se bloquea: el trabajo
  arranca igual y el problema aparece después.
- `openspec init` **detecta solo** las herramientas por sus directorios: con `.codex`, `.agent` y
  `.claude` presentes configuró las tres sin `--tools`. → Por eso el panel **no** replica la lista de
  treinta herramientas del CLI.
- Sin ningún directorio de herramienta, `init` **falla** con «No tools detected» y exige `--tools`. → Es
  el único caso en que hay que preguntar, y el que impide bloquear.
- `init` **no pisa** `openspec/config.yaml`. Comprobado por hash sobre `odontoPau`: idéntico antes y
  después. Es incremental —agrega la herramienta que falta y nada más—.
- Tras inicializar, `openspec instructions` **sigue** devolviendo contexto vacío y cero reglas: el
  `config.yaml` que deja son veinte líneas todas comentadas. Inicializar entrega el método, no el
  contexto del proyecto.
- `--tools claude` escribe once archivos: cinco slash commands, cinco skills y el `config.yaml`.
  `--tools none` escribe uno solo.

Estado real de los repositorios al medir: `gitCronos` con claude sin configurar; `odontoPau` con codex y
antigravity; `odontoPro` con claude y cline sin configurar.

## Lo que se implementó

**El lector** (`electron/pipeline/openspec-tooling.ts`, puro y probado con tablas) resuelve tres estados
distinguibles: sin `openspec/`, con OpenSpec y alguna herramienta sin configurar, y todo en orden. Se lee
del disco porque no hay comando que lo informe: `init` lo sabe, pero lo aplica escribiendo.

Una herramienta desconocida **no** se reporta como faltante. Si OpenSpec agrega una que no está en la
tabla, el panel queda como estaba, que es preferible a una afirmación falsa.

**El aviso** (`OpenSpecReadiness`) es una línea arriba de la guía. Aparece sólo cuando falta algo —un
bloque que siempre está enseña a saltearlo— y ahora también acompaña al formulario cuando se empieza un
cambio con otro ya abierto, donde no hay pantalla de entrada que lo haya declarado.

**La referencia** (`OpenSpecToolList`) es la lista completa, en la solapa Herramientas del rail, con la
cuenta de pendientes en la propia solapa: si hubiera que abrirla para saber que falta algo, dejaría de
ser un aviso.

**La inicialización** corre `openspec init` desde el proceso principal, sin pasar por ninguna sesión de
runtime —por el mismo motivo que el archivado: un agente puede no tener el comando y devolver éxito sin
haber hecho nada—. Declara antes qué escribe, exige acción humana, y al terminar **relee la evidencia**:
lo que el panel muestra después sale del disco, no de suponer que el comando hizo lo que dijo.

## Dos decisiones que aparecieron al implementar

**Una sola acción que inicializa, y vive en el rail.** El aviso no repite el botón: los dos serían el
mismo control, con el mismo texto y el mismo efecto, visibles a la vez. El aviso lleva al detalle y el
detalle resuelve. Lo que sí se corrigió es que sin OpenSpec el aviso no ofrecía **ninguna** salida —el
enlace sólo aparecía en el caso de herramientas—: declarar sin ofrecer nada deja sabiendo que algo falta
y sin qué hacer, que es el peor de los dos estados.

**La salida sólo se ofrece si hay a dónde llevar.** Con el rail cerrado, el enlace abriría una solapa que
nadie ve. Se omite en ese caso.

## Elegir herramienta no es un error

Cuando el CLI devuelve «No tools detected» el panel **no** lo muestra como fallo: muestra la pregunta con
la lista de herramientas conocidas y un botón que no se puede pulsar hasta elegir. Nada preseleccionado,
porque esto escribe en el repositorio. Cualquier otro fallo sí informa el motivo crudo del CLI, sin
normalizar: «no encontró herramientas» y «falló» piden respuestas distintas de quien lo lee.

Se puede elegir **más de una**. La primera versión fue un desplegable de una sola opción; Ale lo vio en
la pantalla y preguntó cómo elegir varias. Son casillas: el CLI acepta `--tools a,b` y las configura
juntas en una sola corrida, y un repositorio trabajado con dos ejecutores las necesita a las dos —pedirlas
de a una dejaría la segunda al olvido, que es exactamente el estado que este panel existe para evitar—.
Mientras la pregunta está en pantalla, el botón que detecta solo no se ofrece: ya se sabe que no encuentra
nada, así que sería un segundo control con una salida conocida.

El identificador elegido pasa por `TOOL_ID_PATTERN` antes de llegar al proceso. En Windows el CLI corre
con `shell: true` —no hay forma de ejecutar un `.cmd` sin shell—, así que todo argumento variable queda
acotado a un alfabeto cerrado.

El catálogo de herramientas se comparte con el lector en vez de copiarse en el renderer: dos listas que
envejecen por separado dirían cosas distintas del mismo repositorio.

## Inicializar no cuesta lo escrito

Si se inicializa desde el aviso con el formulario completado, el objetivo y el slug siguen ahí al volver.
Se descartó volver al formulario vacío, que es más simple: castiga a quien hizo lo correcto. La persona
escribió su idea, el panel le avisó de algo que no sabía, y perder el texto por atender el aviso
convierte la advertencia en un costo. Una advertencia que cuesta se aprende a ignorar.

Hay una prueba que lo sostiene y que simula el ciclo entero: escribir, inicializar, recibir el snapshot
nuevo, y comprobar que los dos campos siguen como estaban.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm exec eslint` limpio sobre los seis archivos tocados.
`openspec validate offer-openspec-init --strict` válido.

`pnpm test` en **112 archivos / 815 tests**, corrida completa en verde. La base antes de esta tanda era
111 archivos / 802 tests: entra un archivo nuevo y trece casos.

La corrida fue con `pnpm run electron:dev` levantado, que es el entorno donde este proyecto suele ver
timeouts espurios. Esta vez no cayó ninguno; se declara igual la condición en que se corrió.

## Lo que falta

La tarea 6.6: Ale valida abriendo un repositorio sin OpenSpec y llegando a inicializarlo. Se tilda antes
de archivar, porque un change archivado es de sólo lectura.

Queda además una nota del propio change: **no se midió** cuánto cuesta la detección de directorios en
cada refresco. Es una lectura de disco sobre unas pocas decenas de rutas, del mismo orden que las que el
lector ya hace, pero es una estimación y no una medición.
