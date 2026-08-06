## ADDED Requirements

### Requirement: Un control no desplaza a los demás al cambiar
Un control que alterna su texto o su cuenta SHALL reservar el espacio de su variante más larga, y SHALL
NOT desplazar a los elementos que tiene al lado al cambiar. Las cuentas SHALL alinearse por columna
para que un dígito más no corra el texto.

El fundamento es que tildar una casilla mueve hoy el título del panel y su descripción: «Sumar todos»
pasa a «Quitar todos» y «Elegidos: 0 de 5» pasa a «5 de 5», y las dos cosas arrastran a lo que tienen
alrededor. Una interfaz que se reacomoda cuando la acción no cambió de lugar obliga a volver a buscar
lo que se estaba mirando, y hace dudar de si se apretó lo que se quería.

#### Scenario: Elegir archivos en el panel de preparación
- **WHEN** se tildan archivos y los controles cambian de texto y de cuenta
- **THEN** el resto del encabezado del panel no se desplaza

#### Scenario: Cuenta que crece de un dígito a dos
- **WHEN** una cuenta pasa de una cifra a dos
- **THEN** el texto que la acompaña no se corre

### Requirement: El contenido de los artefactos se lee con ritmo
El texto de los artefactos SHALL presentarse con interlineado y separación entre bloques suficientes
para leer un documento largo, y la separación SHALL distinguir un encabezado de un párrafo en vez de
tratar todos los bloques por igual.

El fundamento es que `proposal.md` y `design.md` son documentos de prosa densa y largos, y el ritmo
tipográfico del panel se heredó de cuando mostraba fragmentos cortos: con todos los bloques a la misma
distancia no hay dónde descansar la vista ni cómo reconocer la estructura sin leerla.

#### Scenario: Documento largo en un artefacto
- **WHEN** se abre una propuesta o un diseño extensos
- **THEN** sus párrafos y encabezados se distinguen por su separación, no sólo por su tamaño

### Requirement: El estado del repositorio se lee en una línea
El control del encabezado que abre la preparación SHALL presentarse en una sola línea, sin marco propio
que lo separe de la barra que lo contiene, y SHALL declarar la rama de destino con el mismo tratamiento
que recibe dentro del panel de preparación. La acción SHALL conservar su forma de control.

El fundamento es que ese control hace una sola cosa y estaba maquetado como tres —rótulo, dato
secundario y pastilla, dentro de una caja sobre otra caja—. La rama es el destino del commit, el mismo
dato que el panel de preparación declara al lado del mensaje: mostrarlo igual en los dos lugares evita
que se lea como dos cosas distintas.

#### Scenario: Encabezado del panel
- **WHEN** el panel muestra el estado del repositorio y su acción de preparar
- **THEN** se leen en una sola línea y la rama se distingue del resto del texto

#### Scenario: La rama en los dos lugares
- **WHEN** la rama se declara en el encabezado y en el panel de preparación
- **THEN** recibe el mismo tratamiento visual en ambos
