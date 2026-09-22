## Why

Este cambio se crea a pedido de Alejandro con el objetivo explícito «para borrar»: no responde a
un problema medido en la aplicación ni a un pedido de producto. Sirve como cambio de sonda —para
probar el ciclo OpenSpec (crear, ver el recorrido, archivar o retirar) desde GitCron sin afectar
ninguna capability real— y se espera que se retire o se borre sin consolidar specs.

## What Changes

- No se modifica ningún archivo de código, componente ni canal IPC de GitCron.
- Se documenta que este change existe únicamente para ejercitar el ciclo de artefactos y se marca
  como candidato a retiro apenas cumpla su función de sonda.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

_Ninguna._

## Impact

- Sin impacto en código, dependencias ni configuración. Sólo agrega los artefactos de planificación
  de este directorio (`openspec/changes/para-borrar/`).

## Out of Scope

- Implementar cualquier funcionalidad: este change no tiene tareas de código, sólo el cierre
  (retirar o borrar la carpeta) cuando Alejandro lo decida.
