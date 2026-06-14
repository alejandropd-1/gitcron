# F6 — Dashboard estadístico del Temporal Agent (Brier) (brief para el agente)

> **Leé primero:** `docs/00_FUENTE_DE_VERDAD.md`, `docs/01_INVARIANTES.md` y
> `docs/TEMPORAL_AGENT_DESIGN.md` (el diseño del agente — no rediseñar nada de ahí). Trabajá
> por TANDAS y PARÁ en cada checkpoint. Esta fase es **lectura pura de SQLite + render**;
> riesgo bajo. **Prerrequisito:** que SQLite ya tenga datos acumulados (varias predicciones
> con decisiones). Si está casi vacía, el dashboard se construye igual pero con estados vacíos
> elegantes — confirmá con Ale cuántos datos hay antes de empezar.

## Por qué esta feature

El Temporal Agent guarda confianza auto-reportada por predicción (0..1) y el resultado real
(aceptada/materializada/rechazada/diferida). Con eso se puede medir **calibración**: ¿cuando
la IA dice "0.7" acierta el 70%? El **Brier score** y la **curva de calibración** lo
cuantifican. Encaja natural en la estética TCARS/Centauro. Es el pago de toda la inversión
en persistencia SQLite.

## Estado de partida (verificado)

- SQLite global en `userData`, 3 tablas append-only: `prediction_run` (contexto del batch:
  provider, modelo, fecha, scope), `speculative_branch` (predicción individual con confidence
  normalizada 0..1, type, outcome), `branch_decision` (log append-only de cada
  accept/reject/defer con timestamp). Detalle en `docs/TEMPORAL_AGENT_DESIGN.md`.
- IPC de lectura YA existe: `temporal-agent:get-history` (historial por run),
  `ai:load-prediction` (caché). Hay `electron/db/repository.ts` con las queries.
- UI del agente: HUD Centauro (informe/historial), `temporal/PredictionDetail.tsx`.
- **Convención (invariante de diseño):** la DB guarda valores crudos (confidence normalizada,
  outcomes, timestamps). **No** guarda scores computados. El Brier y la calibración se
  **calculan al leer**, nunca se persisten. Respetalo.
- **Diferidos = censurados:** una predicción `deferred` sin resolver se EXCLUYE del Brier
  hasta que se resuelva (no cuenta como acierto ni error). Esto ya está decidido en el diseño.

## Arquitectura objetivo

### Cómputo (módulo puro testeable)
`lib/agent-stats.ts` con tests Vitest. A partir de las filas crudas de la DB:
- `brierScore(predictions)` → media de `(confidence - outcome)²`, donde `outcome ∈ {0,1}`
  (materializada/aceptada = 1, rechazada = 0; **diferida sin resolver = excluida**).
- `calibrationCurve(predictions, bins)` → por bin de confianza (p.ej. 0–0.1, …, 0.9–1.0):
  confianza media predicha vs. tasa real de acierto + n. Para la curva clásica.
- `outcomeBreakdown`, `acceptanceByType` (improvement/breakthrough/trend),
  `providerComparison` (Brier por proveedor/modelo).
Estos cálculos NO van en el componente ni en el handler: módulo puro, con fixtures que cubran
el caso de diferidos excluidos, bins vacíos, y n=0.

### Lectura
Si `temporal-agent:get-history` ya devuelve lo necesario, reusalo. Si falta una query
agregada cross-run (todas las predicciones del repo, o de todos los repos para la vista
unificada), agregar un handler de **solo lectura** `temporal-agent:get-stats(repoPath?)` en
`electron/temporal-agent-ipc.ts` apoyado en `electron/db/repository.ts`. Nada de escritura.

### UI
Vista de dashboard (entrada desde Settings → Temporal Agent, o desde el HUD Centauro — elegí
lo que respete el layout). Charts con la estética TCARS/Centauro (cian/verde/naranja, glass):
- **Curva de calibración** (diagonal ideal + puntos por bin con tamaño = n).
- **Brier score** del repo (y comparación entre proveedores/modelos).
- **Outcome breakdown** en el tiempo (aceptadas/materializadas/rechazadas/diferidas).
- **Aceptación por tipo** de predicción.
- Toggle **per-repo / unificado cross-repo**.
Para los charts podés usar SVG propio (coherente con el grafo) o una lib liviana si ya está
en el bundle; no agregues dependencias pesadas sin justificar. Estados vacíos elegantes
cuando no hay datos suficientes. i18n 3 idiomas.

## Plan de tandas

1. **TANDA 0 — Diseño + datos reales.** Confirmar el shape exacto que devuelven las queries
   existentes, cuántos datos hay hoy, y qué query agregada falta (si falta). Definir tipos de
   `lib/agent-stats.ts` y los casos borde (diferidos, n=0, bins vacíos). **CHECKPOINT 0.**
2. **TANDA 1 — Cómputo + tests.** `lib/agent-stats.ts` con Vitest verde sobre fixtures.
   Cero UI. CHECKPOINT.
3. **TANDA 2 — Lectura.** Reusar/crear el handler de stats (solo lectura), exponer en preload
   + tipos. Probar que devuelve datos reales del repo. CHECKPOINT.
4. **TANDA 3 — UI charts.** Dashboard con los 4–5 charts, toggle per-repo/unificado, estados
   vacíos, i18n 3 idiomas, estética TCARS. CHECKPOINT (QA visual).

## Qué NO hacer

- No persistir scores computados en la DB (rompe la convención de "solo valores crudos").
- No incluir diferidos sin resolver en el Brier.
- No tocar la lógica del agente (predict, providers, materialización), ni el schema SQLite,
  ni `electron/db` salvo agregar una query de lectura. No rediseñar nada de TEMPORAL_AGENT_DESIGN.md.
- No disparar predicciones de IA para "generar datos" (invariante #10: consume crédito de
  Ale — solo él dispara). El dashboard se prueba con los datos que ya existen o con fixtures.
- No tocar README/CHANGELOG.

## Cierre
Reporte en `docs/reports/F6_REPORT.md`: queries usadas, fórmulas implementadas, casos borde
cubiertos, métricas. STOP para OK visual de Ale.
