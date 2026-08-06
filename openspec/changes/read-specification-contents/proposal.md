## Why

La barra lateral lista las especificaciones consolidadas de `openspec/specs/` pero no deja abrir
ninguna: las renderiza como `<div>` y no como botón, porque no hay nada que mostrar al pulsarlas. El
tipo que las transporta lo dice —`OpenSpecSpecificationEvidence` en `types/pipeline/index.ts:112`
tiene `specificationId`, `requirements` y `sourceRef`, y ningún campo de contenido—, así que la lista
declara cuántos requisitos tiene cada especificación y nada más.

Lo llamativo es que el proceso principal ya lee el archivo y después lo tira. En
`electron/pipeline/repo-evidence-reader.ts:312` hace `safeReadRepoFile(repoPath, sourceRef)` y en la
línea 316 se queda sólo con `countRequirements(specFile.content)`: el texto completo estuvo en memoria
y se descartó. Falta llevarlo al snapshot, que es exactamente lo que el lector ya hace con los
artefactos de un cambio.

El costo de no tenerlo es que las especificaciones consolidadas —el resultado acumulado de todos los
cambios archivados, o sea el estado declarado del producto— son lo único del método que no se puede
leer desde la aplicación. Para consultarlas hay que salir a abrir archivos a mano, que es justo lo que
este panel existe para evitar.

## What Changes

- El lector de evidencia suma el contenido de cada `openspec/specs/<id>/spec.md` al snapshot, con el
  mismo tratamiento de tamaño y truncado que ya reciben los artefactos de un cambio.
- `OpenSpecSpecificationEvidence` gana el campo de contenido, con `null` explícito cuando el archivo no
  se pudo leer, para que la ausencia se distinga de un archivo vacío.
- La barra lateral pasa a renderizar cada especificación como botón y muestra su contenido en el visor
  de artefactos, que ya sabe renderizar markdown de la metodología.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-repo-evidence`: la evidencia de especificaciones consolidadas incluye el contenido del
  archivo, no sólo su identificador y su conteo de requisitos.

## Impact

**Producción:** `electron/pipeline/repo-evidence-reader.ts` (conservar el contenido leído),
`types/pipeline/index.ts` (campo nuevo en `OpenSpecSpecificationEvidence`), la barra lateral y el visor
de artefactos del panel.

**Sin tocar:** el conteo de requisitos y su parser, el canal IPC del snapshot, el renderizador de
markdown —que ya cubre los cuatro niveles de encabezado desde `render-openspec-markdown`—.

**Fuera de alcance:** editar una especificación desde la aplicación. Las especificaciones consolidadas
las escribe `openspec archive`; abrirlas para escritura sería una superficie nueva que nadie pidió.

**Dependencias:** ninguna.

**Riesgo:** bajo en lógica, a vigilar en tamaño. El snapshot crece con el texto de todas las
especificaciones del repositorio, que hoy son varias decenas de archivos. Mitigación: reutilizar el
límite de tamaño y el truncado que ya se aplican a los artefactos de un cambio, y medir el peso del
snapshot antes y después en vez de suponer que no importa.
