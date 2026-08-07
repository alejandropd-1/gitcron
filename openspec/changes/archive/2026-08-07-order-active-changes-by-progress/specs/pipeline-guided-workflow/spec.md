## ADDED Requirements

### Requirement: La lista de cambios activos se ordena por avance
La lista de cambios activos SHALL ordenarse por proporción de tareas completadas, de mayor a menor. Los
cambios con el mismo avance SHALL ordenarse por fecha de creación, primero el más reciente. El orden
SHALL ser estable: el mismo conjunto SHALL producir siempre la misma secuencia.

El fundamento es que hoy la lista no declara ningún orden y hereda el del sistema de archivos, así que
un cambio al 96% —a una casilla de poder archivarse— puede quedar debajo de tres parqueados en 0%. Lo
que está por cerrarse es lo que hay que encontrar primero.

Que se compare la proporción y no la cantidad de casillas tildadas importa porque lo contrario premia a
los cambios grandes: cinco de veinte quedaría por encima de tres de cuatro, cuando el segundo está por
terminar y el primero recién arranca.

El desempate por fecha no es un adorno: el empate es el caso más común, porque los recién creados y los
parqueados hace semanas comparten el 0%. Sin él, un cambio que se acaba de abrir cae al fondo junto a
los que nadie va a tocar.

#### Scenario: Cambios con distinto avance
- **WHEN** se listan cambios con distinta proporción de tareas completadas
- **THEN** aparecen de mayor a menor avance

#### Scenario: Proporción frente a cantidad
- **WHEN** un cambio lleva tres de cuatro tareas y otro cinco de veinte
- **THEN** el de tres de cuatro aparece primero

#### Scenario: Dos cambios sin empezar
- **WHEN** dos cambios están en cero y uno se creó después
- **THEN** el creado más recientemente aparece primero

#### Scenario: Sin marca de creación
- **WHEN** dos cambios empatan y no tienen fecha de creación
- **THEN** el orden entre ellos es estable entre relecturas, sin inventar una posición
