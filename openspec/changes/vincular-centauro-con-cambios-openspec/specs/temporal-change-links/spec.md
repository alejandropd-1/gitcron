# temporal-change-links

## Purpose

Relacionar decisiones sobre futuros sugeridos con cambios SDD y evidencia Git, preservando el historial y la autonomía de la materialización existente.

## ADDED Requirements

### Requirement: Una idea puede originar o enlazar un cambio

Desde una propuesta temporal SHALL poder prepararse un cambio nuevo o vincularse uno existente del mismo repositorio. Aceptar una idea SHALL NOT crear un cambio automáticamente. La relación SHALL ser navegable desde ambos extremos.

#### Scenario: Crear propuesta
- **WHEN** se elige convertir una idea en trabajo SDD
- **THEN** se prepara objetivo y origen para el flujo existente y se confirma antes de crear archivos

#### Scenario: Vincular existente
- **WHEN** se elige un cambio ya creado
- **THEN** se registra el vínculo sin duplicar cambios ni materializar ramas

### Requirement: El origen conserva una referencia portable

El vínculo SHALL conservar identidad de propuesta/ejecución y cambio; la propuesta nueva SHALL incluir origen y justificación legibles sin la base local. Relaciones a destinos ausentes SHALL mostrarse como no resueltas sin inventar evidencia.

#### Scenario: Clone sin historial local
- **WHEN** se abre el cambio en otra máquina
- **THEN** se lee su origen portable y se declara que el historial local no está disponible

#### Scenario: Destino retirado
- **WHEN** el cambio vinculado fue retirado
- **THEN** el vínculo conserva el origen y permite consultar motivo/reemplazo si existe

### Requirement: Materializar y planificar conservan efectos distintos

Materializar SHALL mantener su revisión de rama/tag/commit y comportamiento sobre el árbol de trabajo. Vincular o planificar SHALL NOT ejecutar materialización ni checkout ocultos. Reintentos SHALL detectar operaciones ya realizadas.

#### Scenario: Rama materializada previa
- **WHEN** se planifica una idea que ya tiene rama imagined
- **THEN** se muestran las ramas implicadas y se resuelve destino explícitamente sin crear una segunda rama por accidente

#### Scenario: Reintento
- **WHEN** se repite la confirmación tras respuesta perdida
- **THEN** se devuelve el resultado existente o estado por recuperar sin duplicar el cambio

### Requirement: Historial y métricas reflejan la decisión vigente

Deshacer una decisión SHALL reflejarse en historial, feedback y métricas tras reiniciar. Las métricas basadas en aceptación SHALL identificar esa variable y SHALL NOT presentarse como éxito técnico de la implementación.

#### Scenario: Deshacer y reiniciar
- **WHEN** se revierte una aceptación y se reabre GitCron
- **THEN** historial, feedback y métricas usan el mismo estado vigente

#### Scenario: Idea materializada
- **WHEN** se crea una rama con IDEA.md
- **THEN** se informa materialización sin afirmar cumplimiento de requisitos o pruebas
