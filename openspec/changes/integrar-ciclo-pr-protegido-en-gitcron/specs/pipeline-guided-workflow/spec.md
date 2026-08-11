## ADDED Requirements

### Requirement: Checkpoint PR reutiliza la capacidad central
Pipeline SHALL consumir el snapshot y las acciones del ciclo PR central sin implementar una segunda API, caché o superficie de confirmación. Si la capacidad central está ausente o degradada, Pipeline MUST reflejar ese estado en vez de inferirlo desde archivos OpenSpec.

#### Scenario: PR asociado al change
- **WHEN** la rama `change/<slug>` tiene un PR inequívoco hacia la base
- **THEN** Pipeline muestra el mismo número, SHA, checks y estado que la vista central de Pull Requests

#### Scenario: Estado cambia fuera de Pipeline
- **WHEN** el PR pasa a Ready o Merged desde otra vista o desde GitHub
- **THEN** Pipeline se reconcilia con el snapshot central sin conservar una copia obsoleta

### Requirement: Gates OpenSpec enriquecen y no reemplazan GitHub
Pipeline MUST combinar evidencia OpenSpec con GitHub antes de recomendar merge: tareas completas, validación humana atribuida, commit de cierre, Archive y commit posterior, head SHA y checks requeridos. Estos gates SHALL aplicarse sólo cuando exista un change OpenSpec asociado, porque el flujo PR central también sirve a repositorios sin OpenSpec.

#### Scenario: OpenSpec incompleto
- **WHEN** el PR está verde pero quedan tareas sin marcar o el change sigue activo cuando la política exige Archive
- **THEN** Pipeline bloquea su acción de merge y señala la evidencia OpenSpec faltante

#### Scenario: Repositorio sin OpenSpec
- **WHEN** el PR pertenece a un repositorio sin change asociado
- **THEN** la vista central conserva el merge según GitHub y Pipeline no inventa requisitos OpenSpec

### Requirement: Última decisión humana intransferible
Pipeline MUST reservar la confirmación final de merge al usuario y SHALL registrar que la acción se solicitó desde Pipeline sin marcar automáticamente tareas humanas. Ningún runtime o agente podrá activar el botón, responder el diálogo ni usar una autorización anterior para otro SHA.

#### Scenario: Agente completa tareas técnicas
- **WHEN** un runtime deja CI, preview y Archive listos
- **THEN** Pipeline muestra el checkpoint pendiente y espera una acción explícita del usuario

#### Scenario: Nuevo commit después de aprobar
- **WHEN** cambia el head SHA antes del merge
- **THEN** la aprobación previa queda invalidada y Pipeline solicita revisar la nueva revisión

### Requirement: Siguiente acción guiada hasta producción
Pipeline SHALL derivar una única siguiente acción trazable entre crear PR, esperar checks, pasar a Ready, mergear, sincronizar base, observar release y limpiar rama. MUST distinguir acciones ejecutables, esperas externas y decisiones humanas para no presentar un botón engañoso.

#### Scenario: Checks en ejecución
- **WHEN** CI o preview siguen pendientes
- **THEN** Pipeline muestra espera con progreso y enlaces, sin ofrecer merge

#### Scenario: Merge y release exitosos
- **WHEN** GitHub confirma el merge y la política de release devuelve éxito para el merge SHA
- **THEN** Pipeline recomienda sincronizar la base y luego permite la limpieza opcional de rama

#### Scenario: Release fallido
- **WHEN** el deployment de producción falla después del merge
- **THEN** Pipeline conserva la rama, muestra diagnóstico y no trata el cambio como publicación verificada

### Requirement: Modo PR protegido configurable
Pipeline SHALL respetar una preferencia por repositorio entre flujo Git directo y PR protegido, y MAY recomendar PR cuando detecte branch protection u OpenSpec implementable. La recomendación MUST requerir aceptación y no cambiar silenciosamente la metodología del proyecto.

#### Scenario: Proyecto adopta PR protegido
- **WHEN** el usuario habilita el modo para un repositorio
- **THEN** las siguientes acciones de Pipeline priorizan rama, Draft PR y gates antes de `main`

#### Scenario: Proyecto conserva flujo directo
- **WHEN** la preferencia permanece desactivada y no hay política remota obligatoria
- **THEN** Pipeline no fuerza la creación de PR y mantiene el comportamiento Git existente
