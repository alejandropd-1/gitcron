## Why

Ale estaba a mitad de empezar un cambio, fue a la solapa Graph a mirar algo y al volver el formulario
había desaparecido: tuvo que rehacerlo desde cero. La causa está medida en el código, no supuesta: en
`components/RepoMainView.tsx:270` cada solapa es un `return` distinto, así que ir a Graph **desmonta**
`PipelineWorkspace` entero y con él muere todo su estado local —que el formulario esté abierto, el modo
elegido, el objetivo, el slug, las restricciones y las casillas—.

No es un caso raro: es para lo que sirven las solapas. Y es el mismo principio que este panel ya aplicó
dos veces esta semana —inicializar OpenSpec no puede costar el objetivo y el slug—, sólo que peor,
porque acá no hay ni siquiera un aviso: la pantalla simplemente no está al volver.

## What Changes

- Lo que se está escribiendo en el flujo de cambio nuevo sobrevive a salir de Pipeline y volver: que el
  formulario esté abierto, el modo, el objetivo, el slug, las restricciones y las dos casillas.
- El borrador tiene alcance por repositorio: volver a un repositorio distinto no muestra lo que se estaba
  escribiendo en otro.
- El borrador se descarta al cerrar el flujo explícitamente y al arrancar la sesión, que son los dos
  momentos en que deja de ser un borrador.

## Capabilities

**Modified Capabilities**
- `pipeline-guided-workflow`: suma un requisito sobre la persistencia del borrador. No cambia ninguno de
  los requisitos existentes, así que entra como `ADDED` dentro de esa capacidad.

## Impact

- `components/pipeline/` — el estado del flujo sale del `useState` del componente y pasa a un store.
- `lib/` — un store de Zustand nuevo, del mismo tipo que el que ya usa la aplicación.
- No se toca el montaje de las solapas ni el ciclo de vida de `PipelineWorkspace`: se descartó
  explícitamente en el diseño y el motivo está ahí.
- No se persiste a disco: el borrador vive en memoria y muere con la aplicación.
