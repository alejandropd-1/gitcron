# Proposal

## Why

GitCron lleva a mano su propia lista de las herramientas que OpenSpec configura
(`OPENSPEC_TOOL_DIRECTORIES`, `electron/pipeline/openspec-tooling.ts`), y a partir de ella decide qué
herramienta está presente, cuál está configurada y si la integración está al día. Esa lista quedó
atrás de OpenSpec 1.13 —Codex y Antigravity ahora escriben en `.agents`, no en `.codex`/`.agent`;
GitHub Copilot en `.github`, no en `.github-copilot`; «GitHub Workflows» ni siquiera es una
herramienta de OpenSpec— y el 2026-09-25 costó un día entero de defectos en cadena en OdontoPau
(change `actualizar-motor-local-del-repo`, grupo 6): «Actualización detenida» con un motivo falso,
«Codex sin configurar», «Falta en Codex y GitHub Workflows» con botones «Actualizar» que no podían
arreglar nada. Se emparcharon tres lectores con reglas propias (`.openspec-target`, «la categoría
ci no cuenta»), pero la causa sigue: cada versión nueva de OpenSpec puede volver a desfasar la lista.

Medido el 2026-09-25: OpenSpec no tiene un comando que liste sus herramientas, pero su paquete trae
la lista (`AI_TOOLS`) y las funciones con las que el propio motor decide qué hay en un proyecto
(`getAvailableTools`, `getToolStates`, `getAllToolVersionStatus`, `getToolsNeedingProfileSync`).
Corridas sobre OdontoPau contestan la verdad: disponible Codex, configurada Codex, al día, nada
que sincronizar. Sobre gitCronos: seis disponibles, cinco configuradas, Zcode presente sin configurar
—el caso real en el que hoy GitCron ofrece «Actualizar», que no configura herramientas—.

Decisión de Alejandro (2026-09-25): **del motor, con respaldo**. GitCron le pregunta al motor que
responde en cada repositorio; si no puede, usa su lista propia y lo dice en pantalla; una prueba
avisa cuando la lista propia se desfasa.

## What Changes

- GitCron obtiene del motor resuelto en cada repositorio la lista de herramientas y, por cada una,
  si está presente, si está configurada y si necesita actualizarse, más si el perfil de workflows
  requiere sincronizar. Lo corre en un proceso aparte, con tope de tiempo, y sólo si el paquete
  encontrado es la misma versión que responde.
- Si no puede —paquete no encontrado, versión distinta, la parte interna de OpenSpec cambió—, usa
  su lista propia, que pasa a ser una copia de la de OpenSpec de la versión del ciclo SDD (1.13), y
  la pantalla lo avisa con el motivo.
- Una prueba falla si la copia propia no corresponde a la versión del ciclo SDD, y un script la
  vuelve a capturar del motor.
- La integración está «al día» cuando las herramientas configuradas están al día y el perfil no
  requiere sincronizar, que es exactamente lo que `openspec update` arregla. Una herramienta presente
  sin configurar se muestra aparte y ofrece inicializarla, nunca «Actualizar».
- Se retiran los parches que esto reemplaza: la entrada «GitHub Workflows», la regla «la categoría
  ci no cuenta» y la lectura propia de `.openspec-target` en los tres lectores.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-openspec-engine`: la lista y el estado de las herramientas salen del motor, con
  respaldo declarado; cambia qué significa «integración al día» y qué se ofrece para una
  herramienta presente sin configurar.

## Impact

- Proceso principal: un lector nuevo del motor (`electron/pipeline/`), `buildEngineStatusSnapshot`
  y la divergencia del perfil (`electron/ipc/pipeline-openspec.ts`), `readOpenSpecTooling`
  (`electron/pipeline/repo-evidence-reader.ts`), `inspectInstalledEvidence`
  (`electron/pipeline/openspec-evidence.ts`), el registro (`electron/pipeline/openspec-tooling.ts`).
- Renderer: los que hoy importan el registro estático (`OpenSpecDashboard.tsx`,
  `OpenSpecReadiness.tsx`, `OpenSpecUpdateReview.tsx`, `OpenSpecUpdateRunner.tsx`,
  `pipeline-domain.ts`) pasan a leer el informe que viaja en el estado del motor.
- Tipos: el estado del motor suma el informe de herramientas.
- Un script para recapturar la copia propia; sin dependencias nuevas.
- Riesgo aceptado: usa una parte interna del paquete de OpenSpec. Por eso el respaldo y el aviso.
