## Why

GitCron habla con OpenSpec un subconjunto del protocolo de la versión 1.5. La herramienta va por
la 1.11 y el proyecto se actualizó el 2026-09-01, pero la aplicación no: **no hay nada roto —los
nueve comandos que ejecuta siguen existiendo— y por eso el desfase no se nota**. Lo que se pierde
es todo lo que se agregó desde entonces.

La medición, del 2026-09-02:

```
operationGuidance    0 archivos      canal para pasarle reglas de ejecución al agente
--diff (1.11)        0               mostrar qué altera un change
--archived (1.9)     0               verificar que un change archivado esté completo
opsx-update (1.6)    0               revisar el plan de un change sin tocar código
templates · workset · schemas        0
```

Del JSON que devuelve `openspec instructions`, GitCron consume `.state` y `.tasks`. **Ignora
`context`, `operationGuidance`, `contextFiles` e `instruction`** —los cuatro campos por los que el
CLI entrega el método al ejecutor—.

El caso que lo resume está en `components/pipeline/pipeline-next-action.ts`: cuatro funciones
`compose*Instruction` que **arman a mano el texto** que dicta los comandos a correr. La de
propuesta enumera `openspec new change`, `openspec status` y `openspec instructions` uno por uno,
que es lo que `/opsx-propose` resuelve solo desde la 1.6. Es una instrucción escrita a mano donde
el canal ya entrega una, y quedó congelada con la forma que los comandos tenían hace dos versiones.

Ese es el mismo vicio que el proyecto viene sacando: **una regla escrita en un lugar propio cuando
la herramienta ya la entrega**. Acá aparece un piso más arriba, en el código en vez de en la
documentación.

El rediseño entra al mismo change y no aparte, porque **no se puede separar**: dibujar el
formulario sin saber qué instrucción va a generar es diseñar sobre un contrato que está por
cambiar. Y al revés: decidir qué campos hacen falta obliga a saber qué configura cada uno.

## What Changes

- **El ciclo consume el canal en vez de dictarlo.** Donde hoy hay un texto compuesto a mano, se
  usa lo que `openspec instructions <operación> --json` devuelve: su `instruction`, su `context` y
  su `operationGuidance`. Lo que la aplicación agrega encima es lo que el canal no sabe —el
  objetivo que escribió la persona y su alcance—, no una lista de comandos.
- **Cada campo declara dónde termina.** El objetivo va a la línea «Objetivo» de la instrucción; el
  alcance, a «Alcance y restricciones»; el nombre, a la carpeta del change. Hoy el formulario lo
  dice al pie de cada campo pero no dice qué queda escrito en el repositorio y qué es sólo texto
  para el ejecutor.
- **Ninguna escritura en Git ocurre sin anunciarse.** Hoy «Revisar y elegir runtime» crea la rama:
  un botón que dice revisar cambia el repositorio de rama. El aviso se decide en el rediseño —una
  confirmación, un cambio de rótulo, o mover la creación al lanzamiento— pero la propiedad se
  declara acá: lo que toca Git se anuncia antes de tocarlo.
- **Se aprovecha lo que la 1.11 ya trae**, en lugar de suplirlo: `--diff` para mostrar qué altera
  un change, `--archived` para no archivar con tareas colgadas, y `opsx-update` para revisar un
  plan sin tocar código.
- **La versión de OpenSpec deja de ser un supuesto.** La aplicación ya muestra la versión detectada
  en su franja; se declara además contra qué versión está escrito el ciclo, para que el próximo
  desfase se vea en vez de descubrirse dos versiones después.

## Non-Goals

- **No se rehace `gestionar-ciclo-openspec-desde-gitcron`.** Ese change describe qué se puede
  operar —editar tareas y artefactos, sincronizar specs, archivar con motivo— y sigue siendo
  válido. Lo que cambia es que varias de sus 53 tareas se escribieron para suplir cosas que el CLI
  viejo no daba: **después de este change hay que releerlo y sacar lo que ya venga hecho**, que es
  el motivo de hacer éste primero.
- **No se toca la disposición del cuerpo de la vista.** Eso es `remaquetar-cuerpo-de-sdd`.
- **No se agregan runtimes ni se toca el hub.** El adaptador de OpenCode ya se registró.
