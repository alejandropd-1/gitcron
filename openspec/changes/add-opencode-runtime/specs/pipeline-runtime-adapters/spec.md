## MODIFIED Requirements

### Requirement: Factory de adaptador con ejecutable resuelto por el hub
El hub SHALL poder pasar un `executable` resuelto al factory del adaptador cuando el adaptador lo requiera. Los adaptadores que resuelven su propio binario internamente (claude, codex, agy) SHALL ignorar el parámetro. Un adaptador cuyo binario pueda variar (opencode) SHALL recibir el ejecutable del hub en vez de hardcodearlo.

#### Scenario: OpenCode registrado como lanzable
- **WHEN** el hub construye los adaptadores para discovery
- **THEN** OpenCode aparece con `launchable: true` cuando el binario `opencode` está instalado y su handshake ACP responde

#### Scenario: OpenCode ausente
- **WHEN** el binario `opencode` no está en PATH
- **THEN** se lista con `installed: false` y su diagnóstico, sin romper el listado de los demás runtimes

#### Scenario: Sesión que modifica el repo
- **WHEN** una sesión de OpenCode arranca
- **THEN** el launcher exige confirmación explícita, porque `modifiesRepo` es `true`
