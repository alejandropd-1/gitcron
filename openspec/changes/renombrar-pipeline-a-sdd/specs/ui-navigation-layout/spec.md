## MODIFIED Requirements

### Requirement: La navegación entre vistas SHALL presentarse como un desplegable encabezado por la vista activa

La navegación SHALL mostrar la vista actual como encabezado del panel lateral y SHALL desplegar las
demás al activarse; al elegir una, el encabezado SHALL pasar a nombrarla. SHALL cumplir el
comportamiento de teclado que rige para todo desplegable de la aplicación.

La vista del ciclo de especificación SHALL nombrarse `SDD` en toda superficie donde la persona lea
su nombre, y esa sigla SHALL NOT traducirse: se lee igual en los tres idiomas. El nombre que la
persona lee SHALL poder diferir del identificador que el código usa para esa misma vista.

El fundamento es que cuatro filas permanentes ocupan altura para una decisión que se toma de a una
por vez y que cambia pocas veces por sesión, mientras la lista de ramas —que se recorre
continuamente— compite por ese mismo espacio. El encabezado que nombra la vista activa cumple además
una segunda función: declara dónde se está, que hoy sólo se deduce de cuál pestaña está resaltada.

Y si declara dónde se está, tiene que decirlo bien. «Pipeline» viene de la integración continua,
donde una tubería encadena etapas automáticas de compilación y despliegue; lo que la vista muestra
es el ciclo de proponer un cambio, especificarlo, implementarlo y archivarlo. En chino el nombre
llegó a leerse `流水线`, «línea de producción», que agrava el mismo malentendido. La sigla queda sin
traducir porque nombra la práctica del oficio, como ya ocurre con «Commit» y «Stash».

La divergencia entre el nombre leído y el interno queda declarada a propósito: las claves de
traducción, las capacidades y los componentes siguen diciendo `pipeline`, porque renombrarlos
arrastraría los deltas, los tests y la historia de archivo de doce capacidades sin que nadie note la
diferencia en pantalla.

Las vistas SHALL seguir siendo alcanzables por atajo de teclado sin abrir el desplegable, como ya lo
son hoy.

#### Scenario: Cambio de vista
- **WHEN** se elige otra vista en el desplegable
- **THEN** el contenido cambia y el encabezado pasa a nombrar la vista elegida

#### Scenario: Atajo de teclado
- **WHEN** se usa el atajo de una vista sin abrir el desplegable
- **THEN** la vista cambia igual y el encabezado la refleja

#### Scenario: Nombre de la vista del ciclo de especificación
- **WHEN** se muestra el nombre de esa vista en cualquier superficie y en cualquiera de los tres idiomas
- **THEN** dice SDD, y no dice Pipeline ni su traducción

#### Scenario: Identificador interno
- **WHEN** el código nombra esa vista en una clave de traducción, una capacidad o un componente
- **THEN** puede seguir diciendo pipeline, porque ese nombre no llega a pantalla
