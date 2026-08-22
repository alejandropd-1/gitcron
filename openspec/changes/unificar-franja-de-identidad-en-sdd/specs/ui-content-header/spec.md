## MODIFIED Requirements

### Requirement: El encabezado SHALL alojar los controles cuyo alcance es la vista

Un control que sólo afecta a lo que la vista muestra SHALL ubicarse en el encabezado de esa vista, y
SHALL NOT ubicarse en el panel lateral. El encabezado SHALL estar presente en toda vista que aloje un
control de este tipo, de modo que pasar de una vista a otra SHALL NOT desplazar el contenido.

La franja de identidad SHALL ser común a toda vista que necesite nombrar la rama actual y el estado
del repositorio, y SHALL componerse siempre igual: la identidad a la izquierda —rama, estado del
árbol de trabajo, estado de sincronización— y el control de alcance de la vista a la derecha.
Ninguna vista SHALL declarar una franja propia para eso.

Una vista SHALL NOT alojar en esa franja datos que no sean identidad ni control. Los contadores, las
insignias y los rótulos de marca pertenecen al cuerpo del panel, donde disponen del ancho que la
línea no tiene.

El fundamento es el requisito ya vigente de que cada control resida en la superficie que corresponde a
su alcance. El selector de modo del grafo gobierna cuál de sus dos representaciones se muestra: su
alcance es el área de contenido del grafo. Ubicado en el panel lateral obliga a reservar altura en
todas las demás vistas para evitar el salto, y esa altura queda vacía. En el encabezado no hay nada
que reservar, porque cada vista aporta su propio contenido a la franja.

Lo que se agrega tiene su propia evidencia. La vista del ciclo de especificación encabezaba con una
barra escrita aparte que llevaba seis piezas en una línea: el título de la práctica en dos renglones,
dos contadores, el estado del repositorio, la rama y la insignia del motor. En la aplicación se leía
`18 e·Repositorio en 0%en estado` —los contadores desbordaban su pista y se encimaban con el estado—.
El defecto ya había aparecido antes y se había corregido agregando una cuarta pista a la grilla;
volvió, porque el problema no era cuántas pistas había sino cuánto se le pedía a una sola línea. Una
franja que sólo admite identidad y control no puede volver a llenarse hasta romperse.

#### Scenario: Control de alcance acotado a una vista
- **WHEN** una vista ofrece un control que sólo afecta a lo que esa vista muestra
- **THEN** ese control está en el encabezado de la vista y no en el panel lateral

#### Scenario: Cambio de vista
- **WHEN** se pasa de una vista a otra
- **THEN** el contenido no se desplaza verticalmente por la aparición o desaparición de un control

#### Scenario: Vista que nombra la rama y el estado
- **WHEN** una vista necesita mostrar la rama actual y el estado del repositorio
- **THEN** usa la franja común, con la identidad a la izquierda y el control de su alcance a la derecha, y no declara una franja propia

#### Scenario: Dato que no es identidad ni control
- **WHEN** una vista necesita mostrar contadores, insignias o un rótulo de marca
- **THEN** los ubica en el cuerpo del panel y no en la franja de identidad
