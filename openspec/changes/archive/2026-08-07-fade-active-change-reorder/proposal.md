## Why

`order-active-changes-by-progress` dejó la lista de cambios activos ordenada por avance, y con eso
introdujo un efecto que no estaba antes: tildar una casilla puede mover el cambio de posición mientras
se lo está mirando. El salto es instantáneo, así que la única pista de que algo se movió es que el
contenido ya no está donde estaba. Se declaró como riesgo asumido en aquel cambio y quedó pendiente de
comprobar en uso; comprobado, molesta.

La aplicación ya resolvió antes exactamente este problema y tiene el patrón escrito. El visor de
diferencias envuelve sus secciones en `motion.div` con clave e inicializadores de opacidad para que el
contenido "se hidrate con un fundido" en vez de aparecer de golpe —está en el registro de cambios—, y el
mismo criterio se aplicó al lienzo del grafo para evitar deformaciones al alternar vistas. La lista de
cambios activos era una de las pocas superficies que seguía cambiando de forma abrupta.

## What Changes

- Cada cambio de la lista se anima al moverse de posición, en vez de saltar.
- Los que entran o salen de la lista lo hacen con un fundido de opacidad, siguiendo el patrón del visor
  de diferencias.
- La animación se desactiva cuando el sistema pide menos movimiento.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el reordenamiento de la lista de cambios activos es perceptible en vez de
  instantáneo.

## Impact

**Producción:** `components/pipeline/OpenSpecDashboard.tsx`, únicamente el elemento que envuelve cada
cambio de la lista.

**Sin tocar:** el orden en sí, que ya está resuelto y probado con tablas; el resto de la barra lateral;
y la lista de archivados, que no se reordena sola.

**Fuera de alcance:** animar el resto del panel. Ale acotó el pedido a este caso —"sutil, nada más para
este caso"— y aplicar el efecto a todo convertiría una ayuda puntual en ruido de fondo.

**Dependencias:** ninguna nueva. `motion/react` ya es una dependencia del proyecto y se usa en los
toasts y en el visor de diferencias.

**Riesgo:** bajo. Es una envoltura sobre un elemento que ya existía, sin cambio de comportamiento. El
riesgo real sería que la animación estorbe en vez de ayudar, y por eso es corta y la comprobación es
visual: no hay prueba automatizada que distinga "se movió suave" de "saltó".
