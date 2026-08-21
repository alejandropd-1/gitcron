## Why

Cada vista de la aplicación encabeza su contenido a su manera. La vista de historial rotula con una
cadena armada por interpolación dentro del componente; el grafo clásico dibuja los nombres de sus
cinco columnas; la vista de autoría usa una grilla con sus claves de traducción. Las tres comparten
casi la misma firma visual —`sticky top-0 bg-bg-surface/75`, `text-[11px] uppercase tracking-wider
font-bold`— pero divergen en el detalle: el grafo usa una altura fija sin borde inferior, las otras
dos usan relleno vertical con borde. Hay un encabezado de contenido de hecho, que nadie declaró, y
por eso se vuelve a copiar con variaciones cada vez que aparece una vista nueva.

El grafo cronométrico no tiene ninguno: su contenedor arranca directo en el lienzo. Por eso el
selector de modo clásico/cronométrico —el único control que gobierna a las dos vistas por igual—
terminó en el panel lateral, donde ocupa una fila que queda vacía en toda vista que no sea el grafo.
El control vive lejos de aquello que gobierna y reserva altura donde no gobierna nada. El invariante
vigente pide que cada control resida en la superficie que corresponde a su alcance, y el alcance de
este selector es el área de contenido del grafo, no el panel lateral.

Los rótulos de esos encabezados tampoco son consistentes. El grafo clásico los escribe en inglés
dentro del JSX; el historial los escribe en castellano por interpolación; y la clave `history.header`
existe en los tres idiomas sin ningún consumidor, huérfana desde la mudanza de textos. El invariante
8 exige que toda cadena de interfaz pase por `lib/i18n.ts`, y hoy dos de las cuatro superficies no
lo cumplen: la aplicación en inglés muestra el historial en castellano, y la aplicación en castellano
muestra las columnas del grafo en inglés.

El botón que anuncia las ramas especulativas vive en ese mismo encabezado y arrastra tres defectos.
No consulta la preferencia de ramas especulativas que ya existe, de modo que la única forma de
ocultarlo es apagar el grafo cronométrico entero y perder con él el selector de modo. Su rótulo y su
tooltip están escritos en castellano dentro del componente. Y el único interruptor que gobierna esa
preferencia vive dentro del lienzo cronométrico, inalcanzable desde la vista clásica que es donde el
botón aparece.

## What Changes

- **El encabezado de contenido se declara y se unifica.** Una sola pieza, con una sola firma visual,
  que cada vista puebla con lo suyo. Las tres implementaciones actuales pasan a usarla y dejan de
  divergir en altura, relleno y borde.
- **Todos sus rótulos pasan por `lib/i18n.ts`** en los tres idiomas, sin armar claves por
  interpolación de plantilla. La clave huérfana recupera consumidor o se retira.
- **El grafo cronométrico recibe encabezado.** Se ubica en el contenedor común de los dos modos, por
  encima de ambos, de modo que el archivo protegido por el invariante 12 no se edita: sólo recibe
  menos alto por composición.
- **El selector de modo se muda al encabezado** y sale del panel lateral, y con él la fila reservada
  y el hueco que deja en las demás vistas.
- **El anuncio de ramas especulativas respeta la preferencia que ya existe**, y su rótulo y su
  tooltip pasan por `lib/i18n.ts`.

**Fuera de alcance, explícitamente:** los colores literales del anuncio de ramas especulativas y del
resto de las superficies tocadas, que resuelve `unificar-paleta-carbon-soul` con la verificación de
color que ese change declara; la geometría del lienzo cronométrico, protegida por el invariante 12;
y la disposición de la vista Pipeline.

## Capabilities

### New Capabilities
- `ui-content-header`: el encabezado del área de contenido como pieza única, con su composición, sus
  rótulos traducidos y su comportamiento ante el cambio de vista.

### Modified Capabilities
- `ui-navigation-layout`: distinguir la franja de acciones retirada —prohibida entre la barra de
  ventana y el área de contenido— del encabezado de contenido, que vive dentro del área de contenido
  y sí está permitido. Y retirar del panel lateral el selector de modo de grafo.
- `speculative-branches-preference`: el anuncio de ramas especulativas queda sujeto a la preferencia
  por repositorio que la capacidad ya define.

## Impact

- `components/RepoMainView.tsx`: encabezado del grafo clásico, contenedor común de los dos modos,
  anuncio de ramas especulativas.
- `components/RepoContentViews.tsx`: encabezados de historial y de autoría.
- `components/RepoSidebar.tsx`: retiro de la fila del selector de modo.
- `lib/i18n.ts`: claves de los rótulos, en ES, EN y ZH.
- `components/ChronometricGraph.tsx`: **no se edita.** Recibe menos alto por composición; ese efecto
  requiere validación visual de Alejandro, acotada y con fecha, conforme al invariante 12.
