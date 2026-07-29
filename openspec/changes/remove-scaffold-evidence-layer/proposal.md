## Why

La pestaña Pipeline se construyó para observar el kit multi-agente que vive en `C:\www\scaffold`: Hermes como orquestador, delegaciones a otras IA, un veto determinístico de gates y mediciones de diff visual. Ese encuadre quedó sin uso. Hoy Pipeline es un workspace de OpenSpec, y la perspectiva de la feature cambió por completo.

Lo que quedó no es sólo documentación: `gates`, `delegations` y `visualDiffs` son campos del modelo de evidencia que atraviesan parsers, reducer, lector de evidencia, adaptador, tipos, i18n, UI y esquema SQLite. Cada uno tiene tests que pasan en verde, así que su desuso no se nota: es deuda que se ve sana, el mismo patrón que ya obligó a retirar doce módulos huérfanos.

Mantenerlos tiene un costo concreto además del peso: el workspace muestra fuentes que ningún flujo alimenta, y un agente que lea el modelo asume que Pipeline sigue siendo una torre de control multi-agente.

## What Changes

- Se retira `hermesConnected` y toda referencia a Hermes como fuente, transporte o estado de conexión.
- Se retiran `GateRecord`, `DelegationRecord` y `VisualDiffRecord` del modelo de evidencia, junto con sus parsers, su lectura desde `docs/ai/logs/`, su reducción, su proyección al renderer y su persistencia.
- Se retiran los componentes que sólo existían para mostrarlos: `GateHistory` y `AuditorFindings`.
- Se retiran las cadenas i18n asociadas en ES, EN y ZH.
- Se conservan intactos el workspace OpenSpec, el lanzador multi-proveedor, `runtime-adapters`, las sesiones persistidas, `control-bus` y los fixtures de `docs/pipeline/f03`, que son evidencia viva citada por los adaptadores y leída por la suite de conformance.

## Capabilities

### New Capabilities

_Ninguna. Este change sólo retira superficie._

### Modified Capabilities

- `pipeline-repo-evidence`: la evidencia local deja de incluir gates, delegaciones y diffs visuales del kit. El requisito de tolerancia se mantiene, pero su alcance pasa a ser OpenSpec y Git.
- `pipeline-connection-security`: desaparece la cláusula que declara a Hermes como transporte no obligatorio, porque Hermes deja de existir como fuente.

## Impact

**Código de producción:** `electron/pipeline/parsers.ts`, `reducer.ts`, `repo-evidence-reader.ts`, `pipeline-repository.ts`, `electron/db/schema.ts`, `components/pipeline/pipeline-adapter.ts`, `pipeline-view-state.ts`, `PipelineDetails.tsx`, `PipelineEmptyState.tsx`, `types/pipeline/index.ts`, `types/pipeline/projection.ts`, `lib/i18n.ts`.

**Se borran:** `components/pipeline/GateHistory.tsx`, `components/pipeline/AuditorFindings.tsx` y sus pruebas.

**Sin tocar:** topbar, iconos, sidebars, lógica de Git, features vivas de GitCron, `runtime/`, `runtime-adapters/`, `control/`, `docs/pipeline/f03`.

**Dependencias:** ninguna agregada ni removida.

**Riesgo:** el esquema SQLite pierde tablas o columnas. La migración debe degradar sin romper bases existentes, no asumir instalación limpia.
