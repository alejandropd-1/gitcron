# Pipeline decision contract

## Purpose

Definir solicitudes, opciones y efectos de decisiones humanas con evidencia y trazabilidad.

## Requirements

### Requirement: Solicitud humana respaldada por evidencia
Cada `DecisionRequest` SHALL identificar repo/change/task/run/session/agent, clase de decisión, estado, explicación, opciones, riesgo con procedencia, refs de evidencia, digest de scope y expiración.

#### Scenario: Dependencia solicitada
- **WHEN** se deriva una solicitud de dependencia
- **THEN** debe existir diff confirmado del manifest y regla aplicable; un gate global rojo por sí solo no alcanza

#### Scenario: Resolución trazable
- **WHEN** una persona elige una opción disponible
- **THEN** la resolución conserva option, actor, timestamp y commandId nullable sin sobrescribir el request original

### Requirement: Opciones condicionadas por capability
Una opción SHALL ser ejecutable sólo si referencia una capability negociada, target vigente y precondiciones válidas. De otro modo SHALL explicar por qué no está disponible.

#### Scenario: Control no soportado
- **WHEN** una decisión ofrece pausar pero la sesión no negoció `run.pause`
- **THEN** la opción permanece informativa con `available: false` y razón explícita

### Requirement: Ack separado de efecto
El estado de un comando SHALL distinguir solicitud, aceptación, acknowledgement, efecto observado, fallo y resultado desconocido.

#### Scenario: Interrupción reconocida
- **WHEN** un runtime confirma recepción de interrupt
- **THEN** Pipeline muestra ACK y espera reconciliación de sesión y working tree antes de declarar el efecto
