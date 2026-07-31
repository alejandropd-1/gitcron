# Reporte — bound-active-changes-list

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `bound-active-changes-list`

## Qué problema resolvía

La sección "Cambio activo" del navegador crecía sin tope y empujaba al resto de la columna. Con
varios cambios activos alguno quedaba fuera de vista **sin ninguna señal de que estaba ahí**, y
Completados y Especificaciones se alejaban detrás de toda la lista.

Lo agravaba que el cambio seleccionado se desplegaba solo, mostrando intención y artefactos: ocupa
varias veces el alto de un ítem plegado. Al cambiar la selección, el anterior se plegaba, se
liberaba espacio y **aparecía un cambio que hasta entonces era invisible**. Que un elemento se
descubra por rebote de otra acción no es presentarlo.

Detectado por Ale durante el QA visual, con cuatro cambios activos.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `components/pipeline/OpenSpecDashboard.module.css` | `.activeList`: alto acotado a `34vh` con desplazamiento propio. |
| `components/pipeline/OpenSpecDashboard.tsx` | Los cambios activos van en su propio contenedor desplazable; el desplegado deja de seguir a la selección. |
| `components/pipeline/__tests__/pipeline-selection-sync.test.tsx` | +2 casos: seleccionar no despliega; el control de desplegado sí, con independencia de la selección. |

Dos decisiones que vale registrar:

- **El tope es relativo al viewport (`34vh`), no fijo.** Un alto en `rem` se vuelve desproporcionado
  en ventanas chicas, que es justo donde el problema aprieta más.
- **El encabezado de la sección queda fuera del contenedor desplazable**, para que el rótulo y el
  contador de activos no se vayan con el scroll.

## Qué NO se tocó

- Qué se muestra al desplegar un cambio, el orden de la lista y la selección: idénticos.
- Las otras dos secciones del navegador, que no tenían el problema.
- Electron main, IPC, SQLite, i18n. Sin dependencias nuevas.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` | **586 passed / 81 archivos**, 0 failed |
| `pnpm exec eslint` sobre los archivos tocados | **limpio** |
| `openspec validate bound-active-changes-list --strict` | **válido** |

## Pendiente de QA visual

El tope de `34vh` es un valor elegido, no medido: se ve razonable para 4-6 cambios plegados, pero
quien tiene que confirmarlo en pantalla es Ale. Si queda corto o largo, es un número y se ajusta.
