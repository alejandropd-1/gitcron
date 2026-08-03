# repo-watch-lifecycle Specification

## Purpose
TBD - created by archiving change single-repo-watch-subscription. Update Purpose after archive.
## Requirements
### Requirement: Una sola observación por repositorio abierto
La aplicación SHALL mantener una única suscripción a los eventos de cambio del repositorio y un
único temporizador de respaldo, sin importar cuántos componentes usen las funciones de carga y
refresco. Obtener esas funciones SHALL NOT crear observación alguna.

El fundamento es que la observación es un recurso de alcance global —procesos de Git y eventos de
sistema de archivos— mientras que las funciones de refresco son de uso local. Atarlas en el mismo
hook hace que el costo se multiplique por cada consumidor, y ninguno lo pidió.

#### Scenario: Varios componentes usan las funciones de refresco
- **WHEN** varios componentes obtienen las funciones de carga y refresco del repositorio
- **THEN** no se agrega ninguna suscripción a los eventos de cambio ni ningún temporizador por esas
  obtenciones

#### Scenario: Un cambio de archivo con varios consumidores montados
- **WHEN** el sistema de archivos notifica un cambio y hay varios componentes usando las funciones
  de refresco
- **THEN** el estado del árbol se relee una sola vez

### Requirement: Los disparadores de refresco se conservan
La observación única SHALL conservar los mismos disparadores que existían por consumidor: cambio en
el sistema de archivos, commits hechos por la aplicación, foco de ventana, cambio de visibilidad y
temporizador de respaldo. Ningún disparador SHALL perderse al unificar.

#### Scenario: Commit hecho por la aplicación
- **WHEN** la aplicación confirma commits en el repositorio observado
- **THEN** se releen el log, el estado y las ramas, una sola vez cada uno

#### Scenario: Ventana que recupera el foco
- **WHEN** la ventana vuelve a tener foco o pasa a ser visible
- **THEN** el estado del árbol se relee una sola vez

### Requirement: Montaje duplicado declarado en desarrollo
Si la observación se monta más de una vez para el mismo repositorio, la aplicación SHALL declararlo
en la consola durante el desarrollo. La condición SHALL NOT degradar el rendimiento en silencio.

El fundamento es que este defecto ya ocurrió y sólo se detectó por una advertencia genérica del
emisor de eventos, después de que el costo fuera visible para el usuario.

#### Scenario: Segundo montaje de la observación
- **WHEN** un segundo componente monta la observación del mismo repositorio en desarrollo
- **THEN** se declara la condición en consola identificando el hook responsable

### Requirement: Limpieza al cerrar la observación
Al desmontarse, la observación SHALL cancelar su temporizador, quitar sus listeners y pedir el cese
de la vigilancia del repositorio, sin dejar trabajo pendiente que se ejecute después.

#### Scenario: Desmontaje con un refresco pendiente
- **WHEN** la observación se desmonta con un refresco en espera por debounce
- **THEN** ese refresco no se ejecuta y la vigilancia del repositorio queda cerrada

