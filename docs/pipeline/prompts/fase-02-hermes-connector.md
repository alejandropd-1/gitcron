# Prompt de ejecución — Pipeline Fase 02 · Hermes Connector read-only

> Rama: `pipeline/fase-02-hermes-connector`. Requiere F01 completada por Ale.

## Contexto obligatorio

Leé fuente de verdad, invariantes, contexto integral, estado del track, protocolo,
`docs/pipeline/briefs/fase-02-hermes-connector-readonly.md`, ADR F00 y reporte F01. Confirmá en el
código las versiones y contratos; no confíes solo en reportes previos.

## Decisiones confirmadas — no volver a preguntar

- El conector vive en Electron main; renderer no recibe secretos ni socket privilegiado.
- Vínculo explícito por repo/session; `cwd` solo no autoriza una asociación.
- Esta fase solo observa: no prompt, approval, interrupt, steer, model-set ni kill.
- Sin scraping de token/HTML ni bypass si falta un endpoint de Hermes.
- Ale realiza stage, commit y push.

## Ejecución y checkpoint

Identificate, anunciá rama/tandas/riesgos y pedí OK. TANDA 0 revalida auth, versión, fixtures y API
propuesta sin editar. Esperá aprobación antes de implementar cliente, normalización, vínculo,
reconnect, dedupe, cleanup e IPC read-only.

## Entregables

- Connector y pruebas definidas en el brief.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-02-hermes-connector.md` con plantilla oficial.
- Checklist humano de conexión/desconexión y actualización del tablero.

## Entrega

No ejecutes controles reales ni operaciones Git de cierre. Reportá validaciones con exit code,
seguridad, degradación, archivos, mensaje/comandos sugeridos y STOP.
