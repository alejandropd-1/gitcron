# Prompt de ejecución — Pipeline Fase 00 · Contrato y spikes

> Rama: `pipeline/fase-00-contrato`. Fase audit-only. No implementar código de producto.

## Contexto obligatorio

GitCron construirá una torre de control per-repo para Hermes, Claude, Codex, `agy`, OpenCode y LM
Studio. Esta fase elimina supuestos antes de diseñar adaptadores. Leé, en orden:

1. `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`;
2. `docs/pipeline/CONTEXTO-INTEGRAL.md`;
3. `docs/pipeline/00-estado-track.md`;
4. `docs/pipeline/protocolo-ejecucion-agentes.md`;
5. `docs/pipeline/briefs/fase-00-contrato-y-spikes.md`.

## Decisiones confirmadas — no volver a preguntar

- GitCron observa y controla; Hermes sigue siendo el orquestador.
- El producto es per-repo y contrasta runtime con Git/OpenSpec/filesystem.
- Reasoning, costo y contexto conservan procedencia; unknown nunca se inventa.
- No ejecutar probes pagos, leer secretos ni instalar dependencias sin autorización.
- Ale realiza stage, commit y push.

## Arranque y checkpoint

Identificate con IA/runtime/modelo/rol. Inspeccioná read-only Git y las interfaces instaladas.
Presentá: estado, capacidades a verificar, alternativas de protocolo, fixtures propuestos, tandas,
riesgos y rama objetivo. Pedí OK antes de crear/cambiar la rama o escribir documentación de salida.
Ejecutá solo TANDA 0 y detenete en su checkpoint.

## Entregables

- Contrato v1 propuesto, matriz de capabilities, fixtures/procedimiento y ADR de conexión.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-00-contrato.md` usando
  `docs/pipeline/PLANTILLA-REPORTE-FASE.md`.
- Actualización de `docs/pipeline/00-estado-track.md` a `Lista para QA` o `Bloqueada`.

## Entrega

No hagas stage, commit, push, merge, tag ni release. Cerrá con checks aplicables, checklist humano,
desvíos, riesgos, `git status --short`, mensaje de commit sugerido y `STOP` para QA de Ale.
