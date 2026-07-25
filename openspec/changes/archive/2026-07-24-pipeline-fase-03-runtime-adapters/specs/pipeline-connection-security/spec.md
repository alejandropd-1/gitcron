## ADDED Requirements

### Requirement: Ejecución confinada de runtimes locales
Los procesos de F03 SHALL iniciarse desde Electron main con executable y args separados, `shell: false`, cwd canónico validado, entorno mínimo y sin secretos en argumentos o logs.

#### Scenario: Cwd fuera del repositorio vinculado
- **WHEN** una solicitud intenta iniciar una sesión con cwd no equivalente al repo canónico
- **THEN** el runner la rechaza antes de ejecutar el binario

### Requirement: Límites, cancelación y cleanup
Cada proceso creado por F03 SHALL tener límites de stream, timeout o señal de cancelación y cleanup esperado; sólo procesos registrados como owned SHALL poder recibir señales internas.

#### Scenario: Timeout de runtime
- **WHEN** una ejecución supera su timeout
- **THEN** el runner solicita terminación del proceso owned, espera su exit y emite resultado timeout sin dejarlo huérfano

#### Scenario: Proceso externo observado
- **WHEN** Pipeline conoce una sesión que GitCron no creó
- **THEN** ninguna capability de señal o kill queda disponible
