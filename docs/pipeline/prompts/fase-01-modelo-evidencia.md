# Prompt de ejecución — Pipeline Fase 01 · Modelo y evidencia per-repo

> Rama: `pipeline/fase-01-modelo-evidencia`. Ejecutar solo si F00 fue confirmada por Ale y el gate
> base versionado devuelve `VERDE`.

## Contexto obligatorio

Leé fuente de verdad, invariantes, `CONTEXTO-INTEGRAL.md`, `00-estado-track.md`, protocolo común,
`docs/pipeline/UX-DECISIONES.md`, brief F01 y reporte final de F00. Verificá el repo: una IA anterior puede haber
dejado la documentación desactualizada.

## Decisiones confirmadas — no volver a preguntar

- Modelo y persistencia per-repo; sin UI ni conexión a Hermes en esta fase.
- Parsers/reducers puros; I/O separado; repos sin scaffold son válidos.
- Git/OpenSpec/docs/filesystem son evidencia, no texto decorativo.
- Parsear los tres JSONL locales con schema F00 y normalizar `DecisionRequest` antes de diseñar UI.
- Preservar métricas opcionales de resultado/reintentos/espera/toques humanos y normalizar la
  evaluación por control sin convertir ausencia en cero.
- Una aprobación de zona protegida conserva diff/archivos/digest exactos; no acepta texto ambiguo.
- Repo sin kit es degradación parcial, no ausencia total de Pipeline.
- Secrets y reasoning crudo no se persisten indiscriminadamente.
- Ale realiza stage, commit y push.
- Antes de escribir producto, `pwsh -NoProfile -File scripts/gates.ps1 fast` debe dar `VERDE`;
  `ROJO` o `PENDIENTE`
  detienen F01 y se reportan sin reinterpretarlos.

## Ejecución

Identificate y anunciá objetivo, scope, rama, tandas, archivos probables y validaciones. Pedí OK para
crear la rama e iniciar. TANDA 0 corre primero el gate base y luego audita sin modificar: localizá modelos, DB, preload/IPC y
helpers reutilizables. Mostrá el mapa y esperá OK. Después ejecutá una tanda autorizada por vez según
`docs/pipeline/briefs/fase-01-modelo-y-evidencia-repo.md`.

## Entregables

- Dominio, `DecisionRequest`, lectores JSONL, seguridad de paths, reducer, SQLite e IPC read-only
  del brief.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-01-modelo-evidencia.md` con la plantilla oficial.
- Checklist humano para repos con/sin kit y estado `Lista para QA` o `Bloqueada` en el tablero.

## Entrega

Ejecutá typecheck, tests focalizados, suite y fallow según el brief. No hagas operaciones Git de
cierre. Entregá exit codes, archivos, desvíos, riesgos, mensaje de commit/comandos sugeridos y STOP.
