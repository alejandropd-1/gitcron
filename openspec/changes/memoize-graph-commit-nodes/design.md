## Context

El encuadre ya está bien aplicado: un único `<g transform="translate(...) scale(...)">` envuelve el
contenido del mundo, y los hijos usan coordenadas de mundo. Mover el grafo debería costar actualizar
un atributo.

Lo que lo hace caro es que React no lo sabe: cuando cambia `viewport`, `ChronometricGraph` se
reejecuta entero y reconcilia todo el subárbol de ese `<g>` para terminar cambiando una cadena.

La capa de nodos recorre `projectedCommits` —hasta 500 entradas, por el tope `--max-count=500` de
`git:log`— y por cada uno construye un `<g>` con hasta cuatro elementos SVG. Es la capa más numerosa
y la primera candidata.

Inventario de lo que usa hoy ese bloque, que es lo que define las props:

| Origen | Estable hoy |
|---|---|
| `projectedCommits`, `headCommitNode` | sí, `useMemo` |
| `isCommitEntering` | sí, `useCallback` |
| `selectedHash`, `selectedBranchName`, `onContextMenu` | props del componente |
| `hoveredHash` | estado |
| `selectedBranchColor` | valor derivado, string |
| `setHoveredHash`, `setHoveredPos` | sí, setters de `useState` |
| `selectGraphCommit` | **no**: `function` declarada en el cuerpo |
| `fs` | **no**: función recreada en cada render |

## Goals / Non-Goals

**Goals:**

- Que arrastrar y hacer zoom no reconstruyan la capa de nodos.
- Que la memoización no se pueda anular sin que se note.

**Non-Goals:**

- Cambiar la geometría. Mismas posiciones, radios, colores y orden de capas.
- Extraer las demás capas —conexiones, tags, satélites, ticks, stashes—. Se decide con la medición
  de ésta a la vista, en su propio change.
- Virtualizar o recortar lo que se dibuja.
- Cambiar el tope de 500 commits.

## Decisions

**La escala tipográfica viaja como número, no como función.** Hoy el bloque usa `fs(base)`, que se
recrea en cada render. Pasar `textScale` y construir el equivalente dentro del componente memoizado
resuelve el problema en el origen; pasar `fs` envuelta en `useCallback` también funcionaría, pero
deja una función en la superficie de props donde alcanza un número.

**Los callbacks se estabilizan con el patrón de ref al último valor.** `selectGraphCommit` depende
de media docena de cosas del cuerpo del componente; envolverla en `useCallback` con la lista
completa de dependencias la volvería a recrear casi siempre y no ganaríamos nada.

En su lugar, un ref guarda las funciones vigentes, se actualiza **en un effect** —no durante el
render, que es lo que `react-hooks/globals` prohíbe con razón— y los callbacks que se pasan hacia
abajo son envoltorios vacíos de dependencias que leen ese ref. Así son estables de por vida y
siempre invocan la versión actual.

La alternativa era pasar `selectGraphCommit` tal cual y aceptar que la memoización no funcione en
los renders donde cambie. Se descartó porque el modo de falla es invisible: el grafo seguiría
correcto y sólo estaría lento, que es exactamente la situación de la que venimos.

**La comparación de `React.memo` queda en la superficial por defecto.** Todas las props pasan a ser
primitivas, referencias memoizadas o callbacks estables, así que una comparación superficial
alcanza. Un comparador propio sería una segunda definición de "qué cambió" que habría que mantener
sincronizada con las props, y se desincronizaría sin avisar.

## Risks / Trade-offs

- **Una prop no estable que se cuele anula la memoización en silencio.** → Es el riesgo principal y
  por eso hay cobertura específica: un test verifica que la capa no se reconstruye cuando sólo
  cambia el encuadre, y falla si alguien agrega una prop inestable.
- **Mover ~90 líneas de JSX puede introducir una regresión visual que ningún test ve.** → La
  invariante 12 lo cubre: la validación visual de Ale es condición de cierre y está en las tareas.
  El diff se mantiene lo más mecánico posible, sin reordenar ni reescribir el marcado.
- **El hover reconstruye la capa entera.** → Es el comportamiento de hoy y no empeora. Aislar el
  hover por nodo es otra optimización, con su propia medición; meterla acá mezclaría dos cambios y
  agrandaría la validación visual.
- **La mejora esperada no está medida todavía.** → Se conoce el costo actual (50–70 ms) pero no el
  posterior. La tarea de cierre incluye volver a medir con la misma instrumentación, para que el
  próximo paso se decida con número y no con impresión.
