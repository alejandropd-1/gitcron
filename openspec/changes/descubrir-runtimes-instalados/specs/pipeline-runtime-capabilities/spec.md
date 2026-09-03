# pipeline-runtime-capabilities

## MODIFIED Requirements

### Requirement: Lanzabilidad basada en instalación, no en fixture
Un runtime SHALL ser lanzable cuando el adaptador lo declara lanzable y el binario está instalado.
La coincidencia exacta de versión con un fixture auditado SHALL NOT ser condición de lanzamiento.
`evidenceStatus` SHALL ser un metadato informativo que la UI muestra; SHALL NOT bloquear el
arranque. La resolución del ejecutable SHALL declarar con qué entorno se hizo, y un runtime que el
sistema tiene instalado pero la aplicación no resuelve SHALL aparecer con el motivo medido en vez
de omitirse.

#### Scenario: Versión instalada distinta de la de referencia
- **WHEN** discovery encuentra un runtime instalado cuya versión difiere de cualquier referencia previa
- **THEN** el runtime es lanzable y la UI muestra que no está verificado, en vez de negar el arranque

#### Scenario: Runtime verificado
- **WHEN** la versión instalada coincide con una referencia verificada
- **THEN** el runtime es lanzable y se muestra como verificado

#### Scenario: Adaptador sin `start()`
- **WHEN** un adaptador no implementa `start()` o se declara no lanzable
- **THEN** el runtime no es lanzable y se lista con su motivo, sin depender de la versión

#### Scenario: Instalado en el sistema pero no resuelto por la aplicación
- **WHEN** un runtime cuyo adaptador se declara lanzable está instalado y es invocable fuera de la aplicación, y el descubrimiento de la aplicación no lo resuelve
- **THEN** el runtime aparece en la superficie de arranque con el motivo por el que no se pudo resolver, y no se omite de la lista
