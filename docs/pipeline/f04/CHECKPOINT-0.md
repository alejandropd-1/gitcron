# Pipeline F04 — CHECKPOINT 0 · Wireframe semántico y contrato de estado

Fecha: `2026-07-24`
Builder: `Claude Opus 5 / direct` · Rol: builder de markup y estado
Rama: `pipeline/fase-04-workspace-ui`
Estado: `Entregado — sin editar código`

---

## 1. Trazado de integración (auditoría previa)

Puntos exactos donde entra Pipeline, verificados sobre el código actual:

| Archivo | Línea | Qué hay hoy | Qué cambia |
|---|---:|---|---|
| `components/TopBar.tsx` | 103-105 | `Commit`, `Graph`, `History` | Se agrega la 4ª entrada `Pipeline` |
| `components/RepoMainView.tsx` | 236-238 | Router por `tabViews.activeTab` | Se agrega una rama antes del fallback a Graph |
| `app/page.tsx` | 163 | `useState('Graph')` | **Sin cambios** |
| `app/page.tsx` | 1657 | Objeto `tabViews` | **Una sola línea**: `repoPath` |
| `lib/i18n.ts` | 44-46, 1128-1130, 2209-2211 | Claves `tab.*` en es/en/zh | Se agregan `tab.pipeline` y `pipeline.*` |

### Por qué `app/page.tsx` no crece

`app/page.tsx` tiene **1907 líneas** y el brief advierte explícitamente contra inflarlo. La regla que
aplico: **page.tsx no aprende nada nuevo sobre Pipeline.** Sólo pasa `repoPath`, un dato que ya tiene
en scope (lo usa en la línea 1443). Todo el estado de la feature —fetch, snapshot, subscripciones,
selección de change, filtros— vive dentro de `PipelineWorkspace`.

`repoPath` no es prop top-level de `RepoMainView` (ahí sólo existe `cartographyRepoPath`, que está
semánticamente atado a cartografía). Se agrega a `TabViewsProps`, que es donde corresponde.

---

## 2. Wireframe textual

Jerarquía de headings real, para que el recorrido por teclado y lector de pantalla tenga sentido.

```
┌─ TopBar ─────────────────────────────────────────────────────────────┐
│  Commit   Graph   History   [Pipeline]                               │
└──────────────────────────────────────────────────────────────────────┘

<section aria-labelledby="pipeline-title" data-repo={repoPath}>
  <h2 id="pipeline-title">Pipeline</h2>            ← h2: la tab
  <p role="status" aria-live="polite">…</p>        ← cambios de estado no urgentes

  ┌─ AHORA ──────────────────────────────────── <h3> ─────────────────┐
  │  Estado legible primero, jerga después.                            │
  │  "Codex está auditando 3 de 7 tareas."                             │
  │                                                                    │
  │  agente · task · tiempo · costo · ¿necesita algo de mí?            │
  │  data-estado="running" data-runtime="codex"                        │
  │  Costo sin dato → "sin datos", NUNCA 0.                            │
  └────────────────────────────────────────────────────────────────────┘

  ┌─ DECISIONES PENDIENTES ──────────────────── <h3> ─────────────────┐
  │  Zona prioritaria: va ARRIBA del feed (regla del brief).           │
  │  <ul> una decisión por <li>                                        │
  │    ├─ qué me piden        (title)                                  │
  │    ├─ por qué ahora       (why | "sin dato")                       │
  │    ├─ opciones + consecuencia conocida                             │
  │    ├─ riesgo + procedencia   data-provenance                       │
  │    ├─ evidencia (refs)                                             │
  │    └─ <details> contexto técnico sanitizado ← cerrado por defecto  │
  │                                                                    │
  │  Opciones de F05 presentes pero deshabilitadas, explicando         │
  │  por qué: aria-disabled + texto de indisponibilidad.               │
  └────────────────────────────────────────────────────────────────────┘

  ┌─ VÍA DEL CHANGE ─────────────────────────── <h3> ─────────────────┐
  │  propuesta → aprobación → builder → gates → auditor → fixer → merge│
  │  <ol> estaciones. data-estado: done | current | possible | rejected│
  │  Camino sólido = ocurrido · punteado = posible · retroceso = rechazo│
  └────────────────────────────────────────────────────────────────────┘

  ┌─ AGENTES ─── <h3> ──┐  ┌─ ECONOMÍA Y CONTEXTO ─── <h3> ──────────┐
  │ árbol parent/child  │  │ tokens · costo+procedencia · contexto    │
  │ role/runtime/model  │  │ data-cost-basis: runtime_reported |      │
  │ <ul> anidada        │  │   estimated | included_plan |            │
  │                     │  │   local_unpriced | unknown              │
  │                     │  │ Sin cobertura USD → tokens + cobertura, │
  │                     │  │ nunca torta vacía.                       │
  └─────────────────────┘  └──────────────────────────────────────────┘

  ┌─ ACTIVIDAD ──────────────────────────────── <h3> ─────────────────┐
  │  Filtros: narrativo | reasoning | tools | archivos | sistema      │
  │  Reasoning ausente → "este runtime no lo expone"                  │
  │  (NO panel vacío engañoso)                                        │
  │  Archivos tocados → DiffViewer existente, carga lazy              │
  └────────────────────────────────────────────────────────────────────┘
</section>
```

### Estados del shell (TANDA 1)

Cada uno es un estado normal, no un error:

| Estado | Cuándo | Qué muestra |
|---|---|---|
| `loading` | montaje o cambio de repo | esqueleto + `aria-busy` |
| `no-repo` | sin repo activo | invitación a abrir un repo |
| `no-pipeline` | repo sin evidencia Pipeline | explica qué falta, no es error |
| `no-kit` | repo sin kit de gobernanza | **conserva** Git/Hermes/runtime; explica qué fuentes faltan |
| `hermes-offline` | Hermes desconectado | normal: Hermes no es gateway obligatorio |
| `incompatible` | schemaVersion desconocida | explica versión y no renderiza datos dudosos |
| `error` | fallo recuperable | mensaje + reintento |
| `ready` | hay snapshot | el workspace completo |

---

## 3. Árbol de componentes

```
components/pipeline/
├── PipelineWorkspace.tsx      ← ÚNICO dueño del estado de la feature
│   ├── PipelineEmptyState.tsx    (loading | no-repo | no-pipeline | no-kit |
│   │                              hermes-offline | incompatible | error)
│   ├── PipelineNow.tsx           TANDA 2
│   ├── DecisionInbox.tsx         TANDA 2
│   │   └── DecisionCard.tsx
│   ├── ChangePath.tsx            TANDA 2
│   ├── AgentTree.tsx             TANDA 3
│   ├── EconomyPanel.tsx          TANDA 3
│   ├── ActivityFeed.tsx          TANDA 3
│   └── (TANDA 4) reusa components/DiffViewer.tsx — no se reescribe
└── primitives/
    ├── ProvenanceBadge.tsx    procedencia + explicación humana
    └── UnknownValue.tsx       "sin datos" — el único lugar que decide
                               cómo se ve un dato ausente
```

**`UnknownValue` existe por una razón concreta:** que un solo componente decida cómo se muestra un
valor ausente es la garantía estructural de que `unknown` nunca se renderice como `0`. Si esa regla
vive repetida en ocho componentes, alguna se va a romper.

---

## 4. Contrato de props

Sin bolsas de callbacks: cada componente recibe datos, no un saco de handlers.

```ts
// El único punto de entrada. page.tsx no sabe nada más que esto.
type PipelineWorkspaceProps = {
  repoPath: string | null;
  /** Monta/desmonta con la tab: cancela requests viejos y evita mezclar snapshots. */
  isActive: boolean;
};

type PipelineViewState =
  | { kind: 'loading' }
  | { kind: 'no-repo' }
  | { kind: 'no-pipeline' }
  | { kind: 'no-kit'; availableSources: PipelineSource[] }
  | { kind: 'hermes-offline' }
  | { kind: 'incompatible'; foundVersion: string | null }
  | { kind: 'error'; messageKey: string; canRetry: boolean }
  | { kind: 'ready'; snapshot: PipelineSnapshot };

type PipelineSource = 'git' | 'hermes' | 'runtime' | 'kit';

type ProvenanceBadgeProps = {
  provenance: PipelineDataProvenance;   // runtime | repo | derived | human
  evidenceStatus: PipelineEvidenceStatus;
};

type UnknownValueProps = {
  /** Por qué no hay dato: cambia el texto, no sólo el guión. */
  reason: 'not-reported' | 'not-applicable' | 'pending-fixture' | 'unknown';
};
```

### Regla de scoping per-repo

`PipelineWorkspace` se monta con `key={repoPath}`. Cambiar de repo **desmonta y remonta**: no hay
riesgo de mostrar el snapshot del repo anterior mientras carga el nuevo. Es más barato y más seguro
que sincronizar efectos a mano.

---

## 5. Fixtures visuales

Estados a los que hay que poder llegar sin backend, para QA y para el review de accesibilidad:

| Fixture | Estado que ejercita |
|---|---|
| `pipeline-ready-running.json` | task activa, costo conocido, reasoning emitido |
| `pipeline-ready-unknown-cost.json` | economía sin cobertura USD → tokens + clasificación |
| `pipeline-no-reasoning.json` | runtime que no expone reasoning |
| `pipeline-auditor-rejected.json` | retroceso a fixer visible como retroceso |
| `pipeline-multi-change.json` | selector de change, sin elegir arbitrariamente |
| `pipeline-no-kit.json` | repo sin kit conservando Git/Hermes/runtime |

Los fixtures se agregan en la tanda que estrena cada vista, no todos ahora.

---

## 6. Accesibilidad y teclado

- Headings anidados sin saltos: `h2` (tab) → `h3` (secciones) → `h4` (tarjetas).
- Navegación por tabs: patrón de `TopBar` existente; Pipeline no inventa uno nuevo.
- `role="status"` + `aria-live="polite"` para cambios de estado. Nunca `assertive`: el feed de
  actividad no debe interrumpir al lector de pantalla.
- Deltas de alta frecuencia agrupados antes de renderizar: no un nodo por token.
- `<details>` nativo para contexto técnico: accesible por defecto, sin JS de toggle.
- Opciones no conectadas: `aria-disabled="true"` + razón textual, no sólo gris.

---

## 7. Lo que NO se hace en F04

- **CSS.** Markup semántico, clases estables y `data-*` para que Ale haga la piel.
- Controles de F05: aprobar, rechazar, mandar al fixer, responder al runtime.
- `dangerouslySetInnerHTML` para markdown.
- Charts o dependencias nuevas.
- Tocar `ChronometricGraph` / `CommitGraph`.
- Estado global de Pipeline en `app/page.tsx`.

---

## 8. Decisión que queda para Ale

El brief pide *"ocultar panel derecho histórico irrelevante si el workspace ocupa el detalle propio"*.
Eso toca `RepoDetailsPanel`, que es UI que ya usás todos los días. **No lo toco en TANDA 1.** Propongo
verlo con el workspace ya renderizado, cuando puedas juzgar si estorba de verdad o no.
