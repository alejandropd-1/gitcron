# Vincular ideas de Centauro con cambios OpenSpec

## Context

La materialización usa buildMaterializationPlan y Git plumbing para crear commit/rama/tag sin checkout. Hay prediction.json/notas y SQLite temporal-agent-history.db. Dashboard compartido entre Centauro y Settings calcula aceptación/materialización como 1, rechazo como 0; no mide tests exitosos.

Ver proposal.md para alcance y dependencias; specs/ contiene los contratos observables.

## Goals / Non-Goals

**Goals:** completar el recorrido descrito reutilizando servicios y superficies existentes; separar contratos, integración y presentación para que cada tanda local tenga un resultado verificable.

**Non-Goals:** reescribir el cliente Git, alterar la geometría del Cronométrico, introducir WebMCP/MCP Apps como dependencia o ejecutar implementación al redactar estos artefactos.

## Decisions

### 1. Decisión de implementación

Vincular por IDs de ejecución y propuesta, repo y changeId; persistir relación local en SQLite. Al crear un cambio incluir una referencia portable a la idea y su justificación en la propuesta, sin volcar secretos o toda la conversación. En otro equipo se lee ese contexto aunque no exista el historial local.

### 2. Decisión de implementación

Ofrecer Crear propuesta y Vincular cambio existente como acciones explícitas. Aceptar idea no crea archivos. Materializar conserva preview de branch/tag/commit y no crea también un cambio por efecto lateral.

### 3. Decisión de implementación

Resolver rama imagined y rama del change sin checkout oculto: mostrar rama actual y destino, usar flujo de rama del proyecto y permitir elegir vínculo a trabajo existente. Un cambio de HEAD invalida la ejecución pendiente.

### 4. Decisión de implementación

Registrar reversión de una decisión como evento SQL, y derivar notas/feedback de la decisión vigente; migrar con respaldo y reconciliación declarada. No reinterpretar ausencia de SQL como rechazo.

### 5. Decisión de implementación

Separar estados sugerida/decidida/materializada de estado SDD y evidencia Git. Métricas de aceptación se rotulan por su variable real; nunca presentar materializar como implementación verificada.

### Alternativas

Se descarta construir un subsistema paralelo porque las operaciones y evidencias actuales ya cubren parte del recorrido.

## Risks / Trade-offs

- Historial local no viaja con un clone: referencia portable mantiene la explicación y marca origen local no disponible.
- Reintentos pueden duplicar cambios: correlación e idempotencia por operación, detección de existencia y recuperación sin repetir materialización.

## Migration Plan

Relaciones y eventos de reversión aditivos. Las propuestas antiguas siguen sin vínculo hasta elección explícita; no inferir vínculo por título o similitud. Mantener ramas/tags existentes.

## Open Questions

No hay bloqueo de producto. La implementación debe documentar una única precedencia entre notas JSON y SQL tras migración; decisiones históricas ambiguas se marcan como tales.
