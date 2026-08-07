## ADDED Requirements

### Requirement: La evidencia de un cambio lleva cuándo empezó y cuándo se archivó
La evidencia de un cambio SHALL incluir su marca de creación con fecha y hora, y SHALL incluir la de
archivado cuando el cambio esté archivado. Ambas SHALL derivarse de la historia de Git. Cuando el
cambio todavía no esté confirmado, la marca de creación SHALL provenir del disco y SHALL quedar
distinguible de una marca confirmada.

El fundamento es que hoy no se puede saber cuánto lleva abierto un cambio ni cuánto duró uno terminado
sin salir de la aplicación: el cambio activo no muestra ninguna fecha y el archivado muestra una sola,
sin hora. Que la fuente sea Git y no el disco importa porque la marca del disco no sobrevive: se pierde
al archivar, porque el directorio bajo `archive/` se crea nuevo, y se pierde al clonar, donde todos los
cambios pasarían a figurar creados el día de la copia. Una marca que miente después de un `git clone`
es peor que ninguna.

Distinguir la marca no confirmada importa porque las dos afirman cosas distintas, y el paso de una a
otra es información: significa que el trabajo se confirmó.

#### Scenario: Cambio activo ya confirmado en Git
- **WHEN** se lee la evidencia de un cambio cuyo `proposal.md` ya está confirmado
- **THEN** su marca de creación es la del commit que lo añadió, con fecha y hora

#### Scenario: Cambio recién creado y sin confirmar
- **WHEN** se lee la evidencia de un cambio que todavía no tiene ningún commit
- **THEN** su marca de creación proviene del disco y queda distinguible de una confirmada

#### Scenario: Cambio archivado
- **WHEN** se lee la evidencia de un cambio archivado
- **THEN** lleva su marca de creación y la de archivado, y la creación sigue siendo alcanzable a través
  del rename
