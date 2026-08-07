## Decisión: ejecutar la inicialización, con la herramienta elegida en el panel

El panel ejecuta `openspec init` sobre el repositorio abierto, tras una confirmación humana que enumere
qué se va a escribir. **Qué herramienta se configura lo elige la persona**, no la aplicación.

Esa segunda mitad no estaba en la propuesta original y la impuso una sonda: `openspec init` **exige
`--tools`** y falla sin él. No existe un «inicializar» a secas. Sus valores son unas treinta
herramientas, más `all` y `none`.

**Alternativa descartada: fijar `--tools claude`.** Es más simple y cubriría el caso más frecuente de
Ale. Se descarta porque decide por él en repositorios donde usa Codex o Antigravity, y porque instala
cinco slash commands `/opsx:*` —justo lo que este proyecto dejó de usar deliberadamente, al punto de
tener una prueba que falla si una instrucción vuelve a empezar con `/`—. Elegir por el usuario qué
ejecutor va a usar en su repositorio es exactamente el tipo de suposición que no corresponde.

**Alternativa descartada: entregar el mando para correrlo a mano.** No agrega ninguna superficie de
escritura, y ahora tiene un argumento nuevo a favor: elegir herramienta no es algo que la aplicación
pueda adivinar. Se descarta igual porque el problema no es que falte saber el mando: es que el panel
muestra cuatro ceros y no ayuda a salir de ahí. Quien abrió un repositorio y se encontró con una
pantalla vacía no está en posición de saber que le falta un paso que nadie le nombró.

**Contrapartida asumida:** es una escritura nueva en un repositorio del usuario, y con `--tools claude`
son **once archivos**, no uno: cinco slash commands, cinco skills y el `config.yaml`. Se asume
enumerándolos antes de escribirlos, y ofreciendo la opción mínima descrita abajo.

## Decisión: elegir herramienta es lo importante, y `none` no es el camino seguro

Se ofrece `none` como opción, pero **no es la predeterminada** y se declara lo que implica: deja al
ejecutor sin las instrucciones que le enseñan a usar el método.

Esta decisión estaba escrita al revés y se corrigió con evidencia. La versión anterior ponía `none` por
defecto razonando que era «la opción que menos toca el repositorio ajeno». Es cierto que escribe un solo
archivo, y es exactamente por eso que es la peor.

Lo que instala `init --tools <herramienta>` no es decoración: son las skills que le enseñan al ejecutor
que el canal existe. La de `openspec-propose` dice textualmente «Follow the `instruction` field from
`openspec instructions` for each artifact type» y «**IMPORTANT**: `context` and `rules` are constraints
for YOU». Sin ese archivo, un ejecutor no sabe que tiene que pedir instrucciones ni que hay reglas que
cumplir: el canal está lleno y nadie lo abre.

Hay medición de las dos mitades. En `C:\www\odontoPau` existe `.codex/skills/openspec-*` con cinco
archivos y **no existe `.agent/`**, que es donde OpenSpec instala los de Antigravity —está soportado,
con skills en `.agent/skills/` y workflows en `.agent/workflows/`—. Codex tenía las instrucciones;
Antigravity no tenía ninguna. Eso explica por qué uno escribió los artefactos bien y el otro improvisó,
y no era una diferencia de criterio del ejecutor sino de qué había instalado en el repositorio.

**Alternativa descartada: no ofrecer `none` en absoluto.** Sería coherente con lo anterior. Se descarta
porque un repositorio puede legítimamente no usar ninguna de las herramientas de la lista, y negar la
inicialización mínima sería peor que ofrecerla con su advertencia.

## Consecuencia sobre el cambio hermano

`carry-task-form-in-config` escribió reglas de forma en el canal de este repositorio, y en su reporte se
declaró como hipótesis que el ejecutor desviado «probablemente no pidió instrucciones». Ya no es
hipótesis: no podía pedirlas, porque no tenía instalado el archivo que se lo enseña. La regla escrita
allá sigue siendo correcta y sigue sin alcanzar sola.

## Decisión: la lista de herramientas se lee del CLI

Las opciones salen de `openspec init --help`, que las enumera, y no de una lista escrita en el código.

**Alternativa descartada: escribirlas en el código.** Es más simple y no depende de parsear una salida
de ayuda. Se descarta porque son treinta y las define el CLI, no este proyecto: una copia queda vieja en
silencio en cuanto OpenSpec agregue o quite una, y el panel ofrecería algo que el comando rechaza. Si la
salida de ayuda cambia de forma y el parseo falla, la degradación es mostrar sólo `none`, que sigue
siendo una inicialización válida.

## Decisión: distinguir la ausencia del vacío en la evidencia, no en la vista

El lector de evidencia pasa a diferenciar tres estados del repositorio: sin `openspec/`, con
`openspec/` y sin cambios activos, y con cambios activos. La vista consume esa distinción en vez de
inferirla.

**Alternativa descartada: inferirlo en el renderer a partir de los contadores en cero.** Es menos
código y no toca el proceso principal. Se descarta porque cero cambios activos y ausencia de OpenSpec
son estados distintos que piden respuestas distintas, y ya coinciden en los contadores: un repositorio
correctamente inicializado y recién empezado muestra los mismos cuatro ceros. Inferir el estado desde
un valor que ambos comparten produce el fallo que Ale ya detectó una vez —la guía diciendo "no hay
ningún cambio activo" debajo de una lista con cuatro—, que es exactamente lo que pasa cuando la vista
deduce en vez de recibir.

## Decisión: sembrar reglas deja de ser un agregado

Que la inicialización siembre reglas en el `config.yaml` era, en la primera versión de este cambio, una
mejora sobre el estado que dejaba `init`. Las sondas lo convirtieron en lo único que cambia algo.

Medido: después de `openspec init`, `openspec instructions` sigue devolviendo **contexto vacío y cero
reglas**, exactamente igual que antes de inicializar. El `config.yaml` que deja son veinte líneas
**todas comentadas** salvo `schema:` —una plantilla con ejemplos, no una configuración—.

**Alternativa descartada: inicializar y no tocar el `config.yaml`.** Es lo que hace el comando y
respetarlo sería lo menos intrusivo. Se descarta porque dejaría el change sin efecto sobre el problema
que lo motivó: el panel pasaría de mostrar cuatro ceros a mostrar un repositorio inicializado donde el
ejecutor sigue recibiendo el encargo y ninguna regla. La sonda que abrió este pendiente y la que lo
cierra dicen lo mismo.

## Decisión: nombrar la consecuencia, no sólo la falta

El estado explica que sin `init` crear un cambio igual funciona, pero el ejecutor recibe el encargo sin
contexto ni reglas.

**Alternativa descartada: decir sólo "este repositorio no usa OpenSpec".** Es más corto y suficiente
para identificar el estado. Se descarta porque no comunica lo que hace peligroso al caso: el sondeo
mostró que `openspec new change` funciona sin `init` y deja un `config.yaml` vacío del que
`openspec instructions` devuelve contexto vacío y ninguna regla. El fallo es silencioso, y un aviso que
no nombra la consecuencia deja a la persona creyendo que inicializar es opcional.

## Riesgos

**La inicialización falla a mitad y deja el repositorio a medio escribir.** Mitigación: informar el
error real sin normalizarlo —el mismo criterio que se aplicó al fallo de creación de rama— y volver a
leer la evidencia para que el panel muestre el estado que hay, no el que se esperaba.

**El binario de OpenSpec no está disponible.** Mitigación: es el mismo problema de disponibilidad que
ya tiene el resto del panel; se reporta como tal y no se ofrece una acción que no se puede ejecutar.

## Sin medir

No se midió cuánto tarda `openspec init` en un repositorio grande. Si la acción necesita estado de
progreso, se sabrá al implementarla; darlo por descontado ahora sería presentar una expectativa como
resultado.
