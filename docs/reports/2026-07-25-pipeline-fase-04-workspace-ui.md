# Pipeline F04 — Reporte de Cierre de Fase (Workspace Visual Per-Repo)

**Fecha:** 2026-07-25  
**Orquestador/Builder:** Claude Code (Tandas 0–3) / Antigravity (Tandas 4 y 5)  
**Branch:** `pipeline/fase-04-workspace-ui`  
**Estado de la fase:** `Completada`  

---

## 1. Resumen Ejecutivo

Fase 04 implementa el workspace visual per-repo en la solapa **Pipeline**, permitiendo observar de forma honesta, limpia y estructurada la actividad de los runtimes y agentes sobre el repositorio activo sin inflar `app/page.tsx`.

Se integran las 5 tandas completas:
- **Tanda 0:** Wireframe semántico, contrato de estado (`PipelineWorkspace`), fixtures.
- **Tanda 1:** Entrada de 4ª pestaña en `TopBar` / `RepoMainView`, scoping per-repo (`key={repoPath}`, `AbortController`, `loadKey`), 7 estados no-ready.
- **Tanda 2:** Vía del change en diagonal (`ChangePath`), estación "Ahora" (`PipelineNow`), Inbox de decisiones pendientes (`DecisionInbox`, `DecisionCard`) read-only contra `UX-DECISIONES.md`.
- **Tanda 3:** Jerarquía de agentes (`AgentTree`), feed de actividad con agrupamiento de deltas (`ActivityFeed`), economía de tokens y contexto (`EconomyPanel`).
- **Tanda 4:** Detalle y evidencia (`PipelineDetails`), renderizado seguro de propuesta sin innerHTML (`SafeMarkdown`), diffs perezosos con procedencia de agente/tarea (`LazyDiffViewer`), hallazgos del auditor (`AuditorFindings`) e historial de comprobación de gates (`GateHistory`).
- **Tanda 5:** Visual QA, CSS sobre tokens del design system sin colores literales, i18n ES/EN/ZH con llaves dobles, accesibilidad y soporte de `prefers-reduced-motion`.

---

## 2. Invariantes y Reglas de Honestidad Verificadas

- **`unknown` NUNCA es `0`:** Todo valor ausente se renderiza estructuralmente con `<UnknownValue reason="..." />`.
- **Derivado ≠ Hecho:** `ProvenanceBadge` diferencia explícitamente `runtime`, `repo`, `derived` y `human`.
- **Información no inventada:** `consequence: null` o datos faltantes se presentan como "sin datos" o "no aplica", no con texto generado ficticio.
- **Sin cobertura total de costo, no hay comparación en dinero:** `hasUsableCostCoverage()` exige cobertura del 100% de agentes; de lo contrario se muestran tokens y el texto explícito de cobertura.
- **F04 read-only:** Las opciones de F05 permanecen deshabilitadas con el motivo escrito (`aria-disabled` + texto).
- **RepoDetailsPanel conservado:** El panel de detalles del repositorio (`repositoryDetailsVisible`) se mantiene visible por indicación explícita de Ale.

---

## 3. Componentes Creados / Modificados

```
components/pipeline/
├── PipelineWorkspace.tsx        dueño ÚNICO del estado de la feature
├── PipelineEmptyState.tsx       7 estados no-ready
├── PipelineNow.tsx              "¿qué pasa, cuánto cuesta, me necesita?"
├── DecisionInbox.tsx            zona prioritaria por encima del feed
├── DecisionCard.tsx             tarjeta de decisión individual
├── ChangePath.tsx               vía en diagonal (slanted path)
├── AgentTree.tsx                jerarquía parent/child
├── ActivityFeed.tsx             filtros + agrupación de deltas
├── EconomyPanel.tsx             tokens, costo, contexto
├── SafeMarkdown.tsx             renderizado seguro de propuesta (sin dangerouslySetInnerHTML)
├── LazyDiffViewer.tsx           diffs perezosos con procedencia de agente y tarea
├── AuditorFindings.tsx          hallazgos estructurados del auditor
├── GateHistory.tsx              historial de ejecuciones de gates
├── PipelineDetails.tsx          solapa de detalles y evidencia
├── PipelineDevFixtures.tsx      selector sólo-desarrollo
├── pipeline-domain.ts           lógica pura (ordenamiento, árbol, agrupación, tipos TANDA 4)
├── pipeline-view-state.ts       resolución de estado
├── primitives/UnknownValue.tsx  variante estructural de valor ausente
├── primitives/ProvenanceBadge.tsx badge de procedencia
├── __fixtures__/pipeline-fixtures.ts fixtures sanitizados de prueba
└── __tests__/                   5 archivos, 47 tests
```

---

## 4. CSS y Accesibilidad

- **Patrón Cartografía:** Clases `.pipeline-*` en `app/globals.css` sobre tokens del design system.
- **Cero colores literales:** Verificado con regex sobre el bloque Pipeline (`0` coincidencias hex/rgb).
- **Diferenciación no exclusiva por color:** Los estados se comunican también por forma, borde o marcador (cuadrado vs redondo, punteado vs sólido).
- **Soporte `prefers-reduced-motion`** y navegación accesible por teclado (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `role="listbox"`, `role="option"`).

---

## 5. Verificación de Calidad al Cierre

- **TypeScript (`pnpm exec tsc --noEmit`):** `0 errores` (Exit code 0)
- **Vitest (`pnpm test`):** `64 archivos pasaron / 412 tests pasaron` (Exit code 0)
- **ESLint (`pnpm exec eslint components/pipeline/`):** `0 errores` (Limpio)
- **Next Build (`pnpm build`):** `Exportación estática completada exitosamente`
- **Gate Fast (`pwsh -NoProfile -File scripts/gates.ps1 fast`):** `VERDE` (C1, C2, C3, C4, C6 OK)
- **Gate Full (`pwsh -NoProfile -File scripts/gates.ps1 full`):** `PENDIENTE` (Build OK; deuda previa a F04 de lint/fallow)

---

## 6. Deuda Declarada

- **Lector de evidencia per-repo no conectado:** `PipelineWorkspace` utiliza un loader por defecto que devuelve `null` a propósito en ausencia de corridas registradas, para no fabricar snapshots falsos. Conectarlo contra el store SQLite per-repo de F01/F03 (`PipelineRepository`, `persistRuntimeEnvelope`) es trabajo pendiente no asignado a ninguna tanda específica.
