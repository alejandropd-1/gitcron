## Context

La aplicación no crea el cambio: `composeProposeInstruction`
(`components/pipeline/pipeline-next-action.ts:199`) arma una instrucción que nombra
`openspec new change "<slug>"`, y un runtime la ejecuta. El único momento en que la aplicación conoce el
slug antes de que exista el cambio es cuando el formulario de propuesta se valida, justo antes de
entregar la instrucción al lanzador.

Ese es el punto donde tiene que crearse la rama, y es también el único: después, el cambio ya lo creó un
agente y la aplicación se enteraría tarde.

La restricción que ordena todo lo demás es la invariante 6: las escrituras de Git nuevas son sólo las que
el change autoriza explícitamente, y con confirmación de la persona. Crear una rama no es destructivo,
pero es una escritura, así que se declara antes y se puede desactivar.

## Goals / Non-Goals

**Goals:**

Que empezar un cambio con la tarea clara deje el trabajo en su propia rama, declarado antes de ocurrir y
desactivable. Que un fallo al crearla no deje al agente trabajando en otra rama que la declarada.

**Non-Goals:**

Qué hace el archivado con la rama, fusionar, borrar, o pararse en la rama al abrir un cambio existente.
El flujo de exploración. Consumir la rama para atribuir archivos en el panel de preparación.

## Decisions

**La rama se crea al validar el formulario, no al lanzar la sesión.** Es el momento en que el slug existe
y todavía no se abrió ningún proceso. Se descartó crearla dentro del lanzador: el lanzador es el único
que abre procesos y meterle una escritura de Git le agrega una responsabilidad que no tiene, además de
que su fallo se confundiría con un fallo de arranque.

**El nombre es `change/<slug>`.** Con prefijo para que las ramas de trabajo se distingan de las demás de
un vistazo y para no chocar con `imagined/*` ni `flight/*`, que ya tienen significado en este proyecto.
Se descartó usar el slug pelado: un identificador como `add-opencode-runtime` como rama suelta no dice
que sea de un cambio.

**Un fallo no lanza la sesión.** Se descartó lanzar igual en la rama actual: la persona acaba de leer que
se iba a trabajar en `change/<slug>`, y arrancar en otra parte sin que lo pida es exactamente la clase de
divergencia entre lo declarado y lo ejecutado que este proyecto trata como defecto. Se descartó también
intentar cambiarse a la rama si ya existe: reutilizar una rama de un trabajo anterior es una decisión con
consecuencias —arrastra sus commits— y adivinarla es peor que informar y dejar decidir.

**La casilla viene marcada.** Se descartó que venga desmarcada: dejaría la función invisible y el trabajo
seguiría en `main` por inercia. Viene marcada y con su declaración a la vista en el mismo formulario, así
que no es silencioso: para que ocurra hay que apretar el botón que ya se iba a apretar, habiendo leído
qué va a pasar.

**El motivo del fallo se muestra tal como vuelve.** Sin normalizar a un mensaje propio, igual que el
archivado: un mensaje genérico obliga a ir a la terminal a averiguar qué pasó.

## Risks / Trade-offs

**Crear una rama con el árbol sucio arrastra los cambios sin confirmar.** → Es el comportamiento normal de
Git y suele ser lo que se quiere: el trabajo en curso pasa a la rama nueva. Cuando Git no puede hacerlo,
falla, y ese fallo se informa y detiene el arranque. No se agrega ningún manejo propio —ni stash
automático— porque sería una escritura más que nadie pidió.

**El repositorio queda con muchas ramas si no se limpian.** → Es real y queda fuera de alcance por
decisión explícita. Este change deja el dato disponible; qué hace el archivado con la rama es la decisión
que sigue, y conviene tomarla viendo el efecto en vez de anticiparla.

**La atribución no queda resuelta por esto.** → No se afirma que lo esté. Sólo el trabajo empezado desde
la aplicación con la tarea clara queda separado; lo que se edite a mano en `main`, o lo que corra un
agente fuera de la aplicación, sigue sin rama propia. Es un punto de partida, no una solución.

## Open Questions

Ninguna que bloquee. Queda para decidir más adelante, ya con ramas reales en el repositorio, qué hace el
archivado con la rama del cambio.
