## ADDED Requirements

### Requirement: El flujo de cambio nuevo se puede cerrar sin empezar nada
El flujo de cambio nuevo SHALL poder cerrarse sin haber empezado ningún trabajo, en sus dos modos. El
control de cierre SHALL aparecer junto a las acciones que abren el flujo, no dentro de lo que se
desplegó. Cerrarlo SHALL NOT detener nada que ya se haya lanzado.

El fundamento es que hoy abrirlo es un viaje de ida: el estado que lo muestra sólo se limpia al elegir un
cambio, al lanzar una tarea o al archivar, y en la pantalla de inicio no hay ninguno de los tres, porque
es justamente donde todavía no se eligió nada. Abrir para mirar es un uso previsto —la guía invita a
ello— y no tenía retorno.

Que el control viva junto a las acciones que abren el flujo, y no adentro, es lo que lo hace legible
como su contraria: las tres son opciones de un mismo grupo —empezar de un modo, del otro, o no
empezar—. Puesto dentro del formulario competía con el selector de modo, que tiene las mismas dos
opciones repetidas, y quedaba a un costado sin relación clara con nada.

Que cerrar no detenga lo lanzado no es un matiz: lo que se empezó vive en la sesión del runtime y no en
este formulario, así que cerrarlo después de arrancar algo no puede leerse como cancelarlo.

#### Scenario: Abrir el flujo para mirar y volver atrás
- **WHEN** se abre el flujo desde la pantalla de inicio y no se quiere empezar nada
- **THEN** se puede cerrar y vuelve la pantalla de inicio

#### Scenario: El modo de explorar también se cierra
- **WHEN** se abre el flujo en su modo de explorar
- **THEN** ofrece la misma salida que el de proponer
