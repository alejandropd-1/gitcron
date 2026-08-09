# Redactar el asunto del commit con un modelo local

**Change:** `draft-commit-message-with-local-ai` · **Fecha:** 2026-08-08 · **Tareas:** 43/44 (falta la
validación de Ale) · **Rama:** `change/name-task-in-commit-message` → renombrada a
`change/draft-commit-message-with-local-ai`

## De dónde salió

Ale preguntó: *«vos que estás viendo todo sabés qué poner en el mensaje, ¿cómo se puede lograr algo
así?»*. La respuesta corta es que la intención existe en el momento de la acción y la aplicación la está
reconstruyendo después, a partir de los restos.

Se probaron tres rutas deterministas antes de llegar a la buena, y **dos se descartaron midiendo**:

| Ruta | Idea | Por qué se cayó |
|---|---|---|
| A | Nombrar la tarea de la sesión | Cada commit cubre entre 7 y 15 tareas —3 commits/30 tareas, 2/25, 4/22—. Nombrar una es precisión falsa |
| B | Nombrar las secciones de `tasks.md` cerradas | Los tres commits reales tocan **todas** las secciones. No discrimina nada |
| C | Tres botones `feat`/`fix`/`chore` | Sobrevive como respaldo, pero es pedirle a la persona lo que la máquina puede intentar |

La que quedó fue de Ale: **que lo redacte una IA local**. Y desarmó la objeción de fondo — todo lo que se
venía descartando se descartaba por no ser derivable de forma determinista, y un LLM no necesita que lo
sea. Era el criterio equivocado aplicado a un problema que no lo pedía.

## Lo medido sobre la calidad

Tres commits de naturaleza distinta contra dos modelos, en la placa de 12 GB de Ale vía LM Link:

| | `e44e6b3` (feat) | `f84b14e` (style) | `5da3899` (archivado) |
|---|---|---|---|
| **gemma-4-12b**, techo 3.000 | `feat(pipeline): implementar atribución de archivos en el panel` | `style(pipeline): cambiar color de avisos a ámbar` | vacío por `length` |
| **qwen3.5-9b**, techo 3.000 | vacío | vacío | vacío |
| **qwen3.5-9b**, techo 8.000 | — | `fix(avisos): Corregir color…`, 98 s | — |

Acertó el tipo en los dos que contestó, y en el primero **escribió mejor mensaje que el humano**: Ale había
commiteado `chore: attribute-files-to-change`. El tipo es justamente el único dato que ninguna fuente del
repositorio contiene —no está en el diff, ni en las rutas, ni en la rama, ni en las tareas—.

De ahí salieron tres decisiones de diseño que la medición impuso:

**El selector no es una comodidad, es una condición.** Con el mismo prompt, un modelo acierta dos de dos y
el otro no contesta nada. La función sirve o no según cuál sea, así que elegirlo es de la persona y el
panel tiene que dejar ver cuándo un modelo no está contestando.

**El techo de tokens no puede ser una constante.** 3.000 alcanza para uno y no para el otro; 8.000 alcanza
pero duplica la latencia. Hay una prueba que falla si alguien mete un número fijo en el proveedor.

**No se llama al modelo cuando la sugerencia determinista ya es buena.** El único caso que gemma no pudo
redactar es el commit de archivado, y es exactamente donde la aplicación ya produce el mensaje correcto
por la ruta. Falla donde no hace falta.

## Lo que ya existía y no hubo que construir

- **El adaptador de LM Studio** ya estaba en GitCron para Cartografía: `electron/ai/carto/lmstudio.ts`,
  local, sin API key.
- **El registro de proveedores** ya contemplaba lo local con auth opcional. Su propio comentario lo dice:
  *«diseñar sólo para cloud rompe OpenCode»*.
- **`lms` está instalado**, es un `.exe` —así que `execFile` sin shell, nada del problema de
  `openspec.cmd`— y trae `-c/--context-length`, `--ttl` y `--estimate-only`.

Y esto **no depende del change parqueado** `add-lmstudio-agent-runtime`: aquél son 28 tareas porque
construye el loop agente con tool calling. Redactar un asunto es una llamada sin tools.

## Dos correcciones sobre la marcha

**«GitCron verifica y declara, no carga» era la conclusión correcta con la información equivocada.** Se
sostuvo mientras parecía que el contexto sólo podía fijarse a mano. Ale señaló que por CLI se puede pedir
la carga con el contexto que uno quiera, y tenía razón: con `--estimate-only` se declara el costo —7,04
GiB para 65.536, en ~1 s— y con `--ttl` el modelo se libera solo. Cargar deja de ser un residuo.

**Casi afirmo que existía un endpoint REST para cargar.** `/api/v0/load` devolvía 200 y parecía real.
Probé una ruta inventada: también devuelve 200, con `{"error":"Unexpected endpoint or method"}`. Ese 200
no probaba nada.

## Lo que se sostuvo

**La IA nunca se dispara sola.** Cada canal responde a un botón. Un refresco del panel no puede costar 47
segundos de GPU ni 7 GB de VRAM.

**Lo que viaja es el diff del repositorio**, más sensible que el contexto de Cartografía. Ése es el
argumento fuerte para que el proveedor sea local: el código no sale a ningún tercero.

**«No contestó» no es «contestó vacío».** Los modelos con razonamiento agotan el presupuesto pensando y
devuelven contenido en blanco. Mostrarlo como mensaje vacío haría pensar que la función está rota cuando
lo que falta es techo de tokens.

**Un asunto mal formado no se ofrece.** Obligaría a corregirlo a mano, que es peor que no sugerir nada.

**Lo escribió un modelo, y se dice.** El aviso nombra cuál y pide revisarlo antes de confirmar.

## La espera, idea de Ale

La redacción tarda entre 25 y 98 segundos: un campo quieto durante minuto y medio se lee como colgado.
`TemporalAgentSettings.tsx` ya resolvía esto para las predicciones con frases que rotan, así que se
extrajo **el mecanismo** a `hooks/use-rotating-thoughts` y el Agente Temporal pasó a usarlo. Copiarlo
habría dejado dos ciclos idénticos que se separan con el primer arreglo — el patrón que en este panel ya
produjo tres controles duplicados.

El vocabulario es propio: las del Agente Temporal hablan de predecir futuros y ramas especulativas, y acá
se está leyendo un diff.

Dos decisiones que conviene dejar escritas:

- **La frase va encima del campo, no adentro.** Se ve donde Ale la pidió, y el valor del input nunca la
  toca: es imposible que termine siendo el mensaje del commit. Tiene su prueba.
- **Rotan en orden, no al azar.** Sortear en el render es impuro y el linter lo rechaza con razón.
  Recorrer en orden **garantiza** lo que el sorteo apenas hacía probable —que no se repita la anterior—.
  El costo asumido es que cada espera arranca con la misma frase.

De paso se corrigió un `setState` sincrónico dentro de un efecto en `TemporalAgentSettings.tsx`, anterior
a este trabajo: el avance de la barra ahora se deriva.

## El callejón sin salida que encontró Ale validando

Al probarlo, LM Studio había descargado el modelo por inactividad —cero cargados— y el panel respondió
correctamente: *«no está cargado con al menos 32768 de contexto. El contexto se define al cargar el modelo
en LM Studio»*. Explicaba el problema y **no daba la salida**.

Lo peor es que la salida ya estaba construida: `commit-ai:estimate` y `commit-ai:load` se habían hecho en
la tanda anterior y nunca se conectaron a la vista. La aplicación sabía cargar el modelo con 65k y no
había ningún botón que lo pidiera.

Ahora, con un modelo en disco, el botón cambia a **«Cargar el modelo»**: primero corre `--estimate-only`
—~1 s, sin tocar la VRAM— y declara *«va a ocupar unos 7,04 GiB de la placa, confianza LOW, se libera solo
tras media hora sin uso»*; recién con la confirmación carga. Y si la clave coincide con más de un modelo,
lo avisa antes, porque el CLI carga «el primero» en silencio.

Es el mismo principio que el resto del panel: declarar el costo antes de ocuparlo, nunca hacerlo callado.

## La corrección más grande: el CLI se retira entero

Se implementó la carga de modelos con `lms load -c`, y estaba mal fundada. Se había sondeado
`/api/v0/load`, devolvió 200 con un cuerpo de error, y de ahí salió «no hay endpoint REST para cargar».

Ale pasó los logs del servidor de LM Studio, que enumeran sus rutas: **existe `POST
/api/v1/models/load`**. Acepta `{ model, context_length }` y, medido, cargó gemma-4-12b con 65.536 de
contexto en 11 segundos. El endpoint estaba en otra ruta de la que se sondeó, y la conclusión anterior era
una generalización desde una sola prueba fallida.

El catálogo nativo `/api/v1/models` —no la `v0` que se venía usando— trae además `display_name`,
`params_string`, `quantization`, `size_bytes`, el contexto real de la instancia cargada y
`capabilities.reasoning`. Y el `size_bytes` de gemma-4-12b son 7.556.574.286 bytes: **los mismos 7,04 GiB
que estimaba `lms load --estimate-only`**. El costo se declara desde el catálogo, sin proceso aparte.

Con eso el CLI sale del cambio, y se gana en tres frentes:

- **Llega a la máquina remota.** El CLI hablaba con la instancia local: `lms ps` decía «no models loaded»
  mientras el servidor tenía uno cargado del otro lado de LM Link.
- **No hay salida que limpiar.** El CLI devuelve códigos de color ANSI, que aparecieron en pantalla como
  `Ø[33mLOWØ[39m` y además rompieron la lectura del GiB, que salió como `?`. Ale lo vio validando.
- **No depende de que `lms` esté instalado** ni de invocar un proceso.

De paso, `capabilities.reasoning` explica el modo de fallo más caro que se midió, y ahora se declara: un
modelo que razona gasta el presupuesto pensando y devuelve vacío.

## Las características, como lista

El párrafo con seis datos adentro se reemplazó por una lista de una línea por dato: estado y contexto
real, cuánto ocupa, parámetros y cuantización, contexto máximo, y si razona. Lo pidió Ale y tiene razón:
lo que hay que poder hacer ahí es comparar de un vistazo, sobre todo el contexto y el razonamiento, que
son los dos que deciden si el modelo va a contestar.

## La VRAM: se apilaba, y ahora se libera sola

Ale vio dos modelos de 7 GB cargados a la vez sin haber pedido ninguno dos veces: cargar uno tras otro los
apilaba. Preguntó si no se podían sacar al terminar la consulta.

Se hicieron dos cosas, y la segunda es mejor que lo que preguntó:

- **Se descarga la instancia anterior** al cargar otra, vía `POST /api/v1/models/unload` con el
  `instance_id` que trae el catálogo. Se libera **sólo lo que cargó esta aplicación**: desalojar un modelo
  que la persona levantó a mano para otra cosa sería peor que el problema.
- **El servidor lo desaloja solo** tras media hora sin uso, con `ttl_seconds` en la carga. Descargar al
  terminar cada redacción castigaría el caso normal —dos mensajes seguidos pagarían dos veces los 11
  segundos de carga—; con TTL, el segundo reusa el modelo y si no se usa más la VRAM se libera sin que
  nadie haga nada.

El nombre del parámetro no se adivinó. El servidor valida las claves por nombre antes que el modelo, así
que se probó contra uno inexistente: `ttl_seconds` falló por «modelo no encontrado» —la clave pasó—
mientras `ttl`, `unload_after` y un nombre inventado fallaron por «clave no reconocida». Y una carga real
devuelve `ttl_seconds: 1800` en su respuesta.

## En qué máquina vive cada modelo

Ale lo pidió por un motivo concreto: corre GitCron en la notebook o en la PC de casa, que es la que tiene
la placa, y quiere saber cuál va a hacer el trabajo. Con LM Link eso es invisible — `localhost:1234`
resuelve contra el equipo enlazado de forma transparente, y los 25–47 segundos que se midieron **ya
corrían en la PC** sin que nada lo dijera.

**Se implementó y se retiró en la misma tanda.** El dato no está en la API HTTP: las dos copias del mismo
modelo llegan idénticas byte a byte, no hay endpoint de dispositivos, y ni siquiera la instancia cargada lo
lleva. Sólo lo sabe el CLI, y el CLI **se degrada**: medido tres veces seguidas, 1,7 s / 9,2 s / 37,8 s,
tirando abajo el propio `GET /api/v1/models` por timeout y trabando la notebook de Ale al abrir la
preparación. Bajar la frecuencia no alcanzó, porque el problema es lanzar `lms` **una sola vez**.

Saber en qué máquina corre un modelo no vale trabar la máquina. Queda anotado para el día que LM Studio lo
exponga por HTTP. Lo que se había construido, como referencia:
`lms ls --json` trae `deviceIdentifier` por modelo —nulo significa esta máquina— y `lms link status
--json` traduce ese identificador al nombre que la persona reconoce. Medido en la máquina de Ale: 13
modelos en `Ale-CasaNew` y 3 en `Ale-Book`, con uno que está en las dos.

Volver al CLI acá es distinto de lo que se acaba de retirar: es JSON, no hay códigos de color, y no es
para *hacer* nada sino para leer un dato que la API no expone. Con dos límites explícitos:

- **Sólo con el endpoint local.** El CLI describe la máquina donde corre GitCron y sus enlaces; con un
  servidor remoto configurado esa vista es de otra realidad y mentiría.
- **Sin el dato no se afirma nada.** Sin `lms`, con LM Link apagado o con endpoint remoto, el modelo se
  muestra sin dispositivo. No saber no es lo mismo que saber que es local.

De paso, esto explica el duplicado: un modelo presente en las dos máquinas ahora lleva las dos, y deja de
ser un renglón repetido para pasar a ser información.

## Dos correcciones que salieron de la validación de Ale

**El error de React por claves duplicadas** era un defecto real de LM Link: el catálogo de Ale tiene 16
entradas para 14 modelos porque dos existen en ambas máquinas. Ahora se unen por clave y gana la copia
cargada — elegir la otra habría mostrado «en disco» sobre un modelo disponible. Hay una prueba con las
copias al revés para que el resultado no dependa del orden.

**El modelo venía preseleccionado**, y Ale preguntó por qué si tendría que poder elegir. Estaba puesto
como comodidad, y contradice el fundamento del selector: está medido que la función sirve o no según qué
modelo sea, así que dejar uno puesto convierte esa decisión en un descuido. Es además el mismo principio
que ya rige este panel con los archivos. Ahora arranca en «Elegí un modelo…».

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm exec eslint` limpio sobre lo tocado.
`openspec validate draft-commit-message-with-local-ai --strict` válido.

`pnpm test` en **122 archivos / 923 tests**, corrida completa en verde. La base antes de esta tanda era
118 archivos / 866 tests: entran cuatro archivos netos —el del proveedor, el del prompt, el del hook de
frases y el del panel— y cincuenta y siete casos.

## Lo que falta

La tarea 6.6: Ale valida que ningún mensaje redactado se lea como verificado por la aplicación. Es el
mismo riesgo que en la atribución de archivos, y se tilda antes de archivar.
