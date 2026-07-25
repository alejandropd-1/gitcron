# Pipeline F04 — CHECKPOINT 1 · Entrada y shell per-repo

Fecha: `2026-07-24`
Builder: `Claude Opus 5 / direct`
Rama: `pipeline/fase-04-workspace-ui`
Estado: `Implementado — validado, pendiente de CSS de Ale`

---

## 1. Qué entrega esta tanda

La cuarta pestaña Pipeline, montada per-repo, con todos sus estados de shell y sus strings en
ES/EN/ZH. Sin ninguna vista de datos todavía: eso es TANDA 2.

## 2. Cableado — 5 puntos, mínimos

| Archivo | Cambio | Tamaño |
|---|---|---|
| `components/TopBar.tsx` | 4ª entrada de tab | **1 línea** |
| `components/RepoMainView.tsx` | import + `repoPath` en `TabViewsProps` + rama del router | **9 líneas** |
| `app/page.tsx` | `repoPath` en el objeto `tabViews` | **1 línea** |
| `lib/i18n.ts` | 38 claves × 3 idiomas | strings |
| `vitest.config.ts` | include de `components/**/__tests__` | 1 patrón |

`app/page.tsx` sigue en 1908 líneas: **creció exactamente una**, y esa línea es un dato que ya
tenía en scope. No aprendió nada sobre Pipeline.

## 3. Componentes creados

```
components/pipeline/
├── PipelineWorkspace.tsx          dueño único del estado
├── PipelineEmptyState.tsx         los 7 estados no-ready
├── pipeline-view-state.ts         lógica pura, testeable sin DOM
├── primitives/UnknownValue.tsx    único lugar que decide cómo se ve un dato ausente
├── primitives/ProvenanceBadge.tsx procedencia + respaldo, en palabras y en data-*
└── __tests__/                     14 tests
```

## 4. Scoping per-repo — tres mecanismos

El brief pide que cambiar de tab o de repo no mezcle snapshots. Se cubre por capas:

1. **`key={repoPath}`** en el llamador: cambiar de repo desmonta y remonta. No hay estado viejo
   que pueda sobrevivir.
2. **`AbortController`**: la request anterior se cancela en el cleanup del efecto.
3. **`loadKey`**: si una respuesta en vuelo llega tarde igual, se descarta por no coincidir con el
   pedido vigente.

`isLoading` es **derivado**, no almacenado: no puede quedar desincronizado del pedido real en curso.

## 5. Orden de guardas del estado

Deliberado, y el motivo importa:

1. Sin repo no hay nada que resolver.
2. **Versión desconocida gana sobre todo lo demás.** Si no sabemos leer el sobre, no podemos
   afirmar nada sobre su contenido — ni siquiera que Hermes está caído.
3. Sin actividad no es error: es un repo que todavía no corrió nada.
4. Hermes desconectado y repo sin kit son degradaciones informativas. El resto de la evidencia
   sigue siendo válida y se muestra.

Hay un test por cada una de estas reglas.

## 6. Verificación visual

**Lo que verifiqué en la app corriendo** (`next dev`, servidor compilado y 200 OK):

- La pestaña **Pipeline** aparece como cuarta, después de Commit/Graph/History.
- Es accesible y clickeable desde el árbol de accesibilidad (`button "Pipeline"`).
- Los labels resuelven por i18n (la UI estaba en ES y mostró las 4 en español).

**Lo que NO pude verificar ahí, y por qué:** el cuerpo del workspace no renderiza en el preview web.
`RepoMainView` tiene `if (isRepoStartView) return <RepoStartView />` en la línea 177, **antes** del
router de tabs. Sin repo abierto gana la pantalla de inicio — comportamiento preexistente que aplica
igual a las 4 pestañas, no algo introducido por F04. Abrir un repo requiere Electron con IPC de Git,
que el preview web no tiene.

Queda para el checkpoint visual con Electron: los 7 estados del shell con repo abierto.

## 7. Bug encontrado por los tests

Los strings de la versión incompatible usaban `{version}`, pero `translate()` interpola con
**`{{version}}`** (llaves dobles, `lib/i18n.ts:3251`). Sin el test de interpolación, el usuario habría
visto el literal `{version}` en pantalla, en los tres idiomas. Corregido.

Es exactamente el tipo de error que no aparece en typecheck ni en lint.

## 8. Cero CSS

`git status -- "*.css" "*.scss"` vacío. Se entregan clases estables (`pipeline-workspace`,
`pipeline-empty`, `pipeline-empty__title`, `pipeline-provenance`, `pipeline-unknown`) y atributos
`data-estado`, `data-provenance`, `data-evidence`, `data-unknown-reason`, `data-source`,
`data-repo-path` para que Ale haga la piel.

## 9. Accesibilidad

- `<section aria-labelledby="pipeline-title">` con `h2`; los estados usan `h3`. Sin saltos.
- `role="status"` + `aria-live="polite"`. Nunca `assertive`: el feed no debe interrumpir al lector.
- El estado `error` sí usa `role="alert"`, que es donde corresponde.
- `aria-busy` durante la carga.
- Botón de reintento nativo, sin div clickeable.

## 10. Validación

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test`: **61 archivos / 381 tests** verde (+14 de F04).
- `pnpm build`: OK, export estático completo.
- `pnpm exec eslint` sobre lo tocado: limpio. Las 2 warnings de `app/page.tsx` son preexistentes
  (líneas 227 y 895, fuera de lo editado).
- `pwsh scripts/gates.ps1 fast`: **VERDE**.

## 11. Decisión que sigue pendiente para Ale

El brief pide *"ocultar panel derecho histórico irrelevante si el workspace ocupa el detalle propio"*.
Toca `RepoDetailsPanel`, que es UI de uso diario. Sigue sin tocarse: conviene decidirlo con el
workspace ya renderizado y con CSS, no antes.
