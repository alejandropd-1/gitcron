## MODIFIED Requirements

### Requirement: Adaptadores sin citas a fixtures retirados
Los adaptadores SHALL NOT citar `evidenceRefs` que apunten a archivos retirados del repositorio. Una capability cuyo único respaldo era un fixture retirado SHALL declararse `pending_fixture` y SHALL seguir siendo lanzable. La detección de versión instalada SHALL continuar para reportar `runtimeVersion`, pero SHALL NOT decidir lanzabilidad ni `evidenceStatus`.

#### Scenario: Adaptador de runtime estructurado tras el retiro
- **WHEN** el adaptador detecta un runtime instalado cuya versión ya no tiene fixture
- **THEN** reporta la versión instalada, declara sus capabilities `pending_fixture` y el runtime es lanzable

#### Scenario: Adaptador sin stream estructurado
- **WHEN** un adaptador (p. ej. `agy`) no expone stream estructurado
- **THEN** se declara no lanzable por diseño, se lista con su motivo, y no se le exige fixture
