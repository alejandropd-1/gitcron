# Vincular ideas de Centauro con cambios OpenSpec

## Why

Centauro ya propone futuros, aprende de decisiones y materializa ramas con IDEA.md, pero ese recorrido no acredita una relación con un cambio SDD. Vincular ambos permite recuperar por qué se eligió una idea y qué trabajo real produjo.

## What Changes

- Permitir abrir una propuesta SDD desde una idea o vincularla con un cambio existente sin duplicarlo.
- Mantener el circuito independiente de materializar rama y su revisión previa.
- Conservar relación navegable entre ejecución/propuesta temporal, cambio, rama materializada y evidencia de entrega.
- Reconciliar reversión de decisiones entre notas e historial; explicar que las métricas actuales reflejan decisiones humanas.

## Capabilities

### New Capabilities

- `temporal-change-links`: trazabilidad entre idea temporal y trabajo SDD.

### Modified Capabilities

Ninguna.

## Impact

ChronometricGraph/Centauro, temporal-agent-ipc, tablas prediction/decisions, materialize-idea, flujo de nuevo cambio y contexto compartido. No cambia proyección geométrica ni algoritmo de predicción.

## Dependencies

Después de retomar-trabajo-con-asistencia-contextual y retirar-cambios-openspec-obsoletos. Usa creación y lectura de cambios existentes y el discriminante de cierre para reconocer destinos retirados. No requiere el mapa de pantallas.
