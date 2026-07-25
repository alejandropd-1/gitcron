## ADDED Requirements

### Requirement: Fixture identificado por runtime y versión
Cada parser F03 SHALL estar respaldado por un fixture sanitizado que registre runtime, versión, transporte, estado de evidencia y procedimiento de captura.

#### Scenario: Sólo existe evidencia de interfaz
- **WHEN** el CLI anuncia JSON pero no existe una captura real sanitizada
- **THEN** el fixture queda `pending_fixture` y no autoriza un parser específico de payload

### Requirement: Fixtures sin contenido sensible
Los fixtures SHALL omitir o reemplazar secrets, paths de usuario, prompts, respuestas privadas, session IDs y reasoning crudo antes de versionarse.

#### Scenario: Campo de autorización inesperado
- **WHEN** una captura contiene un header o key sensible
- **THEN** el valor se reemplaza por marcador de redacción y la suite verifica que el original no persiste

### Requirement: Matriz de degradación ejecutable
F03 SHALL mantener una tabla machine-readable que relacione adapter, versión, transporte, fixture y estado de cada capability relevante.

#### Scenario: Runtime ausente
- **WHEN** discovery no encuentra un ejecutable soportado
- **THEN** health informa unavailable y el resto de Pipeline continúa con evidencia local y otros adapters
