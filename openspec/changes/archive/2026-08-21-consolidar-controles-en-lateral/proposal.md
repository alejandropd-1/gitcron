## Why

La aplicación quedó con tres franjas horizontales apiladas antes de que empiece el contenido: la
barra de ventana con las pestañas de repositorio, una barra de acciones, y recién entonces el área de
trabajo. El change anterior redujo la del medio de catorce controles a seis, pero no la eliminó, y
seis controles siguen justificando una franja completa que atraviesa la pantalla.

La referencia declarada en el invariante 11 resuelve esto de otra manera: en aplicaciones de trabajo
como Codex no hay barra intermedia. La ventana lleva sus pestañas y dos o tres controles a la
derecha; el panel lateral concentra la navegación y las acciones; el resto es contenido. Una franja
menos que cruzar antes de llegar a lo que se vino a hacer.

Quedan además dos asuntos del change anterior que al usarlos mostraron que la solución no era la
correcta. El bloque de navegación en el panel lateral ocupa cuatro filas para una decisión que se
toma de a una por vez. Y los controles del lienzo se contrajeron en un menú donde una de las cinco
entradas abre otro panel: un rodeo para llegar al lector de ramas futuras, que era lo que se quería
alcanzar.

## What Changes

- **Desaparece la barra de acciones.** La franja intermedia deja de existir; sus controles se
  reparten según a qué pertenecen.
- **Traer, publicar, recargar y el desplegable de acciones bajan al panel lateral**, en una fila bajo
  el título, por encima de las ramas.
- **Los controles de plegado y la búsqueda suben a la barra de ventana**, a la derecha de las
  pestañas de repositorio, que es donde la referencia los ubica y donde quedan alcanzables aunque el
  panel lateral esté plegado.
- **La navegación entre vistas pasa a ser un desplegable encabezado por la vista activa**, en lugar
  de cuatro filas permanentes. El título nombra dónde se está y despliega adónde se puede ir.
- **El control del lienzo abre el lector de ramas futuras directamente**, sin menú intermedio.
- **Acercar, alejar y restablecer quedan como controles sueltos** sobre el lienzo, sin agruparse.
- **El estado del repositorio se muestra como indicadores junto a su nombre** en el panel lateral
  —rama, árbol de trabajo, validación—, en lugar de vivir sólo dentro de una vista.

**Fuera de alcance, explícitamente:** la vista Pipeline, cuya composición de tres columnas y hoja de
estilos propia son independientes del armazón y merecen su propio trabajo; el contenido de las demás
vistas, que sólo cambian de lugar; y agregar dependencias de interfaz.

## Capabilities

### New Capabilities

Ninguna. Este change ajusta dónde vive cada control, que es lo que `ui-navigation-layout` ya
describe.

### Modified Capabilities
- `ui-navigation-layout`: la jerarquía de acciones deja de referirse a una barra superior que ya no
  existe y pasa a describir el panel lateral y la barra de ventana; el control del lienzo deja de
  abrir un menú y pasa a abrir el lector; y se suman la navegación como desplegable y los indicadores
  de estado del repositorio.

## Impact

**Renderer.** `components/TopBar.tsx` deja de existir como franja: sus contenidos se reparten entre
`components/RepoTabs.tsx` —controles de plegado y búsqueda— y `components/RepoSidebar.tsx` —acciones
del repositorio y navegación—. `app/page.tsx` recablea lo que hoy pasa por la barra.
`components/ChronometricGraph.tsx` cambia el destino de su control inferior y libera los tres
controles de encuadre.

**Riesgo declarado.** Es el segundo movimiento seguido sobre la navegación y las acciones. El
anterior no rompió nada, pero cada mudanza de un control es una oportunidad de dejarlo sin cablear, y
esta vez desaparece el componente que los alojaba. Las pruebas deben cubrir que cada acción sigue
llegando a su destino desde su ubicación nueva, no sólo que se dibuja.

**Riesgo de destino.** El panel lateral pasa a concentrar navegación, acciones, ramas, estado y
mantenimiento. La referencia que se sigue tiene menos elementos que esta aplicación: si el lateral
termina tan cargado como estaba la barra, el problema se habrá mudado en lugar de resolverse. Al
implementar corresponde contar los elementos resultantes y declararlo.
