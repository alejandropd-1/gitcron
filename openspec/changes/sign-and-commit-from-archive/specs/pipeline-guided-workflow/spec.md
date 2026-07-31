## ADDED Requirements

### Requirement: El archivado registra la firma humana y sólo eso

Archivar desde la aplicación SHALL marcar completada la tarea de firma del cambio, y SHALL NOT
marcar ninguna otra. La tarea de firma SHALL identificarse por un texto literal declarado en la
convención, nunca por heurística sobre prosa ni por su posición en la lista.

Su texto SHALL declarar exactamente lo que el click prueba —que una persona confirmó el archivado
desde la aplicación— y SHALL NOT afirmar nada que el click no demuestre, como haber revisado el
resultado. Marcar toda tarea pendiente al archivar convertiría el checkbox en "se apretó el botón" y
haría que el archivo afirme trabajo que nadie hizo.

Si el cambio no declara tarea de firma, el archivado SHALL proceder sin marcar ninguna.

#### Scenario: Cambio con tarea de firma

- **WHEN** se confirma el archivado de un cambio que declara su tarea de firma
- **THEN** esa tarea queda marcada y las demás conservan su estado

#### Scenario: Tareas pendientes reales

- **WHEN** el cambio tiene tareas sin marcar que no son la de firma
- **THEN** siguen sin marcar, y el cambio se archiva declarando ese pendiente

#### Scenario: Cambio sin tarea de firma

- **WHEN** el cambio no declara ninguna tarea de firma
- **THEN** se archiva sin marcar ninguna tarea

### Requirement: Confirmar el trabajo en Git con alcance declarado y a la vista

Archivar SHALL poder confirmar el trabajo en Git en dos commits —el del trabajo y el del archivado—
y SHALL mostrar antes de ejecutar el mensaje de cada uno, los archivos que entran y **los archivos
modificados que quedan fuera**.

El alcance del commit del trabajo SHALL leerse de un manifiesto declarado por el cambio, porque el
árbol puede contener varios cambios en curso y no es deducible cuál archivo pertenece a cuál. Los
archivos SHALL enumerarse uno por uno; SHALL NOT agregarse directorios completos.

El archivado SHALL NOT ejecutar `push`, `merge`, `tag` ni ninguna operación que publique. La
confirmación humana autoriza esa acción concreta y nada más.

Si el commit del trabajo falla, el archivado SHALL NOT continuar, y el motivo real SHALL mostrarse.

#### Scenario: Alcance a la vista antes de ejecutar

- **WHEN** se pide archivar un cambio que declara manifiesto
- **THEN** se muestran los mensajes, los archivos incluidos y los modificados que quedan fuera, y nada se ejecuta hasta confirmar

#### Scenario: Manifiesto equivocado

- **WHEN** un archivo modificado que corresponde al cambio no figura en el manifiesto
- **THEN** aparece entre los que quedan fuera, de modo que el error se vea antes de confirmar

#### Scenario: Falla el commit del trabajo

- **WHEN** el commit del trabajo falla
- **THEN** no se archiva ni se commitea nada más, y se muestra el motivo informado por Git

#### Scenario: Nada se publica

- **WHEN** se completa el archivado con sus dos commits
- **THEN** no se ejecuta ningún `push` ni `merge`, y publicar sigue siendo una acción manual
