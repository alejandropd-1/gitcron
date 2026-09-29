# Completar la cobertura operativa de OpenSpec

## Why

Mostrar el motor y sus workflows instalados no demuestra que cada operación pueda realizarse desde GitCron. La integración debe declarar su cobertura real, ejecutar los recorridos faltantes y adaptarse a esquemas/versiones sin exigir memorizar comandos.

## What Changes

- Inventariar operaciones y distinguir disponibilidad del motor, integración instalada, ejecutor y recorrido UI verificado.
- Completar revisión de planificación, verificación de implementación y flujos incrementales/avanzados según perfil.
- Cubrir artefactos personalizados y rutas devueltas por el motor sin imponer las cuatro piezas conocidas.
- Ofrecer administración avanzada de esquemas/templates, stores y worksets según capacidad observada; diferenciar alcance local/global.
- Separar actualizar integración del CLI de revisar planificación del workflow.

## Capabilities

### New Capabilities

- `openspec-operation-coverage`: cobertura verificable y acceso contextual a operaciones OpenSpec.

### Modified Capabilities

Ninguna.

## Impact

OpenSpecEngineCard, PipelineArtifactGraph, pipeline-next-action, launchers y adaptador CLI/IPC. Reutiliza sincronización del primer cambio, configuración global y retiro de sus cambios propietarios.

## Dependencies

Después de cerrar-conexiones-operativas-de-sdd y retomar-trabajo-con-asistencia-contextual; la administración global usa administrar-configuracion-global-de-openspec. Retirar sigue siendo propiedad de retirar-cambios-openspec-obsoletos. Puede ejecutarse en paralelo al mapa de pantallas y al vínculo temporal.
