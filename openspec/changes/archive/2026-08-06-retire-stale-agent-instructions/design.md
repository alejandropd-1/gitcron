## Context

`AGENTS.md` declara dónde vive el método y por qué: las reglas viajan por `openspec/config.yaml`, que
el CLI entrega a cualquier ejecutor que pida instrucciones, y una regla que sólo exista en un archivo
suelto no es vinculante. Ese texto se escribió a partir de un incidente real —un runtime trabajó con
reglas locales sin saber que había un flujo— y la capacidad ya lo tiene como requisito.

Lo que nunca se hizo es la mitad de limpieza que ese requisito implica: retirar los archivos sueltos
que quedaron dando órdenes. Siguen ahí, en la raíz y en `docs/`, con fechas de junio y julio, y un
agente que arranque hoy los encuentra antes que la metodología.

## Goals / Non-Goals

**Goals:**

Que no queden en el repositorio instrucciones de trabajo que contradigan la metodología vigente. Que lo
que se retira siga siendo legible como registro histórico.

**Non-Goals:**

Reescribir el roadmap. Tocar `design-qa.md`, que no ordena nada. Cambiar `AGENTS.md`, que ya dice lo
correcto.

## Decisions

**Se archivan, no se borran.** Los cuatro describen trabajos que efectivamente se hicieron —la
integración del Temporal Agent, una pasada de optimización, el roadmap de fases F1→F6— y sirven para
entender por qué el proyecto tiene la forma que tiene. Lo que sobra es su autoridad, no su contenido.
Se descartó borrarlos: perderíamos el registro de decisiones que hoy explican código vivo.

**Cada uno lleva una nota de encabezado, no un archivo índice aparte.** La nota va donde alguien la va
a leer: arriba del texto que podría tomar como orden. Un `README` en `docs/historico/` explicando que
todo lo de adentro está retirado depende de que alguien lo abra primero, que es el mismo defecto que se
está corrigiendo.

**`docs/briefs/` se mueve entero.** Es el mecanismo al que apunta el roadmap, y su contenido ya está
todo bajo `_done`. Se descartó dejarlo en su lugar: mientras exista en la ruta que el roadmap nombra,
la instrucción sigue siendo ejecutable aunque el roadmap esté archivado.

**El roadmap se archiva sin reescribirse.** Dice «documento de Ale — NO pegar a agentes», así que su
contenido es de Ale y no me corresponde reinterpretarlo. Lo que sí corresponde es que deje de estar en
`docs/`, donde convive con las invariantes y la fuente de verdad como si tuviera el mismo estatus.

## Risks / Trade-offs

**Mover el roadmap le saca a Ale su tablero de su lugar habitual.** → Queda en `docs/historico/` con su
contenido intacto y la nota aclara que su estado es de junio. Si quiere un tablero vigente, es trabajo
propio y este change lo declara fuera de alcance.

**Alguien puede buscar esos archivos donde estaban.** → El movimiento queda en la historia de Git como
renombre, así que `git log --follow` los alcanza. Es la misma propiedad que `group-archive-move-together`
protege para los artefactos, y por eso conviene que el movimiento viaje entero en un commit.

**No se puede comprobar con un test que un agente ya no los lea.** → Cierto: no hay forma de probar
esto con la suite. Lo verificable es que los archivos ya no están en las rutas donde se los encuentra
por accidente, y que ninguno de los tres documentos que sí rigen los referencia.

## Open Questions

Ninguna.
