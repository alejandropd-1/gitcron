# Ejecución del retiro de cambios

Después de cerrar-conexiones-operativas-de-sdd; antes de vincular-centauro-con-cambios-openspec y de los cierres por lote. Aplicar [el plan común](../../EXECUTION.md).


Rutina de trabajo: [config.yaml](../../config.yaml). Las rutas de esta tabla son referencias de implementación.

| Tarea | Responsable | Alcance |
|---|---|---|
| 1.1 | local | types/pipeline/index.ts; nuevo parser; test |
| 1.2 | local | Módulo retirement-record y test |
| 1.3 | local | repo-evidence-reader; test de evidencia |
| 2.1 | orquestador | pipeline-archive; openspec-cli; design |
| 2.2 | local | electron/pipeline/openspec-cli.ts; test |
| 2.3 | local | Nuevo handler retire-plan; test |
| 2.4 | local | Handler retire-change; test filesystem |
| 2.5 | local | electron/main.ts; electron/preload.ts; tipos IPC; test composición |
| 3.1 | local | Acción y formulario; i18n; test UI |
| 3.2 | local | Lista/detalle histórico y tests |
| 3.3 | local | lib/change-commit-scope.ts; test |
| 3.4 | orquestador | Recorrido y validación integrada |
