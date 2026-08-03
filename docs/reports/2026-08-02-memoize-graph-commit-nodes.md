# Reporte — `memoize-graph-commit-nodes`

**Fecha:** 2026-08-02 · **Base:** `main` en `a6189a1`

Primer paso del arreglo de fondo del tironeo: abaratar el render del grafo, no reducir su frecuencia.

## Diagnóstico

`coalesce-graph-viewport-updates` bajó los renders pedidos a uno por cuadro, pero el tironeo siguió.
La instrumentación mostró por qué: cada render cuesta 50–70 ms con 500 commits, contra un
presupuesto de 16,6 ms por cuadro. Sólo se conseguían 3–7 renders por segundo, unos 5 fps.

La causa no eran los cálculos: de los ~30 `useMemo` del archivo **sólo uno depende del encuadre**,
el de la posición del tooltip. La proyección de commits, las filas y los colores ya estaban
memoizados. El costo estaba en reconstruir el JSX y reconciliar el subárbol del `<g>` que lleva la
transformación: cientos de elementos SVG recreados para terminar cambiando una cadena de texto.

## Qué se tocó

- **`components/graph/CommitNodesLayer.tsx`** (nuevo). La capa de nodos de commit sale de
  `ChronometricGraph` a un componente memoizado que recibe los datos ya proyectados y **no** el
  encuadre. El marcado se movió sin reordenarlo ni reescribirlo.
- **`hooks/use-latest-callback.ts`** (nuevo). Callback de identidad estable que invoca la versión
  vigente, con el ref actualizado en un effect y no durante el render. Existe porque
  `selectGraphCommit` se declara en el cuerpo del componente y `onContextMenu` es una prop: pasarlas
  tal cual habría anulado `memo` **en silencio**, dejando el grafo correcto y sólo lento.
- **`components/ChronometricGraph.tsx`**. Usa la capa nueva y estabiliza las cuatro manijas que le
  pasa. La escala tipográfica viaja como número (`textScale`) en vez de como función `fs`, por el
  mismo motivo.

Archivos:

- `components/ChronometricGraph.tsx`
- `components/graph/CommitNodesLayer.tsx` (nuevo)
- `components/graph/__tests__/CommitNodesLayer.test.tsx` (nuevo)
- `hooks/use-latest-callback.ts` (nuevo)
- `hooks/__tests__/use-latest-callback.test.ts` (nuevo)

## Qué NO se tocó

- **La geometría.** Mismas posiciones, radios, colores, opacidades y orden de capas. El bloque se
  movió tal cual. Aun así, la invariante 12 exige validación visual de Ale, que es condición de
  cierre y está sin marcar.
- **Las demás capas del `<g>`**: conexiones, tags, satélites, ticks de tiempo, stashes. Alcance
  acotado a propósito a la capa más numerosa, para medir antes de seguir.
- El aislamiento del hover por nodo. Hoy pasar el mouse reconstruye la capa entera; es el
  comportamiento previo y no empeora. Mezclarlo acá habría agrandado la validación visual.
- El tope de 500 commits de `git:log`.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec eslint` (archivos nuevos) | limpio |
| `pnpm exec eslint components/ChronometricGraph.tsx` | 5 errores `set-state-in-effect`, **todos preexistentes** |
| `pnpm exec tsc --noEmit` | 0 errores |
| `pnpm test` (corrida 1) | 88 archivos · 632 tests · verde |
| `pnpm test` (corrida 2) | 88 archivos · 632 tests · verde |
| `pnpm test` (corrida 3) | 88 archivos · 632 tests · verde |
| `openspec validate memoize-graph-commit-nodes --strict` | válido |

Sobre los 5 errores de lint: se verificó lintando la versión de `HEAD` del archivo. Aparecen en las
líneas 300, 711, 819, 1050 y 1596 antes del cambio y en 302, 713, 821, 1052 y 1598 después —las
mismas cinco, desplazadas por los dos imports agregados—. **Este change no introdujo ninguno.**

Antes de este change la suite era de 86 archivos y 625 tests; los siete nuevos son los de estas dos
piezas.

**Sobre el flake:** tres corridas verdes sin reproducir el `Test timed out in 5000ms`. Como en las
tres tandas anteriores: no está resuelto ni medido, sólo no apareció.

## Cobertura agregada

Siete tests. El de la capa cuenta las invocaciones de `isCommitEntering` —una por nodo por
construcción— para medir si la capa se reconstruyó, sin instrumentar el componente por dentro.

- Cambiar sólo el `transform` del encuadre → la capa **no** se reconstruye.
- Cambiar la selección, el hover o los commits proyectados → sí se reconstruye.
- La capa dibuja un grupo por commit con las iniciales del autor.
- `useLatestCallback` conserva su identidad entre renders de su dueño.
- `useLatestCallback` invoca la versión vigente y no la del primer render.

El test de la primera fila es el que protege la memoización: si alguien agrega una prop que se
recrea por render, falla.

## Medición: el cambio NO redujo el costo por render

Medido con la misma instrumentación, en gitCronos con 500 commits y en dev:

| | renders/s al arrastrar | medio | máx |
|---|---|---|---|
| antes | 5–13 | 44–65 ms (pico 205) | 497 ms |
| después | 3–15 | 60–90 ms (pico 152) | 452 ms |

**No hay mejora medible.** Hay bloques mejores y bloques peores; el costo por render se quedó donde
estaba, muy por encima de los 16,6 ms de presupuesto por cuadro.

La hipótesis que motivó el change —que la capa de nodos dominaba el costo— **no se confirma**. Se
memoizaron ~500 grupos de 2 a 4 elementos, pero en cada render el contenedor sigue reconstruyendo
las conexiones (con un `.map` anidado sobre `node.connections`), los tags, los ticks de tiempo, los
satélites y el bloque de etiquetas de commit, que tiene otro `.map` anidado. La capa extraída era una
fracción del total y la fracción no alcanzaba.

Lo que sí está verificado, y es la razón de conservar el change: la capa **deja de reconstruirse** al
mover el encuadre, con un test que lo fija y que falla si alguien cuela una prop inestable. Es
condición necesaria para memoizar el resto —`useLatestCallback` y la superficie de props estable
sirven igual para las demás capas— pero por sí sola no mueve la aguja.

**La ruta incremental fue una mala elección de mi parte.** La alternativa que se descartó al abrir el
change era medir por capa antes de mover nada; con estos números, era la correcta. Lo que sigue debe
empezar por ahí y no por extraer la siguiente capa a ojo.

## Dos hallazgos de la medición, no atacados

- **El grafo se re-renderiza cada 2 s en reposo**, sin interacción: bloques de `1 render en ~2000ms ·
  medio 33–46ms`. Es el heartbeat de `git status` tocando el store. No causa el tironeo, pero son
  ~40 ms de trabajo por cada 2 s con el grafo abierto.
- **Persisten picos de 350–450 ms** que no correlacionan con el arrastre. No están explicados.

## Pendiente

- `4.5` — medir el costo por render después del cambio.
- `4.10` — **quitar la instrumentación temporal de `ChronometricGraph.tsx` antes de archivar.** Está
  puesta a propósito para la medición y no debe entrar en el commit.
- `4.8` — validación visual de Ale, invariante 12.
- `4.9` — archivado confirmado por Ale desde la aplicación.
