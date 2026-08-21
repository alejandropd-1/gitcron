## Why

La aplicación tiene dos paletas conviviendo y una tercera heredada. Los fondos y superficies se
rearmaron bajo «The Compiled Carbon Soul», pero la vista Pipeline define diez tokens de color
propios en su hoja de estilos —`--os-bg`, `--os-surface`, `--os-green`, `--os-cyan`, `--os-amber`,
`--os-violet` y sus bordes— que no salen de la paleta general y que quedaron desafinados al
cambiarla. Y los acentos generales siguen siendo los de la paleta anterior: el verde de éxito
`#a3f185` es un lima saturado elegido contra un fondo azul marino, que sobre grises carbón desentona
aunque cumpla el contraste exigido.

Eso último es lo que hace al caso instructivo: la verificación automática de contraste lo aprueba,
porque mide legibilidad y no armonía. Un color puede ser perfectamente legible y aun así pertenecer
a otra paleta.

El invariante 11 incorporó el 2026-08-20 la regla que este change implementa: una sola paleta,
declarada, y ninguna propia. Hoy la aplicación no la cumple.

## What Changes

- **Pipeline deja de tener paleta propia.** Sus diez tokens se resuelven contra los de la paleta
  general, o se incorporan a ella si cubren un caso que la general no tiene.
- **Los acentos se revisan contra el fondo carbón.** Éxito, error, advertencia, información y los
  colores de estado de Git se ajustan para pertenecer a la misma familia que los fondos, sin perder
  su significado ni bajar del contraste exigido.
- **La verificación automática se extiende al color.** Se agrega una comprobación que falla ante
  cualquier color literal declarado fuera de `app/globals.css`, del mismo modo que ya se comprueban
  los tamaños, los espaciados y los radios.

**Fuera de alcance, explícitamente:** la disposición de Pipeline —sus tres columnas y su
amontonamiento son un trabajo aparte—; los colores del lienzo cronométrico, protegidos por el
invariante 12 y sin autorización vigente para este alcance; y agregar colores que no resuelvan un
caso ya existente.

## Capabilities

### New Capabilities
- `ui-color-source`: la paleta como fuente única de color de la aplicación, verificable
  automáticamente.

### Modified Capabilities

Ninguna. `ui-visual-system` ya norma la escala y la accesibilidad; el color queda como capacidad
propia porque su regla es de procedencia y no de medida.

## Impact

**Estilos.** `components/pipeline/OpenSpecDashboard.module.css` pierde sus diez tokens propios.
`app/globals.css` revisa sus acentos y, si Pipeline requiere algún matiz que la paleta no tiene, lo
incorpora con nombre general en lugar de dejarlo dentro de una vista.

**Verificación.** Se suma al conjunto que ya recorre las hojas de estilo una comprobación de
procedencia de color, con la misma forma que las existentes: función pura sobre el texto, sin
dependencias nuevas.

**Riesgo declarado.** Los acentos cargan significado —verde es agregado, rojo es eliminado, naranja
es modificado— y ese significado está aprendido por quien usa la aplicación. Cambiar sus valores para
armonizar puede volverlos menos distinguibles entre sí. La verificación de contraste no lo detecta:
mide cada color contra su fondo, no unos contra otros. Es comprobación humana.

**Medición de partida.** Diez tokens propios en Pipeline. El número de colores literales fuera de
`globals.css` no está medido y debe informarse antes de migrar, como se hizo con los tamaños.
