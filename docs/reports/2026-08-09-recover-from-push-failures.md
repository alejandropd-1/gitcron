# Que un fallo de push se entienda, y tenga salida

**Change:** `recover-from-push-failures` · **Fecha:** 2026-08-09 · **Tareas:** 27/28 (falta la validación
de Ale) · **Rama:** `change/recover-from-push-failures`

## De dónde salió

Ale apretó PUSH y recibió ocho líneas de Git en inglés nombrando `push.default` y `branch.autoSetupMerge`.
Su primera reacción fue preguntar **si era un problema de conexión**.

Eso es el síntoma exacto del problema: cuando el texto no se entiende, se adivina la causa equivocada. Y
en Git adivinar mal lleva a tocar el historial.

El caso real era simple de decir: la rama se renombró —yo la renombré, cuando `name-task-in-commit-message`
dejó de describir el trabajo— y el vínculo con el remoto quedó apuntando al nombre anterior. Git se negó a
empujar porque no sabía a cuál de los dos ir. **Hizo lo correcto.**

Pero al investigarlo apareció algo peor que el texto: **GitCron no sabía reapuntar un upstream
desalineado**. `git:push-branch` sólo agrega `--set-upstream` cuando el primer intento falla por «sin
upstream»; con el nombre desalineado el primer intento funciona, así que el vínculo queda torcido para
siempre. Renombrar una rama es corriente, y la aplicación dejaba a la persona sin salida dentro de sí
misma: la obligaba a la terminal para algo que podía hacer.

## Los textos, capturados y no recordados

Antes de escribir un solo patrón se provocó cada fallo en repositorios descartables y se guardó su salida
textual en `textos-reales.md`. No es ceremonia: al capturarlos aparecieron **dos cosas que nadie habría
adivinado**.

**«Sin ningún remoto» es un caso aparte de «sin upstream».** Apareció de casualidad, al intentar
reproducir el segundo sin haber agregado el remoto todavía. Dan textos distintos y piden respuestas
distintas —agregar el remoto contra reapuntar el vínculo—, así que colapsarlos habría producido un consejo
falso.

**El rechazo por estar atrasado empieza con `error:`, no con `fatal:`**, y trae la ruta del remoto adentro.
Un patrón que sólo mire `fatal:` lo deja afuera en silencio.

Quedó anotado lo que **no** se capturó: el fallo por permisos, que necesita un remoto real que rechace la
autenticación. Su patrón queda sin escribir hasta tenerlo — escribirlo de memoria es exactamente lo que
ese archivo existe para evitar.

## Lo que ya existía

El reconocimiento por texto **no es un mecanismo nuevo**: `electron/ipc/git-sync.ts` ya lo hacía para «no
upstream branch». Esto no inventa nada, completa una cobertura que había quedado en un caso, y la saca del
proceso principal para poder probarla con tablas.

## Tres reglas que el diseño sostiene

**El texto de Git nunca se pierde.** Va plegado dentro del aviso, no reemplazado. Cuando la explicación
acierta el original sobra; cuando falla —y va a fallar, porque los mensajes de Git cambian entre versiones
y con el idioma del sistema— es lo único que permite entender qué pasó, y lo que hace falta pegar para
pedir ayuda afuera. Con `select-text` explícito, porque el caso de uso es copiarlo.

**La acción la ejecuta la persona.** Empujar y reapuntar tocan el remoto. Se descartó reapuntar
automáticamente al detectar el desajuste: es justo lo que Git se negó a hacer y por buenos motivos —hay
dos nombres y sólo la persona sabe cuál conservar—. Automatizarlo puede dejar publicada una rama con un
nombre que ya no describe nada, que es como este repositorio llegó a tener
`origin/change/name-task-in-commit-message`.

**Sin salida no hay botón.** Sin remoto configurado o con el servidor caído se explica qué pasó y no se
ofrece nada: un botón que no resuelve nada es peor que ninguno. Tiene su prueba.

## Lo que no se hizo

**Traducir toda la salida de Git.** Es tentador y es una trampa: produciría textos en castellano que
*parecen* explicar y que son una traducción literal de algo que ya era incomprensible, tapando el
original. Lo que no se reconoce se muestra como viene, y `unknown` es un resultado explícito y no un hueco.

**Cambiar `push.default`.** Es configuración de la persona, y su valor actual —`simple`— es justamente el
que produjo la protección que funcionó.

**Borrar la rama vieja del remoto** al reapuntar. Es otra decisión, con otras consecuencias: puede haber
alguien más siguiéndola.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm exec eslint` limpio sobre lo tocado.
`openspec validate recover-from-push-failures --strict` válido.

`pnpm test` en **965 tests**, corrida completa en verde y sin flakes —a diferencia de la corrida anterior,
donde tres archivos cayeron por timeout con `electron:dev` corriendo y pasaron aislados en 8,5 segundos—.
Entran 25 pruebas nuevas: los cinco fallos reales sobre el reconocedor, la forma del mensaje, y el
comportamiento del aviso.

## Lo que falta

La tarea 6.6: Ale provoca el fallo de nuevo y dice si la explicación alcanza para saber qué hacer. Es el
único criterio que importa acá — el trabajo entero existe porque el texto anterior no alcanzaba.
