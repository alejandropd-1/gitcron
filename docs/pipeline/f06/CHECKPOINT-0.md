# CHECKPOINT 0 — Threat Model, Model Catalog & Budget Architecture (Fase 06)

**Fecha:** 2026-07-25
**Fase:** Fase 06 — Modelos, presupuestos, contexto y routing por rol
**Estado:** Auditado (TANDA 0)
**Autor:** Antigravity (Pair Programming con Ale)

---

## 1. Alcance y Principios de Diseño

El objetivo de la **Fase 06** es proporcionar routing flexible de modelos por repositorio, rol (Scout, Planner, Builder, Auditor, Fixer) y tarea, monitorear el uso de tokens, costo en USD y estado de la ventana de contexto, y aplicar presupuestos supervisados sin poner en riesgo la integridad de la base de código.

### Principios Fundamentales:
1. **Next Safe Unit:** Los cambios de modelo se aplican al crear el próximo agente o al iniciar el siguiente turno seguro. Se prohíbe el *hot-swap* (intercambiar el modelo en medio de un stream o turno activo).
2. **Decorrelación Inviolable Builder/Auditor:** El agente `builder` y el agente `auditor` deben pertenecer a familias de proveedores distintas (`providerFamily`). Un fallback automático **nunca** puede violar esta regla (debe lanzar `DECORRELATION_VIOLATION` si no hay familia alternativa disponible).
3. **Invariante de Datos Ausentes (`local_unpriced` y `unknown`):** Un modelo local o sin tarifa no reporta `$0.0000` en USD, sino `costUsd = null` con `costBasis = 'local_unpriced'`. El costo `unknown` jamás permite enforcement monetario rígido (se degrada a límites de tokens o tiempo).
4. **Sin Double-Counting:** El consumo de subagentes se atribuye individualmente a cada nodo en el árbol de ejecución y no se duplica en el consumo directo del agente padre.
5. **Presupuestos Supervisados (Soft vs Hard):**
   - **Soft Limit:** Notifica al 70%, 90% y 100% de uso sin interrumpir la tarea.
   - **Hard Limit:** Impide iniciar la *siguiente* unidad o tarea cuando el remanente es insuficiente. Por omisión, **nunca** corta abruptamente una escritura o stream en curso.

---

## 2. Definición del Catálogo y Estructura de Tipos

```typescript
export type ProviderFamily = 'anthropic' | 'openai' | 'google' | 'opencode-acp' | 'lmstudio-local' | 'unknown';

export type CostBasis = 'real_usage' | 'estimated' | 'flat_subscription' | 'local_unpriced' | 'unknown';

export interface ModelDescriptor {
  modelId: string;
  displayName: string;
  providerFamily: ProviderFamily;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  inputCostPer1mUsd: number | null;
  outputCostPer1mUsd: number | null;
  supportsReasoning: boolean;
  supportsVision: boolean;
  requiresAuth: boolean;
  isLocal: boolean;
}
```

---

## 3. Jerarquía de Configuración de Modelos

El modelo efectivo para una tarea se resuelve evaluando la siguiente precedencia (de menor a mayor prioridad):

```text
Default de Runtime / Orquestador
  └── Perfil GitCron por Repositorio
       └── Política por Rol (R4: scout, planner, builder, auditor, fixer)
            └── Override por Change
                 └── Override por Task
                      └── Override explícito de Corrida
```

La UI de GitCron reflejará siempre la trinidad:
- `requested`: Lo solicitado por la jerarquía.
- `resolved`: Lo resuelto por la matriz de capacidades y decorrelación.
- `reported`: Lo reportado efectivamente por el runtime durante la ejecución.

---

## 4. Matriz de Capacidades por Runtime

| Runtime | Selección de Modelo | Decorrelación Soportada | Captura de Context Window |
| :--- | :--- | :--- | :--- |
| **Antigravity (AGY)** | Flag `--model` / SDK config | Sí (familia `google` / `anthropic`) | Sí (vía eventos SDK) |
| **Claude Code CLI** | Flag `--model` | Sí (familia `anthropic`) | Sí (vía JSON stream) |
| **OpenCode ACP** | ACP model selection | Sí (familia `opencode-acp`) | Sí (vía protocolo ACP) |
| **LM Studio** | Local endpoint / `lms ps` | Sí (familia `lmstudio-local`) | Sí (vía API local) |
| **Codex CLI** | Flag `--model` | Sí (familia `openai`) | Sí (vía event log) |

---

## 5. Matriz de Amenazas y Control de Seguridad

| Vector de Amenaza | Riesgo | Mitigación Implementada |
| :--- | :--- | :--- |
| **Evasión de decorrelación por Fallback** | Alto | El motor de routing valida que `builder.providerFamily !== auditor.providerFamily`. Si el fallback intenta asignar la misma familia, se cancela el fallback con error explícito. |
| **Hot-swap durante stream** | Alto | Las solicitudes de cambio se almacenan en `pendingModel` y solo se promueven a `effectiveModel` al crear el siguiente agente o iniciar el nuevo turno. |
| **Engaño de costo cero ($0.00)** | Medio | Ninguna métrica sin tarifa o local muestra `$0.0000`. Se usa `UnknownValue('local_unpriced')`. |
| **Double-counting de tokens** | Medio | Atribución separada: `treeTotalTokens = parentDirectTokens + sum(childNode.totalTokens)`. No se suman los tokens de los hijos directamente a `parentDirectTokens`. |
| **Modificación accidental de credenciales/globals** | Crítico | Main no altera archivos `.env`, tokens ni configuraciones globales de Hermes/LM Studio sin acción explícita y separada del usuario. |

---

## 6. Estado del Checkpoint 0

- [x] Modelo de amenazas y matriz de decorrelación definidos.
- [x] Regla "Next Safe Unit" acordada.
- [x] Invariante de datos ausentes (`local_unpriced`, `unknown`) y no double-counting ratificados.
- [x] Tipos e interfaces definidos (`ModelDescriptor`, `ProviderFamily`, `CostBasis`).
