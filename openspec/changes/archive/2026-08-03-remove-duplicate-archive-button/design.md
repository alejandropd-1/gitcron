## Context

Hay dos caminos que producen un botón "Archivar cambio" en `OpenSpecDashboard.tsx`:

1. La **acción primaria** (`primaryAction`, línea 669) devuelta por `derivePipelineNextAction`. En su estado `ready-to-archive` (`pipeline-next-action.ts:404`) la primaria es `start-archive` con etiqueta "Archivar cambio".
2. Un **botón siempre visible** (línea 696) independiente de la derivación, que aparece mientras el cambio no esté archivado y muestra "Archivar cambio" (o "Archivar cambio (N sin tildar)").

Ambos disparan el mismo `handleIntent({ kind: 'start-archive', … })`. Con validación aprobada y sin tareas pendientes, los dos se ven a la vez con idéntico texto y efecto.

El botón siempre visible no es puro duplicado en todos los estados:

- `task-pending` con validación aprobada: la primaria es "Continuar tarea"; el botón siempre visible ofrece archivar declarando las pendientes. Aporte real.
- Validación `failed`/`unknown`: no hay primaria de archivar; el botón siempre visible queda deshabilitado mostrando el motivo. Aporte informativo real.

## Goals / Non-Goals

**Goals:**
- Que no se vean dos botones idénticos cuando la derivación ya ofrece archivar.
- Conservar el botón siempre visible donde aporta algo que la primaria no cubre.

**Non-Goals:**
- No se rediseña la barra de acciones ni se toca la derivación. El rediseño visual grande queda para otro change.
- No se unifican los dos caminos en uno: el botón siempre visible sigue existiendo para los casos donde la primaria no es archivar.

## Decisions

### No renderizar el botón siempre visible cuando la primaria ya es `start-archive`

En `OpenSpecDashboard.tsx:696`, agregar a la guarda existente (`selectedArchive === null`) la condición de que la primaria no sea ya archivar: `primaryAction?.intent.kind !== 'start-archive'`. Cuando la primaria deriva a archivar, el botón siempre visible no se renderiza; en los demás estados sigue.

**Alternativa descartada:** eliminar el botón siempre visible por completo. Pierde el aporte con tareas pendientes (archivar declarando cuántas) y con validación no aprobada (motivo visible). Es información útil que la primaria no muestra.

**Alternativa descartada:** cambiar la etiqueta del botón siempre visible para diferenciarla. Los dos botones harían lo mismo con textos distintos, que es peor: confunde en vez de duplicar.

### La decisión vive en el componente, no en la derivación

La derivación no cambia: sigue devolviendo `ready-to-archive` con primaria `start-archive`. Es el componente el que decide no renderizar el botón siempre visible cuando eso ocurre. La razón es que la duplicación es un hecho del render, no de la lógica de estados: la derivación no sabe qué otros botones existen en pantalla.

## Risks / Trade-offs

- **[Riesgo] Alguien espera archivar desde el botón siempre visible aun con validación aprobada.** → **Mitigación:** la acción primaria está justo ahí, con el mismo texto y efecto; no se pierde capacidad, sólo se quita la repetición.
- **[Riesgo] La guarda depende de `primaryAction`, que es `null` si la derivación no devuelve primaria.** → **Mitigación:** se comprueba `primaryAction?.intent.kind !== 'start-archive'`; con `primaryAction === null` la condición es `true` y el botón siempre visible se renderiza normalmente.

## Migration Plan

Sin migración: es un cambio de render en un componente. Verificación: test que monta el dashboard en `ready-to-archive` y en `task-pending`, y `openspec validate remove-duplicate-archive-button --strict`.

## Open Questions

Ninguna.
