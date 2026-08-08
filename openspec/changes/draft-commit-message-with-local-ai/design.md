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
