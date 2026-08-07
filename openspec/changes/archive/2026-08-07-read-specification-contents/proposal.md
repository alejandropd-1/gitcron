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

- Un canal de lectura puntual devuelve el contenido de una especificación por su identificador, con la
  ruta validada y un límite de tamaño explícito.
- La barra lateral pasa a renderizar cada especificación como botón y muestra su contenido en el visor
  de artefactos, que ya sabe renderizar markdown de la metodología.
- El estado sin contenido se distingue del archivo vacío y del fallo de lectura, en vez de mostrar el
  visor en blanco.

**Se corrigió el plan original tras medir.** La primera versión de esta propuesta decía sumar el
contenido de todas las especificaciones al snapshot, como ya se hace con los artefactos de un cambio.
Medido sobre este repositorio, eso son **145 KB en quince archivos, con uno solo de 84,9 KB**
—`pipeline-guided-workflow`—, y el snapshot se rearma en cada refresco, que el watcher dispara con cada
guardado. Pagar ese peso continuo para un contenido que casi nunca se mira, y que sólo cambia al
archivar, no se sostiene. El motivo está en `design.md`.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-repo-evidence`: el contenido de una especificación consolidada se puede leer desde la
  aplicación, sin transportarlo en cada snapshot.

## Impact

**Producción:** un canal de lectura nuevo en `electron/ipc/`, su exposición en el preload, y la barra
lateral y el visor de artefactos del panel.

**Sin tocar:** el conteo de requisitos y su parser, el snapshot y su caché por repositorio y cambio
seleccionado, la suscripción del watcher, y el renderizador de markdown —que ya cubre los cuatro
niveles de encabezado desde `render-openspec-markdown`—.

**Fuera de alcance:** editar una especificación desde la aplicación. Las especificaciones consolidadas
las escribe `openspec archive`; abrirlas para escritura sería una superficie nueva que nadie pidió.

**Dependencias:** ninguna.

**Riesgo:** bajo. El snapshot no cambia, así que el costo del refresco queda igual que hoy: la lectura
ocurre sólo al abrir una especificación. Lo que sí se agrega es una superficie de lectura nueva hacia el
repositorio, y por eso el identificador se valida contra el mismo patrón que ya se exige en el lector y
la ruta se resuelve contenida al repositorio, sin aceptar rutas del renderer.
