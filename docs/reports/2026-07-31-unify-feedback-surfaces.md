# Reporte — unify-feedback-surfaces

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `unify-feedback-surfaces`

## Qué problema resolvía

Tres observaciones de Ale sobre cómo la aplicación comunica lo que hace.

1. **Pipeline inventó su propia superficie de aviso.** El archivado exitoso se anunciaba con una
   banda verde arriba del panel, mientras el resto de la app usa toasts abajo, con animación,
   autocierre y cierre manual. Dos superficies para lo mismo obligan a mirar dos lugares.
2. **El progreso no se percibía donde ocurre.** Seleccionar un cambio dispara una relectura tras la
   cual se completan los círculos del ciclo de vida y se habilita el archivado. La banda fina
   superior agregada antes queda lejos de la acción y pasa desapercibida.
3. **Los toasts de mensaje simple usaban ancho fijo.** Una frase de cuatro palabras se mostraba en
   una caja de 640 px.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `components/pipeline/OpenSpecDashboard.tsx` | El aviso de archivado se emite por `setSuccess` del store compartido; el ciclo de vida recibe el estado de relectura. |
| `components/pipeline/PipelineWorkspace.tsx` | Propaga `revalidating` al dashboard. |
| `components/pipeline/OpenSpecDashboard.module.css` | Se retira la banda propia; el ciclo late mientras se relee, con `prefers-reduced-motion` respetado. |
| `components/PageToasts.tsx` | Los toasts de mensaje simple pasan de `w-[...]` a `max-w-[...]`. |
| `lib/i18n.ts` | Se retira `archive.dismiss` × 3 idiomas: el toast ya trae su cierre. |
| Tests de archivado y de revalidación | Actualizados al contrato nuevo. |

**Los toasts con acciones conservan su ancho fijo** —decisión de pull, archivos ignorados—, porque
ahí el ancho sostiene la disposición de los botones. Es exactamente el recorte que pidió Ale.

## Nota de alcance

`components/PageToasts.tsx` es un **componente compartido, fuera de Pipeline**. Se tocó porque el
defecto de ancho está ahí y arreglarlo dentro de Pipeline habría significado no arreglarlo. Queda
declarado por si conviene separarlo en su propio change: el resto de este trabajo no depende de esa
línea.

## Qué NO se tocó

- El contenido de los avisos, su duración ni su comportamiento de autocierre.
- Los toasts con acciones.
- La banda fina superior de relectura, que se conserva: el latido del ciclo la complementa, no la
  reemplaza. Una es señal global, la otra local.
- Electron main, IPC, SQLite. Sin dependencias nuevas.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` | **586 passed / 81 archivos**, 0 failed |
| `pnpm exec eslint` sobre los archivos tocados | **limpio** |
| `openspec validate unify-feedback-surfaces --strict` | **válido** |

## Pendiente de QA visual

El latido del ciclo dura lo que la relectura, que tras `fix-pipeline-refresh-cost` ronda 1,6 s: es
perceptible pero breve. Si queda demasiado sutil, el ajuste es de opacidad o duración, no de
estructura.
