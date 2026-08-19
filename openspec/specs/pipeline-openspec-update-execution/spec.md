# pipeline-openspec-update-execution Specification

## Purpose
TBD - created by archiving change actualizar-openspec-desde-la-herramienta. Update Purpose after archive.
## Requirements
### Requirement: Ejecución segura de openspec update en el repositorio autorizado
GitCron SHALL permitir la ejecución del comando `openspec update` únicamente sobre repositorios
autorizados y mediante el proceso principal de Electron, utilizando el ejecutable resuelto y validado,
con variables de entorno controladas (`OPENSPEC_NO_UPDATE_CHECK=1` y telemetría desactivada) y sin
interactividad TTY. GitCron SHALL NOT permitir la ejecución si el repositorio no está debidamente
autorizado o si no ha pasado una revisión previa de integridad.

El fundamento es que regenerar los archivos de instrucciones de OpenSpec dentro de `.agents`, `.codex`,
`.claude`, etc., modifica archivos en el disco del usuario. Canalizar la ejecución a través del proceso
principal con argumentos estrictos garantiza que no se inyecten comandos arbitrarios y que los outputs
queden confinados exclusivamente al repositorio activo.

#### Scenario: Ejecución exitosa de update tras revisión
- **WHEN** el usuario confirma la ejecución de `openspec update` desde la revisión de actualización
- **THEN** el proceso principal ejecuta el binario de OpenSpec resuelto sobre `repoPath` con `update`, captura la salida estándar y de error, y reporta el resultado estructurado al renderer

#### Scenario: Rechazo por repositorio no autorizado
- **WHEN** se solicita la ejecución de `openspec update` sobre una ruta que no está en el almacén de repositorios autorizados
- **THEN** el proceso principal rechaza la invocación con un error de seguridad y no inicia ningún proceso hijo

### Requirement: Salvaguardas de seguridad Git y estado de trabajo limpio
GitCron SHALL validar que el repositorio no se encuentre en un estado de trabajo sucio o conflictivo antes
de ejecutar `openspec update`. GitCron SHALL NOT realizar ninguna mutación en el control de versiones de
Git (`git add`, `git commit`, `git push`, `git merge`, cambios de rama o borrado) como parte de la
actualización, y SHALL presentar al usuario un resumen de los archivos modificados con la opción de
preparar el commit manualmente.

El fundamento es que OpenSpec delega el control de versiones al desarrollador. Ejecutar una regeneración
sobre un árbol sucio podría sobreescribir trabajo en curso no confirmado o mezclar cambios de producto con
cambios de configuración. Exigir un árbol seguro y no tocar Git preserva la soberanía del usuario.

#### Scenario: Bloqueo ante árbol de trabajo sucio ajeno
- **WHEN** el usuario intenta ejecutar la actualización pero existen archivos modificados no relacionados en el working tree
- **THEN** GitCron bloquea la ejecución y explica que debe confirmarse o descartarse el trabajo previo antes de continuar

#### Scenario: Notificación y ofrecimiento de preparar commit al finalizar
- **WHEN** la ejecución de `openspec update` finaliza con éxito y produce modificaciones en los archivos de skills
- **THEN** GitCron actualiza la vista, reporta los archivos tocados y ofrece la acción de «Preparar commit» sin ejecutar staging automático

### Requirement: Manejo determinista de actualizaciones incompletas
GitCron SHALL clasificar el estado como `update-incomplete` si el comando `openspec update` termina con
código de salida distinto de cero o falla en regenerar parte de los skills esperados, informando
exactamente qué componentes fueron actualizados y cuáles requirieron intervención.

El fundamento es que un fallo parcial (por ejemplo por permisos de archivo en una carpeta de skills) no
debe dejar a la aplicación en un estado indeterminado ni asumir que todo falló si parte de los archivos se
escribió.

#### Scenario: Reporte honesto de fallo parcial
- **WHEN** el proceso de `openspec update` retorna un error a mitad de ejecución
- **THEN** GitCron reporta el estado `update-incomplete`, conserva la evidencia capturada y sugiere una acción segura de reintento o inspección

