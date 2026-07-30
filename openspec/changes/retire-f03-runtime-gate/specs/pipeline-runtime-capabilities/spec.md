## MODIFIED Requirements

### Requirement: Lanzabilidad basada en instalación, no en fixture
Un runtime SHALL ser lanzable cuando el adaptador lo declara lanzable y el binario está instalado. La coincidencia exacta de versión con un fixture auditado SHALL NOT ser condición de lanzamiento. `evidenceStatus` SHALL ser un metadato informativo que la UI muestra; SHALL NOT bloquear el arranque.

#### Scenario: Versión instalada distinta de la de referencia
- **WHEN** discovery encuentra un runtime instalado cuya versión difiere de cualquier referencia previa
- **THEN** el runtime es lanzable y la UI muestra que no está verificado, en vez de negar el arranque

#### Scenario: Runtime verificado
- **WHEN** la versión instalada coincide con una referencia verificada
- **THEN** el runtime es lanzable y se muestra como verificado

#### Scenario: Adaptador sin `start()`
- **WHEN** un adaptador no implementa `start()` o se declara no lanzable
- **THEN** el runtime no es lanzable y se lista con su motivo, sin depender de la versión

### Requirement: `evidenceStatus` informativo y honesto
Una capability SHALL conservar `evidenceStatus` como metadato que refleja si existe evidencia respaldadora. Sin fixture o referencia que la respalde, SHALL declararse `pending_fixture`; SHALL NEVER declararse `verified` sin evidencia. Este estado SHALL mostrarse al usuario sin impedir el lanzamiento.

#### Scenario: Capability sin evidencia respaldadora
- **WHEN** los `evidenceRefs` de una capability apuntaban a un fixture retirado
- **THEN** la capability se declara `pending_fixture` y el runtime sigue siendo lanzable

#### Scenario: Capability con evidencia respaldadora
- **WHEN** existe referencia verificada para la capability
- **THEN** se declara `verified` y el runtime es lanzable
