# Ejecución de Vincular ideas de Centauro con cambios OpenSpec

Estado: planificación preparada; implementación sin iniciar.

## Orden y dependencias

Después de retomar-trabajo-con-asistencia-contextual y retirar-cambios-openspec-obsoletos. Usa creación y lectura de cambios existentes y el discriminante de cierre para reconocer destinos retirados. No requiere el mapa de pantallas.


## Mapa de trabajo

Rutina de trabajo: [config.yaml](../../config.yaml). Secuencia del producto: [EXECUTION.md](../../EXECUTION.md). Las rutas de esta tabla son referencias de implementación.

| Tarea | Responsable | Archivos o responsabilidad acotada |
|---|---|---|
| 1.1 | orquestador | Persistencia temporal actual y design |
| 1.2 | local | Módulo SQL temporal y tests |
| 1.3 | local | Servicio temporal y consumidores acotados |
| 2.1 | local | Adaptador Temporal→SDD y tests |
| 2.2 | local | Acción de Centauro; flujo de propuesta actual; tests |
| 2.3 | local | Acciones de Centauro y resolvedor de links |
| 2.4 | local | Adaptador de materialización y test |
| 2.5 | local | Dashboard temporal; i18n; tests |
| 3.1 | orquestador | Recorrido integrado y validación |
