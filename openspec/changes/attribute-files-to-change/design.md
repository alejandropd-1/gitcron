## La decisión que falta

Hay dos fuentes posibles para atribuir un archivo de código a un cambio, y la elección no está tomada.
Este documento propone una y deja escrita la otra con su motivo. **Ale confirma antes de implementar.**

## Decisión propuesta: la rama como fuente, la observación por sesión como complemento

Se propone que la atribución primaria venga de la rama —`change/<slug>`, lo que separa el trabajo en
Git— y que la observación por sesión se sume después como señal secundaria, rotulada como observación.

El motivo es qué afirma cada fuente. Una rama es una afirmación deliberada: alguien declaró que ese
trabajo pertenece a ese cambio, y Git la sostiene con independencia de quién editó los archivos, con
qué herramienta y desde dónde. Una observación de árbol de trabajo es una correlación temporal: dice
que unas rutas cambiaron mientras una sesión estaba abierta, que no es lo mismo que decir que esa
sesión las cambió.

**Alternativa descartada como fuente primaria: la observación por sesión.** Es la que está más a mano
—`captureWorkingTree` ya calcula las rutas y las tira, el hub ya la llama antes y después de cada
sesión, y la sesión ya conoce su `changeId`; sólo hay que dejar de descartar el dato— y no depende de
que nadie adopte ninguna convención. Se descarta como fuente primaria por sus dos puntos ciegos, que
no son defectos a corregir sino límites de lo que el método puede saber: sólo ve agentes lanzados
desde la aplicación, con lo cual todo el trabajo hecho a mano o desde la terminal queda sin atribuir; y
dos sesiones solapadas se ven las rutas entre sí, con lo cual atribuiría a un cambio archivos de otro.
Una fuente que se equivoca en silencio no puede ser la principal en una pantalla desde la que se
confirma trabajo en Git.

No se descarta del todo, y ahí está el matiz: cubre exactamente el hueco que la rama deja cuando la
convención no se cumple. Por eso entra como complemento, con la etiqueta explícita "tocado por una
sesión de X", nunca "pertenece a X".

**Contrapartida asumida:** la rama hoy no existe. `git branch --list "change/*"` no devuelve nada
sobre 35 ramas locales. Este camino depende de `carry-branch-rule-in-config` y no rinde nada hasta que
empiecen a aparecer ramas de verdad. Es una espera real y hay que decirlo, no disimularla: si Ale
prefiere ver algo funcionando ya, la observación por sesión da resultado antes y es un argumento
legítimo a favor de invertir el orden.

## Decisión propuesta: la confianza viaja con el dato

Cada atribución lleva de dónde salió y con qué confianza, en el mismo tipo que la transporta, en vez de
que la vista lo deduzca de qué campo vino relleno.

**Alternativa descartada: un único campo de `changeId` por archivo.** Es más simple de consumir y de
tipar. Se descarta porque colapsa dos afirmaciones que no valen lo mismo, y quien lea la pantalla no
tendría cómo distinguirlas: la persona que confirma en Git necesita saber si está viendo una
declaración o una correlación. Es el mismo criterio por el que la evidencia del proyecto ya lleva
`confidence` en vez de presentar todo como hecho.

## Decisión propuesta: el alcance sigue siendo puro

`lib/change-commit-scope.ts` recibe la atribución como parámetro. No consulta Git ni conoce la forma de
`GitFile`.

**Alternativa descartada: que la derivación consulte la atribución por sí misma.** Ahorra pasar el dato
por la cadena de llamadas. Se descarta porque la pureza de ese módulo es lo que permite probarlo con
tablas, y esa propiedad ya sobrevivió a varios refactors por buenas razones. Un acceso a estado desde
adentro la rompe de una vez y para siempre.

## Riesgos

**Una atribución errónea que parezca cierta.** Es el riesgo central, y es de producto: alguien confirma
archivos que no corresponden porque la aplicación parecía haberlo verificado. Mitigación: ninguna
afirmación sin su confianza, los puntos ciegos visibles en la pantalla donde se atribuye, y nada
preseleccionado —que ya es una decisión tomada por otro motivo y que acá vuelve a proteger.

**Depender de una convención que nadie cumple.** Mitigación: `carry-branch-rule-in-config` la pone en
el canal que alcanza a cualquier ejecutor, y la comprobación honesta es contar ramas `change/*` después,
no suponer adopción.

## Sin medir

No se midió cuánto cuesta conservar las rutas del árbol de trabajo en el snapshot ni cuánto crece con
un árbol sucio grande. Tampoco se sabe cuántos archivos quedarían efectivamente atribuidos por cada
fuente: para saberlo hace falta que existan ramas y sesiones, y hoy no hay ni una rama.
