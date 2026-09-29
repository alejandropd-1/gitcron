# Retirar cambios sin convertir sus planes en especificaciones vigentes

## Why

La UI permite archivar cambios, pero falta distinguir un retiro por obsolescencia de un trabajo completado. Conservar la propuesta retirada, su motivo y el reemplazo permite retomar el proyecto sin implementar planes descartados ni consolidar requisitos que no se entregaron.

## What Changes

- Incorporar Retirar cambio como operación explícita que usa archive con --skip-specs y conserva un retirement.md portable.
- Pedir motivo, explicación, estado conocido de implementación y reemplazo cuando corresponda.
- Separar retiro pendiente, retirado verificado, completado acreditado e histórico de finalización desconocida.
- Planificar sin escribir, revalidar alcance/huellas al confirmar y verificar el movimiento y las specs canónicas después.
- Integrar resultado y mensaje sugerido en el circuito Git existente.
- Reemplazar el diseño antiguo basado en 1.5.0 por el contrato comprobable del motor instalado 1.13.2; no asumir que shell: true por sí solo es seguro.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: retiro sin consolidación, registro portable, cierre verificable y mensaje sugerido propio.

## Impact

Wrapper CLI y handler main acotado, preload/tipos, lector de evidencia, acción contextual, formulario de retiro, histórico e i18n. Reutiliza el runtime OpenSpec descubierto, autorización main, cola/planes y operaciones Git actuales. Sin dependencias nuevas.

## Dependencies

Reutilizar los contratos de operación de cerrar-conexiones-operativas-de-sdd. Entregar antes de los enlaces temporales que muestran destinos retirados y antes del cierre por lote. El retiro documental realizado para ordenar este backlog no acredita que esta feature esté implementada.
