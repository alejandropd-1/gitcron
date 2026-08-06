## Why

El repositorio tiene cuatro artefactos que le dan instrucciones de trabajo a un agente, y **ninguno
menciona OpenSpec**. Los cuatro son anteriores a que la metodología existiera y siguen en los lugares
donde un ejecutor los encuentra antes que `openspec/config.yaml`.

`NEXT_AGENT_OPTIMIZATION_PROMPT.md` (2 de junio) tiene una sección titulada **«Modo de trabajo
obligatorio»** que prescribe trabajar por fases pequeñas y validar cada fase. Contradice de frente a
`AGENTS.md`, que declara: «El método es OpenSpec, y no hay otro».

`CLAUDE_CODE_PROMPT.md` (2 de junio) instruye «Trabajá por FASES y PARÁ en cada checkpoint». Es el
modelo de fases que `retire-lifecycle-phases` acaba de jubilar del producto, sobreviviendo como orden
directa a quien lea el archivo.

`docs/02_ROADMAP.md` (24 de julio) declara en su segunda línea: «Los agentes reciben SOLO los briefs de
`docs/briefs/`». Ese directorio existe, y su contenido está entero bajo `_done` desde el 18 de junio:
el mecanismo está retirado pero el archivo sigue apuntando a él como única fuente.

Esto no es desorden cosmético. Es exactamente el incidente que `AGENTS.md` narra como fundamento de su
propia regla —«un runtime sin los comandos instalados nunca vio el flujo y trabajó con reglas locales
sin saberlo»— y que la capacidad ya cubre con el requisito «La metodología viaja por el canal de la
herramienta», cuyo escenario dice que una regla que contradice a la herramienta se retira. Nunca se
ejecutó ese retiro sobre estos archivos.

## What Changes

Los cuatro artefactos se mueven a `docs/historico/`, con una nota de encabezado que declara que ya no
rigen y qué los reemplazó. Se archivan en vez de borrarse porque describen trabajos que se hicieron y
sirven para entender por qué el proyecto es como es; lo que se retira es su autoridad, no su registro.

`docs/briefs/` se mueve entero, con su `_done` adentro.

Queda **fuera de alcance**: reescribir el roadmap en términos de OpenSpec. Es el tablero de Ale y su
contenido es suyo; si quiere uno vigente, lo abre como trabajo propio. Acá sólo deja de ser una
instrucción que un agente pueda tomar como vigente. Tampoco entra `design-qa.md`, que es un registro de
una revisión y no le ordena nada a nadie.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que no coexistan en el repositorio
  instrucciones de trabajo que contradigan la metodología vigente.

## Impact

Se mueven `CLAUDE_CODE_PROMPT.md`, `NEXT_AGENT_OPTIMIZATION_PROMPT.md`, `docs/02_ROADMAP.md` y
`docs/briefs/` a `docs/historico/`, cada uno con su nota de encabezado. No se toca código, ni tests, ni
i18n, ni el proceso principal.

Ninguno de los cuatro está referenciado desde `AGENTS.md`, `openspec/config.yaml` ni
`docs/01_INVARIANTES.md`, que son los que sí rigen.
