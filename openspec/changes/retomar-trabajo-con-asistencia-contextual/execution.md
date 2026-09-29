# Ejecución de Retomar trabajo con asistencia contextual

Estado: planificación preparada; implementación sin iniciar.

## Orden y dependencias

Después de cerrar-conexiones-operativas-de-sdd y de la gestión compartida de proveedores/modelos de `modelos-en-casa` (decisión recuperada en [EXECUTION.md](../../EXECUTION.md); propuesta formal pendiente). Sustituye explicar-el-ciclo-sin-tecnicismos. Primer recorrido de aceptación: retomar cambio SDD → consulta → tarea → revisión → commit común. Otros módulos reciben el asistente contextual básico; vínculos temporales y mapa de pantallas son cambios posteriores.


## Mapa de trabajo

Rutina de trabajo: [config.yaml](../../config.yaml). Secuencia del producto: [EXECUTION.md](../../EXECUTION.md). Las rutas de esta tabla son referencias de implementación.

| Tarea | Archivos o responsabilidad acotada |
|---|---|
| 1.1 | Tipos de navegación, binding main y stores identificados en el relevamiento |
| 1.2 | Un resolvedor y test |
| 1.3 | Registro de contribuciones y test |
| 2.1 | Persistencia IA y test de migración |
| 2.2 | Handler IPC; preload/tipos correspondientes; tests |
| 2.3 | Servicio de consulta y test |
| 2.4 | Shell de asistencia y test de montaje |
| 2.5 | Dos adaptadores de vista y tests |
| 2.6 | Dos adaptadores de vista y tests |
| 2.7 | Adaptador Settings; launcher; tests focalizados |
| 3.1 | Un selector/resolvedor y tests |
| 3.2 | Cache/resolvedor del resumen y tests |
| 3.3 | Servicio narrador y tests |
| 3.4 | ViewSwitcherRail; shell de paneles; tests |
| 3.5 | Componentes de entrada y tarea; i18n; tests focalizados |
| 4.1 | Recorrido de aceptación y validación integrada |
