## Why

La interfaz de GitCron no tiene sistema visual: tiene resultados. El proyecto declara veinte tamaños
de fuente distintos, con ciento dieciocho declaraciones por debajo de doce píxeles, y ni una sola
variable CSS de espaciado o de tipografía —las cuarenta que existen son de color, radio o
disposición—. Sin escala, cada componente elige su número a ojo, y por eso no hay dos paneles que
respiren igual. Lo que se percibe como desprolijidad no es falta de criterio de quien lo escribió:
es que no había regla que sostener.

El armazón sufre el mismo problema por el lado opuesto. La paleta ya declara la intención —
`--color-bg-surface` está documentada como «Toolbars, Sidebars, list panels» y `--color-bg-base` como
fondo de página— pero esa separación no se aplica de forma consistente, así que la barra superior, la
lateral y el cuerpo se leen como una sola superficie continua y nada indica dónde termina el armazón
y empieza el contenido.

El resultado es una aplicación que muestra mucha información y obliga a recorrerla entera para
encontrar un dato. Aplicaciones de trabajo comparables —Codex, Unsloth— muestran tanta información
como GitCron y se leen sin esfuerzo, porque separan el armazón del contenido por fondo y geometría, y
porque cada elemento tiene un tamaño que le corresponde y no el que hizo falta para que entrara.

## What Changes

- **Escala de tokens.** Se define una escala acotada de tipografía y espaciado como variables CSS,
  junto a las de color que ya existen, con un piso de legibilidad declarado.
- **Migración de la aplicación a la escala.** Los tamaños y espaciados literales se reemplazan por
  tokens en todas las pantallas: Commit, Graph, History y Pipeline.
- **Armazón separado del contenido.** La barra superior y la lateral comparten el fondo del armazón;
  el cuerpo se apoya sobre el suyo y se separa con una esquina redondeada en el encuentro. Los
  controles de mostrar y ocultar paneles, que ya existen, quedan visibles y consistentes.
- **Piso de accesibilidad verificable.** Área objetivo de 44 por 44 píxeles en todo control,
  contraste AA para texto y para elementos que no son texto, foco visible y no tapado, y soporte de
  ajuste de espaciado de texto y ampliación al doscientos por ciento.
- **Verificación automática.** Pruebas que recorren las hojas de estilo y fallan ante un tamaño fuera
  de escala, un espaciado literal o un área de control insuficiente.
- **Criterio de prosa en la interfaz.** Un texto que orienta puede quedarse, pero no se repite ni
  compite con la acción. Corrige un caso concreto: `pipeline.openspec.engine.review.safetyHelp` se
  renderiza dos veces en la misma pantalla, en
  `components/pipeline/OpenSpecUpdateReview.tsx:138` y `:147`.

**Fuera de alcance, explícitamente:** la geometría de `ChronometricGraph.tsx` y `CommitGraph.tsx`,
que el invariante 12 protege y que sólo se toca con validación visual previa de Ale; cualquier
dependencia nueva de interfaz, que AGENTS.md sujeta a aprobación explícita; y toda funcionalidad
nueva —este change no agrega ni cambia lo que la aplicación hace, sólo cómo se ve y se recorre.

## Capabilities

### New Capabilities
- `ui-visual-system`: escala de tipografía y espaciado en tokens, separación visual entre armazón y
  contenido, y piso de accesibilidad verificable automáticamente.

### Modified Capabilities

Ninguna. Este change no altera el comportamiento declarado por ningún spec existente: cambia la
presentación, que hasta ahora ningún requisito describía.

## Impact

**Estilos.** Se agregan tokens de tipografía y espaciado en `app/globals.css`, junto a los de color.
Los módulos CSS de `components/` migran sus valores literales a esos tokens. La medición de partida
queda registrada para poder comparar: veinte tamaños distintos y ciento dieciocho declaraciones por
debajo de doce píxeles antes de empezar.

**Armazón.** `app/page.tsx` y `components/TopBar.tsx` aplican la separación de fondos y la esquina
redondeada. Los controles de mostrar y ocultar paneles ya existen —`onToggleSidebar` y
`onToggleDetails` en `components/TopBar.tsx:88`, con sus claves `toolbar.showSidebar` y
`toolbar.hideSidebar`— y este change los conserva, revisando su presentación y su área objetivo.

**Método.** El invariante 11 fue revisado el 2026-08-19 por decisión de Ale, retirando «denso» y la
prohibición de textos explicativos, que empujaban a comprimir la interfaz. Este change implementa esa
revisión; no la decide.

**Riesgo declarado.** La migración toca hojas de estilo de pantallas que hoy funcionan y cuya
corrección no está cubierta por pruebas automáticas más allá de las reglas que este mismo change
introduce. La verificación visual final es humana y así queda declarada en las tareas.
