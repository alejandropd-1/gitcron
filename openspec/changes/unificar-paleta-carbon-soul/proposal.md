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
- **La escala tipográfica entra al mismo alcance.** La aplicación declara siete escalones en
  `app/globals.css:26-32`, cada uno con su propósito escrito —`--font-size-md` dice «títulos de
  sección»—, y no los usa: hay **129 rótulos en versalita con 74 tratamientos distintos**, y **95 de
  ellos declaran un tamaño literal por debajo del piso de 12px** que la propia escala define como
  «piso de legibilidad». Es el mismo problema que el color, en otra dimensión: la norma está escrita
  y la aplicación no la cumple.
- **La verificación automática se extiende al color, y la de tamaños se arregla.** La comprobación
  de escala **ya existe** —`lib/__tests__/visual-scale-scan.test.ts`— pero escanea dos archivos CSS
  y ningún `.tsx`, que es exactamente donde están los 95 literales. Pasa en verde porque no mira
  donde está el problema. La de color nace con el mismo escáner, corregido: si no alcanza a los
  `.tsx`, nace ciega igual.

**Fuera de alcance, explícitamente:** la maquetación del cuerpo de la vista del ciclo —dónde va cada
cosa, las solapas, los botones, los avisos— es un change aparte, decidido con Alejandro el
2026-08-24: color y escala se miden contra una norma declarada, la disposición son decisiones suyas
una por una, y mezclarlas produce un change donde lo verificable y lo opinable se estorban. Tampoco
entran los colores del lienzo cronométrico, protegidos por el invariante 12 y sin autorización
vigente para este alcance; ni agregar colores o escalones que no resuelvan un caso ya existente.

*(La mención anterior a «las tres columnas de Pipeline» quedó sin objeto: las retiró
`compartir-paneles-laterales-entre-vistas`, archivado el 2026-08-24.)*

## Capabilities

### New Capabilities
- `ui-color-source`: la paleta como fuente única de color de la aplicación, verificable
  automáticamente.

### Modified Capabilities

- `ui-visual-system`: ya norma la escala, pero su verificación automática sólo alcanza a dos hojas de
  estilo. Se extiende a los componentes, que es donde están los tamaños fuera de norma.

El color queda igual como capacidad propia, porque su regla es de procedencia y no de medida.

## Impact

**Medición de partida, rehecha el 2026-08-24.** La del 2026-08-22 quedó vieja: la hoja de estilos de
la vista del ciclo pasó de **63 colores literales distintos en 136 apariciones** a **129 distintos en
213 apariciones**. El trabajo se duplicó mientras se remaquetaba la vista, que es la mejor evidencia
de por qué hace falta la verificación: sin una guarda, cada tanda agrega literales nuevos.

Y hay tres tokens que la medición anterior no vio. La hoja **define diez** `--os-*` pero **usa doce
nombres en 268 lugares**: `--os-fg` (7 usos), `--os-bg-deep` (4) y `--os-red` (1) **nunca se
declaran**. Siempre gana su valor de reserva —y `--os-fg` tiene tres valores de reserva distintos—,
así que son tokens de mentira: parecen una decisión tomada una vez y son un literal con nombre.

Fuera de esa hoja, `components/` declara **937 apariciones de color literal con 230 valores
distintos**, y `app/` otras 94 con 66. La migración empieza por la vista del ciclo, que es la peor,
pero la verificación tiene que alcanzar a todo.

**Estilos.** `components/pipeline/OpenSpecDashboard.module.css` pierde sus diez tokens propios y sus
tres fantasmas.
`app/globals.css` revisa sus acentos y, si Pipeline requiere algún matiz que la paleta no tiene, lo
incorpora con nombre general en lugar de dejarlo dentro de una vista.

**Verificación.** Se suma al conjunto que ya recorre las hojas de estilo una comprobación de
procedencia de color, con la misma forma que las existentes: función pura sobre el texto, sin
dependencias nuevas.

**Riesgo declarado.** Los acentos cargan significado —verde es agregado, rojo es eliminado, naranja
es modificado— y ese significado está aprendido por quien usa la aplicación. Cambiar sus valores para
armonizar puede volverlos menos distinguibles entre sí. La verificación de contraste no lo detecta:
mide cada color contra su fondo, no unos contra otros. Es comprobación humana.

**Medición de partida, hecha el 2026-08-22.** La hoja de estilos de la vista SDD
—`components/pipeline/OpenSpecDashboard.module.css`— declara **sesenta y tres colores literales
distintos en ciento treinta y seis apariciones**. Los diez tokens propios son la parte declarada; los
cincuenta y tres restantes están escritos directo en las reglas, sin nombre y sin criterio: `#d8a657`
aparece veinticuatro veces, `#38bdf8` ocho, `#94a3b8` ocho.

Ese número cambia el tamaño del trabajo por seis, y también su fundamento. El problema no es sólo que
la vista tenga paleta propia: es que **tiene un color por situación**. Un token existe para que una
decisión de color se tome una vez y se propague sola; cincuenta y tres literales sueltos son
cincuenta y tres decisiones que hay que volver a tomar cada vez que algo cambie, y que nadie va a
encontrar todas. La verificación de procedencia que este change agrega es lo que impide que vuelvan a
aparecer.
