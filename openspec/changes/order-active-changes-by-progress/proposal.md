## Why

La lista de cambios activos no se ordena por ningún criterio. En
`components/pipeline/OpenSpecDashboard.tsx` se recorre `activeChanges` tal como llega, y llega en el
orden en que el sistema de archivos lista `openspec/changes`: alfabético por accidente, no por
decisión. La lista de archivados sí se ordena —por fecha, en el lector—, así que la de activos quedó
como el único listado del panel sin criterio.

La consecuencia se ve en cuanto hay unos pocos cambios abiertos: uno al 96%, a una casilla de poder
archivarse, queda debajo de tres parqueados en 0% que nadie va a tocar esta semana. Lo que está por
cerrarse es lo que más rápido se tiene que encontrar, y es lo que hay que buscar con la vista.

## What Changes

- Los cambios activos se ordenan por proporción de tareas completadas, de mayor a menor.
- Entre los que empatan se ordena por fecha de creación, primero el más reciente.
- El orden es el único: no se agrega ningún control para elegirlo.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: la lista de cambios activos declara un orden, en vez de heredar el del
  sistema de archivos.

## Impact

**Producción:** `components/pipeline/pipeline-view-state.ts` (la función de orden) y
`components/pipeline/OpenSpecDashboard.tsx` (una línea, para consumirla).

**Sin tocar:** el lector de evidencia, que sigue entregando la lista sin ordenar; el orden de los
archivados; y la selección, que no depende de la posición.

**Fuera de alcance:** un selector de orden y un filtro por estado. Se consideraron y no entran, con el
motivo en `design.md`: el orden elegido ya responde a los tres casos que los motivaban.

**Dependencias:** ninguna. Aprovecha la marca de creación que dejó `show-change-timestamps`.

**Riesgo:** bajo. Es una función pura sobre una lista, probada con tablas. El único efecto perceptible
es que la lista puede reordenarse al tildar una casilla, que es la consecuencia buscada.
