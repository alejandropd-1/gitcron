# Prompt de ejecución — Pipeline Fase 04 · Workspace visual per-repo

> Rama: `pipeline/fase-04-workspace-ui`. Requiere F03 completada.

## Contexto obligatorio

Leé fuente de verdad, invariantes, contexto integral, estado, protocolo,
`docs/pipeline/UX-DECISIONES.md`,
`docs/pipeline/briefs/fase-04-workspace-pipeline-ui.md` y reporte F03. Auditá primero la navegación,
stores y componentes existentes que deben reutilizarse.

## Decisiones confirmadas — no volver a preguntar

- La solapa pertenece al repo activo y muestra Now, camino, agentes, actividad, economía y diffs.
- Implementar el inbox read-only según `docs/pipeline/UX-DECISIONES.md`.
- Unknown no es cero; derived no es hecho; raw payload/reasoning no se expone por defecto.
- Reusar `DiffViewer`; i18n ES/EN/ZH y accesibilidad son parte del alcance.
- Los agentes entregan markup semántico y estado; Ale escribe/modifica CSS.
- F04 no aprueba, rechaza, responde a runtimes/orquestadores ni mergea; esas opciones explican su
  indisponibilidad.
- Ale realiza stage, commit y push.

## Ejecución y checkpoints

Identificate, anunciá rama/tandas/componentes/validaciones y pedí OK. TANDA 0 entrega wireframe
textual, árbol de componentes, props y fixtures sin editar. Esperá OK. Implementá una tanda por vez y
cerrá cada una con checkpoint funcional/visual. Si creés necesitar CSS, detenete y pedí dirección.

## Entregables

- Workspace, inbox y estados definidos por F04, sin controles de F05.
- Evidencia visual de estados y resoluciones acordadas.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-04-workspace-ui.md` con plantilla oficial.
- Checklist manual de teclado/i18n/estados y tablero actualizado.

## Entrega

Reportá typecheck/tests/fallow/QA, consola, archivos, desvíos y ausencia de cambios CSS. No hagas
stage/commit/push. Entregá mensaje/comandos sugeridos y STOP para QA visual de Ale.
