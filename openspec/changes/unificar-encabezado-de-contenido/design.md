## Contexto

El relevamiento del 2026-08-21 encontró cuatro superficies que encabezan contenido y una que no lo
hace:

| Vista | Encabezado | Rótulos |
|---|---|---|
| Grafo clásico | `RepoMainView.tsx:427`, altura fija, sin borde | Inglés crudo en el JSX: `Branch / Tag`, `Graph`, `Commit message`, `Date`, `Commit` |
| Grafo cronométrico | No tiene | — |
| Historial | `RepoContentViews.tsx:53`, relleno vertical y borde | Castellano crudo por interpolación: `Historial · N commits`, `N de M commits` |
| Autoría | `RepoContentViews.tsx:231`, relleno vertical y borde, en grilla | Correcto: `blame.commit`, `blame.author`, `blame.age`, `blame.line`, `blame.content` |

La vista de autoría es el modelo: ya resuelve el caso como corresponde. Las otras dos lo resuelven
cada una a su manera, y el grafo cronométrico no lo resuelve.

La clave `history.header` existe en los tres idiomas —`lib/i18n.ts:1034`, `:2731`, `:4602`— y no
tiene ningún consumidor en el árbol. Se escribió durante la mudanza de textos y la vista siguió
armando su rótulo por interpolación al lado.

## Decisiones

### La pieza vive en el contenedor común, no dentro del lienzo

El grafo cronométrico necesita encabezado, pero `components/ChronometricGraph.tsx` está protegido por
el invariante 12 y la autorización vigente —del 2026-08-20— está acotada a tres controles del lienzo
que no incluyen esto.

La pieza se ubica en `GraphTabView` (`components/RepoMainView.tsx:400`), que es el contenedor común
de los dos modos, por encima del `AnimatePresence` que los alterna. Así el archivo protegido no se
edita y el encabezado aparece en ambos modos por composición.

**Lo que no evita:** el lienzo cronométrico recibe menos alto disponible, y su proyección depende del
alto. Eso no se puede probar automáticamente contra lo que la persona ve. Queda declarado como
riesgo y requiere validación visual de Alejandro, acotada por alcance y con fecha.

### El selector de modo se muda al encabezado y el panel lateral pierde su fila

El selector gobierna cuál de los dos modos del grafo se muestra. Su alcance es el área de contenido
del grafo. En el panel lateral obliga a reservar altura en todas las demás vistas para que no haya
salto al cambiar de una a otra, y esa altura queda vacía. En el encabezado no hace falta reservar
nada: la franja siempre tiene contenido, porque cada vista pone el suyo.

Esto revisa una decisión que `consolidar-controles-en-lateral` tomó y que Alejandro validó en
pantalla el 2026-08-21: la fila funciona, pero el hueco que deja es peor que el problema que
resolvió.

### Franja de acciones y encabezado de contenido no son la misma pieza

`consolidar-controles-en-lateral` retiró `components/TopBar.tsx` y dejó escrito que la aplicación
«SHALL NOT presentar una franja de acciones entre la barra de ventana y el área de contenido», con
un escenario que afirma que «no existe ninguna franja de controles».

Ese requisito apunta a lo que se retiró: una franja de **ancho completo**, por encima del panel
lateral, con **acciones sobre el repositorio** —traer, publicar, deshacer, rehacer, los desplegables
y los controles de plegado a los extremos—. El encabezado de contenido es otra cosa: empieza a la
derecha del panel lateral, por debajo de la barra de ventana, y lleva el **rótulo de la vista** más,
en el grafo, el selector de su modo.

La distinción es real, pero la redacción del escenario no la sostiene sola: dice «ninguna franja de
controles», y el selector de modo es un control. Por eso este change modifica ese requisito para
nombrar las dos piezas por separado, en vez de dejar que cada quien la interprete después.

### Un rótulo por vista, ninguno armado por interpolación

Las cadenas con cantidades —«Historial · N commits», «N de M commits»— se resuelven con la
interpolación de valores que `lib/i18n.ts` ya soporta, del modo en que `history.header` está escrita.
Lo prohibido es lo otro: armar el **nombre de la clave** concatenando trozos, que es el patrón que ya
produjo una pantalla mostrando el literal crudo.

## Preguntas abiertas

- **¿Qué encabezan las vistas Commit y Pipeline?** El relevamiento cubrió cuatro superficies con
  certeza. Commit delega en `CommitTabView` y Pipeline en `PipelineWorkspace`, y ninguna de las dos
  se inspeccionó. La primera tarea del change las releva y declara si les corresponde encabezado o
  si quedan fuera. Si Pipeline resulta tener el suyo, no se toca su disposición: eso es otro trabajo.
- **¿El anuncio de ramas especulativas debe seguir siendo un botón?** Hoy es un atajo que lleva al
  modo cronométrico y enciende la capa. Si pasa a respetar la preferencia, deja de aparecer cuando la
  persona eligió ocultarla, y volver a encenderla exige ir al lienzo cronométrico. Puede estar bien
  —es un anuncio, no un descubridor—, pero es decisión de Alejandro y hay que declararla.
