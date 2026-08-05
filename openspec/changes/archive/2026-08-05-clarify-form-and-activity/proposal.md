## Why

Dos superficies no declaran qué son, y Ale tuvo que preguntar por las dos.

El formulario para empezar un cambio pide objetivo, nombre y alcance sin decir qué se hace con eso.
Nada de lo que se escribe se guarda en un archivo: los tres campos arman una instrucción de texto
—`composeProposeInstruction` en `components/pipeline/pipeline-next-action.ts:199`— que recibe un
runtime, y es el agente el que escribe `proposal.md`, `design.md` y `tasks.md`. La instrucción completa
sí se ve, pero recién en el paso siguiente, dentro del lanzador
(`components/pipeline/PipelineRuntimeLauncher.tsx:265`). Quien completa el formulario no tiene forma de
saber si está escribiendo el artefacto o el encargo.

La columna de actividad, sin ningún cambio abierto, muestra la última sesión que corrió en el
repositorio. Eso es lo decidido en `filter-activity-by-change` —sin cambio abierto no hay contra qué
filtrar— pero el encabezado declara el runtime y el estado y **no declara cuándo**: la fecha sólo vive
en el selector de sesiones, que no se renderiza cuando hay una sola
(`components/pipeline/OpenSpecDashboard.tsx:1493`). El resultado observado es una sesión del día
anterior presentada sin ninguna marca temporal, que se lee como actividad en curso.

## What Changes

El formulario declara qué hace con lo que se escribe. Una línea arriba dice que esos campos arman el
encargo que recibe el agente, no los artefactos, y cada campo declara dónde termina: el objetivo y el
alcance como líneas de la instrucción, el nombre como identificador del cambio y como carpeta bajo
`openspec/changes/`. El cuerpo del formulario se ensancha para que esos textos no lo aprieten.

La columna de actividad declara cuándo corrió la sesión que está mostrando, en su encabezado y no sólo
en el selector. Cuando no hay ningún cambio abierto, además declara que es la última del repositorio, en
vez de dejar que se lea como lo que está pasando ahora.

Queda **fuera de alcance**: cambiar qué sesión se elige mostrar —la decisión de
`filter-activity-by-change` no se revisa—, mover la instrucción del lanzador al formulario, y el ancho
de los paneles de artefactos, que sigue sin poder reproducirse.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que el formulario declare qué se hace con lo que
  se escribe. «La actividad mostrada corresponde al cambio abierto» pasa a exigir que se declare cuándo
  corrió la sesión y, sin cambio abierto, que se declare que es la última del repositorio.

## Impact

En `components/pipeline/PipelineNewChangeFlow.tsx` se suman la línea de encabezado y las ayudas por
campo. En `components/pipeline/OpenSpecDashboard.tsx` el encabezado de la columna suma la fecha de la
sesión y la declaración de alcance. En `OpenSpecDashboard.module.css` se ensancha el cuerpo del
formulario.

En i18n, las claves nuevas se escriben en ES, EN y ZH. En pruebas se cubre que el formulario declara el
destino de cada campo y que la columna declara cuándo corrió la sesión.

No se agregan dependencias. No se toca el proceso principal.
