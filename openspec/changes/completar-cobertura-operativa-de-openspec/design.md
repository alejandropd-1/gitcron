# Completar la cobertura operativa de OpenSpec

## Context

OpenSpec local 1.13.2. Help expone init/update/config/schema/store/context/workset/doctor/status/instructions/templates/schemas/new/validate/archive. OPSX documenta core propose/explore/apply/update/sync/archive y ampliados new/continue/ff/verify/bulk-archive/onboard. Son workflows de agentes, no todos subcomandos del CLI. La tabla es línea base fechada, no enum cerrado.

Ver proposal.md para alcance y dependencias; specs/ contiene los contratos observables.

## Goals / Non-Goals

**Goals:** completar el recorrido descrito reutilizando servicios y superficies existentes; separar contratos, integración y presentación para que cada tanda local tenga un resultado verificable.

**Non-Goals:** reescribir el cliente Git, alterar la geometría del Cronométrico, introducir WebMCP/MCP Apps como dependencia o ejecutar implementación al redactar estos artefactos.

## Decisions

### 1. Decisión de implementación

Registro de operaciones con procedencia y cuatro dimensiones: motor, integración, ejecutor y UI. Descubrir help/schemas/instructions y metadatos oficiales; cuando no exista introspección estructurada, usar adaptador versionado con tests y declarar cobertura desconocida para versiones no reconocidas.

### 2. Decisión de implementación

Cada operación llama al CLI o skill/workflow que corresponda, sin crear comandos ficticios opsx en el shell. Resolver root de planificación y store antes de leer/escribir; cambio de root invalida selecciones y planes.

### 3. Decisión de implementación

Editor de planificación usa instrucciones oficiales y preview de archivos; verify contrasta implementación con artefactos y evidencia de pruebas, separado de validate estructural. new/continue/ff trabajan el DAG real y no saltan confirmaciones de sobrescritura.

### 4. Decisión de implementación

Herramientas avanzadas a demanda. stores/worksets/schemas/templates requieren resultados confinados al alcance explícito, preview de escrituras y manejo de cambios concurrentes. Un store externo sólo se autoriza como destino explícito, nunca por path contenido en respuesta de IA.

### 5. Decisión de implementación

Bulk archive previsualiza cada cambio y ordena dependencias/conflictos de specs antes de ejecutar; reporta resultado por cambio y recuperación parcial. Onboard usa repo de práctica explícito o delimita el repo actual; nunca simula una operación como real.

### 6. Decisión de implementación

Probar un recorrido por operación. Una acción declarada por el motor pero sin ejecutor aparece como no disponible con causa; esa degradación informa, pero no cuenta como integración completada del alcance soportado.

### Alternativas

Se descarta construir un subsistema paralelo porque las operaciones y evidencias actuales ya cubren parte del recorrido.

## Risks / Trade-offs

- Upstream cambia comandos y formatos: fixtures por familia de versiones y downgrade honesto, sin parser de salida humana que afirme garantías inexistentes.
- Ampliar funciones puede saturar UI: conservar entrada contextual y catálogo avanzado bajo demanda, sin wizard de etapas fijas.

## Migration Plan

Registro/adaptadores incrementales; mantener las rutas existentes durante adopción. Ninguna configuración cambia al consultar el inventario. La matriz de cobertura se guarda como evidencia de validación, no como duplicado de reglas metodológicas.

## Open Questions

Antes de habilitar una versión nueva, comprobar en repo temporal semántica de operaciones y roots. No se declara compatibilidad universal con versiones futuras.
