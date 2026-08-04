## Why

Tres de las cuatro instrucciones que la guía compone empiezan con un slash command —`/opsx:apply`,
`/opsx:propose`, `/opsx:explore`— y sólo funcionan si el runtime elegido lo tiene instalado. En este
repositorio los comandos viven en `.agent/workflows/` y `.opencode/commands/`; **`.claude/commands/`
no existe**, así que con Claude las tres fallan.

Ya pasó una vez y el propio código lo documenta, en
`components/pipeline/pipeline-next-action.ts:146`:

> Antes devolvía `/opsx:archive <id>`, un slash command que Claude Code no tiene —los lee de
> `.claude/commands/`, y ahí no existe `opsx`—. La sesión cerraba en milisegundos con
> `"Unknown command"` e `is_error: false`, así que la app declaraba éxito sin haber archivado nada.

**Ese arreglo se aplicó sólo a `archive`.** Las otras tres quedaron con el defecto original. Desde
`fail-claude-unknown-command-runs` el fallo al menos se declara en vez de mentir, pero la acción
sigue sin ocurrir: el botón "Continuar con la tarea" abre el lanzador, la sesión arranca, y con
Claude termina en nada.

La causa de fondo es que la guía delega en el runtime un conocimiento que no le corresponde: los
comandos `opsx` **son guiones en markdown** que le dicen al agente qué comandos del CLI correr. Nada
de lo que hacen exige que estén instalados, y componer la instrucción con ese contenido la vuelve
independiente del runtime.

## What Changes

- Las tres instrucciones dejan de empezar con un slash command y pasan a ser autosuficientes: dicen
  qué hacer y qué comandos del CLI de OpenSpec consultar antes de escribir.
- El contenido se alinea con lo que los guiones `opsx` ya indican —`openspec status --json` para el
  estado, `openspec instructions <artefacto> --json` para el template y las reglas—, de modo que un
  agente sin los comandos instalados haga lo mismo que uno que los tenga.
- **BREAKING** para quien dependiera de que la instrucción arrancara con `/opsx:…`. No hay
  consumidores automáticos: la instrucción se muestra bajo "Ver instrucción" y se le pasa al
  runtime elegido.

Fuera de alcance, declarado: no se toca `composeArchiveInstruction`, que ya es autosuficiente y
ejecuta el proceso principal. Tampoco se cambia qué runtime se elige, ni se instalan comandos en
`.claude/commands/` — precisamente porque la salida es no depender de que estén.

## Capabilities

### Modified Capabilities

- `pipeline-guided-workflow`: la instrucción que la guía entrega a un runtime deja de depender de
  comandos instalados en él.

## Impact

- `components/pipeline/pipeline-next-action.ts` — las tres funciones de composición.
- `components/pipeline/__tests__/pipeline-next-action.test.ts` — los cuatro casos que hoy fijan el
  texto con slash command.
- Sin cambios de i18n: las instrucciones no son texto de interfaz traducible, son lo que se le pasa
  al agente.
- Sin cambios de IPC ni de dependencias.
