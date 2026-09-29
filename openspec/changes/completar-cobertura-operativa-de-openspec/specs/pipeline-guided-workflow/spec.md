# Spec Delta

## MODIFIED Requirements

### Requirement: La sincronización de specs SHALL mostrar qué fusionaría antes de ejecutarse

La aplicación SHALL ofrecer la sincronización de specs con una vista previa de qué capacidades y
requisitos se incorporarían a los specs principales, y SHALL ejecutarla sólo tras confirmación. Sin
previa, la operación se juzga por su resultado ya escrito: sincronizar consolida en la fuente de
verdad del proyecto, y revisar después es revisar algo que ya ocurrió.

#### Scenario: Vista previa antes de sincronizar
- **WHEN** se pide sincronizar los specs de un cambio
- **THEN** se muestra qué se incorporaría a los specs principales y ningún archivo del repositorio objetivo se escribe hasta confirmar; la preparación puede usar un espacio temporal aislado y declarado

#### Scenario: Sincronización confirmada
- **WHEN** se confirma la sincronización
- **THEN** los specs principales quedan modificados en el árbol de trabajo, sin confirmarse en Git

#### Scenario: Sin agente disponible
- **WHEN** se pide sincronizar y GitCron no cuenta con un agente o ejecutor de workflows que produzca la propuesta de fusión
- **THEN** la sincronización no se ejecuta, se declara el motivo junto al control, y se indica que archivar el cambio sí sincroniza los specs

#### Scenario: La propuesta quedó vencida
- **WHEN** cambian las specs canónicas, deltas, raíz o motor relevantes desde la vista previa
- **THEN** se rechaza aplicar esa propuesta y se pide regenerarla sin escribir parcialmente

#### Scenario: Preview confinado
- **WHEN** el ejecutor genera la propuesta de fusión
- **THEN** las specs canónicas permanecen intactas hasta confirmar y ningún output fuera del alcance aprobado se aplica
