## ADDED Requirements

### Requirement: Flujo PR central y optativo
GitCron SHALL ofrecer el ciclo de Pull Request como capacidad central para repositorios GitHub, aunque no usen OpenSpec ni Pipeline. El flujo directo de commit y push MUST permanecer disponible porque no todos los repositorios aplican revisión por PR.

#### Scenario: Repositorio sin OpenSpec
- **WHEN** un repositorio GitHub no contiene `openspec/` y el usuario abre una rama distinta de la base
- **THEN** GitCron permite crear, detectar y operar un PR sin mostrar gates OpenSpec

#### Scenario: Flujo directo conservado
- **WHEN** el usuario trabaja en un repositorio que no requiere PR
- **THEN** las acciones Git existentes continúan disponibles y GitCron no crea un PR automáticamente

### Requirement: Snapshot autoritativo del Pull Request
GitCron SHALL representar número, estado, Draft, base, head, head SHA, mergeabilidad, método permitido, checks, conversaciones y deployments con procedencia GitHub. Los campos no obtenidos MUST figurar como no disponibles y nunca como aprobados, porque un default optimista permitiría fusionar evidencia incompleta.

#### Scenario: PR listo y actualizado
- **WHEN** GitHub devuelve el PR, su revisión y los checks del head SHA
- **THEN** GitCron muestra un snapshot único correlacionado con esa revisión exacta

#### Scenario: Evidencia parcial
- **WHEN** GitHub no permite leer branch protection, conversaciones o deployments
- **THEN** GitCron identifica cada dato ausente y no lo sustituye por éxito

### Requirement: Reconciliación de acciones internas y externas
GitCron SHALL refrescar PRs y estado Git después de cada mutación propia y al recuperar foco o solicitar actualización. Un PR cerrado o mergeado MUST abandonar la lista de abiertos sin exigir reiniciar el repositorio, porque conservarlo como Draft induce acciones sobre estado obsoleto.

#### Scenario: Merge realizado dentro de GitCron
- **WHEN** GitHub confirma el merge
- **THEN** la lista, el detalle, Pipeline y el grafo se reconcilian con el merge commit devuelto

#### Scenario: Merge realizado en GitHub web
- **WHEN** GitCron recupera foco después de que el PR fue mergeado externamente
- **THEN** vuelve a consultar GitHub y reemplaza el snapshot obsoleto por el estado `merged`

### Requirement: Creación y transición de Draft controladas
GitCron SHALL permitir crear un Draft PR o asociar el PR inequívoco de la rama, y SHALL requerir una acción humana para pasarlo a Ready. La aplicación MUST evitar duplicados y mostrar la base y el head antes de crear o cambiar estado.

#### Scenario: Rama sin PR
- **WHEN** una rama publicada no tiene un PR abierto hacia la base elegida
- **THEN** GitCron ofrece crear un Draft PR con título, cuerpo, base y head visibles

#### Scenario: PR existente
- **WHEN** GitHub ya informa un PR abierto para el mismo head y base
- **THEN** GitCron lo vincula en vez de crear un duplicado

#### Scenario: Pasar a Ready
- **WHEN** el usuario confirma que el Draft está listo para revisión
- **THEN** GitCron solicita la transición a GitHub y refresca el snapshot resultante

### Requirement: Merge humano sobre revisión exacta
GitCron MUST exigir confirmación humana para cada merge y MUST enviar a GitHub el head SHA aprobado, el PR y el método explícito. La aplicación SHALL rechazar auto-merge, bypass administrativo y cualquier intento cuyo SHA cambió desde la confirmación, porque mezclar otra revisión invalida los checks observados.

#### Scenario: Confirmación de merge
- **WHEN** el PR satisface los gates conocidos y el usuario solicita merge
- **THEN** el diálogo muestra repositorio, PR, base, head, SHA, método y consecuencias antes de habilitar la confirmación

#### Scenario: Revisión cambió
- **WHEN** GitHub informa un head SHA distinto del confirmado
- **THEN** GitCron cancela el merge, refresca checks y exige una nueva confirmación

#### Scenario: Check requerido pendiente o fallido
- **WHEN** un required check de la revisión exacta no está exitoso
- **THEN** GitCron deshabilita el merge y muestra el check bloqueante sin ofrecer bypass

#### Scenario: GitHub rechaza la operación
- **WHEN** branch protection, una conversación o una política externa impide el merge
- **THEN** GitCron conserva el PR abierto y presenta el motivo sanitizado sin intentar otro método automáticamente

### Requirement: Métodos de merge explícitos y gobernados
GitCron SHALL mostrar sólo los métodos habilitados por el repositorio y MUST conservar la elección explícita del usuario en la confirmación. Pipeline MAY recomendar `merge commit` cuando el método de cierre exige preservar commits, pero el núcleo no deberá imponer una política propia a todos los repositorios.

#### Scenario: Repositorio permite tres métodos
- **WHEN** GitHub habilita merge commit, squash y rebase
- **THEN** GitCron muestra las tres opciones con sus consecuencias y no elige silenciosamente

#### Scenario: Pipeline requiere trazabilidad de commits
- **WHEN** el cambio OpenSpec declara commit de cierre y commit de Archive separados
- **THEN** Pipeline recomienda `merge commit` y advierte que squash o rebase perderían esa estructura

### Requirement: Autenticación GitHub confinada a Electron main
GitCron MUST almacenar y usar credenciales GitHub sólo en Electron main mediante `safeStorage`; el renderer SHALL recibir únicamente estado de autenticación, fingerprint acotado y DTOs sanitizados. Los comandos IPC MUST derivar owner/repo desde el origin validado y no aceptar tokens ni destinos arbitrarios.

#### Scenario: Consultar un PR
- **WHEN** el renderer solicita el snapshot por repoPath validado y número
- **THEN** main obtiene la credencial cifrada, deriva el remoto y devuelve datos sin secretos

#### Scenario: Inspeccionar tráfico IPC
- **WHEN** se auditan payloads de listado, Ready o merge
- **THEN** ningún payload contiene token, cookie, header Authorization ni credencial de proveedor

### Requirement: Sincronización local posterior al merge
GitCron SHALL ofrecer, como acción separada, actualizar la rama base local mediante fetch y fast-forward exclusivo al merge commit confirmado. MUST bloquear checkout o pull si el working tree lo impide y no deberá crear un merge local adicional.

#### Scenario: Base local detrás y limpia
- **WHEN** el PR fue mergeado, `main` está detrás de `origin/main` y el working tree permite checkout
- **THEN** GitCron ofrece cambiar a `main` y traer directo hasta el merge commit

#### Scenario: Base divergida o trabajo local pendiente
- **WHEN** `main` no admite fast-forward o existen cambios que impiden checkout
- **THEN** GitCron detiene la sincronización y deriva al flujo de decisión Git ya existente sin descartar trabajo

### Requirement: Limpieza de rama posterior y opcional
GitCron MUST mantener la eliminación local o remota como decisión humana separada y SHALL ofrecerla sólo después del merge. Si existe verificación de release configurada, Pipeline MUST esperar su resultado exitoso antes de recomendar la limpieza.

#### Scenario: Release verificado
- **WHEN** el merge está confirmado y la política de release devuelve éxito para el merge SHA
- **THEN** GitCron puede ofrecer borrar la rama local, remota o ambas mediante la confirmación existente

#### Scenario: Verificación pendiente o no disponible
- **WHEN** el deployment continúa pendiente o la política exige evidencia que no está disponible
- **THEN** GitCron conserva la rama y explica por qué todavía no recomienda limpiarla

### Requirement: Degradación fuera de GitHub
GitCron SHALL declarar el ciclo PR como no disponible para remotos no GitHub sin afectar las funciones Git locales. La ausencia de soporte MUST mostrarse como capacidad no disponible, no como error del repositorio.

#### Scenario: Origin de otro proveedor
- **WHEN** el origin pertenece a GitLab, Bitbucket o un servidor no reconocido
- **THEN** GitCron mantiene commit, branch, push y pull, y oculta o deshabilita sólo las acciones PR de GitHub
