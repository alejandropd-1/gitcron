# Ejecución de Completar la cobertura operativa de OpenSpec

Estado: planificación preparada; implementación sin iniciar.

## Orden y dependencias

Después de cerrar-conexiones-operativas-de-sdd y retomar-trabajo-con-asistencia-contextual; la administración global usa administrar-configuracion-global-de-openspec. Retirar sigue siendo propiedad de retirar-cambios-openspec-obsoletos. Puede ejecutarse en paralelo al mapa de pantallas y al vínculo temporal.


## Mapa de trabajo

Rutina de trabajo: [config.yaml](../../config.yaml). Secuencia del producto: [EXECUTION.md](../../EXECUTION.md). Las rutas de esta tabla son referencias de implementación.

| Tarea | Responsable | Archivos o responsabilidad acotada |
|---|---|---|
| 1.1 | orquestador | CLI help/instructions y consumidores actuales |
| 1.2 | local | Adaptador de motor y tests |
| 1.3 | local | Resolvedor root/store y tests |
| 2.1 | local | Adaptador de workflow update y tests |
| 2.2 | local | Adaptador verify y tests |
| 2.3 | local | Adaptador new/continue y tests |
| 2.4 | local | Adaptador ff y tests |
| 3.1 | local | Adaptador schema y UI puntual |
| 3.2 | local | Adaptador templates y UI puntual |
| 3.3 | local | Adaptador store y UI puntual |
| 3.4 | local | Adaptador workset y UI puntual |
| 3.5 | local | Adaptadores de diagnóstico y UI puntual |
| 3.6 | local | Planificador bulk y test |
| 3.7 | local | Ejecutor bulk y tests |
| 3.8 | local | UI de onboarding y tests |
| 4.1 | orquestador | Matriz y recorrido integrado |
