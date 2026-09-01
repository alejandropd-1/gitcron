## ADDED Requirements

### Requirement: Un detector SHALL entregar candidatos en una forma fija

Un detector de migración SHALL devolver cada candidato como `{ archivo, linea, texto, ancla,
sugerencia? }`, y SHALL declarar en su propio archivo qué recorre y qué no alcanza a ver.

`ancla` es el fragmento de texto que el ejecutor va a buscar para ubicar la edición. `sugerencia`
es lo único específico de la tarea: para i18n, la clave del diccionario que ya contiene ese texto;
para color, el token de la paleta. Las piezas que consumen la lista NO SHALL conocer el dominio.

El fundamento es medido: el detector de i18n se corrigió ocho veces entre el 2026-08-30 y el
2026-08-31, y las correcciones caras fueron siempre las de omisión, no las de exceso. Contaba
`fontSize: 'var(--font-size-md)'` como texto —1018 de sus primeros 1093 hallazgos eran valores
CSS— y a la vez no veía el texto que no empieza con `>` y termina con `<` en la misma línea, que en
JSX multilínea es casi todo.

#### Scenario: El detector no alcanza a ver una familia de casos
- **WHEN** un detector no puede reconocer una forma de aparición
- **THEN** lo declara en su cabecera, y el número que informa se lee como piso y no como total

#### Scenario: Un candidato ya tiene solución en el proyecto
- **WHEN** el texto de un candidato coincide exactamente con un valor ya presente en el destino
- **THEN** el detector emite esa referencia como `sugerencia`, sin pedir ninguna decisión

### Requirement: El detector SHALL preferir el falso positivo a la omisión

Un detector SHALL diseñarse permisivo. Un candidato dudoso SHALL emitirse y resolverse una sola vez
en la línea de base como exento, con su motivo escrito.

Un falso positivo cuesta una línea declarada. Un caso omitido cuesta una migración que se cree
completa y no lo está.

#### Scenario: Un candidato resulta no ser deuda
- **WHEN** un candidato se declara exento con su motivo
- **THEN** no vuelve a aparecer, y el motivo queda disponible para quien audite después

### Requirement: El prompt generado NO SHALL pedir inventario

Un prompt emitido para un ejecutor NO SHALL contener consignas de la forma «enumerá todos los que
queden», «revisá si hay otros», «listá lo que falta» ni «verificá que no quedó nada». La detección
de lo que resta SHALL ser trabajo del auditor.

El caso real: la tanda `i18n-4` del 2026-08-31 pidió enumerar el texto suelto que quedaba en tres
archivos. Eso obligó al ejecutor a leer archivos enteros —uno de 3.836 líneas— y disparó la
compactación del cliente a mitad de tanda. Como grep en el auditor, la misma comprobación es
exhaustiva, determinística y no consume contexto de nadie.

#### Scenario: Se necesita saber qué quedó pendiente
- **WHEN** hace falta el inventario de lo que resta después de una tanda
- **THEN** lo produce el auditor recorriendo el árbol, y nunca el ejecutor leyendo archivos

### Requirement: El prompt generado SHALL cerrar el trabajo antes de emitirlo

Un prompt SHALL dar la ubicación por ancla o por rango de líneas, y NO SHALL pedir que el ejecutor
busque. SHALL declarar un presupuesto de lectura en números. SHALL contener una sola clase de
trabajo. SHALL declarar un criterio de terminación contable. NO SHALL trasladar ninguna decisión ya
tomada. Y NO SHALL pedir que se ejecute ningún comando.

Un ancla que aparece más de una vez SHALL declararse con su número de apariciones en el propio
prompt. El presupuesto de lectura importa incluso con ventana amplia: sin él, un modelo con espacio
lee de más justamente porque le entra.

#### Scenario: Un ancla no es única
- **WHEN** el mismo texto ancla aparece más de una vez en su archivo
- **THEN** el prompt lo dice y declara cuántas veces, para que no se lea como error

#### Scenario: El ejecutor necesita saber que terminó
- **WHEN** el ejecutor completa las ediciones
- **THEN** puede confirmarlo contando, sin releer los archivos que tocó

### Requirement: Un validador SHALL revisar el prompt antes de que salga

Un prompt generado SHALL pasar por un validador que comprueba, sin criterio humano, que no pide
inventario, que sus anclas existen y son únicas o declaran su multiplicidad, que trae presupuesto
de lectura, que su criterio de terminación es contable, que no pide correr comandos, y que no
traslada decisiones ya tomadas.

Esta pieza es la que retira a la sesión que orquesta del bucle. Sin ella, cada tanda necesita que
alguien lea el prompt a mano y el método no escala.

#### Scenario: Un prompt incumple una regla
- **WHEN** el validador encuentra un incumplimiento
- **THEN** el prompt no se emite, y el validador informa qué regla y dónde

### Requirement: El auditor SHALL distinguir el fallo del hallazgo

Un auditor de tanda SHALL devolver uno de tres estados. `OK` cuando la tanda hizo lo esperado.
`FALLO` cuando el ejecutor hizo algo prohibido o quedó incompleto. `HALLAZGO` cuando apareció algo
que la línea de base no contemplaba.

`HALLAZGO` NO SHALL cortar la corrida: se encola y queda para revisar al final. Con sólo dos
estados, cualquier sorpresa se presenta como falla y traba la cadena a mitad de camino.

Es la misma forma que los prompts ya le dan al ejecutor con «si aparece alguno MÁS, PARÁ y
reportá»: una manera de señalar lo imprevisto sin romper nada.

#### Scenario: Aparece un caso fuera de la línea de base
- **WHEN** el auditor encuentra algo que la línea de base no declaraba
- **THEN** devuelve `HALLAZGO`, lo encola, y el bucle sigue con la tanda siguiente

#### Scenario: El ejecutor tocó algo prohibido
- **WHEN** el auditor detecta un archivo fuera de alcance o una comprobación ablandada
- **THEN** devuelve `FALLO` y el bucle para

### Requirement: La deuda de i18n SHALL medirse con una prueba, no con un script

El proyecto SHALL tener una prueba con línea de base que falle cuando aparezca una string de
interfaz fuera de `lib/i18n.ts` que la línea de base no declare, del mismo modo que
`visual-scale-scan` y `ui-color-scan`.

Un script hay que acordarse de correrlo; una prueba corre sola y falla el build. La línea de base
que sólo puede bajar es un trinquete: es lo que llevó a cero la paleta de color y la escala
tipográfica.

#### Scenario: Entra una string nueva sin pasar por el diccionario
- **WHEN** un componente incorpora texto de interfaz escrito a mano
- **THEN** la suite falla nombrando el archivo, la línea y el texto

#### Scenario: Se salda una string declarada en la línea de base
- **WHEN** una entrada de la línea de base deja de aparecer en el código
- **THEN** la suite falla pidiendo la poda, para que el número no quede inflado
