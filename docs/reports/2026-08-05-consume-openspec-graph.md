# Pipeline consume el grafo de artefactos de OpenSpec

**Change:** `consume-openspec-graph` · **Fecha:** 2026-08-05 · **Tareas:** 14/15 (falta la validación visual de Ale)

**Autoría:** los artefactos y el grueso de la implementación los escribió Zai (z.ai vía OpenCode). Esta
sesión los retomó, encontró y corrigió dos defectos, verificó el cierre y marcó las tareas, que habían
quedado todas sin tildar.

## Qué se hizo

`consume-openspec-status` había cableado `openspec status --json` hasta el renderer y **nadie lo leía**:
el campo `status` existía en `pipeline-view-state.ts` y ningún componente lo consumía. Ahora la pestaña
Artefactos muestra el grafo real: un ítem por artefacto con su estado del CLI —`done`, `ready`,
`blocked`— y, cuando está bloqueado, qué dependencias le faltan.

Cuando el grafo no existe —`status` ausente, o `available: false` porque el CLI no pudo correr— la
superficie **no se renderiza**. No se inventa un estado sustituto derivado de tareas o validación, que
es justamente el modelo propio del que este trabajo empieza a salir.

El alcance quedó acotado a propósito: **no se tocó la barra de fases del encabezado ni el contador
«Paso N de 5»**. `lifecycle()` en `OpenSpecDashboard.tsx` y `LIFECYCLE_TOTAL` en `pipeline-next-action.ts`
siguen exactamente como estaban —verificado: ninguno de los dos archivos figura como modificado—. La
duplicación entre las dos superficies es consciente y se resuelve en una pasada posterior.

## Los dos defectos que se encontraron al retomar

**`tsc` estaba roto.** `pipeline-artifact-graph.test.tsx` importaba `OpenSpecChangeStatus` desde
`../pipeline-view-state`, que lo importa para uso interno pero no lo re-exporta:

```
error TS2459: Module '"../pipeline-view-state"' declares 'OpenSpecChangeStatus' locally,
but it is not exported.
```

Los tests pasaban igual porque Vitest no chequea tipos, así que una corrida verde no lo delataba. Se
corrigió importando el tipo desde `@/types/pipeline`, que es de donde lo toma el componente.

**La traducción de `ready` al español no decía nada.** Estaba como `'corriente'`, que no transmite que
el artefacto se puede escribir, y además chocaba con `'listo'` para `done`: dos estados distintos que se
leían casi igual. Quedó `hecho` / `habilitado` / `bloqueado`. «Habilitado» es la palabra que el propio
`AGENTS.md` usa para esto —«las dependencias son habilitadoras, no barreras»—, así que la interfaz habla
el mismo idioma que la metodología. El comentario del CSS que repetía «corriente» se corrigió también.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero **después de la corrección**; antes fallaba. `pnpm test` en
**100 archivos / 725 tests, verde en dos corridas seguidas**. El flake conocido de los archivos que
crean repositorios Git reales no apareció en ninguna de las dos; sigue sin estar resuelto. Lint limpio
sobre los cinco archivos tocados. `openspec validate consume-openspec-graph --strict` válido.

## Lo que queda para la validación visual

Además de lo que pide la tarea 5.5, hay una decisión de ubicación que conviene mirar con la pantalla
delante: el grafo se renderiza en `pipeline-details__body`, arriba de los paneles, así que aparece
sobre las cinco sub-pestañas —Propuesta, Diseño, Specs, Tareas y **Diffs**—. En las cuatro primeras
declara el estado de lo que se está por leer, que es el fundamento del diseño; sobre Diffs aporta
menos. No se cambió porque el diseño eligió esa ubicación explícitamente, pero si en la revisión
molesta, acotarlo a las sub-pestañas de artefactos es un cambio chico.

## Lo que sigue pendiente

Este change es el primer paso del pendiente más viejo. Lo que **no** hace: retirar la barra
`Explore → Propose → Apply → Validate → Archive` ni el `LIFECYCLE_TOTAL = 5` que la sostiene. Mientras
las dos superficies convivan, el panel declara el estado de dos maneras distintas —etapa operacional y
estado por artefacto— y eso es deuda declarada, no un descuido.
