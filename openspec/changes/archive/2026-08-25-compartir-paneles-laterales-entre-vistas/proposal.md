## Why

Hay dos lugares de panel en el armazón —uno a cada lado del contenido— y cada vista los llena con
piezas propias en vez de compartirlos. La consecuencia es que plegar un panel produce efectos
distintos según dónde se esté parado.

La causa está en una sola línea. En `app/page.tsx` el estado de los paneles del armazón se pasa tal
cual a la vista SDD: `leftOpen: sidebarOpen`, `rightOpen: detailsOpen`. El mismo interruptor gobierna
el panel lateral del armazón **y además** la columna izquierda interna del dashboard, que es otra
cosa. En SDD terminan conviviendo cuatro columnas: el lateral del armazón más las tres del
dashboard. El panel de detalles del grafo se apaga por su cuenta en esa vista, así que el lugar de la
derecha queda libre y lo ocupa una columna distinta que nadie declaró equivalente.

El resultado es que hay que ocultar paneles a mano al cambiar de vista, y que el mismo control
significa cosas distintas en cada pantalla.

Ese cuerpo arrastra además dos deudas que se resuelven al rehacerlo, porque se tocan los mismos
archivos: la disposición amontonada de sus tres columnas, señalada desde hace varias sesiones, y las
285 declaraciones de borde de su hoja de estilos, que el requisito vigente de separación por fondo ya
prohíbe.

## What Changes

- **El estado de los paneles deja de gobernar dos cosas.** `sidebarOpen` y `detailsOpen` gobiernan
  los dos lugares de panel del armazón, y nada más. Las columnas internas del dashboard dejan de
  depender de ellos.
- **Los dos lugares de panel son del armazón y cada vista aporta su contenido.** A la derecha, el
  grafo pone el detalle del commit y SDD pone su actividad y sus herramientas. La pieza es una;
  lo que cambia es lo que muestra.
- **El panel derecho pasa a ser una tarjeta con alto propio y arrastrable.** Sigue en su columna y
  sigue repartiendo el ancho con el contenido —no se superpone—, pero no llega al piso: su alto se
  arrastra con el puntero como hoy se arrastra su ancho, y se recuerda por repositorio.
- **El cuerpo de SDD deja de tener tres columnas propias.** Lo que hoy vive en su columna izquierda
  y en su columna derecha pasa a los dos lugares del armazón; queda el contenido central.
- **Las líneas divisorias del cuerpo de SDD se retiran**, conforme al requisito vigente de que la
  separación se dé por fondo y espacio.

**Fuera de alcance, explícitamente:** los 323 usos de tokens propios `--os-*`, que resuelve
`unificar-paleta-carbon-soul` con la verificación de color que ese change declara; el nombre interno
de la vista, que sigue diciendo `pipeline`; y la franja de identidad, que ya quedó unificada.

## Capabilities

### New Capabilities
- `ui-side-panels`: los dos lugares de panel del armazón como superficie compartida, su estado, su
  geometría arrastrable en ancho y alto, y la regla de que cada vista aporta contenido y no
  estructura.

### Modified Capabilities
- `ui-navigation-layout`: un control del armazón no puede gobernar además una estructura interna de
  una vista.

## Impact

- `app/page.tsx`: el reparto del estado de paneles entre armazón y vistas.
- `hooks/use-panel-layout.ts`: el alto arrastrable del panel derecho y su persistencia.
- `components/RepoDetailsPanel.tsx`: pasa a ser el contenido que el grafo aporta al lugar derecho.
- `components/pipeline/OpenSpecDashboard.tsx` y su hoja de estilos: retiro de las columnas propias y
  de las líneas divisorias del cuerpo.
- `components/ChronometricGraph.tsx`: **no se edita en las primeras fases.** Si al rehacer los
  paneles el lienzo necesitara ajuste, frenar y reportar: está protegido por el invariante 12 y no
  hay autorización vigente para este alcance.
