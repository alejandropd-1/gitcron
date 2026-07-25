# CHECKPOINT 0 — Data Quality Report & Anomaly Rules (Fase 07)

**Fecha:** 2026-07-25
**Fase:** Fase 07 — Replay, loops e inteligencia operativa
**Estado:** Auditado (TANDA 0)
**Autor:** Antigravity (Pair Programming con Ale)

---

## 1. Alcance y Principios de Diseño

El objetivo de la **Fase 07** es convertir el historial acumulado por el Pipeline (Fases 01 a 06) en comprensión operativa: replay determinístico cronológico, detección de loops y anomalías con evidencia citada, estimaciones estadísticas con intervalos de confianza y recomendaciones no destructivas sobre controles.

### Principios Fundamentales:
1. **Replay Determinístico Read-Only:** El reproductor histórico funciona sin LLMs y no modifica el estado vivo (`live state`), ni ejecuta IPC de control ni altera archivos del repositorio.
2. **Explicabilidad Citada:** Las alertas y narraciones citan eventos específicos (`eventId`, `timestamp`, `agentId`, `fileRef`). Ninguna anomalía o sugerencia actúa sin evidencia o de forma invisible.
3. **Transparencia Muestral (`n < 5` = Insuficiente):** No se generan rankings ni predicciones pseudo-precisas con muestras pequeñas. Se requiere `n >= 5` en el mismo cohort (tipo y riesgo de tarea). De lo contrario, se declara explícitamente `"Muestra insuficiente. Predicción diferida"`.
4. **Cero Automatización de Controles:** Las sugerencias de política (`mandatory`, `conditional`, `sampled`, `retire-candidate`) abren únicamente una consulta para el usuario humano; nunca cambian la configuración o gates automáticamente.

---

## 2. Cobertura y Calidad de Datos Auditada

| Dimensión | Fuente de Evidencia | Estado de Cobertura | Manejo de Ausencia |
| :--- | :--- | :--- | :--- |
| **Identidad de Agentes** | Events / Snapshots (F01/F03/F04) | Medida (`measured`) | `UnknownValue('not-reported')` |
| **Eventos de Estación y Gates** | Activity Feed & Audit (F01/F04/F05) | Medida (`measured`) | `UnknownValue('not-reported')` |
| **Tokens y Costos en USD** | Budget Engine (F06) | Medida (`real_usage`) / Local (`local_unpriced`) | `costUsd = null`, `costBasis = 'local_unpriced'` |
| **Salud de Contexto** | Context Health Engine (F06) | Medida (`measured`) / Estimada (`estimated`) | `healthState = 'unknown'` |
| **Outcomes de Tareas** | Decision Inbox & Gates (F04/F05) | Medida (`measured`) | `UnknownValue('pending-fixture')` |

---

## 3. Catálogo Explicable de Loops y Anomalías

```typescript
export type AnomalyType =
  | 'REPEATED_AUDIT_REJECTION'
  | 'REPEATED_COMMAND_FAILURE'
  | 'STAGNANT_TOKEN_SPEND'
  | 'INACTIVE_HEARTBEAT'
  | 'UNANNOUNCED_MODEL_DRIFT'
  | 'CONTEXT_PRESSURE_RETRY_LOOP';

export interface AnomalyAlert {
  alertId: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0.0 a 1.0
  evidenceRefs: string[];
  explanationKey: string;
  suggestedActionKey: string;
  timestamp: number;
}
```

### Reglas Puras Determinísticas:
1. **`REPEATED_AUDIT_REJECTION`:** Un auditor o gate C1-C6 rechaza la misma regla/hallazgo 2 o más veces consecutivas en la misma sesión.
2. **`REPEATED_COMMAND_FAILURE`:** El mismo comando con los mismos argumentos y error de salida se ejecuta 2 o más veces sin cambios intermedios en los archivos.
3. **`STAGNANT_TOKEN_SPEND`:** El consumo acumulado supera los 50.000 tokens en la tarea actual sin registrar modificaciones en archivos ni cambios de estación.
4. **`INACTIVE_HEARTBEAT`:** Un agente en estado `running` no emite eventos ni actualizaciones por más de 300 segundos.
5. **`UNANNOUNCED_MODEL_DRIFT`:** El modelo reportado por el runtime difiere del modelo resuelto por el catálogo de la Fase 06.
6. **`CONTEXT_PRESSURE_RETRY_LOOP`:** Llenado de contexto >=90% combinado con fallos de ejecución en los últimos 3 turnos.

---

## 4. Clasificación Muestral de Controles

Las sugerencias sobre reglas y controles se categorizan usando el siguiente esquema:
- **`mandatory`:** El control es esencial (0% de falsos positivos en el cohort).
- **`conditional`:** El control aporta valor bajo condiciones específicas de riesgo.
- **`sampled`:** El control se recomienda ejecutar por muestreo debido a su costo/tiempo.
- **`retire-candidate`:** El control presenta una tasa de falsos positivos >50% o no aporta hallazgos aceptados en el cohort.

---

## 5. Estado del Checkpoint 0

- [x] Data quality report y matriz de cobertura validados.
- [x] Reglas puras de loops y anomalías definidas con evidencia citada.
- [x] Invariantes de Replay `read-only` y suficiencia muestral (`n >= 5`) ratificados.
