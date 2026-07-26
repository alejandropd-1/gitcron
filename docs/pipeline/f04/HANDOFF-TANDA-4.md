# GitCron — Estado de Pipeline F04 y handoff para el siguiente agente

**Última actualización:** 2026-07-25 por Claude Opus 5
**Repositorio:** `C:\www\gitcron` · **Rama:** `pipeline/fase-04-workspace-ui`
**Último commit:** `bce1a8d feat(pipeline): conectar el lector real de evidencia per-repo al workspace F04`

> Este documento reemplaza al handoff original de tandas 4–5, que quedó obsoleto:
> Antigravity avanzó hasta F08 y las tandas que quedaban pendientes ya están hechas.

---

## 1. Estado real

| Bloque | Quién | Estado |
|---|---|---|
| Tandas 0–3 (shell, vía, Ahora, inbox, agentes, actividad, economía) | Claude | hecho |
| Tanda 4 (detalle, diffs, auditoría, gates) | Antigravity | hecho |
| Controles F05, hardening F06–F08 | Antigravity | hecho |
| Piel visual (CSS) | Claude | hecho |
| Lector real de evidencia per-repo | Claude | **hecho** (`bce1a8d`) |

Validación al cierre: `tsc` 0 · **82 archivos / 482 tests** · `eslint` limpio en `components/pipeline/`
· build OK · `gates.ps1 fast` VERDE.

### Componentes

```
components/pipeline/
├── PipelineWorkspace.tsx     dueño ÚNICO del estado; carga y suscripción
├── pipeline-adapter.ts       PipelineState (F01) → snapshot del workspace  ← LEER §3
├── pipeline-domain.ts        lógica pura: orden, árbol, agrupación, cobertura
├── pipeline-view-state.ts    resolución de estado, testeable sin DOM
├── PipelineNow / ChangePath / DecisionInbox / DecisionCard
├── AgentTree / ActivityFeed / EconomyPanel
├── PipelineDetails / AuditorFindings / GateHistory / LazyDiffViewer / SafeMarkdown
├── PipelineControlBar / ConfirmControlModal / PartialWorkBanner
├── PipelineDevFixtures.tsx   selector sólo-desarrollo  ← LEER §4
├── primitives/UnknownValue · ProvenanceBadge
└── __tests__/  9 archivos
```

CSS: `app/globals.css`, bloque `PIPELINE (F04)`, ~800 líneas, **cero colores literales**.

---

## 2. La regla que no se rompe: `app/page.tsx` no sabe nada de Pipeline

Tiene ~1900 líneas. Creció **una sola línea** en toda la fase: pasar `repoPath`, que ya tenía en scope.
Todo el estado vive en `PipelineWorkspace`.

Puntos de integración, sólo tres:
`components/TopBar.tsx` (la 4ª tab) · `components/RepoMainView.tsx` (rama del router) ·
`app/page.tsx` (`repoPath` dentro de `tabViews`).

Si necesitás estado nuevo, va **dentro del workspace**.

Scoping per-repo en tres capas: `key={repoPath}` desmonta al cambiar de repo, `AbortController`
cancela la request anterior, y `loadKey` descarta respuestas que lleguen tarde. `isLoading` es
**derivado**, no almacenado — no lo conviertas en estado.

---

## 3. Las reglas de honestidad — el corazón de la fase

Si rompés esto, rompiste la fase. `pipeline-adapter.ts` es la frontera donde se decide qué se puede
afirmar, y su regla es: **lo que la evidencia no dice queda `null`**.

- **`unknown` NUNCA es `0`.** Todo valor ausente pasa por `<UnknownValue>`. Ese componente existe
  para que la regla sea estructural y no una convención repetida que alguna copia rompe.
  `sumOrNull()` devuelve `null` si ningún registro aportó el dato: sumar nada da cero, y cero mentiría.
- **No se inventa lo que nadie observó.** El adaptador no arma jerarquía de agentes (la evidencia de
  F01 no tiene ids padre/hijo) ni adivina el runtime (registra el modelo, no quién lo ejecutó).
- **Derivado ≠ hecho.** `ProvenanceBadge` marca origen y estado de evidencia, en `data-*` además de
  color.
- **Un runtime que no expone algo lo dice.** "Este runtime no expone su razonamiento", no un panel
  vacío que se lea como "no pensó nada".
- **Sin cobertura total de costo, no hay comparación en dinero.** `hasUsableCostCoverage()` sólo es
  `true` con cobertura completa; si no, tokens + texto de cobertura. Un ranking parcial compararía
  agentes medidos contra agentes sin medir.

Hay tests por cada una de estas reglas en `__tests__/pipeline-adapter.test.ts`.

---

## 4. Convenciones de CSS

**El CSS lo escribe el agente**, no Ale. La regla original está revertida y el brief ya lo refleja.

Patrón: el de Cartografía — clases nombradas en `globals.css` sobre los tokens del design system.

- **Cero colores literales.** Usá `var(--color-*)`, `var(--radius-*)`, `var(--spacing-*)`.
- **El estado no se comunica sólo con color.** Vocabulario ya establecido, mantenelo:
  compuerta humana = nodo cuadrado · riesgo desconocido = borde punteado · archivos = nodo cuadrado
  · sistema = nodo hueco · filtro activo = relleno + borde. Sobrevive a daltonismo y alto contraste.
- **No declares `background-color` en el contenedor raíz de una vista.** El padre cambia según el
  modo del grafo: en cronométrico es un panel de cristal (`bg-bg-overlay/60 + blur + rounded`). Un
  fondo opaco propio lo tapa. Usá `flex: 1` + `min-height: 0` y dejá heredar.
- Las tres vistas principales comparten el vocabulario de **nodos sobre riel**: vía del change,
  árbol de agentes y feed de actividad. La pendiente de la vía sale de
  `DEFAULT_CHRONOMETRIC_SLOPE` para sentirse de la misma familia que la vista cronométrica.

Para ver el workspace sin corridas reales: `pnpm run electron:dev` → pestaña Pipeline → selector
violeta **"Vista previa (sólo desarrollo)"** con 4 fixtures. Está detrás de
`process.env.NODE_ENV === 'development'` con import dinámico; verificado que no entra al build de
producción. **No lo saques.**

---

## 5. Trampas que costaron tiempo real

1. **El parche de verificación sobrevive a los apagones.** Para ver el workspace sin repo abierto se
   parchea `RepoMainView` con una ruta hardcodeada. Ya se escapó dos veces, una de ellas por un corte
   de luz. **Antes de cualquier commit:**
   ```bash
   grep -n "repoPath={'C:/www/gitcron'}" components/RepoMainView.tsx
   ```
   Si devuelve algo, la pestaña mostraría siempre ese repo sin importar cuál se abra.
2. **En el multistep usá `margin-top`, no `transform`.** `transform` no aporta altura al layout, así
   que el contenedor colapsa cuando el flex padre necesita espacio. Fue un bug real de la vía.
3. **i18n interpola con llaves DOBLES:** `{{version}}`, no `{version}` (`lib/i18n.ts`). No lo agarra
   typecheck ni lint — lo agarró un test. Hay uno de interpolación: extendelo.
4. **Los diccionarios son 3 y están en un solo archivo:** `const es`, `const en`, `const zh` en
   `lib/i18n.ts`. Agregá la clave en los tres o falla el test de paridad.
5. **`GateRecord` expone `result`, no `status`.** Y `ChangeSelection` pide `confidence`,
   `selectionRequired` y `reason`.
6. **No escribas un ref durante el render:** viola `react-hooks/refs`. Para actualizar estado desde
   un listener, usá actualización funcional (`setResult(prev => ...)`).
7. **La suite de conformance escanea secretos en fixtures.** Una clave llamada `authorization` fue
   rechazada antes del commit; renombrá.
8. **Con repo cerrado no renderiza ninguna tab.** `RepoMainView` corta con `isRepoStartView` antes
   del router. No es un bug de Pipeline.
9. **Editar con scripts Python en Windows reescribe con CRLF**: deja archivos "modificados" con diff
   vacío. Preferí Edit/Write.
10. **El texto de decisiones es texto plano sanitizado, NO clave i18n** (`title`, `why`,
    `consequence`). Los `labelKey` de las opciones sí son claves.

---

## 6. Deuda abierta — no la escondas

> **Actualizado 2026-07-26** (rama `pipeline/f04-runtime-streams`). Los tres huecos de abajo están
> cerrados: ver §8. Se dejan escritos porque explican por qué el adaptador tiene la forma que tiene.

El lector real ya está conectado, pero **lee evidencia del repo, no streams de runtime**. Eso deja
tres huecos declarados en el adaptador:

| Hueco | Por qué | Qué haría falta |
|---|---|---|
| `activity: []` | la evidencia del repo no tiene bitácora | conectar el stream de los runtime adapters de F03 |
| `agents` en plano | F01 no registra ids padre/hijo | ídem |
| `reasoningAvailable: false` | esa fuente no transporta reasoning | ídem |

También: `contextMaxTokens`, `contextCurrentTokens`, `compactionCount` y los tokens de
reasoning/caché quedan `null` desde la fuente real. Los fixtures sí los muestran, así que **no
confundas lo que ves en vista previa con lo que hay en datos reales**.

`gates.ps1 full` da **PENDIENTE** por deuda de lint (76 errores) y fallow previa a F04, con baseline
al 2026-07-23. No es de esta fase y no se presenta como verde.

### Decisión pendiente de Ale

`RepoDetailsPanel`: `repositoryDetailsVisible` (`app/page.tsx:759`) **no mira la pestaña activa**, así
que el panel derecho se muestra también sobre Pipeline. Es un cambio de una línea. **No lo toques sin
su OK**: es UI que usa todos los días.

---

## 7. Validación y gobernanza

```powershell
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm exec eslint components/pipeline/
pwsh -NoProfile -File scripts/gates.ps1 fast
```

- **Ale hace stage, commit y push.** Entregá los comandos, no los ejecutes (`AGENTS.md`).
- Cero dependencias npm nuevas sin aprobación explícita.
- No toques `AGENTS.md`, `scripts/gates.ps1`, `docs/ai/constitution.md` ni `docs/ai/repo-profile.md`:
  el gate C3 los protege.
- Verificá contra Git y disco. Este documento no sustituye evidencia actual.

---

## 8. Streams de runtime conectados (2026-07-26)

**Rama:** `pipeline/f04-runtime-streams` · deuda de F04, no una fase del track.

### Lo que faltaba de verdad

Los adaptadores de F03 eran **librería sin cablear**: `electron/pipeline/runtime-adapters/index.ts`
no tenía dependientes fuera de sus propios tests y nadie llamaba `start()` ni drenaba `events()`.
No había stream al que enchufarse; faltaba toda la capa del medio. Eso es lo que se construyó:

```
types/pipeline/projection.ts              contrato compartido Main ↔ renderer
electron/pipeline/runtime/
├── runtime-projection.ts                 reductor PURO de sobres → proyección  ← las reglas viven acá
└── runtime-session-hub.ts                dueño de sesiones; drena el stream; registra en el bus F05
electron/ipc/pipeline-runtime.ts          canales pipeline:runtime:* (única superficie que abre procesos)
components/pipeline/PipelineRuntimeLauncher.tsx
components/pipeline/pipeline-adapter.ts   + mergeRuntimeIntoSnapshot()
```

### Los tres huecos, cerrados

| Hueco | Ahora | De dónde sale |
|---|---|---|
| `activity: []` | bitácora real por canal | `agent.message`, `reasoning.delta`, `tool.*`, `run.*` del stream |
| `agents` en plano | jerarquía **observada** | `PipelineIdentity.agentId` / `parentAgentId` |
| `reasoningAvailable: false` | tri-estado `true`/`false`/`null` | `reasoningVisibility` de la telemetría |

`contextMaxTokens`, `contextCurrentTokens`, `compactionCount` y los tokens de reasoning/caché ahora
se llenan desde la telemetría del runtime — pero **sólo al cerrar la corrida**, porque
`telemetry()` de `StructuredCliRuntimeAdapter` espera a que el proceso termine. Durante la corrida
siguen `null`: no se estima nada a mitad de camino.

### Reglas nuevas que el stream obligó a escribir

1. **El runtime rellena huecos, nunca suma.** Las dos fuentes pueden describir la misma corrida
   (la bitácora de delegaciones la escribe un orquestador que quizá ejecutó este mismo runtime), así
   que sumar tokens o costo contaría dos veces lo mismo. Un total inflado miente igual que un cero.
   Cada campo se toma del repo si el repo lo sabe, y del runtime sólo si el repo lo dejó `null`.
2. **`reasoningAvailable` pasó de `boolean` a `boolean | null`.** `false` se renderiza como "este
   runtime no expone su razonamiento": afirmarlo sin sesión adjunta era la misma clase de mentira
   que `unknown` valiendo `0`. El test que exigía `false` codificaba el bug y se corrigió.
3. **Los tokens por agente quedan `null`.** El stream sólo reporta totales de sesión al cerrar;
   repartirlos entre agentes inventaría una atribución que nadie midió.
4. **El canal `file` queda vacío a propósito.** Los normalizadores redactan las rutas, así que
   deducir "archivo" del nombre de la herramienta (`Edit`, `Write`) afirmaría una escritura que
   nadie observó: una llamada pedida no es un archivo tocado.
5. **Un agente que seguía corriendo cuando el stream se cortó queda `unknown`, no `done`.**
   Dejar de observar no es ver terminar.
6. **`droppedActivity` cuenta lo que descartó el buffer acotado** (2.000 entradas). Un feed truncado
   en silencio se leería como completo.

### El cuarto hueco, que el handoff no declaraba

`PipelineControlBus.registerSession()` tampoco se llamaba nunca en producción. Además —peor— el
renderer hablaba con `window.electronAPI`, **que no existe**: el preload expone `window.api`. O sea:

- `PipelineWorkspace` mandaba el literal `'session-active'` a un global inexistente. La respuesta a
  una decisión no salía nunca, y si hubiera salido el bus la habría rechazado.
- `PipelineControlBar` caía siempre en su rama de fallback, que hacía `setActiveAck(ackSuccess)`:
  **afirmaba un ACK que nadie dio**. Todos los controles de F05 eran no-ops que reportaban éxito.

Corregido: el hub registra la sesión con las capacidades que el adaptador **implementa de verdad**
(no las del `descriptor`, que declara capacidades de protocolo), y el renderer usa el `sessionId`
real. Un `StructuredCliRuntimeAdapter` cierra su stdin al mandar la instrucción, así que **no**
declara `respond-decision` ni `steer`: la UI lo explica en vez de mandar un comando condenado.

### Qué se puede lanzar, y qué no

Sólo `claude` y `codex`: son los únicos que implementan `start()` con stream real
(`StructuredCliRuntimeAdapter`). Y `start()` aborta salvo que la versión instalada coincida exacto
con el fixture auditado — verificado en esta máquina: `claude --version` → `2.1.206 (Claude Code)` y
`codex --version` → `codex-cli 0.143.0`, las dos coinciden.

- `agy` es un **wrapper de ciclo de vida**: no tiene `start()` y su `events()` no emite nada.
  Aparece en discovery como no lanzable, con el motivo.
- `lmstudio` queda fuera del registro: su descriptor declara `runtime: 'unknown'` porque es un
  **proveedor de modelos**, no un runtime de agente, y la unión `PipelineRuntime` lo excluye a
  propósito. Meterlo bajo `'unknown'` le inventaría una identidad que su propio adaptador se niega
  a afirmar.
- `opencode` queda fuera: su factory exige una ruta de ejecutable que hoy no se configura.

### Deuda que queda abierta

- **Sin QA visual.** Se validó con typecheck, 517 tests, build y `gates.ps1 fast`, pero **no** se
  abrió Electron para ver una corrida real: eso exigía el parche de `RepoMainView` que §5.1 prohíbe
  commitear. Falta la pasada visual de Ale.
- **`telemetry()` bloquea hasta que cierra el proceso**, así que la economía no se mueve durante la
  corrida. Que el stream emita métricas incrementales es trabajo de F03, no de acá.
- **Una sesión por repo.** Dos corridas simultáneas sobre el mismo working tree se pisarían los
  archivos y la vista no podría atribuir qué hizo cuál.
- **`gates.ps1 full` sigue en PENDIENTE** por la deuda de lint previa a F04 (baseline 2026-07-23).
  No es de esta rama y no se presenta como verde.
- Sigue pendiente la decisión de Ale sobre `RepoDetailsPanel` (§6).
