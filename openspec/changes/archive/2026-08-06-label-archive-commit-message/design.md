## Decisión: el archivado se reconoce por la ruta, no por el estado de Git

El conjunto se considera un archivado cuando alguna de sus rutas está bajo
`openspec/changes/archive/<fecha>-<slug>/` y aporta el mismo identificador que devuelve `soleChangeId`.

**Alternativa descartada: reconocerlo por los renombres.** Sería más preciso —un archivado *es* un
movimiento, y los renombres lo prueban— y evitaría el falso positivo descrito abajo. Se descarta porque
obligaría a `suggestCommitMessage` a recibir estado de Git, y la pureza de `lib/change-commit-scope.ts`
es lo que permite probarlo con tablas. Ese módulo no conoce la forma de `GitFile` ni consulta Git, y esa
propiedad ya sobrevivió a varios refactors por buenas razones; romperla para afinar el texto de una
sugerencia es un mal negocio.

**Falso positivo asumido:** editar el artefacto de un cambio archivado hace meses, sin que haya ningún
archivado nuevo, produciría `chore: archived <slug>`. Se asume porque el mensaje no es falso —el commit
efectivamente toca un cambio archivado—, porque el caso es infrecuente, y sobre todo porque la
sugerencia no pisa lo escrito y se corrige antes de confirmar.

## Decisión: `archived` intercalado, no un prefijo distinto

El mensaje queda `chore: archived <slug>`, conservando el tipo `chore` y el alcance cuando lo hay.

**Alternativa descartada: un tipo propio, como `archive:`.** Sería más explícito y ordenaría el
historial por tipo. Se descarta porque el patrón que ya se escribe a mano en este repositorio es
`chore: archived <slug>` —aparece así en cada archivado del historial— y porque cambiar el tipo
afectaría a cualquier convención de commits que lo consuma, que es un alcance mayor que el problema.
Sostener lo que la persona ya venía escribiendo es exactamente lo que se pide de una sugerencia.

**Alternativa descartada: traducirlo al español.** El producto es en español y sería coherente. Se
descarta porque el resto del mensaje es un tipo convencional en inglés y un slug en kebab-case, y
porque el historial ya tiene la palabra en inglés: cambiarla ahora partiría en dos el mismo patrón.

## Decisión: no tocar el caso de varios cambios

Un conjunto que abarca más de un cambio sigue devolviendo la descripción vacía.

**Alternativa descartada: nombrar el archivado aunque haya otros cambios.** Se descarta porque la
descripción vacía es una señal deliberada de que el commit está mezclando trabajos, y llega antes de
confirmar. Rellenarla con el archivado escondería justo el caso en que hace falta que una persona
escriba el mensaje.

## Riesgo

**Romper alguna prueba de tabla existente sobre `suggestCommitMessage`.** Mitigación: es lo que las
pruebas tienen que hacer si el comportamiento cambia; se revisan una por una y se actualiza sólo lo que
corresponde al caso de archivado, sin tocar las demás filas.

## Sin medir

No se midió con qué frecuencia aparece el falso positivo, porque haría falta recorrer el historial
buscando commits que toquen archivados viejos sin ser un archivado. Se declara como caso conocido, no
como caso medido.
