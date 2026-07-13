# Prompt de ejecución — Pipeline Fase 07 · Replay e inteligencia operativa

> Rama: `pipeline/fase-07-inteligencia-replay`. Requiere F01–F06 y una muestra auditable.

## Contexto obligatorio

Leé fuente de verdad, invariantes, contexto integral, estado, protocolo,
`docs/pipeline/briefs/fase-07-inteligencia-replay.md` y reportes F01–F06. No des por suficiente una
muestra solo porque existen eventos.

## Decisiones confirmadas — no volver a preguntar

- Replay es determinístico, read-only y sin efectos sobre el estado vivo.
- Loops/anomalías empiezan como reglas explicables con evidencia.
- Estimaciones muestran rango, cohort, `n` y fecha; sin muestra se declara insuficiente.
- No ranking por tokens/precio ni “más reasoning = más calidad”.
- Narración grounded, citada y opt-in; alertas no ejecutan controles.
- Ale realiza stage, commit y push.

## Ejecución y checkpoints

Identificate y anunciá rama, tandas, datasets, privacidad y validaciones; pedí OK. TANDA 0 produce un
data-quality report sin editar. Esperá decisión humana: si la muestra no alcanza, implementá replay y
reglas, pero diferí ranking/predicción. Separá replay, anomaly engine, estimaciones y explicación.

## Entregables

- Replay/reglas/estimaciones permitidas por la evidencia y tests del brief.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-07-inteligencia-replay.md` con cobertura, cohorts y
  funcionalidades diferidas.
- Checklist manual y tablero actualizado.

## Entrega

Reportá privacidad, falsos positivos, incertidumbre, exit codes, desvíos y archivos. No operaciones
Git de cierre. Mensaje/comandos sugeridos y STOP.
