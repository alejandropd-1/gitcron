## ADDED Requirements

### Requirement: Éxito declarado sólo con ejecución observada
Un adaptador SHALL NOT declarar `success: true` cuando el runtime no ejecutó ningún turno y reportó
un motivo de rechazo, aunque el proceso haya salido con código 0 y sin marca de error. El evento
`run.completed` SHALL llevar `success: false` en ese caso, y el motivo textual reportado por el
runtime SHALL conservarse en la evidencia en vez de descartarse.

El fundamento es que el código de salida y la marca de error del CLI describen el proceso, no el
trabajo. Un runtime que rechaza la instrucción antes de empezar sale limpio, y tomar eso como éxito
convierte un rechazo en una afirmación falsa que el usuario no tiene forma de contradecir.

#### Scenario: Comando inexistente con salida limpia
- **WHEN** el resultado del runtime informa cero turnos y un motivo que empieza con `Unknown command:`
- **THEN** el adaptador emite `run.completed` con `success: false`, conserva el motivo textual y no
  declara la sesión exitosa

#### Scenario: Ejecución real con turnos
- **WHEN** el resultado del runtime informa al menos un turno y ninguna marca de error
- **THEN** el adaptador emite `run.completed` con `success: true` sin cambios respecto del
  comportamiento previo

#### Scenario: Motivo distinto del rechazo de comando
- **WHEN** el resultado informa cero turnos pero el motivo no corresponde a un comando inexistente
- **THEN** el adaptador no inventa un fallo y conserva la derivación basada en la marca de error del
  runtime
