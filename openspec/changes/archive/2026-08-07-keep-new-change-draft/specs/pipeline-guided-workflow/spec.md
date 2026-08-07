## ADDED Requirements

### Requirement: Lo escrito en el flujo de cambio nuevo sobrevive a salir del panel
El panel SHALL conservar el borrador del flujo de cambio nuevo —que esté abierto, el modo, el objetivo, el
slug, las restricciones y las casillas— cuando se sale de Pipeline y se vuelve. El borrador SHALL tener
alcance por repositorio, y SHALL descartarse al cerrar el flujo explícitamente y al arrancar la sesión.

El fundamento es que hoy se pierde entero, y no por decisión sino por cómo están montadas las solapas: en
`components/RepoMainView.tsx` cada solapa es un `return` distinto, así que ir al grafo desmonta
`PipelineWorkspace` y React se lleva todo su estado local. Ale lo encontró yendo a mirar algo a Graph a
mitad de empezar un cambio: al volver la pantalla no estaba y tuvo que rehacerlo.

Salir a mirar otra solapa es para lo que sirven las solapas, no un uso extraño. Y es el mismo principio
que este panel ya sostiene en el aviso de inicialización —atender otra cosa no puede costar el objetivo y
el slug—, agravado porque acá no hay ningún aviso: la pantalla simplemente no está al volver.

El alcance por repositorio existe porque el workspace ya se remonta a propósito al cambiar de repositorio
para no mostrar el snapshot del anterior; un borrador compartido reintroduciría ese defecto, y peor,
apareciendo como si fuera del repositorio nuevo.

Se descarta en esos dos momentos porque son en los que la persona declara que terminó con él. Cambiar de
solapa no lo es.

#### Scenario: Volver a Pipeline después de mirar otra solapa
- **WHEN** se está escribiendo un cambio nuevo, se va a otra solapa y se vuelve a Pipeline
- **THEN** el formulario sigue abierto con el objetivo, el slug y lo demás como estaban

#### Scenario: Otro repositorio
- **WHEN** se vuelve a Pipeline en un repositorio distinto de aquel donde se estaba escribiendo
- **THEN** el formulario no muestra el borrador del otro repositorio

#### Scenario: Cerrar el flujo sin empezar
- **WHEN** se cierra el flujo con la acción de cerrar sin empezar
- **THEN** el borrador se descarta y volver a Pipeline no lo trae de vuelta

#### Scenario: Sesión arrancada
- **WHEN** se arranca la sesión con la instrucción compuesta
- **THEN** el borrador se descarta
