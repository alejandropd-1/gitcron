# pipeline-guided-workflow

## MODIFIED Requirements

### Requirement: Un control no desplaza a los demás al cambiar
Un control que alterna su texto o su cuenta SHALL reservar el espacio de su variante más larga, y SHALL
NOT desplazar a los elementos que tiene al lado al cambiar. Las cuentas SHALL alinearse por columna
para que un dígito más no corra el texto.

Ninguna superficie que se abra, se despliegue o cambie de tamaño SHALL desplazar fuera de vista lo que
la persona estaba mirando. Una superficie que necesite más lugar del que tiene SHALL ocupar el suyo
propio —una capa, un panel, otra pantalla del cuerpo— en vez de empujar a las que tiene debajo.

El fundamento es que tildar una casilla mueve hoy el título del panel y su descripción: «Sumar todos»
pasa a «Quitar todos» y «Elegidos: 0 de 5» pasa a «5 de 5», y las dos cosas arrastran a lo que tienen
alrededor. Una interfaz que se reacomoda cuando la acción no cambió de lugar obliga a volver a buscar
lo que se estaba mirando, y hace dudar de si se apretó lo que se quería. El mismo daño lo hace una
sección que se despliega y corre a la de abajo: medido el 2026-09-04, abrir el formulario de empezar
un cambio empujaba la lista de cambios en curso fuera de la pantalla.

#### Scenario: Elegir archivos en el panel de preparación
- **WHEN** se tildan archivos y los controles cambian de texto y de cuenta
- **THEN** el resto del encabezado del panel no se desplaza

#### Scenario: Cuenta que crece de un dígito a dos
- **WHEN** una cuenta pasa de una cifra a dos
- **THEN** el texto que la acompaña no se corre

#### Scenario: Una superficie se abre pidiendo lugar
- **WHEN** se abre un formulario, un detalle o un panel dentro del cuerpo del ciclo
- **THEN** lo que se estaba mirando sigue a la vista, y la superficie nueva ocupa un lugar propio en vez de empujar a las de abajo

## ADDED Requirements

### Requirement: El cuerpo muestra lo que sirve al objetivo del momento
El cuerpo de la vista del ciclo SHALL presentar las superficies que sirven a lo que la persona está
haciendo, y SHALL NOT mostrarlas todas siempre. Una superficie que no aporta al objetivo del momento
SHALL quedar disponible sin ocupar lugar, y SHALL NOT resolverse relegándola al final de un
desplazamiento.

Cada superficie SHALL declarar la condición por la que aparece, y esa condición SHALL derivarse de
evidencia observada —hay una sesión, hay diffs, hay tareas sin completar— y no de una preferencia
guardada ni de un supuesto sobre lo que la persona querría.

El fundamento está medido: al 2026-09-04 el cuerpo mostraba tareas, evidencia y actividad en una sola
columna, siempre las tres, y «Actividad» quedaba al final del desplazamiento fuera de la vista
mientras estaba vacía el cien por ciento del tiempo, porque su fuente son sesiones lanzadas desde la
aplicación y en este proyecto los ejecutores se lanzan desde afuera. Mostrar algo vacío tiene el
mismo costo de espacio que mostrar algo útil, y desplaza a lo que sí lo es.

#### Scenario: Superficie sin nada que aportar
- **WHEN** una superficie del cuerpo no tiene contenido observado que mostrar
- **THEN** no ocupa lugar en el cuerpo, y sigue siendo alcanzable si se la pide

#### Scenario: Superficie que pasa a tener contenido
- **WHEN** aparece evidencia que esa superficie muestra
- **THEN** la superficie queda disponible declarando qué la habilitó

#### Scenario: Condición derivada, no supuesta
- **WHEN** se decide si una superficie aparece
- **THEN** la decisión se toma sobre evidencia observada y no sobre una preferencia guardada
