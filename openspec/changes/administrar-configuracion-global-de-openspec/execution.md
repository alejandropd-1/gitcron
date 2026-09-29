# Ejecución de Administrar la configuración global de OpenSpec

Estado: planificación preparada; implementación sin iniciar.

## Orden y dependencias

Independiente del mapa de pantallas y Centauro. La dependencia antigua gestionar-ciclo-openspec-desde-gitcron ya fue archivada; reutilizar su implementación. Coordinar catálogo con completar-cobertura-operativa-de-openspec.


## Mapa de trabajo

Rutina de trabajo: [config.yaml](../../config.yaml). Secuencia del producto: [EXECUTION.md](../../EXECUTION.md). Las rutas de esta tabla son referencias de implementación.

| Tarea | Responsable | Archivos o responsabilidad acotada |
|---|---|---|
| 1.1 | orquestador | CLI help/config y design |
| 1.2 | local | Lector de config y tests |
| 1.3 | local | Settings; panel configuración SDD; tests |
| 2.1 | local | Servicio config y test IPC |
| 2.2 | local | Servicio config y test IPC |
| 2.3 | local | UI Settings y tests |
| 2.4 | local | Cache/evento existente y tests |
| 3.1 | orquestador | Recorrido integrado y validación |
