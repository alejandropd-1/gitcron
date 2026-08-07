## ADDED Requirements

### Requirement: El reordenamiento de la lista de cambios es perceptible
Cuando un cambio se mueva de posición en la lista de activos, SHALL desplazarse de forma animada en vez
de saltar. Los cambios que entren o salgan de la lista SHALL hacerlo con un fundido de opacidad. La
animación SHALL desactivarse cuando el sistema declare preferencia por menos movimiento.

El fundamento es que la lista se ordena por avance, así que tildar una casilla puede mover un cambio
mientras se lo está mirando. Con el salto instantáneo, la única pista de que algo se movió es que el
contenido ya no está donde estaba, y quien tildó pierde de vista lo que acababa de tocar.

Que el desplazamiento se anime y el fundido quede para entradas y salidas no es intercambiable: un
elemento que sólo cambia de posición no se desmonta ni se vuelve a montar, así que una animación de
entrada no llegaría a dispararse y el salto seguiría igual. Cada uno cubre el caso que el otro no puede.

Respetar la preferencia de movimiento importa porque acá el desplazamiento se calcula en JavaScript y no
en una hoja de estilos, así que no basta con la regla de CSS que el panel ya aplica a otras animaciones.

#### Scenario: Un cambio sube de posición al completarse una tarea
- **WHEN** tildar una casilla reordena la lista
- **THEN** el cambio se desplaza a su nueva posición de forma animada

#### Scenario: Un cambio entra o sale de la lista
- **WHEN** un cambio aparece o deja de estar activo
- **THEN** lo hace con un fundido de opacidad

#### Scenario: Preferencia por menos movimiento
- **WHEN** el sistema declara preferencia por menos movimiento
- **THEN** la lista se reordena sin animación
