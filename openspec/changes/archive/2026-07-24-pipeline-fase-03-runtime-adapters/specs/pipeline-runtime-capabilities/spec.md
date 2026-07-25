## ADDED Requirements

### Requirement: Capabilities negociadas por instancia y sesión
F03 SHALL resolver capabilities desde runtime, versión, transporte y sesión observados; SHALL NOT derivarlas únicamente del nombre comercial del runtime.

#### Scenario: Nueva versión con schema desconocido
- **WHEN** discovery encuentra una versión sin fixture compatible
- **THEN** la instancia queda degradada o `pending_fixture` aunque otra versión del mismo runtime esté verificada

### Requirement: Coherencia entre anuncio y efecto
Una capability SHALL ser `available` sólo cuando exista método implementado y evidencia compatible; interfaz anunciada sin efecto probado SHALL conservar `pending_fixture`.

#### Scenario: Resume anunciado por help
- **WHEN** el CLI lista resume pero la suite no contiene fixture de efecto
- **THEN** Pipeline conserva evidencia de interfaz y no afirma resume end-to-end
