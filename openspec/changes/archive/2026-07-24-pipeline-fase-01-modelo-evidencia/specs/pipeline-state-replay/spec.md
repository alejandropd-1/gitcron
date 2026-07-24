## ADDED Requirements

### Requirement: Reducción determinística de evidencia
Pipeline SHALL producir el mismo estado y los mismos IDs de eventos para la misma evidencia, estado previo y timestamp de observación suministrado.

#### Scenario: Ingesta repetida
- **WHEN** el reducer recibe por segunda vez evidencia sin cambios
- **THEN** no produce eventos semánticos duplicados

### Requirement: Transiciones semánticas verificables
Pipeline SHALL derivar transiciones de tasks, reportes, gates, merge y archive sólo desde evidencia local con procedencia.

#### Scenario: Task completada
- **WHEN** una task cambia de abierta a completada entre dos snapshots
- **THEN** se emite un único evento `task.completed` enlazado a la evidencia de la task

#### Scenario: Change archivado
- **WHEN** un change desaparece de activos y aparece en el archivo fechado
- **THEN** se emite `change.archived` sin inferir que fue mergeado si Git no lo confirma

### Requirement: Persistencia particionada e idempotente
Pipeline SHALL persistir bindings, snapshots y eventos en SQLite global particionados por `repo_id`, con sequence monotónica per-repo e idempotencia por evento.

#### Scenario: Mismo eventId en dos repos
- **WHEN** dos repositorios producen el mismo `eventId`
- **THEN** cada evento se conserva bajo su propio `repo_id` sin colisión cross-repo

#### Scenario: Replay del último snapshot
- **WHEN** GitCron reinicia sin cambios en el repositorio
- **THEN** puede cargar el último snapshot persistido y reconciliarlo sin duplicar eventos

### Requirement: Retención sanitizada
Pipeline SHALL persistir sólo DTOs sanitizados y acotados, excluyendo secretos, prompts completos, reasoning crudo y diffs enormes.

#### Scenario: Campo sensible inesperado
- **WHEN** una entrada contiene una key o header sensible
- **THEN** el valor se redacta antes de SQLite, IPC y logs

### Requirement: IPC y suscripción read-only
Electron SHALL exponer snapshot y actualización tipados sin aceptar SQL, shell, argv, PID ni operaciones que escriban en el repositorio.

#### Scenario: Cambio observado por watcher
- **WHEN** el watcher existente notifica un cambio para un repo suscripto
- **THEN** main refresca y emite un snapshot tipado mediante `pipeline:snapshot-updated`

#### Scenario: Unsubscribe
- **WHEN** el renderer deja de observar un repo
- **THEN** main elimina la suscripción Pipeline sin crear ni dejar un watcher adicional
