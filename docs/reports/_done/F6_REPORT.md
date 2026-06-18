# Reporte de Fase — F6 Dashboard Estadístico del Temporal Agent (Brier)

Este documento reporta la implementación de la fase **F6: Dashboard estadístico del Temporal Agent (Brier)** en GitCron.

## 1. Cambios Realizados y Qué NO se Tocó

Se implementó el flujo completo de recolección de métricas, cómputo puramente testeable, exposición mediante el puente de Electron y renderizado de la interfaz visual con gráficos interactivos y adaptativos en la estética LCARS/Centauro:

- **Cómputo Puro (F6.A)**: Implementación en `lib/agent-stats.ts` de las métricas de Brier Score, curva de calibración (bins de confianza), desglose temporal de decisiones, ratio de aceptación por tipo (`improvement`/`breakthrough`/`trend`) y Brier por modelo/proveedor.
- **Pruebas Unitarias (F6.A)**: Implementación de 17 casos de prueba robustos en `lib/__tests__/agent-stats.test.ts` que cubren bases de datos vacías, exclusión de diferidos/sin resolver, bins vacíos y agrupaciones cronológicas y por proveedor.
- **Lectura y Puente IPC (F6.B)**: Extensión de `getPredictionHistory` en `electron/temporal-agent-ipc.ts` para habilitar consultas cross-repo (cuando `repoPath` es nulo/vacío) usando `getAllRuns()`. Adaptación del puente de comunicación en `electron/preload.ts` y tipos globales en `types/electron.d.ts`.
- **Integración en Ajustes (F6.C)**: Creación de la sección **Dashboard Temporal** accesible desde el menú lateral de ajustes en `SettingsPanel.tsx` y `RepoSidebar.tsx`.
- **Integración en Grafo (F6.C)**: Agregado de una pestaña **Estadísticas** dentro del panel HUD Centauro en `ChronometricGraph.tsx` para permitir un acceso inmediato e integrado desde la diagonal cronométrica.
- **UI Dashboard (F6.C)**: Creación de `components/temporal/AgentDashboard.tsx` con soporte i18n trilingüe. Renderiza 4 gráficos SVG livianos e interactivos con estados vacíos elegantes y de alta calidad visual.

**Qué NO se tocó**:
- La base de datos SQLite permanece inalterada (sin persistir scores computados, respetando la convención de solo persistir datos crudos).
- La lógica del agente (predict, providers, materialización).
- La geometría matemática de los gráficos clásico y cronométrico (`ChronometricGraph.tsx` y `CommitGraph.tsx`).

---

## 2. Casos Borde Cubiertos y Fórmulas

1. **Brier Score**: $\frac{1}{N} \sum_{i=1}^{N} (f_i - o_i)^2$ donde $o_i \in \{0, 1\}$ (Aceptada/Materializada = 1, Rechazada = 0).
   - *Caso Borde*: Los diferidos (`deferred`) y las predicciones sin decisiones tomadas se excluyen del cómputo para evitar sesgos de censura.
   - *Caso Borde (N = 0)*: Si no hay predicciones resueltas, el Brier score retorna `null` y la UI muestra un estado de espera elegante.
2. **Curva de Calibración**:
   - Agrupamiento en 10 bins de confianza (por ejemplo, `0.0-0.1`, `0.1-0.2`, ..., `0.9-1.0`).
   - El tamaño de los puntos de calibración en el gráfico SVG es proporcional a la raíz cuadrada de $n$ (cantidad de muestras en ese bin) para una escala visual harmoniosa.
   - *Caso Borde*: Bins sin datos resueltos retornan `null` y no se dibujan, evitando picos espurios o ceros ficticios.
3. **Historial de Decisiones (Outcome Breakdown)**:
   - Agrupación por el día de la predicción (`generatedAt` YYYY-MM-DD) y gráfico de barras apiladas SVG interactivo que muestra la recepción de ideas en el tiempo.

---

## 3. Métricas y Delta de Calidad

- **Tests unitarios e integración (Vitest)**: Se agregaron **17 tests unitarios**, todos pasando en verde. La suite completa de tests de GitCron subió de **159 a 176 tests**, manteniéndose verde en su totalidad.
- **Type Checking (tsc)**: `0` errores tipo TypeScript detectados.
- **Maintainability Index (MI)**: `90.3` (bueno, salud estructural estable).
- **Delta Fallow**: No se introdujeron problemas de código muerto o duplicado en los nuevos componentes o funciones utilitarias.
