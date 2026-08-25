## MODIFIED Requirements

### Requirement: Cada control SHALL residir en la superficie que corresponde a su alcance

Un control SHALL ubicarse según sobre qué actúa: la navegación entre vistas y el mantenimiento de la
aplicación en el panel lateral, las acciones sobre el repositorio en el panel lateral junto a ellas, y
los controles que sólo afectan a una vista en el encabezado de esa vista. Un control SHALL NOT
permanecer visible en una pantalla donde no produce efecto, y SHALL NOT reservar espacio en ella.

Un control del armazón SHALL producir el mismo efecto en todas las vistas. SHALL NOT gobernar además
una estructura interna de alguna de ellas, aunque esa estructura se le parezca.

El fundamento es que la barra superior acumulaba cinco categorías distintas en una sola franja, y esa
mezcla obligaba a leerla entera para encontrar cualquier cosa. Cuando el lugar de un control depende
de su alcance, la ubicación deja de memorizarse y pasa a deducirse.

Lo que se agrega es la tercera parte de la regla, y tiene su propia evidencia. El estado de los
paneles del armazón se pasaba sin traducir a la vista del ciclo de especificación, que lo usaba para
su grilla interna: el mismo interruptor abría el panel lateral en una vista y una columna del cuerpo
en otra. Un control que significa dos cosas distintas según la pantalla obliga a aprender ambas, y
deshace lo que las dos primeras partes de esta regla buscaban.

#### Scenario: Selector que sólo aplica a una vista
- **WHEN** se está en una vista distinta de aquella que el selector afecta
- **THEN** ese selector no ocupa lugar ni reserva altura en ninguna superficie

#### Scenario: Selector en la vista que gobierna
- **WHEN** se está en la vista que el selector afecta
- **THEN** el selector aparece en el encabezado de esa vista

#### Scenario: Control del armazón en vistas distintas
- **WHEN** se acciona un control del armazón en cualquier vista
- **THEN** produce el mismo efecto en todas, y ninguno adicional propio de una de ellas

#### Scenario: Mantenimiento de la aplicación
- **WHEN** se presentan la versión de la aplicación y el estado de sus actualizaciones
- **THEN** se ubican junto a los ajustes, la ayuda y el perfil, y no entre las acciones del repositorio
