# Pipeline F04 — CHECKPOINT 3 · Agentes, actividad y economía

Fecha: `2026-07-24`
Builder: `Claude Opus 5 / direct`
Rama: `pipeline/fase-04-workspace-ui`
Estado: `Implementado y verificado en la app corriendo`

---

## 1. Qué entrega esta tanda

`AgentTree`, `ActivityFeed` con filtros, `EconomyPanel`, y el mapa de nombres de runtime que quedó
pendiente en TANDA 2.

## 2. Nombres de runtime

La identidad viaja como id en minúscula (`claude`, `lmstudio`), pero *"codex está revisando"* leía
mal. `runtimeDisplayName()` mapea a `Claude`, `Codex`, `OpenCode`, `Antigravity`, `LM Studio`,
`Hermes`.

Un runtime desconocido **devuelve su propio id**, no un placeholder: mostrar el identificador crudo
es más honesto que inventarle un nombre comercial que no tiene. El id sigue disponible en
`data-runtime` para CSS y depuración.

## 3. Tres decisiones de robustez

| Situación | Qué hace | Por qué |
|---|---|---|
| Agente cuyo padre no está en la lista | se promueve a raíz | perder un agente de la vista es peor que mostrarlo sin jerarquía |
| Ciclo parent/child | segunda pasada rescata los inalcanzables | un ciclo no puede colgar el render ni tragarse nodos |
| Stream de reasoning | colapsa deltas **consecutivos** del mismo canal y agente | sin esto se renderiza un nodo por token |

La agrupación es sólo de lo consecutivo: dos ráfagas separadas por otro canal siguen siendo dos
entradas, porque **el orden es información**. Y nunca colapsa narrativa ni archivos — ahí cada
entrada es un hecho distinto.

## 4. La economía sin USD

Regla del brief: *"la economía sigue siendo útil sin USD"*. `hasUsableCostCoverage()` sólo devuelve
`true` con cobertura **total**. Con cobertura parcial no se dibuja ranking ni torta, porque
compararía agentes medidos contra agentes sin medir y el gráfico mentiría.

En su lugar aparece el texto exacto, verificado en pantalla:

> *"Sólo 2 de 3 agentes informaron costo. No se muestra comparación en dinero porque no sería
> representativa."*

## 5. Verificación funcional real

Con la app corriendo, sobre el fixture completo:

| Comprobación | Resultado |
|---|---|
| Nombres de runtime | `Codex está revisando el trabajo.` · AGENTE `Codex` |
| Árbol parent/child | 1 raíz (Claude, orquestador) con **2 hijos** (Codex auditor, Antigravity explorador) |
| Runtime sin telemetría | Antigravity muestra `sin datos` en modelo, proveedor y tokens |
| Filtros de actividad | 5 entradas → **4** al apagar Razonamiento → **5** al restaurar |
| Agrupación de deltas | `×3` sobre los tres deltas consecutivos de razonamiento |
| Cobertura parcial | advertencia presente |
| Contexto | 262.144 máximo · 37.690 en uso · 0 compresiones |

Sobre el fixture sin reasoning:

| Comprobación | Resultado |
|---|---|
| Aviso honesto | *"Este runtime no expone su razonamiento."* — no un panel vacío |
| Filtro Razonamiento | `disabled`, `aria-pressed="false"` |
| Economía sin datos | 4 valores en "sin datos", costo "sin base de costo conocida" |
| Cobertura | sin advertencia cuando no hay nada que cubrir (total 0) |

**Ningún cero falso en ninguno de los dos recorridos.**

La verificación usó un parche temporal que forzaba el fixture, ya revertido: `grep` confirma 0
ocurrencias de `FIXTURES` en `PipelineWorkspace` y 0 de la ruta hardcodeada en `RepoMainView`.

## 6. Accesibilidad

- El árbol usa **listas anidadas nativas**: el lector de pantalla anuncia la profundidad sin que
  haya que declarar `role="tree"` ni gestionar foco a mano.
- Los filtros son botones con `aria-pressed`, agrupados en un `role="group"` etiquetado.
- El filtro activo se distingue por **relleno y borde**, no sólo por color.
- El estado de cada agente tiene borde de color **y** texto: `trabajando`, `terminó`, `falló`,
  `sin estado`.

## 7. Validación

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test`: **63 archivos / 409 tests** verde (+17 en esta tanda).
- `eslint` sobre lo tocado: limpio.
- CSS: **cero colores literales** en todo el bloque Pipeline — 698 líneas sobre tokens.
- El test de paridad i18n ahora cubre 71 claves × 3 idiomas, e incluye interpolación multivariable
  (`{{withCost}}/{{total}}`, `{{input}}/{{output}}`, `{{done}}/{{total}}`).

## 8. Lo que queda de F04

- **TANDA 4:** detalle y diffs. Reusar `DiffViewer` con carga lazy, proposal/markdown seguro sin
  `dangerouslySetInnerHTML`, hallazgos del auditor y gates history.
- **TANDA 5:** QA visual en resoluciones acordadas, teclado, reduced motion.
- **Decisión pendiente de Ale:** `RepoDetailsPanel` — ocultar el panel derecho cuando el workspace
  ocupa el detalle propio. Sigue sin tocarse.
