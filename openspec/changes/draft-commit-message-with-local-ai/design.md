## Contexto

Todo lo que se descartó para mejorar el mensaje se descartó por el mismo motivo: no era derivable de
forma determinista. Ese criterio es correcto para la evidencia del repositorio —de ahí sale que la
atribución de archivos lleve su fuente— y es el criterio equivocado para redactar prosa. Un modelo de
lenguaje no necesita determinismo; necesita que lo que produce se declare como lo que es.

## Las dos rutas deterministas, descartadas por medición

**Ruta A: nombrar la tarea de la sesión.** La sesión lleva `changeId` y `taskId`, y el mensaje los
descarta. Parecía la ruta barata. Se midió cuántas tareas cubre cada commit en este repositorio:
`declare-change-branch` 3 commits / 30 tareas, `keep-new-change-draft` 2 / 25,
`attribute-files-to-change` 4 / 22. Entre siete y quince tareas por commit: nombrar **una** afirma que el
commit es de esa tarea cuando abarca doce. Precisión falsa.

**Ruta B: nombrar las secciones de `tasks.md` que se cerraron.** Es un hecho de Git —las casillas que
pasaron de `[ ]` a `[x]` desde el último commit—, y parecía mejor porque es el alcance real. Se midió
sobre tres commits reales: los tres tocan **todas** las secciones, porque se commitea una vez por tanda y
la tanda cubre el change entero. «Secciones 1 a 6» no dice nada.

**Ruta C: tres botones `feat`/`fix`/`chore`.** Sobrevive como respaldo cuando no hay modelo disponible,
no como el mecanismo: resuelve el único bit que falta, pero deja la descripción en el identificador del
cambio.

## Decisión: lo redacta un modelo local, y se declara que lo redactó él

**Comprobado antes de decidirlo.** Con el diff real del commit `e44e6b3` de este repositorio, gemma-4-12b
devolvió `feat(pipeline): implementar la atribución de archivos a cambios`. Acertó el tipo —`feat`, no
`chore`—, que es el dato que ninguna fuente del repositorio contiene, y el alcance.

**Alternativa descartada: un proveedor en la nube.** Es más rápido y de mejor calidad. Se descarta porque
la entrada es el diff, o sea el código del usuario: mandarlo a un tercero para redactar una línea es un
precio que nadie pidió pagar. La infraestructura local ya existe y funciona.

## Decisión: el modelo lo elige la persona, de lo que haya en ese momento

Un selector lee el catálogo vivo y muestra, por modelo, su estado —cargado o en disco—, el contexto con
el que está cargado y de qué dispositivo es.

**Alternativa descartada: un modelo fijo en el código o en la configuración.** Envejece con el catálogo
de la máquina y falla el día que ese modelo no está. Además el criterio de elección no es del proyecto:
depende de qué máquina tiene la placa y qué está cargado.

**Medido, y es lo que hace falta distinguir:** `max_context_length` y `loaded_context_length` no son lo
mismo. Un modelo puede soportar 262144 y estar cargado con 65536. El presupuesto real es el segundo, y es
el que el selector muestra.

**Medido también:** con LM Link, el catálogo mezcla dispositivos. En esta máquina, `lms ls` reporta casi
todos los modelos en `Ale-CasaNew` —la PC con la placa— y sólo dos como `Local`, y el servidor de
`localhost:1234` los resuelve contra la PC de forma transparente. Por eso el dispositivo se muestra: sin
él, «cargado» no dice dónde ni con qué placa.

## Decisión: el endpoint es configurable

`electron/ai/carto/lmstudio.ts` tiene `http://localhost:1234` escrito en el código. Funciona sólo
mientras el servidor esté en la misma máquina o haya un reenvío de puerto que no está declarado en
ninguna parte.

**Alternativa descartada: dejarlo fijo porque hoy funciona.** Funciona por una condición del entorno de
una persona que la aplicación no conoce ni puede verificar. El día que falla, no hay dónde mirar.

## Decisión: cargar un modelo se declara antes y se acota en el tiempo

Si el modelo elegido no está cargado, o su contexto no llega al piso, GitCron puede cargarlo con
`lms load <clave> -c <contexto> --ttl <segundos>`. Antes lo declara con `--estimate-only`, que calcula los
recursos **sin cargar**.

Ésta es la invariante del proyecto para toda escritura: se declara qué va a pasar antes de que pase. Y el
`--ttl` cierra el otro extremo: la aplicación no deja gigabytes de VRAM ocupados para siempre por haber
sugerido una línea.

**Alternativa descartada: no cargar nunca, sólo verificar y avisar.** Era la conclusión con la
información anterior, cuando parecía que elegir el contexto exigía el SDK. Deja de valer al comprobar que
`lms load -c` existe y que `--estimate-only` permite declarar el costo antes.

**Alternativa descartada: el SDK `lmstudio-js`.** Sería una dependencia nueva para lo que el CLI ya
instalado resuelve.

**Nota de seguridad:** `lms` es `lms.exe`, así que se invoca con `execFile` **sin shell** —nada del
problema de `openspec.cmd`—. El único argumento variable es la clave del modelo, que se valida contra el
catálogo que devolvió la propia API antes de llegar al proceso.

## Decisión: presupuesto de tokens que contemple el razonamiento

**Medido, y es la trampa menos evidente:** con 200 tokens de techo la respuesta llegó vacía con
`finish_reason=length` y 196 tokens gastados en razonamiento. Con 1.200, lo mismo: 1.196 razonando. Recién
con 3.000 salió el contenido, después de 1.585 tokens de razonamiento.

`enable_thinking: false` en `chat_template_kwargs` **fue ignorado** por este modelo. Lo que destrabó fue
el techo, no la bandera.

De ahí dos reglas: el techo se calcula contemplando el razonamiento, y `finish_reason=length` con
contenido vacío se declara como **«el modelo no contestó»**, no como una respuesta en blanco. Sin eso el
panel mostraría un campo vacío sin explicar por qué.

## Lo medido sobre la calidad, y lo que obliga

Tres commits de naturaleza distinta —una función nueva, un arreglo de estilo y un archivado— contra dos
modelos:

| | `e44e6b3` (feat) | `f84b14e` (style) | `5da3899` (archivado) |
|---|---|---|---|
| **gemma-4-12b**, techo 3.000 | `feat(pipeline): implementar atribución de archivos en el panel` | `style(pipeline): cambiar color de avisos a ámbar` | vacío por `length` |
| **qwen3.5-9b**, techo 3.000 | vacío | vacío | vacío |
| **qwen3.5-9b**, techo 8.000 | — | `fix(avisos): Corregir color de avisos a ámbar en lugar de cyan`, 98 s | — |

De ahí salen tres cosas que el diseño tiene que absorber:

**El selector no es una comodidad, es una condición.** gemma-4-12b acierta el tipo en los dos casos que
contesta y en uno escribe mejor que el mensaje humano original —`feat` con descripción contra `chore` con
el slug—. qwen3.5-9b, con el mismo prompt, no contesta nada; y cuando se le da el doble de presupuesto
contesta en 98 s con el tipo equivocado y un alcance inventado. La función sirve o no sirve según el
modelo, así que elegirlo tiene que ser de la persona y el panel tiene que dejar ver cuándo un modelo no
está contestando.

**El techo de tokens no puede ser una constante.** 3.000 alcanza para uno y no para el otro; 8.000
alcanza pero duplica la latencia. Es un parámetro por modelo, no un número del código.

**No se llama al modelo cuando la sugerencia determinista ya es buena.** El único caso que gemma no pudo
redactar es el commit de archivado —un movimiento masivo de carpetas—, y es exactamente donde la
aplicación ya produce el mensaje correcto por la ruta: `chore: archived declare-change-branch`. Falla
donde no hace falta, así que ahí no se pregunta.

## Decisión: la espera se llena con frases que rotan, reusando el mecanismo que ya existe

Medido, la redacción tarda entre 25 y 98 segundos. Un campo que no hace nada durante un minuto y medio se
lee como colgado, y la reacción natural es apretar de nuevo o cerrar el panel.

`TemporalAgentSettings.tsx` ya resuelve exactamente esto para las predicciones: tres listas de frases
—castellano, inglés y chino—, rotando cada 2,8 segundos y evitando repetir la anterior. Idea de Ale:
hacer lo mismo en el campo del mensaje.

Se extrae **el mecanismo** a un hook compartido, no se copia. Copiarlo dejaría dos ciclos idénticos que se
separan con el primer arreglo, que es el patrón que en este panel ya causó tres controles duplicados.

**Alternativa descartada: reusar también las frases.** Las del Agente Temporal hablan de predecir futuros
y ramas especulativas. Acá se está leyendo un diff, y una frase que no describe lo que está pasando es
peor que un spinner mudo: convierte la espera en decorado.

**El límite, y es duro:** las frases son un estado de espera, no un valor. No pueden quedar en el campo
del mensaje bajo ninguna circunstancia —ni si la llamada falla, ni si se cancela, ni si el modelo no
contesta—. Tiene su prueba.

## Corrección: todo va por HTTP, el CLI se retira

La primera versión cargaba modelos con `lms load -c`. Salió de una conclusión mal fundada: se probó
`/api/v0/load`, devolvió 200 con un cuerpo de error, y se dio por hecho que no había endpoint REST.

Ale pasó los logs del servidor de LM Studio, que enumeran sus rutas. **Existe `POST
/api/v1/models/load`**, acepta `{ model, context_length }` y, medido, cargó gemma-4-12b con 65.536 en 11
segundos. El endpoint estaba en otra ruta de la que se sondeó.

Y el catálogo nativo `/api/v1/models` —no la `v0` que se venía usando— trae todo junto: `display_name`,
`params_string`, `quantization`, `size_bytes`, el contexto real en `loaded_instances[].config` y
`capabilities.reasoning`. El `size_bytes` de gemma-4-12b son 7.556.574.286 bytes, o sea **los mismos 7,04
GiB que estimaba `lms load --estimate-only`**: el costo se puede declarar desde el catálogo, sin un paso
de estimación aparte.

Con eso el CLI se retira entero. Las tres operaciones —catálogo, carga y redacción— son HTTP contra el
mismo servidor. Se gana:

- **Funciona contra la máquina remota** igual que el resto. El CLI, en cambio, hablaba con la instancia
  local: `lms ps` decía «no models loaded» mientras el servidor tenía uno cargado del otro lado de LM
  Link.
- **No hay salida que limpiar.** El CLI devuelve códigos de color ANSI, que llegaron a la pantalla como
  `Ø[33mLOWØ[39m` y rompieron la lectura del GiB. Ale lo vio en la validación.
- **No depende de que `lms` esté instalado**, ni de invocar un proceso.

`capabilities.reasoning` además explica el modo de fallo más caro que se midió y ahora se declara en el
panel: un modelo que razona gasta el presupuesto pensando y devuelve vacío.

## Retirado: en qué máquina vive cada modelo

Ale lo pidió con un motivo válido: corre GitCron en la notebook o en la PC con la placa, y con LM Link
`localhost:1234` resuelve contra el equipo enlazado sin que nada lo diga —los 25–47 segundos medidos ya
corrían del otro lado—. Se implementó y se retiró en la misma tanda, por lo que costaba.

El dato **no está en HTTP**: las dos copias del mismo modelo llegan idénticas byte a byte, no hay endpoint
de dispositivos, y ni siquiera la instancia cargada lo lleva. Sólo lo sabe el CLI. Y el CLI, medido tres
veces seguidas en la máquina de Ale:

| corrida | `lms link status --json` | `lms ls --json` | total |
|---|---|---|---|
| 1 | 405 ms | 1.344 ms | **1,7 s** |
| 2 | 3.104 ms | 6.056 ms | **9,2 s** |
| 3 | 16.480 ms | 21.337 ms | **37,8 s** |

No es un costo fijo: **se degrada**. En la tercera corrida el propio `GET /api/v1/models` se cayó por
timeout a los 10 s, y Ale sintió el mouse trabarse al abrir la preparación.

La primera reacción fue bajar la frecuencia —sacar la consulta del camino de las validaciones, que corría
en cada acción—. No alcanzó: el problema es lanzar `lms` **una sola vez**, no lanzarlo seguido. Saber en
qué máquina corre un modelo no vale trabar la máquina.

Queda anotado como pendiente de LM Studio: si alguna vez el dispositivo aparece en `/api/v1/models`, es
una línea.

## Decisión: se descarga lo que cargamos, y sólo eso

Cargar un modelo tras otro los apila. Ale terminó con dos de 7 GB tomados a la vez sin haber pedido
ninguno dos veces, y lo vio en la pantalla de LM Studio.

`POST /api/v1/models/unload` existe y pide el `instance_id`, que sí viene en el catálogo. Al cargar, se
libera la instancia que **esta aplicación** cargó antes.

**Alternativa descartada: descargar todo lo cargado antes de cargar.** Es más simple y garantiza una sola
instancia. Se descarta porque puede haber un modelo que la persona levantó a mano para otra cosa, y
desalojarlo sería peor que el problema: la aplicación no tiene por qué decidir sobre la VRAM que no tomó.

**Alternativa descartada: descargar al terminar cada redacción.** Fue lo primero que preguntó Ale y es lo
más intuitivo. Se descarta porque castiga el caso normal: redactar dos mensajes seguidos pagaría dos veces
los 11 segundos de carga.

En su lugar, la carga pide `ttl_seconds` y **el servidor lo desaloja solo** tras media hora sin uso. Dos
mensajes seguidos reusan el modelo; si no se usa más, la VRAM se libera sin que nadie haga nada.

El nombre del parámetro no se adivinó. El servidor valida las claves por nombre antes que el modelo, así
que se probó con un modelo inexistente: `ttl_seconds` falló por «modelo no encontrado» —o sea que la clave
pasó— mientras `ttl`, `unload_after` y un nombre inventado fallaron por «clave no reconocida». Y la
respuesta de una carga real devuelve `ttl_seconds: 1800`, que lo confirma del otro lado.

## Riesgos

**Un mensaje redactado por un modelo que no describe lo que se está confirmando.** El conjunto preparado
puede incluir archivos de otra tanda. → Mitigación: se rotula como redactado por un modelo, es editable,
no confirma solo, y el conjunto ya se elige archivo por archivo.

**La latencia hace pensar que se colgó.** Medido: 25 a 47 s con un 12B; un 27B con razonamiento superó
los 240 s y hubo que abortarlo. → Mitigación: acción explícita con estado visible y cancelación, que
`provider-runtime.ts` ya resuelve con `AbortController`.

**Cargar un modelo ocupa VRAM de la máquina de la persona.** → Mitigación: `--estimate-only` antes,
`--ttl` después, y la acción es humana.

## Sin medir

La calidad con otros modelos del catálogo: se probó uno solo con un solo commit. No se sabe cuán seguido
acierta el tipo, y ése es el valor entero de la función. Entra como tarea antes de dar el trabajo por
bueno.
