## ADDED Requirements

### Requirement: Empezar un cambio puede crear su rama
Al empezar un cambio con la tarea clara, la aplicación SHALL poder crear la rama `change/<slug>` y dejar
el repositorio parado en ella antes de lanzar la sesión. Esa creación SHALL declararse en el formulario
antes de ocurrir y SHALL poder desactivarse; desactivada, la aplicación SHALL NOT ejecutar ninguna
operación de Git.

Si la rama no se puede crear, la aplicación SHALL informar el motivo real y SHALL NOT lanzar la sesión.
SHALL NOT cambiarse a una rama existente con ese nombre por su cuenta.

El fundamento es que un archivo de código no se puede atribuir a un cambio: ese dato no existe en el
repositorio, y por eso el panel de preparación sólo puede declarar de qué tipo es cada archivo sin cambio
que lo reclame. Una rama por cambio resuelve la atribución con el mecanismo propio de Git, sin inventar
registro alguno.

Que se declare y se pueda desactivar responde a que es una escritura de Git, y en este proyecto las
escrituras nuevas se autorizan explícitamente. Que un fallo detenga el arranque responde a que la persona
acaba de leer que se iba a trabajar en `change/<slug>`: arrancar en otra rama sería divergencia entre lo
declarado y lo ejecutado. Que no se reutilice una rama existente responde a que arrastraría los commits de
un trabajo anterior, que es una decisión con consecuencias y no algo que corresponda adivinar.

#### Scenario: Cambio nuevo con la rama activada
- **WHEN** se empieza un cambio con la tarea clara y la creación de la rama está activada
- **THEN** se crea `change/<slug>`, el repositorio queda parado en ella, y recién entonces se lanza la
  sesión

#### Scenario: Creación de la rama desactivada
- **WHEN** se empieza un cambio con la creación de la rama desactivada
- **THEN** la sesión se lanza sin que se ejecute ninguna operación de Git

#### Scenario: La rama no se puede crear
- **WHEN** la creación de la rama falla, por existir ya o por cualquier otro motivo
- **THEN** se informa el motivo real y la sesión no se lanza
