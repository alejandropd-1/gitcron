## ADDED Requirements

### Requirement: Flujo de actualización guiada en dos pasos con confirmación explícita
GitCron SHALL estructurar la actualización de integración de OpenSpec en un flujo obligatorio de dos
pasos: un primer clic que abre la revisión diagnóstica sin mutación alguna, y un segundo clic de
confirmación explícita que ejecuta la regeneración de skills con el CLI resuelto. GitCron SHALL NOT
ejecutar mutaciones en el repositorio de forma directa sin pasar previamente por la revisión.

El fundamento es que el usuario debe poder inspeccionar qué archivos se verán afectados, qué skills
legacy se migrarán y qué personalizados preexistentes se preservarán antes de autorizar cualquier
escritura en el repositorio.

#### Scenario: Primer clic abre la revisión no mutante
- **WHEN** el usuario hace clic en el botón de actualización en la tarjeta del motor o banner de avisos
- **THEN** GitCron abre la sección de revisión en la columna central y no realiza ninguna modificación en disco

#### Scenario: Segundo clic ejecuta la actualización
- **WHEN** el usuario confirma la operación desde el botón de acción principal de la revisión
- **THEN** GitCron valida el entorno, ejecuta la regeneración de integración y reporta el progreso

### Requirement: Inhibición de acciones de actualización ante condiciones inseguras de Git
GitCron SHALL deshabilitar el botón de ejecución de actualización y SHALL mostrar una advertencia clara
si el repositorio se encuentra en la rama principal (`main` o `master`) sin aislamiento, o si el árbol de
trabajo contiene modificaciones sucias no confirmadas.

El fundamento es prevenir la sobreescritura accidental de código en ramas de producción y evitar mezclar
cambios de configuración de agentes con commits de producto pendientes.

#### Scenario: Inhibición por rama principal no aislada
- **WHEN** el repositorio se encuentra en la rama `main` y el usuario visualiza la revisión de actualización
- **THEN** el botón de ejecución se muestra deshabilitado con un mensaje que solicita crear o cambiar a una rama de trabajo

#### Scenario: Inhibición por working tree sucio
- **WHEN** existen archivos con cambios pendientes de confirmación en el working tree
- **THEN** el botón de ejecución se muestra deshabilitado indicando que el árbol debe estar limpio antes de regenerar
