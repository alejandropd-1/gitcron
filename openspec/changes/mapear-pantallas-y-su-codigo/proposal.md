# Entender pantallas a través del código que las construye

## Why

Cartografía ofrece grupos técnicos, relaciones y consultas con citas, pero el usuario quiere partir de una pantalla o función reconocible. Hace falta una entrada de producto que conecte esas superficies con sus componentes y archivos sin fingir relaciones que el análisis no puede demostrar.

## What Changes

- Agregar catálogo de pantallas y funcionalidades con nombre legible y evidencia de descubrimiento.
- Mostrar componentes, archivos compartidos, estilos, datos y conexiones relevantes al seleccionar una pantalla.
- Conservar mapa técnico e impacto como profundización y pasar selección a la asistencia compartida.
- Distinguir relaciones verificadas, inferidas y desconocidas; actualización incremental con estado de cobertura.

## Capabilities

### New Capabilities

- `cartography-screen-map`: navegación pantalla/función hacia código con procedencia.

### Modified Capabilities

Ninguna.

## Impact

CartographyView, carto-panorama/groups/roles, graph-engine, CartoNodeDetail, IPC de grafo e integración de contexto. Usa CodeGraph y filesystem actuales; no reemplaza el motor ni agrega proveedor.

## Dependencies

Después de retomar-trabajo-con-asistencia-contextual. Primera entrega: catálogo navegable. La selección visual de elementos sobre una app ejecutándose queda como futura extensión, no prometida por este change.
