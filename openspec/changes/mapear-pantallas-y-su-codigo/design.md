# Entender pantallas a través del código que las construye

## Context

graph-engine combina snapshot CodeGraph con scanRepoFilePaths; node detail ya consulta callers/callees/impact. GitCron cambia superficies en RepoMainView sin necesitar una ruta web distinta por pantalla: un detector basado sólo en rutas omitiría varias vistas.

Ver proposal.md para alcance y dependencias; specs/ contiene los contratos observables.

## Goals / Non-Goals

**Goals:** completar el recorrido descrito reutilizando servicios y superficies existentes; separar contratos, integración y presentación para que cada tanda local tenga un resultado verificable.

**Non-Goals:** reescribir el cliente Git, alterar la geometría del Cronométrico, introducir WebMCP/MCP Apps como dependencia o ejecutar implementación al redactar estos artefactos.

## Decisions

### 1. Decisión de implementación

Agregar adaptadores de descubrimiento por stack, empezando por Next/React y switches de vistas de GitCron, con contrato de cobertura explícito. Resolver estáticamente imports/rutas cuando posible; condiciones runtime y composición dinámica permanecen desconocidas o requieren asociación manual.

### 2. Decisión de implementación

Catálogo por nombre de producto; una pantalla puede usar muchos archivos y un archivo muchas pantallas. Mostrar piezas compartidas separadas de específicas, no asignar propiedad exclusiva a la primera coincidencia.

### 3. Decisión de implementación

Mantener asociaciones manuales portables y auditables con origen manual, separadas de resultados generados. IA puede sugerir asociaciones con fuentes, pero no elevar una sugerencia a relación comprobada.

### 4. Decisión de implementación

Navegación catálogo→detalle→relaciones/impacto→archivo/diff mediante rutas existentes. Mostrar conteos de cobertura, excluidos y errores; cero relaciones observadas no significa inexistencia de dependencias.

### 5. Decisión de implementación

Indexado reutiliza motor y cache existentes, incremental y cancelable; invalidar por cambios de archivos/HEAD. No iniciar app externa, capturar pantalla ni ejecutar código del repo para completar el mapa.

### Alternativas

Se descarta construir un subsistema paralelo porque las operaciones y evidencias actuales ya cubren parte del recorrido.

## Risks / Trade-offs

- Heurísticas por framework son parciales: fixtures cubren repos con rutas, vistas por estado, imports dinámicos y no-UI; fallback técnico y asociación manual.
- Un canvas grande vuelve a esconder lo importante: catálogo/lista y detalle legibles por defecto, grafo técnico a demanda.

## Migration Plan

Entrada nueva sobre Cartografía existente; conservar preferencia de vista técnica y referencias a nodos. Cache versionada regenerable, asociaciones manuales fuera de la cache. Sin migrar código de repos analizados.

## Open Questions

Repositorios sin interfaz muestran módulos/funciones y cobertura no aplicable; no se inventan pantallas. Inspección visual futura requiere diseño de instrumentación y consentimiento separado.
