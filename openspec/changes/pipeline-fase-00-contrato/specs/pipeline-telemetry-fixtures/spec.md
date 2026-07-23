## ADDED Requirements

### Requirement: Fixture real sanitizado o procedimiento exacto
Cada capability de runtime SHALL tener un fixture sanitizado capturado sin costo adicional o un procedimiento reproducible marcado `pending_fixture`/`blocked` con motivo.

#### Scenario: Captura requiere inferencia de costo ambiguo
- **WHEN** una captura necesita una inferencia cloud cuya facturación no puede confirmarse
- **THEN** F00 documenta comandos, redacción y resultado esperado sin ejecutar la inferencia

### Requirement: Productores JSONL verificados
Los schemas de gates, delegaciones y alturas visuales SHALL derivarse de los productores actuales y SHALL registrar diferencias entre template y script materializado.

#### Scenario: Delegation template más nuevo
- **WHEN** el template incluye resultado, reintentos y espera humana pero el script materializado no
- **THEN** esos campos se conservan opcionales y la variante queda identificada por productor/evidencia

### Requirement: Lector tolerante y seguro
El futuro lector SHALL tolerar última línea incompleta, líneas inválidas aisladas, truncado/reemplazo y opcionales ausentes sin perder las líneas válidas. SHALL sanitizar antes de persistir o mostrar.

#### Scenario: JSONL parcialmente corrupto
- **WHEN** una línea intermedia es inválida y las siguientes son válidas
- **THEN** se emite evidencia degradada por la línea inválida y se continúan procesando las válidas
