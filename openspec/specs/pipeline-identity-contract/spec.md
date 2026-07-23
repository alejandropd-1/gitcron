# Pipeline identity contract

## Purpose

Definir identidades estables y agnósticas para repositorios, ejecuciones, agentes y runtimes.

## Requirements

### Requirement: Identidad agnóstica de orquestador y modelo
Pipeline SHALL identificar por separado repositorio, change, task, run, intento, sesión, agente, runtime, proveedor y modelo solicitado/efectivo/reportado. Hermes SHALL ser opcional mediante `orchestrationMode`, y un proveedor como Z.ai SHALL NOT sustituir la identidad del runtime que lo ejecuta.

#### Scenario: Sesión directa de Codex
- **WHEN** Codex trabaja sobre el repo sin una sesión Hermes
- **THEN** la identidad usa `orchestrationMode: direct`, `runtime: codex` y conserva como `null` todo modelo que la fuente no reporte

#### Scenario: Z.ai mediante OpenCode
- **WHEN** OpenCode ejecuta una tarea con Z.AI Coding Plan
- **THEN** la identidad usa `runtime: opencode`, registra Z.ai como provider/family y preserva los modelos solicitado, efectivo y reportado por separado

### Requirement: Identidad de repositorio estable
Electron main SHALL emitir un `repoId` opaco y persistente después de canonicalizar el path y el Git common-dir. El path SHALL ser metadata redactable y SHALL NOT ser la única clave de aislamiento.

#### Scenario: Paths equivalentes en Windows
- **WHEN** dos strings con casing o enlaces distintos resuelven al mismo Git common-dir
- **THEN** Pipeline los correlaciona con el mismo `repoId`

### Requirement: Semántica de retry, resume y parentage
El contrato SHALL distinguir run, attempt, session y relaciones padre sin reutilizar IDs ambiguamente.

#### Scenario: Retry de una task
- **WHEN** una task se reintenta dentro de la misma corrida
- **THEN** conserva `runId` y `taskId`, crea `attemptId` nuevo y atribuye métricas al intento correcto
