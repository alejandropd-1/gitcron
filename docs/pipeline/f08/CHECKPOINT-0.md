# CHECKPOINT 0 — Feature Freeze, Threat Surface & Release Inventory (Fase 08)

**Fecha:** 2026-07-25
**Fase:** Fase 08 — Hardening, compatibilidad, documentación y release
**Estado:** Auditado (TANDA 0)
**Autor:** Antigravity (Pair Programming con Ale)

---

## 1. Declaración de Feature Freeze

La **Fase 08** representa el cierre del track completo del Pipeline de GitCron. 
- **Queda congelado el scope funcional de producto:** No se agregarán nuevas funcionalidades.
- **Enfoque exclusivo:** Hardening de seguridad, resiliencia ante caídas de runtimes, verificación de empaquetado en Windows, QA E2E, documentación y preparación del Release Candidate.

---

## 2. Superficie de Amenazas Final & Matriz de Hardening

| Vector de Amenaza / Riesgo | Mecanismo de Control / Mitigación Implementado | Estado de Verificación |
| :--- | :--- | :--- |
| **Renderer Compromise / Inyección IPC** | Canales IPC estrictamente allowlisted (`pipeline:control:<action>`), tipos fijos y nonces anti-replay. Prohibido IPC genérico. | **Verificado (F05)** |
| **Process Ownership / Kill indiscriminado** | Main asigna PIDs explícitos y prohíbe `kill_all` global o terminar procesos no creados por GitCron. | **Verificado (F05)** |
| **Markdown / Output Malicioso** | Renderizado vía `SafeMarkdown.tsx` (parser seguro tokenizado sin `dangerouslySetInnerHTML`). | **Verificado (F04)** |
| **Fuga de Secrets / Reasoning Privado** | Exclusión estricta de `.env`, tokens y cookies en audit logs (`pipeline-audit.jsonl`) y estado UI. | **Verificado (F01/F05)** |
| **Evasión de Decorrelación Builder/Auditor** | `ModelRouter` exige `builder.providerFamily !== auditor.providerFamily`. Lanza `DECORRELATION_VIOLATION` en conflicto. | **Verificado (F06)** |
| **Destrucción de código por Interrupción** | Invariante de No-Rollback: Interrumpir o cancelar conserva el trabajo parcial en el working tree sin `git reset`. | **Verificado (F05)** |
| **Replay Read-Only** | Reproductor histórico `PipelineReplayEngine` 100% determinístico sin emisión de controles ni efectos sobre live state. | **Verificado (F07)** |

---

## 3. Inventario de Módulos del Pipeline

1. **`electron/pipeline/control/`**: Command Bus Main-Only (`control-bus.ts`), tipos (`control-bus-types.ts`) y audit logger append-only (`control-audit.ts`).
2. **`electron/pipeline/models/`**: Catálogo (`model-catalog.ts`), Router (`model-router.ts`), Budget Engine (`budget-engine.ts`), Context Health (`context-health-engine.ts`) y Enforcement (`budget-enforcement.ts`).
3. **`electron/pipeline/replay/`**: Reproductor histórico (`pipeline-replay-engine.ts`).
4. **`electron/pipeline/anomaly/`**: Motor de 6 anomalías determinísticas (`pipeline-anomaly-engine.ts`).
5. **`electron/pipeline/estimation/`**: Estimador P10-P90 por cohort (`pipeline-estimation-engine.ts`).
6. **`electron/pipeline/explanation/`**: Explicador grounded y deduplicador de notificaciones (`pipeline-explanation-engine.ts`).
7. **`components/pipeline/`**: Workspace UI con 4 pestañas, `PipelineControlBar`, `ConfirmControlModal`, `PartialWorkBanner`, `EconomyPanel` e i18n en ES/EN/ZH.

---

## 4. Plan de Tandas de Release Candidate (Fase 08)

- **TANDA 0:** Inventario, feature freeze y threat surface.
- **TANDA 1:** Hardening de seguridad, sanitización de inputs/logs y retención de observabilidad.
- **TANDA 2:** Resiliencia, reconexiones, backpressure y degradación elegante ante caídas de runtimes.
- **TANDA 3:** Matriz de ejecutable Windows (`shell:false`, `.cmd/.exe`), verificación de recursos y `node:sqlite`.
- **TANDA 4:** Verificación E2E de historias de uso completas, QA de i18n y accesibilidad.
- **TANDA 5:** Sincronización de documentación (`README.md`, `CHANGELOG.md`, `SECURITY.md`, `00_FUENTE_DE_VERDAD.md`) y preparación de Release Candidate.

---

## 5. Estado del Checkpoint 0

- [x] Scope funcional congelado (Feature Freeze).
- [x] Superficie de amenazas y mitigaciones consolidadas.
- [x] Inventario completo de los módulos F00-F07 verificado.
