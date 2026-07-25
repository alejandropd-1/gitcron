# GitCron — Handoff Pipeline F04 (tandas 4 y 5)

**De:** Claude Opus 5 (builder de markup, estado y CSS, tandas 0–3)
**Para:** Antigravity (u otro agente que continúe)
**Repositorio:** `C:\www\gitcron`
**Rama:** `pipeline/fase-04-workspace-ui`
**Estado al entregar:** tandas 0–3 completas, commiteadas y pusheadas. Árbol limpio, en sync con origin.
**Último commit:** `613529b fix(pipeline): heredar el fondo del contenedor en el workspace F04`

---

## 0. LEER ESTO PRIMERO — el brief está desactualizado en un punto crítico

El brief `docs/pipeline/briefs/fase-04-workspace-pipeline-ui.md` y el prompt
`docs/pipeline/prompts/fase-04-workspace-ui.md` dicen:

> *"Ale escribe el CSS"* · *"NO escribas ni modifiques CSS"* · criterio de aceptación:
> *"Cero cambios CSS hechos por agentes"*

**Eso fue revertido por Ale el 2026-07-25, textualmente:**

> *"acordate que yo no voy a hacer nada de CSS, por ende lo tenés que hacer vos o la IA de turno que
> le toque hacer la UI/UX (…) tenés rienda libre para crear lo necesario respetando el Design system"*

**El CSS es tuyo.** Las tandas 0–3 ya se entregaron con CSS escrito por el agente. Si seguís la regla
vieja vas a entregar markup sin piel y Ale no lo va a estilar.

Los documentos de brief/prompt **todavía no se actualizaron**. Actualizarlos es parte de tu trabajo
(ver §7), para que el próximo agente no herede la regla muerta.

---

## 1. Qué está hecho

| Tanda | Entrega | Commit |
|---|---|---|
| 0 | Wireframe, árbol de componentes, contrato de props, fixtures | `ba85297` |
| 1 | Cuarta pestaña + shell per-repo + 7 estados + i18n ES/EN/ZH | `ba85297` |
| 2 | Vía del change en diagonal, "Ahora", inbox de decisiones, CSS | `186d2ed` |
| 3 | Árbol de agentes, actividad con filtros, economía | `e753b91` |
| — | Selector de fixtures sólo-desarrollo | `e753b91` |
| — | Fix de fondo heredado | `613529b` |

Checkpoints en `docs/pipeline/f04/CHECKPOINT-0.md`, `-1.md`, `-3.md`.

### Archivos de la feature

```
components/pipeline/
├── PipelineWorkspace.tsx        dueño ÚNICO del estado de la feature
├── PipelineEmptyState.tsx       7 estados no-ready
├── PipelineNow.tsx              "¿qué pasa, cuánto cuesta, me necesita?"
├── DecisionInbox.tsx            zona prioritaria, por encima del feed
├── DecisionCard.tsx
├── ChangePath.tsx               vía en diagonal
├── AgentTree.tsx                jerarquía parent/child
├── ActivityFeed.tsx             filtros + agrupación de deltas
├── EconomyPanel.tsx             tokens, costo, contexto
├── PipelineDevFixtures.tsx      selector sólo-desarrollo
├── pipeline-domain.ts           lógica pura (ordenamiento, árbol, agrupación)
├── pipeline-view-state.ts       resolución de estado, testeable sin DOM
├── primitives/UnknownValue.tsx  ← LEER §3
├── primitives/ProvenanceBadge.tsx
├── __fixtures__/pipeline-fixtures.ts
└── __tests__/                   4 archivos, 42 tests
```

CSS: `app/globals.css`, bloque `PIPELINE (F04)` al final, ~700 líneas.

---

## 2. Arquitectura — la regla que no se rompe

**`app/page.tsx` no sabe nada de Pipeline.** Tiene 1908 líneas y el brief advierte contra inflarlo.
Creció **exactamente 1 línea**: pasar `repoPath`, un dato que ya tenía en scope.

Todo el estado vive en `PipelineWorkspace`. Los tres puntos de integración son:

- `components/TopBar.tsx:105` — la 4ª entrada de tab
- `components/RepoMainView.tsx:243` — la rama del router
- `app/page.tsx:~1658` — `repoPath` dentro de `tabViews`

Si TANDA 4 necesita estado nuevo (diff seleccionado, archivo abierto), va **dentro de
`PipelineWorkspace`**, no en `page.tsx`.

### Scoping per-repo, en tres capas

1. `key={repoPath}` en el llamador → cambiar de repo desmonta y remonta.
2. `AbortController` → cancela la request anterior.
3. `loadKey` → descarta respuestas en vuelo que lleguen tarde.

`isLoading` es **derivado**, no almacenado. No lo conviertas en estado.

---

## 3. Las reglas de honestidad — el corazón de la fase

Esta fase existe para no mentirle al usuario. Si rompés esto, rompiste la fase.

- **`unknown` NUNCA es `0`.** Todo valor ausente se renderiza con `<UnknownValue>`. Ese componente
  existe para que la regla sea **estructural** y no una convención repetida que alguna copia rompe.
  Si en TANDA 4 mostrás un número, preguntate qué pasa cuando no está.
- **Derivado ≠ hecho.** `ProvenanceBadge` marca `runtime | repo | derived | human` y el estado de
  evidencia. La distinción va también en `data-provenance` / `data-evidence`, no sólo en color.
- **Lo que no se informó, no se inventa.** `consequence: null` → "sin datos". No se rellena con
  texto generado. Vale igual para riesgo, "por qué" y hallazgos.
- **Un runtime que no expone algo lo dice.** `"Este runtime no expone su razonamiento"`, no un panel
  vacío que se lea como "no pensó nada".
- **Sin cobertura total de costo, no hay comparación en dinero.** `hasUsableCostCoverage()` sólo es
  `true` con cobertura completa; si no, se muestran tokens y el texto de cobertura. Un ranking
  parcial compararía agentes medidos contra agentes sin medir.
- **F04 no ejecuta nada.** Las opciones de F05 se muestran deshabilitadas **con el motivo escrito**
  (`aria-disabled` + texto). Un control gris sin explicación es una trampa.

---

## 4. Convenciones de CSS

Patrón: el de Cartografía. **Clases nombradas en `globals.css` sobre los tokens del design system.**

- **Cero colores literales.** Verificado: `grep -cE "#[0-9a-fA-F]{3,6}|rgb\("` sobre el bloque
  Pipeline devuelve `0`. Usá `var(--color-*)`, `var(--radius-*)`, `var(--spacing-*)`.
- **El estado no se comunica sólo con color.** Compuerta humana = marcador cuadrado vs redondo.
  Riesgo desconocido = borde punteado. Filtro activo = relleno + borde. Sobrevive a daltonismo y
  alto contraste.
- **No declares `background-color` en el contenedor raíz de una vista.** El contenedor padre cambia
  según el modo del grafo: en cronométrico es un panel de cristal
  (`bg-bg-overlay/60 backdrop-blur-md border rounded-xl`). Un fondo opaco propio lo tapa — ese fue
  el bug de `613529b`. Usá `flex: 1` + `min-height: 0` y dejá heredar.
- La diagonal de `ChangePath` usa `--pipeline-slope: 0.85`, derivado de
  `DEFAULT_CHRONOMETRIC_SLOPE` en `lib/chronometric-projection.ts`, para que se sienta de la misma
  familia que la vista cronométrica **sin acoplar los motores**.

---

## 5. Trampas concretas que me costaron tiempo

1. **i18n interpola con llaves DOBLES.** `translate()` usa `{{version}}`, no `{version}`
   (`lib/i18n.ts:3251`). Escribí `{version}` y la UI habría mostrado el literal en los 3 idiomas.
   No lo agarra ni typecheck ni lint — lo agarró un test. Hay uno de interpolación: extendelo.
2. **Los diccionarios son 3 y están en un solo archivo.** `lib/i18n.ts`, `const es` (~línea 23),
   `const en` (~1107), `const zh` (~2191). Agregá la clave en los tres o el test de paridad falla.
3. **La suite de conformance escanea secretos en fixtures.** Un fixture con la clave
   `authorization` fue rechazado antes del commit. Renombrá (`consentNote`, etc.).
4. **`vitest.config.ts` tuvo que ampliarse** para incluir `components/**/__tests__`. Ya está hecho.
5. **Con repo cerrado no renderiza ninguna tab.** `RepoMainView.tsx:178` tiene
   `if (isRepoStartView) return <RepoStartView/>` **antes** del router. No es un bug de Pipeline.
6. **Si editás archivos con scripts Python en Windows**, se reescriben con CRLF. Git lo normaliza en
   commit, pero deja archivos "modificados" con diff vacío. Preferí Edit/Write.
7. **El texto de decisiones es texto plano sanitizado, NO clave i18n.** Contrato en
   `docs/pipeline/UX-DECISIONES.md`: `title`, `why` y `consequence` son strings de la fuente. Los
   `labelKey` de las opciones sí son claves. Yo lo modelé mal primero y hubo que corregirlo.

---

## 6. Cómo ver el workspace

El lector de evidencia per-repo **no está conectado** (ver §8), así que en la app real la pestaña
muestra el estado vacío. Para ver el diseño:

```bash
pnpm run electron:dev
```

Abrí un repo → pestaña **Pipeline** → arriba hay un selector con borde punteado violeta,
**"Vista previa (sólo desarrollo)"**, con 4 opciones: datos reales, auditoría en curso, proveedor
local sin precio, y auditor rechazó + decisiones.

Está detrás de `process.env.NODE_ENV === 'development'` con import dinámico de los fixtures.
Verificado contra el build de producción: no aparece en `out/` ni `.next/static`. **No lo saques.**

---

## 7. Lo que falta — tu trabajo

### TANDA 4 — detalle y diffs

Del brief, sección "TANDA 4":

- Reusar `components/DiffViewer.tsx` **con carga lazy por archivo/branch**. No reescribirlo.
- Proposal/Markdown seguro. **Prohibido `dangerouslySetInnerHTML`.**
- Hallazgos del auditor como estructura (no texto libre), historial de gates y decisiones.
- Archivo tocado muestra agente/task cuando la correlación exista; `unknown` si no.

### TANDA 5 — QA visual

Resoluciones acordadas, recorrido por teclado, `prefers-reduced-motion` (ya hay una regla base),
y los estados de los fixtures. Ale **no** va a escribir CSS: los ajustes visuales son tuyos.

### Documentación a corregir

Actualizar el brief y el prompt de F04 para reflejar la inversión de la política de CSS (§0). Hoy
dicen lo contrario de lo que Ale decidió. Es el mismo error que ya pasó una vez en este proyecto:
en F03 quedó escrito *"LM Studio no es un orquestador"* mucho después de dejar de ser cierto, y un
agente lo heredó como verdad.

### Decisión pendiente de Ale

`RepoDetailsPanel`: el brief pide *"ocultar panel derecho histórico irrelevante si el workspace
ocupa el detalle propio"*. Confirmado que `repositoryDetailsVisible` (`app/page.tsx:759`) **no mira
la pestaña activa**, así que el panel derecho se muestra también sobre Pipeline. Es un cambio de una
línea. **No lo toques sin el OK de Ale**: es UI que usa todos los días.

---

## 8. Deuda declarada — no la escondas

**El lector real de evidencia per-repo no está conectado.** `PipelineWorkspace` usa un loader que
devuelve `null` a propósito, para no fabricar un snapshot falso. Conectarlo contra el store SQLite
per-repo de F01/F03 (`PipelineRepository`, `persistRuntimeEnvelope`) es trabajo real que queda
pendiente y **no está asignado a ninguna tanda**.

Ojo: aunque lo conectes, no vas a ver nada hasta que exista una corrida registrada para ese repo.

---

## 9. Validación obligatoria

Antes y después de cada tanda:

```powershell
pnpm exec tsc --noEmit                          # 0 errores
pnpm test                                        # 63 archivos / 409 tests al entregar
pnpm build                                       # export estático OK
pnpm exec eslint components/pipeline/            # limpio
pwsh -NoProfile -File scripts/gates.ps1 fast     # VERDE
```

`gates.ps1 full` da **PENDIENTE** por deuda heredada de lint (76 errores) y fallow, previa a F04 y
con baseline al 2026-07-23. No es tuya y no la presentes como verde.

### Reglas de gobernanza

- **Ale hace stage, commit y push.** Entregá los comandos, no los ejecutes (`AGENTS.md`).
- Cero dependencias npm nuevas sin aprobación explícita.
- No toques `AGENTS.md`, `scripts/gates.ps1`, `docs/ai/constitution.md` ni `docs/ai/repo-profile.md`:
  el gate C3 los protege.
- Verificá contra Git y disco. Este handoff no sustituye evidencia actual.
