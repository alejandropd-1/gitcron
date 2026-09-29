# Cerrar conexiones operativas de SDD

## Context

Relevamiento estático 2026-09-28, base 6336fdc. RepoDetailsPanel.tsx monta OpenSpecInspector sin onRespondDecision; éste tiene un default vacío. main.ts registra pipeline-sync sin runner; sus defaults lo declaran indisponible. codex-adapter.ts usa exec --ephemeral --sandbox read-only; claude-adapter.ts limita herramientas a archivos. Pipeline prepara mediante stageFiles y el formulario Git compartido.

Ver proposal.md para alcance y dependencias; specs/ contiene los contratos observables.

## Goals / Non-Goals

**Goals:** completar el recorrido descrito reutilizando servicios y superficies existentes; separar contratos, integración y presentación para que cada tanda local tenga un resultado verificable.

**Non-Goals:** reescribir el cliente Git, alterar la geometría del Cronométrico, introducir WebMCP/MCP Apps como dependencia o ejecutar implementación al redactar estos artefactos.

## Decisions

### 1. Decisión de implementación

Conservar la fachada de acciones Git y los guards main existentes. El inspector obtiene callbacks del mismo controlador que PipelineWorkspace; nunca genera una segunda implementación de decisiones o commit.

El 2026-09-29 se verificó que dispatchRespondDecision valida el envío y registra ACK, pero no despacha la opción al ejecutor. La conexión del renderer es un incremento parcial: falta resolver la opción vigente, ejecutar su efecto y persistir/reconciliar el resultado con idempotencia. El feedback de la UI depende de ese contrato.

### 2. Decisión de implementación

Extender la resolución de capacidades por intención. Estar instalado permite aparecer en discovery; implementar exige escritura y verificar con comandos exige ejecución de pruebas. Mantener alternativas de consulta o ejecución externa visibles, sin ampliar permisos silenciosamente.

### 3. Decisión de implementación

Conectar sync-preview al runner de workflow existente, separando generación de propuesta y aplicación. El runner no escribe las specs canónicas durante preview: usar espacio temporal aislado, importar sólo una propuesta acotada y verificarlo. Revalidar hashes, repositorio y cambio al aplicar bajo exclusión mutua.

### 4. Decisión de implementación

Releer evidencia tras acciones y errores. Una respuesta aceptada por transporte no prueba efecto; el estado pendiente permanece hasta resultado. Cubrir el montaje productivo, no sólo un handler con dependencias inyectadas.

### 5. Decisión de implementación

Mantener alternancia fijo/flotante y menú izquierdo. Una acción pertinente puede cambiar de superficie pero conserva ruta alcanzable y selección; registrar matriz de transiciones como evidencia de pruebas.

### Alternativas

Se descarta construir un subsistema paralelo porque las operaciones y evidencias actuales ya cubren parte del recorrido.

## Risks / Trade-offs

- Los adaptadores disponibles no ofrecen lo mismo: no anunciar implementación o pruebas cuando falta soporte; una prueba de integración debe demostrar cada capacidad nueva.
- Sync puede producir cambios fuera de alcance: confinar outputs y rechazar rutas/estado cambiados; no aplicar parcialmente un plan vencido.

## Migration Plan

Cambio incremental sobre contratos y consumidores existentes; no migración de Git. Los estados antiguos sin evidencia de capacidad siguen unknown. La reversión del wiring conserva archivos y sesiones, sin revertir trabajo del usuario.

## Open Questions

Ninguna decisión de producto bloqueante. Durante implementación se debe demostrar qué ejecutor instalado satisface sync; si ninguno lo hace, se informa el bloqueo y no se declara esta entrega completa.
