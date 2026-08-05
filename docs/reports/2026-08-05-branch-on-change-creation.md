# Una rama por cambio, sólo al crearlo

**Change:** `branch-on-change-creation` · **Fecha:** 2026-08-05 · **Tareas:** 13/14 (falta la validación de Ale creando un cambio real)

## Qué se hizo, y qué no

Al empezar un cambio con la tarea clara, el formulario declara que se va a trabajar en `change/<slug>`,
crea la rama y deja el repositorio parado ahí antes de lanzar la sesión. La casilla viene marcada y se
puede desmarcar; desmarcada no se ejecuta ninguna operación de Git.

**Sólo eso.** Ale acotó explícitamente el alcance: nada de qué hace el archivado con la rama, ni
fusionarla, ni borrarla, ni pararse en ella al abrir un cambio existente. El flujo de exploración tampoco
entra, porque no crea ningún cambio y no tiene slug con el cual nombrar una rama.

## Por qué acá y no en otro lado

La aplicación no crea el cambio: `composeProposeInstruction` arma una instrucción que nombra
`openspec new change "<slug>"` y un runtime la ejecuta. El único momento en que la aplicación conoce el
slug y todavía no abrió ningún proceso es cuando el formulario se valida. Después, el cambio ya lo creó
un agente y la aplicación se enteraría tarde.

Se descartó crearla dentro del lanzador: es el único que abre procesos, meterle una escritura de Git le
agrega una responsabilidad que no tiene, y su fallo se confundiría con un fallo de arranque.

## Tres decisiones que conviene conocer

**Un fallo no lanza la sesión.** Si la rama no se puede crear —porque ya existe, o por lo que sea— se
informa el motivo real, sin normalizar, y no se arranca nada. Arrancar igual dejaría al agente trabajando
en una rama distinta de la que la persona acaba de leer, que es divergencia entre lo declarado y lo
ejecutado.

**No se reutiliza una rama existente.** Cambiarse a ella arrastraría los commits de otro trabajo, que es
una decisión con consecuencias y no algo que corresponda adivinar. Se informa y decide la persona.

**El prefijo `change/` es deliberado.** Distingue las ramas de trabajo de las demás y no choca con
`imagined/*` ni `flight/*`, que ya tienen significado en este proyecto. Un slug pelado como rama no dice
que sea de un cambio.

## Sobre la escritura de Git

Es una escritura nueva, así que se declara antes de ocurrir y se puede desactivar, según la invariante 6.
Usa el canal `git:create-branch` que ya existía (`electron/ipc/git-ops.ts:359`): sin `fromHash` llama a
`checkoutLocalBranch`, que crea y se para en la rama. No se agregó ninguna superficie de escritura nueva
en el proceso principal.

No se agrega manejo propio del árbol sucio. Git arrastra los cambios sin confirmar a la rama nueva, que
suele ser lo que se quiere; cuando no puede, falla, y ese fallo se informa. Un stash automático sería una
escritura más que nadie pidió.

## Lo que esto no resuelve

La atribución no queda resuelta. Sólo el trabajo empezado desde la aplicación con la tarea clara queda
separado por rama; lo que se edite a mano en `main`, o lo que corra un agente fuera de la aplicación,
sigue sin rama propia. Es un punto de partida, no una solución, y consumir la rama para atribuir archivos
en el panel de preparación es un trabajo aparte que no se hizo.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **99 archivos / 716 tests, verde en dos corridas
seguidas**. El flake conocido no apareció en estas dos. Lint limpio sobre los archivos tocados —el CSS
queda fuera de la configuración de ESLint, que ya era así—. `openspec validate branch-on-change-creation
--strict` válido.
