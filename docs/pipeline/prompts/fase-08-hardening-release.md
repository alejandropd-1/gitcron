# Prompt de ejecución — Pipeline Fase 08 · Hardening y release candidate

> Rama: `pipeline/fase-08-hardening-release`. Requiere F00–F07 completadas.

## Contexto obligatorio

Leé fuente de verdad, invariantes, contexto integral, estado, protocolo,
`docs/pipeline/briefs/fase-08-hardening-y-release.md` y todos los reportes Pipeline. Verificá el
código: esta fase corrige el track real, no una lista histórica.

## Decisiones confirmadas — no volver a preguntar

- Freeze de features: F08 corrige, prueba, documenta y prepara; no agrega producto nuevo.
- Ningún borrado por fallow sin prueba y checkpoint.
- Validar seguridad, privacidad, streams, DB, runtimes ausentes e instalación Windows.
- Ale controla CSS final, QA, stage, commit, push, merge, tag y release.
- No debilitar CSP/sandbox/auth para hacer pasar packaging.

## Ejecución y checkpoints

Identificate y anunciá rama, inventario, tandas, riesgos y validaciones; pedí OK. TANDA 0 produce
freeze, threat surface, inventario y lista de borrados sin editar. Esperá OK. Corregí solo hallazgos
aprobados y separá seguridad, resiliencia, compatibilidad, E2E y documentación. Toda corrida real,
probe pago, borrado o cambio de packaging necesita autorización aplicable.

## Entregables

- Hardening y release candidate del brief sin features adicionales.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-08-hardening-release.md` con matriz, P0/P1, E2E,
  packaged Windows, privacidad y checklist de release.
- Tablero en `Lista para QA`; solo Ale lo cambia a `Completada`.

## Entrega

No hagas stage/commit/push/merge/tag/release. Entregá exit codes, evidencia visual, archivos,
desvíos, riesgos, mensaje/comandos sugeridos y STOP para QA y publicación humana.
