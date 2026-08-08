## ADDED Requirements

### Requirement: El mensaje sugerido declara de dónde salió
El panel SHALL declarar, junto al campo del mensaje, de qué se derivó la sugerencia que muestra. SHALL NOT
presentar como propia una descripción que declaró un ejecutor.

El fundamento es que hoy la sugerencia es trivial —el identificador del cambio, derivado de rutas y de la
rama— y no necesita explicación. En cuanto afirme **qué se hizo**, pasa a afirmar algo que la aplicación
no verificó, y quien confirma en Git tiene que poder ver que eso lo dijo un agente. Es el mismo criterio
por el que la atribución de archivos lleva su fuente: una afirmación que parece verificada sin serlo es
peor que ninguna.

#### Scenario: Sugerencia derivada de la evidencia del repositorio
- **WHEN** la sugerencia sale de las rutas o de la rama
- **THEN** el panel declara esa procedencia junto al campo

#### Scenario: Descripción declarada por un ejecutor
- **WHEN** la sugerencia incluye una descripción que declaró la sesión de un ejecutor
- **THEN** el panel lo declara como tal, y no como una afirmación de la aplicación

#### Scenario: Sin nada que sugerir
- **WHEN** ninguna fuente aporta descripción
- **THEN** el campo queda con el prefijo y sin descripción, para que la escriba una persona

### Requirement: La sugerencia no decide el commit
El mensaje sugerido SHALL ser editable y SHALL NOT pisar lo que una persona haya escrito. Sugerir SHALL
NOT confirmar.

El fundamento es que el mensaje es la parte del commit que sólo una persona puede responder por, y una
sugerencia que se impone convierte en automático lo que este panel mantiene deliberadamente manual.
Preparar no confirma, y hay una prueba que falla si alguien mete el commit en la preparación.

#### Scenario: Mensaje ya escrito
- **WHEN** hay un mensaje escrito y aparece una sugerencia nueva
- **THEN** lo escrito se conserva

#### Scenario: Sugerencia presente
- **WHEN** el panel muestra una sugerencia
- **THEN** no se confirma ningún commit por mostrarla
