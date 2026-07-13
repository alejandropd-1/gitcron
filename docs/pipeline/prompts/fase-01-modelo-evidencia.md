# Prompt de ejecución — Pipeline Fase 01 · Modelo y evidencia per-repo

> Rama: `pipeline/fase-01-modelo-evidencia`. Ejecutar solo si F00 fue confirmada por Ale.

## Contexto obligatorio

Leé fuente de verdad, invariantes, `CONTEXTO-INTEGRAL.md`, `00-estado-track.md`, protocolo común,
brief F01 y reporte final de F00. Verificá el repo: una IA anterior puede haber dejado la
documentación desactualizada.

## Decisiones confirmadas — no volver a preguntar

- Modelo y persistencia per-repo; sin UI ni conexión a Hermes en esta fase.
- Parsers/reducers puros; I/O separado; repos sin scaffold son válidos.
- Git/OpenSpec/docs/filesystem son evidencia, no texto decorativo.
- Secrets y reasoning crudo no se persisten indiscriminadamente.
- Ale realiza stage, commit y push.

## Ejecución

Identificate y anunciá objetivo, scope, rama, tandas, archivos probables y validaciones. Pedí OK para
crear la rama e iniciar. TANDA 0 es auditoría sin modificar: localizá modelos, DB, preload/IPC y
helpers reutilizables. Mostrá el mapa y esperá OK. Después ejecutá una tanda autorizada por vez según
`fase-01-modelo-y-evidencia-repo.md`.

## Entregables

- Dominio, lectores, seguridad de paths, reducer, SQLite e IPC read-only del brief.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-01-modelo-evidencia.md` con la plantilla oficial.
- Checklist humano para repos con/sin kit y estado `Lista para QA` o `Bloqueada` en el tablero.

## Entrega

Ejecutá typecheck, tests focalizados, suite y fallow según el brief. No hagas operaciones Git de
cierre. Entregá exit codes, archivos, desvíos, riesgos, mensaje de commit/comandos sugeridos y STOP.

