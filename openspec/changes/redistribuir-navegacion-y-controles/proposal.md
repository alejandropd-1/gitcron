## Why

La barra superior de GitCron acumula catorce controles de cinco categorías distintas: la navegación
entre vistas, las acciones sobre el repositorio, un selector que sólo aplica a una de las vistas, el
mantenimiento de la propia aplicación y las herramientas auxiliares. Todo en una franja de 48
píxeles. El resultado es que la navegación principal —Commit, Graph, History, Pipeline— compite por
atención con el botón de actualizar GitCron, y que el selector Clásico/Cronométrico ocupa lugar
mientras se está en una vista donde no hace nada.

A eso se suman tres defectos que el rearmado visual anterior dejó a la vista al retirar lo que los
tapaba. El lienzo cronométrico no reacciona al ancho de su contenedor: no queda ningún
`ResizeObserver` en el componente, y hasta ahora el problema quedaba oculto porque el panel derecho
flotaba por encima y una máscara desvanecía el grafo justo debajo. La barra inferior del lienzo
conserva su recuadro cuando ya nada más en la aplicación lo tiene. Y quedaron líneas divisorias en
`components/RepoMainView.tsx`, que no figuraba en el alcance de aquella limpieza.

Por último, las ramas especulativas se encienden solas: `app/page.tsx:250` lo hace al detectar una
predicción guardada, con el comentario «Auto-enable FUTUROS when a saved prediction exists for this
repo», y `app/page.tsx:1591` al llegar una nueva. La decisión de verlas no es de quien las genera.

## What Changes

- **La navegación entre vistas pasa al panel lateral**, encima de la lista de ramas, como sección
  propia. Deja de vivir en la barra superior.
- **Las acciones sobre el repositorio se jerarquizan.** Traer y publicar permanecen visibles por ser
  las de uso más frecuente; deshacer, rehacer, rama, guardado temporal y parche pasan a un
  desplegable. Recargar permanece junto a las dos primeras, por ser la misma operación conceptual.
- **Las herramientas auxiliares —terminal, filtro y búsqueda— pasan a un desplegable propio**, con
  sus atajos de teclado a la vista.
- **El selector de modo de grafo baja a la vista de grafo**, que es la única donde tiene efecto.
- **El mantenimiento de la aplicación —versión y actualizaciones— baja al pie del panel lateral**,
  junto a ajustes, ayuda y perfil: no es una acción sobre el repositorio.
- **La barra inferior del lienzo pierde su recuadro** y se contrae en un control que la despliega.
  El lector de ramas futuras conserva su superficie propia, porque es un panel con pestañas y alto
  arrastrable, no una entrada de menú.
- **El lienzo cronométrico se readapta al ancho de su contenedor**, sin reconstruir la capa de nodos.
- **Las ramas especulativas quedan apagadas por omisión y la elección se recuerda por repositorio.**
- **Se retiran las líneas divisorias que quedaron** en `components/RepoMainView.tsx` y
  `components/CommitGraph.tsx`.

**Fuera de alcance, explícitamente:** rediseñar el contenido de las vistas, que sólo cambian de
lugar; la geometría de la línea de tiempo y de los nodos, protegida por el invariante 12 salvo en lo
que este change declara; agregar dependencias de interfaz; y cambiar qué hace cada acción —este
change mueve controles, no altera su comportamiento.

## Capabilities

### New Capabilities
- `ui-navigation-layout`: dónde vive cada control según su alcance —navegación, acción sobre el
  repositorio, control de una vista, mantenimiento de la aplicación— y cómo se agrupa lo que no
  amerita estar siempre visible.
- `speculative-branches-preference`: las ramas especulativas se muestran sólo cuando la persona lo
  pide, y esa elección se recuerda por repositorio.

### Modified Capabilities

Ninguna. Este change no altera requisitos existentes: cumple los de `graph-render-isolation` al
readaptar el encuadre sin reconstruir nodos, y los de `ui-visual-system` al retirar las líneas que
aquél declaró y que quedaron fuera de su alcance.

## Impact

**Renderer.** `components/TopBar.tsx` pierde la navegación, el selector de modo y el mantenimiento, y
gana dos desplegables. `components/RepoSidebar.tsx` gana la sección de navegación arriba y
`UpdateControls` al pie. `app/page.tsx` recablea el estado de vista activa desde la barra hacia el
panel lateral. `components/RepoMainView.tsx` y `components/CommitGraph.tsx` pierden sus líneas
divisorias.

**Lienzo.** `components/ChronometricGraph.tsx` observa el tamaño de su contenedor y recalcula el
encuadre. La observación se hace con `ResizeObserver` sobre el contenedor, no con escuchas de
ventana, y el recálculo altera únicamente la transformación del encuadre: el requisito «Mover el
encuadre no reconstruye los nodos» de `graph-render-isolation` es la condición de aceptación de esta
parte, y no se relaja. También pierde el recuadro de su barra inferior.

**Estado.** La preferencia de ramas especulativas se persiste por repositorio siguiendo el patrón que
el proyecto ya usa para las carpetas de ramas —una clave por ruta de repositorio— sin introducir un
mecanismo nuevo. Se retiran los dos encendidos automáticos de `app/page.tsx`.

**Riesgo declarado.** Mover la navegación cambia dónde vive el control de qué vista se está mirando:
si algo sale mal, no se ve feo, se rompe la navegación. Es un riesgo funcional y no estético, y por
eso este change lo separa del rearmado visual que lo precedió.
