## Decisión: se toma el criterio, no las clases

El control adopta contorno, respiro y peso —lo que hace que se lea como botón— pero expresado con los
tokens del panel: `--os-border`, `--os-muted`, la tipografía monoespaciada y la escala `--sp-*`.

**Alternativa descartada: copiar las clases del botón de Configuración.** Es literal a lo pedido y
garantiza que los dos se vean idénticos. Se descarta porque ese botón está escrito con utilidades de
Tailwind sobre los tokens generales de la aplicación, y el panel Pipeline tiene su propio lenguaje
visual en un módulo CSS: monoespaciada, paleta `--os-*`, versalitas. Un control con la tipografía y los
bordes del resto de la aplicación metido en medio del panel se vería pegado, no integrado. Lo que hay
que igualar es que se lea como un control accionable, no la hoja de estilos.

**Se conserva la versalita y el tamaño chico.** No es un descuido: el panel usa esa tipografía para sus
controles secundarios, y volver es secundario respecto de lo que se está mirando. Lo que faltaba era el
contorno, no el tamaño.

## Decisión: se cambia la regla, no los dos botones

El estilo vive en `.backToStart` y los dos usos —el encabezado del panel y la vista de una
especificación— lo heredan sin tocarse.

**Alternativa descartada: darle a cada uno su propio estilo.** Permitiría afinar cada caso. Se descarta
porque son el mismo control con el mismo significado en dos lugares, y separarlos es la forma más
segura de que dentro de dos cambios ya no se parezcan. Es el mismo criterio por el que la evidencia de
diff terminó con una función compartida en vez de dos condiciones iguales.

## Riesgo

**Que el contorno agregue ruido en un encabezado que ya tiene varios elementos.** Mitigación: el
contorno es de un solo píxel y usa el borde tenue del panel, no el fuerte; y la comprobación es visual,
con Ale mirándolo en la aplicación.

## Sin medir

No hay forma de comprobar automáticamente que un control "parece un botón": jsdom no calcula estilos y
ninguna prueba distingue eso. La única verificación posible es la de Ale sobre la aplicación, y así
queda declarado en las tareas en vez de simular cobertura.
