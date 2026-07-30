## MODIFIED Requirements

### Requirement: Selección de transporte por fuente
Pipeline SHALL preferir protocolo estructurado/versionado, luego ACP, luego CLI JSON/JSONL y finalmente hooks/filesystem como degradación. Pipeline SHALL NOT depender de un gateway orquestador para abrir sesiones directas, y SHALL NOT exponer estado de conexión con uno.

#### Scenario: Codex directo
- **WHEN** una sesión Codex expone JSONL o app-server
- **THEN** el adaptador directo normaliza sus eventos bajo el mismo contrato, sin intermediarios

#### Scenario: Sin estado de gateway en el renderer
- **WHEN** el renderer recibe un snapshot de Pipeline
- **THEN** no contiene ningún campo que declare conexión o desconexión con un orquestador externo
