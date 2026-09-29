# Administrar la configuración global de OpenSpec

## Context

OpenSpec 1.13.2 config --help confirma alcance global y operaciones path/list/get/set/unset/reset/edit/profile. La UI actual permite perfil en OpenSpecEngineCard. No se presupone que config list entregue tipos, defaults o un esquema completo para todas las claves.

Ver proposal.md para alcance y dependencias; specs/ contiene los contratos observables.

## Goals / Non-Goals

**Goals:** completar el recorrido descrito reutilizando servicios y superficies existentes; separar contratos, integración y presentación para que cada tanda local tenga un resultado verificable.

**Non-Goals:** reescribir el cliente Git, alterar la geometría del Cronométrico, introducir WebMCP/MCP Apps como dependencia o ejecutar implementación al redactar estos artefactos.

## Decisions

### 1. Decisión de implementación

Separar lectura global de integración local. Tras cambiar perfil global invalidar snapshots afectados y mostrar repos que requieren actualizar integración, sin ejecutarla automáticamente.

### 2. Decisión de implementación

Reutilizar escrituras tipadas existentes. Para opciones adicionales construir descriptores versionados sólo con evidencia del motor; claves desconocidas se muestran saneadas como no editables, evitando campos arbitrarios que muten configuración.

### 3. Decisión de implementación

Preview incluye valor anterior/nuevo y alcance máquina. Reset enumera exactamente las claves afectadas. Releer estado actual antes de aplicar para detectar cambios concurrentes; errores preservan el valor observado y permiten refrescar.

### 4. Decisión de implementación

Actualizar MODIFIED del requisito de perfil para mantener su edición desde la aplicación, ubicándola en Settings y dejando enlace desde diagnóstico del repo. Ayuda y paths técnicos bajo detalle.

### Alternativas

Se descarta construir un subsistema paralelo porque las operaciones y evidencias actuales ya cubren parte del recorrido.

## Risks / Trade-offs

- Config global cambia fuera de GitCron: invalidar por contenido/lectura fresca y no aplicar un plan viejo.
- Un perfil global no implica skills actualizadas: mantener explícitas ambas fuentes.

## Migration Plan

Reubicar controles conservando APIs; no mover archivos de configuración ni reescribir valores al abrir Settings. Sin migración de settings propias de cada repositorio.

## Open Questions

Ninguna. Opciones sin contrato verificable permanecen de sólo lectura hasta soporte probado.
