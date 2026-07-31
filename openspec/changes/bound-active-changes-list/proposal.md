## Why

La sección "Cambio activo" del navegador crece sin tope y empuja al resto de la columna. Con
varios cambios activos, alguno queda fuera de vista sin ninguna señal de que está ahí, y las
secciones de abajo —Completados y Especificaciones— se alejan detrás de toda la lista.

Lo agrava que el cambio seleccionado se despliega solo, mostrando su intención y sus artefactos:
ocupa varias veces el alto de un ítem plegado. Al cambiar la selección, el que estaba desplegado se
pliega, se libera espacio y aparece un cambio que hasta entonces era invisible. Que un elemento
aparezca por un efecto lateral de otra acción no es un descubrimiento aceptable.

Detectado por Ale durante el QA visual: con cuatro cambios activos, uno quedaba fuera de vista.

## What Changes

- La lista de cambios activos recibe un tope de alto y scroll propio, para que ninguno quede
  inalcanzable y las secciones siguientes queden siempre accesibles sin recorrerla entera.
- El cambio seleccionado deja de desplegarse automáticamente. Se despliega al pedirlo, con el
  control que ya existe para eso.
- No cambia qué se muestra al desplegar, ni el orden de la lista, ni la selección.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se declara que la lista de cambios activos es acotada y navegable, y
  que ningún elemento aparece por efecto lateral de otra acción.

## Impact

- `components/pipeline/OpenSpecDashboard.tsx` — el desplegado deja de seguir a la selección.
- `components/pipeline/OpenSpecDashboard.module.css` — tope de alto y scroll de la lista activa.
- Tests del comportamiento de desplegado.
- Sin cambios en Electron main, IPC, SQLite ni i18n. Sin dependencias nuevas.
