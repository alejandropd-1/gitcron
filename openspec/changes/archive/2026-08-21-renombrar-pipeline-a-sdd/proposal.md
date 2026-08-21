## Why

La vista se llama «Pipeline» y no describe lo que hace. El nombre viene de la integración
continua, donde una tubería encadena etapas automáticas de compilación y despliegue. Lo que la vista
muestra es otra cosa: el ciclo de proponer un cambio, especificarlo, implementarlo y archivarlo —
desarrollo guiado por especificación, **Spec Driven Development**—. Quien abre la aplicación
esperando ver corridas de integración encuentra changes de OpenSpec, y quien busca el ciclo de
especificación no adivina que está detrás de esa palabra.

El nombre nuevo es **SDD**. La sigla nombra la práctica que la vista sostiene y es la que ya se usa
al hablar del proyecto.

## What Changes

- **La vista pasa a llamarse SDD** en todo lugar donde la persona lee su nombre: el desplegable de
  navegación del panel lateral, el título de la vista, el rótulo de su indicador de estado y el
  nombre de su atajo de teclado.
- **La sigla no se traduce.** SDD se lee igual en los tres idiomas, del mismo modo que la aplicación
  ya deja sin traducir «Commit» y «Stash». En chino la vista dejará de leerse `流水线`, que traduce
  «línea de producción» y arrastra el mismo malentendido que el nombre original.

**Fuera de alcance, explícitamente:** el nombre interno. Las 666 claves `pipeline.*` de
`lib/i18n.ts`, las doce capacidades `pipeline-*` de `openspec/specs/`, los veinticinco componentes de
`components/pipeline/` y los ciento siete archivos que mencionan Pipeline **no se renombran**. Ese
nombre no lo lee nadie fuera del código, y moverlo arrastraría los deltas, los tests y la historia de
archivo de doce capacidades a cambio de nada. El día que haya un motivo, será un change propio.

Tampoco entra la disposición de la vista —sus tres columnas amontonadas—, que es un trabajo aparte.

## Capabilities

### Modified Capabilities
- `ui-navigation-layout`: la vista que la navegación nombra pasa a llamarse SDD, y el nombre que la
  persona lee deja de coincidir con el que usa el código.

## Impact

- `lib/i18n.ts`: nueve valores, en ES, EN y ZH. Las claves no cambian.
- `components/__tests__/` y `components/pipeline/__tests__/`: las aserciones que fijan el rótulo
  visible.
