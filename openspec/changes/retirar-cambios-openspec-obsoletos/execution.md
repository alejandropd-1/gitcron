# Ejecución del retiro de cambios

Después de cerrar-conexiones-operativas-de-sdd; antes de vincular-centauro-con-cambios-openspec y de los cierres por lote. Aplicar [el plan común](../../EXECUTION.md).


Rutina de trabajo: [config.yaml](../../config.yaml). Las rutas de esta tabla son referencias de implementación.

| Tarea | Alcance |
|---|---|
| 1.1 | types/pipeline/index.ts; nuevo parser; test |
| 1.2 | Módulo retirement-record y test |
| 1.3 | repo-evidence-reader; test de evidencia |
| 2.1 | pipeline-archive; openspec-cli; design |
| 2.2 | electron/pipeline/openspec-cli.ts; test |
| 2.3 | Nuevo handler retire-plan; test |
| 2.4 | Handler retire-change; test filesystem |
| 2.5 | electron/main.ts; electron/preload.ts; tipos IPC; test composición |
| 3.1 | Acción y formulario; i18n; test UI |
| 3.2 | Lista/detalle histórico y tests |
| 3.3 | lib/change-commit-scope.ts; test |
| 3.4 | Recorrido y validación integrada |
