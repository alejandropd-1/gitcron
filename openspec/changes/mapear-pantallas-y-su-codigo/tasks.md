# Tasks

Lista de resultados y comprobaciones pendientes. Referencias de implementación en [execution.md](execution.md).

## 1. Modelo

- [ ] 1.1 Definir contrato pantalla/función y asociación muchos-a-muchos con evidencia. **Comprobación:** Incluye archivos compartidos, estados sin URL y procedencia manual/estática/inferida/desconocida.
- [ ] 1.2 Agregar extractor de rutas Next/React sin ejecutar el repo. **Comprobación:** Fixture de rutas/layouts demuestra archivos propios y compartidos; import dinámico no resuelto queda desconocido.
- [ ] 1.3 Agregar detección de vistas por switches de GitCron. **Comprobación:** Reconoce Graph, SDD y Cartografía como vistas aunque no tengan URL propia.
- [ ] 1.4 Unir asociaciones con relaciones del grafo y niveles de cobertura. **Comprobación:** Ausencia de aristas no se interpreta como ausencia de dependencias.
- [ ] 1.5 Persistir asociaciones manuales fuera del cache reconstruible. **Comprobación:** Reindexado conserva asociación manual; ruta renombrada queda pendiente de resolver, no se reasigna por intuición.
- [ ] 1.6 Agregar indexación incremental cancelable y exclusiones. **Comprobación:** Cambio de rama/repo descarta resultado viejo; medir sobre fixture grande sin ejecutar código.

## 2. Interfaz

- [ ] 2.1 Construir catálogo de pantallas con estado de cobertura. **Comprobación:** Repo sin UI muestra módulos/no aplica; incompleto se distingue de vacío.
- [ ] 2.2 Construir detalle con archivos, estilos, datos y compartidos. **Comprobación:** Una pantalla puede tener múltiples archivos y uno pertenecer a varias; mapa técnico sigue accesible.
- [ ] 2.3 Conectar abrir archivo/diff y consulta contextual de pantalla. **Comprobación:** Usa referencias verificadas y rechaza selección obsoleta; IA distingue evidencia de inferencia.

## 3. Aceptación

- [ ] 3.1 Comprobar localización de código desde una pantalla con Alejandro. **Comprobación:** Identifica archivos sin conocer carpetas; comprobar renombrado, layout compartido, cancelación y vista técnica.
