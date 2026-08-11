## ADDED Requirements

### Requirement: El estado de Git se observa por evento

La observación SHALL incluir los caminos de `.git/` que declaran un cambio de estado del repositorio,
de modo que preparar archivos, cambiar de rama, iniciar un merge o un rebase y confirmar desde fuera de
la aplicación produzcan un evento en lugar de esperar al temporizador de respaldo.

Hoy `.git/` se ignora entero y esas operaciones son invisibles para el sistema de archivos: la única
forma de enterarse es que el temporizador corra `git status`. Eso convierte al respaldo en la fuente
principal, que es lo contrario de lo que declara ser, e impide espaciarlo sin degradar la aplicación.

Los caminos son una lista cerrada y no el directorio completo: Git escribe en `.git/` con muchísima
frecuencia —objetos, registros de referencias, archivos de bloqueo— y casi nada de eso cambia lo que la
aplicación muestra. Observar todo sería cambiar un costo por otro.

#### Scenario: Archivos preparados desde fuera de la aplicación

- **WHEN** alguien corre `git add` en una terminal sobre el repositorio observado
- **THEN** el sistema de archivos notifica un cambio y el estado del árbol se relee sin esperar al
  temporizador de respaldo

#### Scenario: Cambio de rama desde fuera de la aplicación

- **WHEN** alguien corre `git checkout` sobre el repositorio observado
- **THEN** el sistema de archivos notifica un cambio y la rama vigente se relee

#### Scenario: Un merge que deja conflictos

- **WHEN** un merge iniciado fuera de la aplicación deja el repositorio con conflictos
- **THEN** el sistema de archivos notifica un cambio y el estado refleja el merge en curso

#### Scenario: Escritura interna de Git que no cambia el estado

- **WHEN** Git escribe objetos, registros de referencias o archivos de bloqueo dentro de `.git/`
- **THEN** esa escritura no produce por sí sola una relectura del estado

### Requirement: Una relectura redundante no paga el costo completo

El sistema SHALL comprobar con una operación barata si hubo un cambio efectivo antes de releer el
estado completo del repositorio, de modo que un disparo redundante no ejecute `git status`.

Medido sobre este repositorio, `git status --porcelain` tiene una mediana de 42 ms. Con el temporizador
cada 2 segundos y la ventana enfocada, eso son unos 76 segundos de CPU por hora dedicados a preguntar
por algo que la mayoría de las veces no cambió.

#### Scenario: Disparo sin ningún cambio desde la lectura anterior

- **WHEN** el temporizador de respaldo dispara y nada cambió desde la última lectura
- **THEN** no se ejecuta la lectura completa del estado

#### Scenario: Disparo con un cambio real

- **WHEN** el temporizador de respaldo dispara y hubo un cambio desde la última lectura
- **THEN** el estado se relee completo

### Requirement: El temporizador de respaldo ajusta su cadencia

El temporizador SHALL espaciar sus disparos cuando el repositorio lleva tiempo sin actividad, y volver a
una cadencia frecuente cuando la hay, en lugar de disparar siempre al mismo intervalo.

Con el estado de Git ya observado por evento, el temporizador deja de ser la fuente principal y pasa a
cubrir lo que el sistema de archivos no informó —Windows, algunos editores y los guardados atómicos
pierden eventos de verdad—. Un respaldo no necesita la misma frecuencia que una fuente.

El temporizador no se elimina: cambiar un costo medible por un fallo silencioso sería peor, porque lo
que no se detecta no se nota hasta que alguien confirma un commit con la lista de archivos vieja.

#### Scenario: Repositorio sin actividad reciente

- **WHEN** el repositorio observado no registra cambios durante un período prolongado
- **THEN** el temporizador de respaldo dispara con menor frecuencia que inmediatamente después de un
  cambio

#### Scenario: Actividad después de un período quieto

- **WHEN** se detecta un cambio en un repositorio que estaba quieto
- **THEN** el temporizador vuelve a su cadencia frecuente

#### Scenario: La ventana deja de estar enfocada

- **WHEN** la ventana de la aplicación pierde el foco o deja de estar visible
- **THEN** el temporizador de respaldo no ejecuta ninguna lectura del estado
