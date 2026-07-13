# Prompt de ejecución — Pipeline Fase 03 · Adaptadores y telemetría

> Rama: `pipeline/fase-03-runtime-adapters`. Requiere F02 completada.

## Contexto obligatorio

Leé fuente de verdad, invariantes, contexto integral, estado, protocolo, contrato F00, brief F03 y
reporte F02. Esta fase tiene varias tandas/runtimes: no asumas que el mismo agente debe hacerlas todas.

## Decisiones confirmadas — no volver a preguntar

- Adaptadores: Hermes, Claude, Codex, `agy`, OpenCode y LM Studio.
- Capability ausente se declara; no se simula paridad.
- No parsear prosa frágil ni presentar reasoning/costo/contexto inferidos como reales.
- LM Studio es proveedor local, no auditor; ningún control público se habilita todavía.
- Ale realiza stage, commit y push.

## Ejecución y checkpoints

Identificate y declarate responsable de una tanda/runtime concreto. Anunciá rama, fixtures, archivos y
conformance tests; pedí OK. TANDA 0 congela interface y tabla de degradación. Antes de cada adaptador,
revalidá su CLI/API instalada y detenete si el schema difiere. Un auditor de otra familia revisa el
conjunto completo.

## Entregables

- Adaptadores y conformance suite del brief, con procedencia por campo.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-03-runtime-adapters.md` con sección por runtime.
- Tabla PASS/DEGRADED/NO SOPORTADO y tablero actualizado.

## Entrega

Incluí exit codes, procesos/cleanup, compatibilidad, datos desconocidos, desvíos y checklist humano.
No stage/commit/push/merge. Mensaje y comandos sugeridos; STOP.

