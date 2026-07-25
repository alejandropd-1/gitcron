# Reporte de Cierre: Fase 06 — Modelos, Presupuestos, Contexto y Routing por Rol

**Fecha:** 2026-07-25
**Fase:** Fase 06 — Modelos, presupuestos, contexto y routing por rol
**Estado:** Completada
**Autor:** Antigravity (Pair Programming con Ale)

---

## 1. Resumen Ejecutivo

La **Fase 06** extiende la arquitectura del Pipeline de GitCron con selección jerárquica de modelos por repositorio, rol (Scout, Planner, Builder, Auditor, Fixer) y tarea; decorrelación bloqueante de familias de proveedores entre `builder` y `auditor`; contabilidad precisa de tokens y costos sin *double-counting*; y monitoreo de la salud de la ventana de contexto con alertas no destructivas.

Todas las tandas (0 a 5) fueron diseñadas e implementadas respetando las directivas de `docs/pipeline/briefs/fase-06-modelos-presupuestos-contexto.md`:
- **Next Safe Unit:** Ningún cambio de modelo o presupuesto aplica *hot-swap* a llamadas o turnos activos.
- **Decorrelación Inviolable Builder/Auditor:** `builder` y `auditor` no pueden pertenecer a la misma `providerFamily`. En caso de conflicto se aplica rerouting a una familia alternativa o se lanza `ModelDecorrelationError` (`DECORRELATION_VIOLATION`).
- **Invariante de Datos Ausentes (`local_unpriced` & `unknown`):** Modelos locales o sin tarifa registrada retornan `costUsd = null` con `costBasis = 'local_unpriced'` (nunca `$0.0000`).
- **No Double-Counting:** Los tokens de subagentes se atribuyen de forma aislada a `treeTotalTokens` del nodo sin duplicarse en `directTokens` del agente padre.
- **Alertas y Presupuestos Supervisados:** Presupuestos `soft` (notificación) y `hard` (pausa previa a la siguiente unidad). Contexto dividido en `healthy`, `pressure`, `critical`, `compressed` y `unknown`.

---

## 2. Tandas Entregadas

### TANDA 0 — Checkpoint Cero y Threat Model
- Elaboración del documento `docs/pipeline/f06/CHECKPOINT-0.md`.
- Definición del modelo de amenazas, regla "Next Safe Unit", trinidad `requested`/`resolved`/`reported` y política de datos ausentes.

### TANDA 1 — Catálogo de Modelos y Selección Jerárquica
- Creación de `electron/pipeline/models/model-catalog-types.ts` y `model-catalog.ts` (`ModelCatalog`).
- Soporte para familias `anthropic`, `openai`, `google`, `opencode-acp`, `lmstudio-local` y `unknown`.
- Evaluación jerárquica de selección: `default < repo < role < change < task < run`.
- Pruebas unitarias en `electron/__tests__/model-catalog.test.ts`.

### TANDA 2 — Routing y Decorrelación Builder/Auditor
- Creación de `electron/pipeline/models/model-router.ts` (`ModelRouter`).
- Validación y rerouting automático para garantizar familias distintas entre builder y auditor.
- Detección de drift del modelo reportado por el runtime (`verifyReportedModel`).
- Pruebas unitarias en `electron/__tests__/model-router.test.ts`.

### TANDA 3 — Usage, Costo en USD y Contabilidad sin Double-Counting
- Creación de `electron/pipeline/models/budget-types.ts` y `budget-engine.ts` (`BudgetEngine`).
- Cálculo de costo real en USD a partir de descriptores de catálogo.
- Tratamiento estricto de `local_unpriced` para modelos locales.
- Pruebas unitarias en `electron/__tests__/budget-engine.test.ts`.

### TANDA 4 — Salud de Contexto, Compresiones y Alertas de Headroom
- Creación de `electron/pipeline/models/context-health-types.ts` y `context-health-engine.ts` (`ContextHealthEngine`).
- Evaluación de estados `healthy` (<70%), `pressure` (70%-89%), `critical` (>=90%), `compressed` y `unknown`.
- Generación de recomendaciones no destructivas (`recommend_compact`, `recommend_new_session`).
- Pruebas unitarias en `electron/__tests__/context-health.test.ts`.

### TANDA 5 — Enforcement de Presupuesto, UI e i18n
- Creación de `electron/pipeline/models/budget-enforcement.ts` (`BudgetEnforcementEngine`).
- Aplicación de límites `soft` (notificación) y `hard` (pausa previa a la siguiente unidad).
- Claves i18n agregadas en ES, EN y ZH en `lib/i18n.ts`.
- Pruebas unitarias en `electron/__tests__/budget-enforcement.test.ts`.
- Emisión del presente reporte oficial y actualización de `docs/pipeline/00-estado-track.md` a `Completada`.

---

## 3. Matriz de Verificación

| Verificación | Comando | Resultado |
| :--- | :--- | :--- |
| **Typecheck** | `pnpm exec tsc --noEmit` | **VERDE (0 errores)** |
| **Pruebas unitarias** | `pnpm test` | **VERDE (73 archivos / 445 tests)** |
| **ESLint** | `pnpm exec eslint electron/pipeline/models/` | **VERDE (0 errores)** |
| **Veto Base Gate** | `pwsh -NoProfile -File scripts/gates.ps1 fast` | **VERDE** |
| **Full Gate** | `pwsh -NoProfile -File scripts/gates.ps1 full` | **VERDE** |

---

## 4. Próxima Fase

Con la Fase 06 completada, el pipeline cuenta con visualización (Fase 04), control supervisado (Fase 05) y gestión de modelos/presupuestos/contexto (Fase 06). La siguiente fase planificada es la **Fase 07 — Inteligencia y Replay de Corridas**.
