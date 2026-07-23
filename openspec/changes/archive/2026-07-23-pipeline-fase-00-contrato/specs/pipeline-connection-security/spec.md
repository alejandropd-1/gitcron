## ADDED Requirements

### Requirement: Selección de transporte por fuente
Pipeline SHALL preferir protocolo estructurado/versionado, luego ACP, luego CLI JSON/JSONL y finalmente hooks/filesystem como degradación. Hermes SHALL NOT ser transporte obligatorio para sesiones directas.

#### Scenario: Codex directo
- **WHEN** una sesión Codex expone JSONL o app-server sin Hermes
- **THEN** el adaptador directo normaliza sus eventos bajo el mismo contrato

### Requirement: Auth y scoping main-only
Conexiones, tokens, sockets y procesos SHALL vivir en Electron main. Cada sesión/control SHALL vincularse explícitamente a repo/run/session y el renderer SHALL recibir sólo DTOs sanitizados y métodos allowlisted.

#### Scenario: Token de companion local
- **WHEN** GitCron conecta a un servicio loopback
- **THEN** usa autenticación explícita almacenada con safeStorage y nunca expone el secreto al renderer o logs

#### Scenario: Backend local sin auth nativa
- **WHEN** un backend loopback no ofrece autenticación comprobada
- **THEN** main interpone un wrapper autenticado o marca la integración degraded sin exponer el socket al renderer

### Requirement: Version negotiation y degradación
El handshake SHALL negociar rango de protocolo y capabilities. Una incompatibilidad major SHALL deshabilitar controles y conservar evidencia local disponible.

#### Scenario: Runtime más nuevo incompatible
- **WHEN** no existe versión de protocolo común
- **THEN** Pipeline muestra conexión incompatible, no envía comandos y sigue mostrando Git/OpenSpec/filesystem

### Requirement: Reconexión, backpressure y ownership
El connector SHALL aplicar backoff con jitter, dedupe, límites de stream y batching. Sólo SHALL controlar procesos registrados como creados por GitCron.

#### Scenario: Kill sobre proceso externo
- **WHEN** una sesión observada pertenece a un proceso que GitCron no creó
- **THEN** `kill` queda unavailable aunque exista un PID observable

### Requirement: Gate base previo a código Pipeline
El repositorio SHALL versionar instrucciones agnósticas, constitución/perfil y un gate determinístico
antes de iniciar escrituras de producto F01. Un estado rojo o pendiente SHALL NOT presentarse verde.

#### Scenario: Gobernanza modificada localmente
- **WHEN** un agente cambia AGENTS, gate, constitución o perfil sin commit humano
- **THEN** el gate fast queda rojo y F01 no inicia escrituras de producto
