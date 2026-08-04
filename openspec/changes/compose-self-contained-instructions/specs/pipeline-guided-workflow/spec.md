## ADDED Requirements

### Requirement: La instrucción no depende de comandos instalados en el runtime
La instrucción que la guía entrega a un runtime SHALL ser autosuficiente: SHALL NOT requerir que ese
runtime tenga instalado ningún comando propio de una extensión. SHALL nombrar la acción a realizar y
los comandos del CLI de OpenSpec que la respaldan, de modo que cualquier ejecutor pueda cumplirla.

El fundamento es que los comandos de extensión se instalan por runtime y su ausencia no se anuncia:
un ejecutor que no los tiene responde que no conoce el comando y termina sin hacer nada. Ya ocurrió
con el archivado, donde la sesión cerraba en milisegundos y la aplicación declaraba éxito. Delegar
en el runtime un conocimiento que la guía puede expresar convierte una diferencia de instalación en
una acción que no ocurre.

#### Scenario: Runtime sin los comandos de la extensión
- **WHEN** se lanza una sesión con un runtime que no tiene instalados los comandos de OpenSpec
- **THEN** la instrucción alcanza para realizar la acción, porque nombra los comandos del CLI en vez
  de invocar uno de la extensión

#### Scenario: Runtime que sí los tiene
- **WHEN** se lanza una sesión con un runtime que sí los tiene instalados
- **THEN** la instrucción sigue siendo válida y describe el mismo trabajo

### Requirement: La instrucción declara el cambio y la tarea sobre los que se trabaja
Toda instrucción de implementación SHALL nombrar el cambio y la tarea concretos, y SHALL incluir el
texto de esa tarea. Una instrucción que sólo nombre el cambio SHALL NOT considerarse suficiente.

El fundamento es que sin la tarea explícita el ejecutor elige por su cuenta cuál seguir, y la guía
pierde la correspondencia entre lo que ofreció y lo que se hizo.

#### Scenario: Continuar una tarea concreta
- **WHEN** la guía ofrece continuar una tarea y se lanza la sesión
- **THEN** la instrucción nombra el cambio, el identificador de la tarea y su texto
