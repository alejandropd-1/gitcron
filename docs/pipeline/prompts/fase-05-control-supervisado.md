# Prompt de ejecución — Pipeline Fase 05 · Control supervisado

> Rama: `pipeline/fase-05-control-supervisado`. Requiere F04 completada y QA visual aprobada.

## Contexto obligatorio

Leé fuente de verdad, invariantes, contexto integral, estado, protocolo,
`docs/pipeline/briefs/fase-05-control-supervisado.md` y reporte F04. Revalidá capabilities reales;
observar una acción no implica poder controlarla.

## Decisiones confirmadas — no volver a preguntar

- Command bus en main, tipado y allowlisted; renderer no envía argv/PID/session libres.
- Todo target es per-repo y requiere idempotencia, audit log, ack y reconciliación.
- Stop no es rollback; no kill global ni control de procesos no owned.
- Controles reales o pruebas difíciles de revertir requieren autorización específica.
- Ale realiza stage, commit y push.

## Ejecución y checkpoints

Identificate, anunciá threat surface, rama, tandas y pruebas; pedí OK. TANDA 0 entrega threat model,
state machines y matriz comando/runtime sin editar. Esperá OK. Avanzá gradual: command bus,
pause/steer/queue, interrupt/process, approvals/cancel. Detenete antes de toda prueba live.

## Entregables

- Controles y guardrails del brief con pruebas adversariales cross-repo.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-05-control-supervisado.md`.
- Checklist manual de efectos parciales/confirmaciones y tablero actualizado.

## Entrega

Detallá casos adversariales, exit codes, seguridad, archivos, desvíos y riesgos. No hagas operaciones
Git de cierre. Entregá mensaje/comandos sugeridos y STOP.
