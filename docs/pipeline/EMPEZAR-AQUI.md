# Pipeline — Cómo empezar y cómo continuar

## Primer agente

El primer archivo que se entrega o se señala al agente es:

[`prompts/fase-00-contrato.md`](prompts/fase-00-contrato.md)

Instrucción mínima para copiar en cualquier IA con acceso al repositorio:

```text
Trabajá en C:\www\gitcron.
Ejecutá exclusivamente las instrucciones de:
docs/pipeline/prompts/fase-00-contrato.md

No implementes fases posteriores. Primero identificá IA/runtime/modelo/rol, reconstruí el contexto,
presentame la rama, las tandas y el alcance de TANDA 0, y pedime autorización antes de actuar.
```

F00 es deliberadamente audit-only. Su función es verificar las capacidades reales de Hermes,
Claude, Codex, `agy`, OpenCode y LM Studio antes de congelar contratos.

Agentes sugeridos:

- scout principal: Antigravity (`agy`) o Claude Code;
- auditor independiente: Codex de otra familia;
- Hermes: opcional como coordinador, usando `prompt-maestro-hermes.md`.

## Conversación durante una fase

1. El agente presenta identidad, objetivo, branch, tandas, riesgos y primera acción read-only.
2. Ale responde `OK, ejecutá TANDA 0` si está de acuerdo.
3. El agente ejecuta solo esa tanda y muestra el checkpoint.
4. Ale aprueba, corrige o bloquea antes de la tanda siguiente.
5. El proceso se repite hasta completar la fase.
6. El agente genera el reporte, marca `Lista para QA` y entrega mensaje/comandos de commit.
7. Ale hace QA, cambia el tablero a `Completada` si corresponde, y realiza stage, commit y push.
8. Ale decide y ejecuta el merge.

## Después de F00

No abrir F01 hasta que el contrato de F00 esté aprobado y su cierre humano esté hecho. Después usar,
siempre de a uno y respetando prerrequisitos:

1. [`prompts/fase-01-modelo-evidencia.md`](prompts/fase-01-modelo-evidencia.md)
2. [`prompts/fase-02-hermes-connector.md`](prompts/fase-02-hermes-connector.md)
3. [`prompts/fase-03-runtime-adapters.md`](prompts/fase-03-runtime-adapters.md)
4. [`prompts/fase-04-workspace-ui.md`](prompts/fase-04-workspace-ui.md)
5. [`prompts/fase-05-control-supervisado.md`](prompts/fase-05-control-supervisado.md)
6. [`prompts/fase-06-modelos-presupuestos.md`](prompts/fase-06-modelos-presupuestos.md)
7. [`prompts/fase-07-inteligencia-replay.md`](prompts/fase-07-inteligencia-replay.md)
8. [`prompts/fase-08-hardening-release.md`](prompts/fase-08-hardening-release.md)

F07 necesita datos reales suficientes; aunque figure después de F06, su TANDA 0 puede concluir que
ranking/predicción todavía deben diferirse. F08 empieza únicamente cuando F00–F07 estén cerradas.

## Qué archivo cumple cada función

- `CONTEXTO-INTEGRAL.md`: panorama completo para una IA nueva.
- `00-indice.md`: arquitectura, fases y decisiones del producto.
- `00-estado-track.md`: qué fase está planificada, activa, bloqueada o lista.
- `protocolo-ejecucion-agentes.md`: autorizaciones, ramas y cierre humano.
- `UX-DECISIONES.md`: cómo traducir solicitudes técnicas y separar observación de control.
- `prompts/`: punto de entrada ejecutable de cada fase.
- `briefs/`: detalle técnico y criterios de aceptación.
- `PLANTILLA-REPORTE-FASE.md`: forma obligatoria del reporte final.
- `docs/reports/`: reportes producidos después del trabajo.

## Regla simple

Para ejecutar, dar un archivo de `prompts/`. Para entender el detalle, leer `briefs/`. Para saber qué
ocurrió realmente, leer `docs/reports/`. No usar un brief técnico aislado como prompt inicial.
