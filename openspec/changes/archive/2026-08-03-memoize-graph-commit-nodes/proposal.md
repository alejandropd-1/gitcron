## Why

Arrastrar el grafo en un repositorio grande cuesta 50–70 ms por render, con picos de 497 ms. El
presupuesto por cuadro a 60 fps es 16,6 ms, así que sólo se consiguen 3–7 renders por segundo: unos
5 fps. Medido con instrumentación temporal sobre `ChronometricGraph`, en dev:

| repo | commits | renders/s al arrastrar | medio |
|---|---|---|---|
| gitCronos | 500 | 3–7 | 50–70 ms |
| odontoPau | 61 | 10–22 | 24–74 ms |
| odontoPia | 17 | 15–26 | 14–26 ms |

El costo escala con el contenido del repositorio, y con el hilo principal saturado las animaciones
del propio grafo —el punteado de la línea de tiempo, que anima `stroke-dashoffset` y no es
compositable— se ven a saltos.

La causa no son los cálculos: de los ~30 `useMemo` del archivo **sólo uno depende del encuadre**, el
de la posición del tooltip. La proyección de commits, las filas y los colores ya están memoizados y
no se recalculan al arrastrar. El costo está en reconstruir el JSX y reconciliar el subárbol: el
encuadre se aplica como un único `transform` sobre un `<g>`, y cambiar ese atributo hoy obliga a
recrear cientos de elementos SVG que quedan idénticos.

`coalesce-graph-viewport-updates` ya bajó la cantidad de renders pedidos a uno por cuadro; este
change ataca lo que cuesta cada uno.

## What Changes

- La capa de nodos de commit se extrae a un componente propio, memoizado, que recibe los datos ya
  proyectados y **no** el encuadre. Arrastrar deja de reconstruirla.
- Los callbacks que esa capa recibe —selección, menú contextual y hover— se estabilizan, porque una
  función recreada en cada render anularía la memoización sin ninguna señal.
- La escala tipográfica se pasa como número en vez de como función, por el mismo motivo.

**No cambia la geometría**: mismas posiciones, mismos radios, mismos colores, mismo orden de capas.
Cambia cuándo se reconstruye el subárbol, no qué dibuja.

Alcance deliberadamente acotado a la capa de nodos, que es la más numerosa. Las demás capas
—conexiones, tags, satélites, ticks— quedan para después, con la medición de ésta a la vista.

## Capabilities

### New Capabilities

- `graph-render-isolation`: qué obliga a reconstruir el contenido del grafo y qué no — en
  particular, que mover el encuadre no reconstruya lo que el encuadre no cambia.

### Modified Capabilities

Ninguna.

## Impact

- `components/ChronometricGraph.tsx` — se extrae la capa de nodos y se estabilizan sus callbacks.
- Componente nuevo para la capa de nodos.
- Cobertura nueva sobre la condición de memoización.
- Sin cambios de i18n, IPC ni dependencias.

**Invariante 12.** La geometría de `ChronometricGraph` no se toca sin validación visual explícita de
Ale. Este change no la modifica, pero mueve el código que la produce, así que la validación visual
es condición de cierre y está en las tareas.
