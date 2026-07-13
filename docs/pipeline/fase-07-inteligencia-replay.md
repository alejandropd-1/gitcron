# Pipeline Fase 07 — Replay, loops e inteligencia operativa

> Convierte el historial normalizado en comprensión: replay, explicaciones, anomalías,
> estimaciones y comparación de modelos. Requiere datos reales acumulados por F01–F06.
> Branch `pipeline/fase-07-inteligencia-replay`.

## Agentes recomendados

- **Cómputo determinístico:** Claude Code u OpenCode.
- **Exploración de umbrales/fixtures:** Antigravity o LM Studio, sin veredicto.
- **Auditor estadístico/privacidad:** Codex.

## Objetivo

- Replay cronológico de una corrida/change.
- Explicación “¿por qué pasó esto?” basada en evidencia citada.
- Detección determinística de loops, inactividad y gasto sin progreso.
- Estimación de tiempo/costo restante con intervalos y muestra.
- Comparación de modelos por resultado, no solo tokens/precio.
- Alertas per-repo cuando necesita humano.

## Principio de diseño

Lo determinístico se calcula sin IA. La IA, si se usa, solo narra un conjunto de evidencias
acotado, citado y sanitizado. Nunca decide gates, auditoría, rollback o control.

## Métricas de resultado

- costo y tiempo por task aprobada;
- calls/retries hasta gates verde;
- rechazos del auditor por severidad/categoría;
- fixer loops;
- tasks reabiertas;
- porcentaje de runs interrumpidas;
- compresiones/context pressure;
- cambios de modelo/fallback;
- archivos y churn por task;
- lead time proposal → merge.

Comparar solo cohorts compatibles (tipo/riesgo/tamaño de task) y mostrar `n`. No afirmar que un
modelo “es mejor” con dos muestras o trabajos distintos.

## Tandas

### TANDA 0 — Calidad de datos y definiciones

- Auditar cobertura real de identity/events/usage/cost/outcomes.
- Definir qué puede calcularse y qué queda unknown.
- Definir loops/anomalías con reglas explicables.
- Definir cohorts, tamaño mínimo e intervalos para predicciones.
- **CHECKPOINT 0:** data quality report. Si no hay muestra, construir replay y diferir ranking.

### TANDA 1 — Replay determinístico

- Reproducir snapshots/eventos con clock controlable y velocidades.
- Saltos por task/gates/audit/decision.
- Árbol de agentes y diffs en el punto temporal.
- Replay no emite controles ni modifica estado vivo.
- Version compatibility y eventos desconocidos visibles.

### TANDA 2 — Loop/anomaly engine

Reglas puras testeables, por ejemplo:

- mismo hallazgo rechazado dos veces;
- mismo comando/error repetido;
- tokens/costo crecen sin tool/file/task progress;
- agente activo sin heartbeat más de umbral;
- fallback/model drift inesperado;
- context pressure + errores/retries;
- task completada declarada pero evidence no actualizada.

Cada alerta incluye evidencia, confidence y acción sugerida; no actúa sola.

### TANDA 3 — Estimaciones y comparación

- Tiempo/costo restante por distribución histórica y tasks restantes.
- Intervalo, cohort, n y fecha; sin falsa precisión.
- Comparación por modelo/proveedor/rol/tipo de task.
- Actual vs estimated costs separados.
- No entrenar modelo ML complejo: baseline estadístico transparente primero.

### TANDA 4 — Explicación grounded y notificaciones

- “¿Por qué volvió al fixer?” responde desde eventos/report/gates citados.
- Narración local/online opt-in, cacheada por hash del evidence set.
- Prompt acotado, sin secretos/raw reasoning innecesario.
- Notificaciones: necesita spec, escalation, budget, audit rejected, merge ready.
- Quiet hours/dedupe; no spam por delta.

## Prompt copiable — builder Claude/OpenCode

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
fase, rama, tandas y checkpoints. No escribas ni crees la rama hasta recibir autorización.
Implementá SOLO Pipeline Fase 07. Empezá con TANDA 0 audit-only de calidad de datos. Si no hay
muestra suficiente, no inventes rankings: implementá replay y reglas determinísticas, y dejá
predicción/comparación marcada como insuficiente. Esperá OK.

Replay es read-only y no toca estado vivo. Loops/anomalías son funciones puras con evidencia y
tests. Estimaciones muestran rango, cohort y n. La IA solo narra evidence acotado/citado y es
opt-in/cacheada. No automatices controles. No CSS. Cierre estándar con mensaje y comandos de
commit/push sugeridos, sin ejecutarlos.
```

## Prompt copiable — análisis mecánico Antigravity/LM Studio

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Este análisis es read-only: no crees rama ni edites.
Sobre fixtures sanitizados de Pipeline F07, agrupá eventos repetidos y proponé candidatos de
reglas observables. No declares anomalías, causalidad ni “mejor modelo”; entregá conteos,
secuencias y ejemplos para revisión humana. No accedas a secretos/reasoning crudo. STOP.
```

## Prompt copiable — auditor Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta auditoría es read-only: no crees rama ni edites.
Auditá F07 read-only. Revisá data leakage, replay que afecte live state, causalidad falsa,
rankings con muestras pequeñas, cohorts incomparables, double-count, intervalos ausentes,
reasoning usado como quality score, narración sin citas y alertas que ejecutan acciones.
Veredicto y hallazgos; un ranking engañoso es rechazo.
```

## Qué NO hacer

- No auto-stop, auto-switch, auto-merge ni auto-approve.
- No ranking sin muestra/cohort comparable.
- No “calidad = más reasoning/tokens”.
- No replay con side effects.
- No narración sin evidencia citada.
- No almacenar raw reasoning indefinidamente por defecto.

## Criterios de aceptación

- [ ] Replay reproduce sin modificar live state.
- [ ] Loops/anomalías tienen reglas y evidencia.
- [ ] Estimaciones muestran rango, n y cohort o “datos insuficientes”.
- [ ] Comparación considera outcomes/quality, no solo costo.
- [ ] Explicaciones citan eventos/reportes/gates.
- [ ] Notificaciones deduplicadas y per-repo.
