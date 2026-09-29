# Pipeline decision contract

## MODIFIED Requirements

### Requirement: Ack separado de efecto
El estado de un comando SHALL distinguir solicitud, aceptación, acknowledgement, efecto observado, fallo y resultado desconocido. Una respuesta humana desde el inspector o el centro de trabajo SHALL usar la misma operación validada y conservar su repo, sesión, decisión y opción. Un acuse de recepción SHALL NOT marcar la decisión como aplicada ni retirar el pendiente sin evidencia del resultado.

#### Scenario: Interrupción reconocida
- **WHEN** un runtime confirma recepción de interrupt
- **THEN** Pipeline muestra ACK y espera reconciliación de sesión y working tree antes de declarar el efecto

#### Scenario: Respuesta desde el inspector
- **WHEN** una persona elige una opción disponible desde el inspector fijo
- **THEN** se envía la misma operación que desde el centro, ligada al repo y sesión de esa decisión, y el pendiente conserva un estado visible hasta reconciliar el resultado

#### Scenario: Opción aplicada
- **WHEN** la opción válida alcanza su ejecutor y éste confirma el resultado
- **THEN** la resolución persistida registra ese efecto y la proyección actualizada lo presenta sin confundirlo con el acuse inicial

#### Scenario: Rechazo o fallo
- **WHEN** la opción no pertenece a la decisión vigente o falla su ejecución
- **THEN** se informa el rechazo o fallo y no se declara aplicada; un reintento conserva la trazabilidad y no duplica un efecto ya confirmado

#### Scenario: Cambio de repositorio durante la respuesta
- **WHEN** llega una respuesta tras cambiar de repositorio
- **THEN** su resultado permanece asociado al repositorio original y no resuelve pendientes del nuevo
