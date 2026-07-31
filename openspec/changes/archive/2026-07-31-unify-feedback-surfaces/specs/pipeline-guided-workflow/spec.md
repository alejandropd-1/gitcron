## ADDED Requirements

### Requirement: Pipeline no inventa superficies de aviso propias

Los avisos de Pipeline SHALL emitirse por la superficie de notificaciones de la aplicación, y
Pipeline SHALL NOT construir una propia para lo mismo. Una segunda superficie obliga a mirar dos
lugares distintos para enterarse de la misma clase de cosa, y duplica autocierre, cierre manual y
animación que ya están resueltos.

Los avisos de mensaje simple SHALL ajustarse a su contenido, con un tope de ancho. Un aviso de
cuatro palabras no debe ocupar el ancho máximo. Los avisos que presentan acciones SHALL conservar
un ancho estable, porque ahí el ancho sostiene la disposición de los controles.

#### Scenario: Archivado exitoso

- **WHEN** un cambio se archiva con éxito
- **THEN** el aviso aparece en la superficie de notificaciones de la aplicación, nombrando el cambio

#### Scenario: Aviso corto

- **WHEN** el texto de un aviso simple es más angosto que el tope
- **THEN** el aviso ocupa el ancho de su contenido y no el tope

### Requirement: El progreso se percibe donde ocurre

Mientras se relee la evidencia, el progreso SHALL declararse también en el elemento que va a
cambiar, no sólo en un indicador global. Seleccionar un cambio dispara una relectura tras la cual
se completa el ciclo de vida y se habilitan acciones; sin señal en ese mismo lugar, la espera se
lee como que la aplicación no respondió.

#### Scenario: Relectura tras seleccionar un cambio

- **WHEN** hay una relectura de evidencia en curso
- **THEN** el ciclo de vida del cambio declara visualmente que está actualizándose

#### Scenario: Sin relectura

- **WHEN** no hay ninguna relectura en curso
- **THEN** el ciclo de vida se muestra en reposo, sin señal de actividad
