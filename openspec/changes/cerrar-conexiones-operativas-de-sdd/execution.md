# Ejecución de Cerrar conexiones operativas de SDD

Estado: conexión del inspector hecha (1.1-1.4); resto pendiente.

## Orden y dependencias

Primer cambio de la secuencia. No depende de los otros planes nuevos. Sync se completa aquí; la cobertura ampliada lo reutiliza.


## Mapa de trabajo

Rutina de trabajo: [config.yaml](../../config.yaml). Secuencia del producto: [EXECUTION.md](../../EXECUTION.md). Las rutas de esta tabla son referencias de implementación.

| Tarea | Archivos o responsabilidad acotada |
|---|---|
| 1.1 | components/pipeline/__tests__/pipeline-decision-response.test.ts (convertir a .tsx si hace falta) |
| 1.2 | components/RepoDetailsPanel.tsx; components/pipeline/PipelineWorkspace.tsx; un hook compartido si la extracción resulta necesaria |
| 1.3 | components/pipeline/OpenSpecInspector.tsx; components/pipeline/DecisionInbox.tsx; controlador conectado en la tanda anterior |
| 1.4 | electron/ipc/pipeline-control.ts; electron/pipeline/control/control-bus.ts; consumidor runtime y persistencia de decisiones |
| 2.1 | electron/pipeline/runtime-adapters/; electron/pipeline/runtime/; launcher y tipos actuales |
| 2.2 | Módulo actual de capabilities y su test (rutas concretas fijadas al emitir prompt) |
| 2.3 | Launcher actual; consumidor de próxima acción; i18n si corresponde |
| 3.1 | electron/ipc/pipeline-sync.ts; adaptadores runtime; registro en electron/main.ts |
| 3.2 | Un módulo runner y su test; adaptador runtime concreto autorizado |
| 3.3 | electron/main.ts; electron/ipc/pipeline-sync.ts; electron/__tests__/pipeline-sync-ipc.test.ts |
| 3.4 | electron/ipc/pipeline-sync.ts; módulo de plan compartido si existe; test IPC |
| 3.5 | Servicio de ejecución sync y test de filesystem temporal |
| 4.1 | Tests de selección/navegación y consumidor puntual si falla |
| 4.2 | Pruebas de integración sobre repos temporales; documentación de resultados |
