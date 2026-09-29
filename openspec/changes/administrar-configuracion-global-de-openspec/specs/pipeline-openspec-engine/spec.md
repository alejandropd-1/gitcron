# pipeline-openspec-engine

## MODIFIED Requirements

### Requirement: El perfil de workflows SHALL leerse del CLI y poder editarse desde la aplicación

GitCron SHALL obtener del CLI el perfil vigente y el conjunto de workflows habilitados, SHALL ofrecer
únicamente acciones correspondientes a los habilitados, y SHALL permitir activarlos o desactivarlos
sin recurrir a la terminal. El fundamento es que OpenSpec dejó de imponer un flujo único y pasó a
admitir configuraciones por organización, de modo que el conjunto disponible es un dato del entorno y
no una constante del programa. Ofrecer una acción que el perfil no habilita produce un botón que
falla al apretarlo, y esconder una habilitada obliga a salir de la aplicación para usarla.

#### Scenario: Acción no habilitada por el perfil
- **WHEN** el perfil vigente no incluye un workflow
- **THEN** su acción no se ofrece, y se puede consultar que está deshabilitada

#### Scenario: Cambio del perfil desde la aplicación
- **WHEN** se habilita o deshabilita un workflow desde la aplicación
- **THEN** la configuración del CLI queda modificada y las acciones ofrecidas se recalculan desde ella

La edición global SHALL residir en Configuración de GitCron y declarar su alcance máquina. La revisión del repositorio SHALL mostrar el estado efectivo y enlazar a ese editor, sin duplicarlo. Cambiar la configuración global SHALL NOT declarar automáticamente actualizadas las integraciones instaladas ni modificarlas sin su operación explícita.

#### Scenario: Perfil nuevo con integración anterior
- **WHEN** se cambia el perfil global y un repositorio mantiene instrucciones anteriores
- **THEN** se releen ambas fuentes, se declara la diferencia y se ofrece la actualización pertinente sin ejecutarla automáticamente

#### Scenario: Configuración modificada fuera de GitCron
- **WHEN** el estado global cambió desde que se preparó una edición
- **THEN** se invalida la escritura pendiente y se presenta el estado actual antes de continuar


## ADDED Requirements

### Requirement: La administración global expone sólo escrituras con contrato conocido

GitCron SHALL permitir consultar configuración global saneada y editar sólo opciones cuyo alcance, valores y operación estén soportados. Cambios y reset SHALL presentar valores afectados antes de confirmar; la ejecución SHALL releer el resultado del motor. Opciones desconocidas SHALL quedar como no editables, sin inventar tipos ni defaults.

#### Scenario: Reset global
- **WHEN** se prepara restaurar defaults
- **THEN** se muestran claves afectadas y alcance máquina; no se escribe antes de confirmar

#### Scenario: Clave nueva del motor
- **WHEN** aparece una opción sin contrato de edición soportado
- **THEN** se puede conocer su existencia saneada y la limitación, sin habilitar una escritura arbitraria

#### Scenario: Fallo del motor
- **WHEN** el CLI rechaza la modificación
- **THEN** se informa el error y se relee el estado sin afirmar éxito
