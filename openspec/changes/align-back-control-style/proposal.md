## Why

El control para volver del panel Pipeline no se lee como un botón. En
`components/pipeline/OpenSpecDashboard.module.css:1195`, `.backToStart` declara `border: 0` y
`background: none`, con `0.62rem` de tipografía en versalitas y color apagado. Es un texto con una
flecha al lado, y ya hay antecedente de que eso no alcanza: `legible-panel-controls` se abrió
precisamente porque Ale observó que los controles del panel no parecían botones.

El resto de la aplicación resuelve lo mismo de otra manera. El botón "Volver al Repositorio" de
Configuración —`components/SettingsPanel.tsx:344`— lleva borde, un padding que lo separa del texto
vecino y una etiqueta en caja normal. Se lee como un control accionable a primera vista.

La diferencia se nota más ahora, porque el mismo control aparece en más lugares: además del encabezado
de un cambio, la vista de una especificación lo usa para volver.

## What Changes

- `.backToStart` gana contorno, respiro y peso tipográfico, para leerse como un control accionable
  igual que su equivalente de Configuración.
- El cambio alcanza a los dos usos que ya tiene sin tocarlos: el encabezado del panel y la vista de una
  especificación.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el control de volver del panel se presenta como un botón, no como texto.

## Impact

**Producción:** `components/pipeline/OpenSpecDashboard.module.css`, únicamente la regla `.backToStart` y
su estado de hover.

**Sin tocar:** el marcado de los dos botones que la usan, su comportamiento, y el botón de Configuración,
que es el que sirve de referencia y ya está bien.

**Fuera de alcance:** unificar el resto de los controles del panel con los de la aplicación, y mover el
control de lugar. Ale pidió el criterio estético de un control concreto, no una revisión del panel.

**Dependencias:** ninguna.

**Riesgo:** bajo. Es una regla de estilo sobre un control que ya existe, y la comprobación es visual: no
hay prueba automatizada que distinga "parece un botón" de "parece un texto", y declararlo cubierto por
la suite sería falso.
