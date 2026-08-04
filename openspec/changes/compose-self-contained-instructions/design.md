## Context

Cuatro funciones componen instrucciones en `components/pipeline/pipeline-next-action.ts`. Sólo una
sobrevivió al problema:

| función | hoy | funciona sin comandos instalados |
|---|---|---|
| `composeArchiveInstruction` | `openspec archive <id> --yes` | sí |
| `composeApplyInstruction` | `/opsx:apply <id>` + tarea | **no** |
| `composeProposeInstruction` | `/opsx:propose <slug>` + objetivo | **no** |
| `composeExploreInstruction` | `/opsx:explore` + descripción | **no** |

`archive` se arregló cuando el defecto se hizo visible; las otras tres quedaron porque su fallo era
silencioso. Los guiones que definen esos comandos —`.agent/workflows/opsx-*.md`— son markdown que
indica correr `openspec new change`, `openspec status --change … --json` y
`openspec instructions <artefacto> --change … --json`. Nada de eso exige que el guion esté
instalado.

## Goals / Non-Goals

**Goals:**

- Que la instrucción funcione con cualquier runtime, tenga o no los comandos.
- Que diga lo mismo que el guion `opsx` equivalente, para que el resultado no dependa del camino.

**Non-Goals:**

- Instalar comandos en `.claude/commands/`. Sería resolver el caso de un runtime y dejar el
  problema para el siguiente.
- Que GitCron ejecute el CLI por su cuenta para armar la instrucción. Es la evolución natural
  —llamar a `openspec instructions` y pasar su contenido—, pero exige un canal IPC nuevo y entra en
  el trabajo de consumir el CLI como fuente, que va aparte.
- Tocar `composeArchiveInstruction`.

## Decisions

**La instrucción nombra los comandos, no los ejecuta ni los transcribe.** Se le indica al agente que
corra `openspec status` e `openspec instructions` antes de escribir, que es exactamente lo que hace
el guion. La alternativa era pegar el contenido del guion entero en la instrucción; se descartó
porque duplicaría un texto que se mantiene en el paquete de OpenSpec y quedaría desactualizado en
cuanto cambie.

**Se conserva la forma de dos bloques: acción y contexto.** La instrucción sigue siendo un párrafo
de acción seguido del detalle, como hasta ahora. Cambia qué dice la primera línea, no la estructura,
así lo que se muestra bajo "Ver instrucción" se lee igual.

**El texto va en español.** Es el idioma del repositorio y el de las instrucciones que ya se le pasan
a los agentes. No es texto de interfaz: no se traduce ni pasa por i18n.

**Los tests fijan el texto completo.** Hoy hay cuatro casos que comparan la cadena entera, y se
actualizan en vez de relajarse a comprobar que "no empieza con `/`". Fijar el texto es lo que hace
que un cambio accidental se vea en la revisión; una aserción laxa dejaría pasar una instrucción
inservible con tal de que no tuviera slash.

## Risks / Trade-offs

- **Una instrucción en prosa es más ambigua que un comando.** → Por eso nombra los comandos exactos
  del CLI: el agente no tiene que inferir el procedimiento, tiene que ejecutarlo. Y es lo mismo que
  ya ocurre con `archive`, que funciona.
- **Un runtime que sí tiene los comandos ya no los usará.** → Hará el mismo trabajo por el camino
  explícito. La ventaja es que el resultado deja de depender de qué runtime se eligió, que era la
  fuente del problema.
- **No hay forma de probar el efecto real sin lanzar una sesión.** → Los tests fijan el texto
  compuesto, que es lo verificable sin ejecutar un agente. Que la sesión efectivamente avance lo
  comprueba Ale con la aplicación, y está en las tareas.
