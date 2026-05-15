/**
 * GitCron i18n — lightweight translation system.
 *
 * Strategy: flat dictionary keys. ES is the source of truth (default);
 * EN falls back to ES if a key is missing.
 *
 * Usage:
 *   const t = useT();
 *   t('toolbar.openRepo')                          → "Abrir repositorio"
 *   t('errors.pullAuthRequired', { user: 'foo' })  → "Pull fallido para foo..."
 */

export type Lang = 'es' | 'en';

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇦🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

type Dict = Record<string, string>;

const es: Dict = {
  // ── Toolbar / Header ──
  'toolbar.openRepo': 'Abrir repositorio',
  'toolbar.undo': 'Deshacer',
  'toolbar.redo': 'Rehacer',
  'toolbar.pull': 'Pull',
  'toolbar.push': 'Push',
  'toolbar.branch': 'Branch',
  'toolbar.newBranch': 'Nueva branch',
  'toolbar.stash': 'Stash',
  'toolbar.terminal': 'Abrir terminal en el repo',
  'toolbar.settings': 'Configuración',
  'toolbar.help': 'Ayuda',
  'toolbar.profile': 'Perfil',
  'toolbar.connectGitHub': 'Conectar con GitHub',
  'toolbar.connectedAs': 'Conectado como {{user}}',
  'toolbar.filter': 'Filtrar (Ctrl + Alt + F)',

  // ── Tabs ──
  'tab.commit': 'Commit',
  'tab.graph': 'Graph',
  'tab.history': 'History',

  // ── Sidebar sections ──
  'sidebar.local': 'LOCAL',
  'sidebar.remote': 'REMOTO',
  'sidebar.stash': 'STASH',
  'sidebar.tags': 'TAGS',
  'sidebar.worktrees': 'WORKTREES',
  'sidebar.submodules': 'SUBMÓDULOS',
  'sidebar.pullRequests': 'PULL REQUESTS',
  'sidebar.noBranches': 'Abrí un repo para ver branches',
  'sidebar.noStashes': 'Sin stashes',
  'sidebar.noTags': 'Sin tags',
  'sidebar.noSubmodules': 'Sin submódulos',
  'sidebar.noPRs': 'Sin PRs abiertas',
  'sidebar.draft': 'borrador',
  'sidebar.openInGitHub': 'Abrir #{{number}} en GitHub',
  'sidebar.branchTooltip': 'Doble click: cambiar de branch · Click derecho: opciones',
  'sidebar.stashApply': 'Aplicar stash',
  'sidebar.stashDrop': 'Eliminar stash',
  'sidebar.upstreamGone': 'Upstream eliminado',

  // ── Staging Panel ──
  'staging.unstaged': 'Sin stagear',
  'staging.staged': 'Listos para commit',
  'staging.stageAll': 'Stagear todo',
  'staging.unstageAll': 'Unstagear todo',
  'staging.noUnstaged': 'No hay cambios sin stagear',
  'staging.noStaged': 'Stagea archivos para incluir en el commit',
  'staging.openRepoToSee': 'Abrí un repo para ver los cambios',
  'staging.commitMsg': 'Mensaje del commit (requerido)',
  'staging.commitMsgShort': 'Mensaje del commit',
  'staging.commit': 'Commit',
  'staging.committing': 'Commiteando...',
  'staging.commitChanges': 'Commitear cambios',
  'staging.commitWithCount': 'Commitear cambios ({{count}})',
  'staging.resetAll': 'Descartar TODOS los cambios (reset --hard)',
  'staging.stageFile': 'Stagear este archivo',
  'staging.unstageFile': 'Unstagear este archivo',
  'staging.discardChanges': 'Descartar cambios',

  // ── Empty state ──
  'empty.welcome': 'Bienvenido a GitCron',
  'empty.choose': 'Elegí cómo empezar:',
  'empty.openExisting': 'Abrir existente',
  'empty.openExistingDesc': 'Seleccioná una carpeta que ya sea un repo git',
  'empty.createNew': 'Crear nuevo',
  'empty.createNewDesc': 'Inicializar un repo nuevo en tu máquina',
  'empty.cloneGitHub': 'Clonar de GitHub',
  'empty.cloneGitHubDesc': 'Bajar un repo existente desde una URL',
  'empty.loginPrompt': 'Conectá tu cuenta de GitHub para clonar repos privados',

  // ── Diff Viewer ──
  'diff.noChanges': 'No hay cambios para mostrar',
  'diff.binaryFile': 'Archivo binario o sin diff parseable',
  'diff.backToGraph': 'Volver al graph',

  // ── Commit Tab View ──
  'commitTab.workspace': 'Workspace',
  'commitTab.intro': 'Resumen de lo que tenés sin commitear. Hacé clic en cualquier archivo de la columna derecha para ver su diff con colores acá en el centro.',
  'commitTab.cleanTree': 'Working tree limpio',
  'commitTab.cleanTreeDesc': 'No hay cambios sin commitear.',
  'commitTab.changesByType': 'Cambios por tipo',
  'commitTab.flow': 'Flujo',
  'commitTab.step1': 'Modificá archivos en tu editor',
  'commitTab.step2': 'Clic en el {{plus}} de cada archivo en la columna derecha para stagearlo',
  'commitTab.step3': 'Escribí un mensaje en la caja de abajo a la derecha',
  'commitTab.step4': 'Clic en {{commit}}',
  'commitTab.step5': 'Clic en {{push}} para subirlo a GitHub',
  'commitTab.unstaged': 'Sin stagear',
  'commitTab.staged': 'Listos',

  // ── History View ──
  'history.header': 'Historial · {{count}} commits',
  'history.loading': 'Cargando commits...',

  // ── File Status Labels ──
  'fileStatus.modified': 'Modificados',
  'fileStatus.added': 'Nuevos (staged)',
  'fileStatus.deleted': 'Borrados',
  'fileStatus.untracked': 'Sin trackear',
  'fileStatus.renamed': 'Renombrados',

  // ── Modals: shared ──
  'modal.cancel': 'Cancelar',
  'modal.confirm': 'Confirmar',
  'modal.create': 'Crear',
  'modal.close': 'Cerrar',
  'modal.understood': 'Entendido',

  // ── Modal: New Branch ──
  'newBranch.title': 'Nueva branch',
  'newBranch.fromCommit': 'Desde commit:',
  'newBranch.namePlaceholder': 'feature/mi-nueva-feature',
  'newBranch.create': 'Crear',

  // ── Modal: Init Repo ──
  'initRepo.title': 'Crear repositorio nuevo',
  'initRepo.name': 'Nombre del repo',
  'initRepo.namePlaceholder': 'mi-nuevo-proyecto',
  'initRepo.nameHint': 'Solo letras, números, guiones, puntos y underscores',
  'initRepo.parent': 'Carpeta padre',
  'initRepo.pickFolder': 'Click para elegir carpeta...',
  'initRepo.willCreate': 'Se creará en: {{path}}',
  'initRepo.alsoOnGitHub': 'Crear también en GitHub (privado) y conectar',
  'initRepo.alsoOnGitHubNeedsAuth': 'Crear también en GitHub (necesita login)',
  'initRepo.creating': 'Creando...',
  'initRepo.createButton': 'Crear repositorio',

  // ── Modal: Clone Repo ──
  'clone.title': 'Clonar repositorio',
  'clone.myRepos': 'Mis repos de GitHub',
  'clone.manualUrl': 'URL manual',
  'clone.search': 'Buscar...',
  'clone.loading': 'Cargando tus repos...',
  'clone.noResults': 'Sin resultados',
  'clone.urlLabel': 'URL del repo',
  'clone.urlPlaceholder': 'https://github.com/usuario/repo.git',
  'clone.parentFolder': 'Carpeta padre',
  'clone.folderName': 'Nombre de la carpeta',
  'clone.folderNamePlaceholder': 'mi-repo',
  'clone.destination': 'Destino: {{path}}',
  'clone.cloning': 'Clonando...',
  'clone.cloneButton': 'Clonar',

  // ── Modal: Settings ──
  'settings.title': 'Configuración',
  'settings.language': 'Idioma',
  'settings.languageDesc': 'Elegí el idioma de la interfaz',
  'settings.theme': 'Tema',
  'settings.themeDark': 'Oscuro',
  'settings.themeLight': 'Claro (próximamente)',
  'settings.security': 'Seguridad',
  'settings.viewSecurity': 'Ver SECURITY.md',
  'settings.about': 'Acerca de GitCron',
  'settings.version': 'Versión',
  'settings.checkUpdates': 'Buscar actualizaciones',
  'settings.openExternal': 'Abrir en navegador',
  'settings.dataLocation': 'Tus datos se guardan en: %APPDATA%/GitCron (cifrados via OS)',

  // ── Profile Menu ──
  'profile.notConnected': 'No estás conectado',
  'profile.notConnectedDesc': 'Conectá tu cuenta para poder hacer push/pull, ver PRs, y más',
  'profile.signInGitHub': 'Iniciar sesión con GitHub',
  'profile.useToken': 'Usar token personal',
  'profile.viewOnGitHub': 'Ver perfil en GitHub',
  'profile.copyUsername': 'Copiar @{{user}}',
  'profile.signOut': 'Cerrar sesión',
  'profile.deviceCodeShown': 'Se abrió tu navegador. Ingresá este código en GitHub:',
  'profile.browserNotOpened': 'Si el navegador no se abrió:',
  'profile.waitingAuth': 'Esperando autorización...',
  'profile.tokenInputDesc': 'Si preferís usar un Personal Access Token:',
  'profile.tokenGenerate': 'generá uno acá',
  'profile.tokenScope': 'con scope',
  'profile.tokenVerifying': 'Verificando...',
  'profile.tokenConnect': 'Conectar con token',
  'profile.continueWithGitHub': 'Continuar con GitHub',
  'profile.starting': 'Iniciando...',
  'profile.tabOAuth': 'Login con GitHub',
  'profile.tabToken': 'Token manual',
  'profile.oauthDesc': 'Al hacer click, se abre GitHub en tu navegador (donde ya estás logueado con tu cuenta). Solo tenés que confirmar el acceso para GitCron.',
  'profile.oauthFooter': 'GitCron usa el flujo OAuth Device Flow (sin servidor, sin contraseñas).',

  // ── Context menu: branches ──
  'branchMenu.mergeInto': 'Mergear "{{src}}" en "{{dst}}"',
  'branchMenu.rebaseOnto': 'Rebase "{{src}}" sobre "{{dst}}"',
  'branchMenu.fastForward': 'Fast-forward a origin/{{branch}}',
  'branchMenu.checkout': 'Checkout (cambiar a esta)',
  'branchMenu.currentBranch': '(branch actual)',
  'branchMenu.createFrom': 'Crear nueva branch desde acá',
  'branchMenu.rename': 'Renombrar...',
  'branchMenu.delete': 'Eliminar',
  'branchMenu.copyName': 'Copiar nombre',

  // ── Context menu: commits ──
  'commitMenu.mergeIntoCurrent': 'Mergear en branch actual',
  'commitMenu.revert': 'Revertir commit',
  'commitMenu.checkout': 'Checkout',
  'commitMenu.createBranch': 'Crear branch desde acá',
  'commitMenu.copySha': 'Copiar SHA',

  // ── Context menu: files ──
  'fileMenu.stage': 'Stagear',
  'fileMenu.unstage': 'Unstagear',
  'fileMenu.addToGitignore': 'Agregar a .gitignore',
  'fileMenu.stashFile': 'Stashear este archivo',
  'fileMenu.openInEditor': 'Abrir en editor',
  'fileMenu.showInFolder': 'Mostrar en carpeta',
  'fileMenu.copyPath': 'Copiar path',
  'fileMenu.discard': 'Descartar cambios',
  'fileMenu.delete': 'Eliminar archivo',

  // ── Reset All Confirmation ──
  'resetAll.warning': 'Esto va a descartar TODOS los cambios (staged, unstaged y archivos untracked). ¿Seguro?',
  'resetAll.button': 'Descartar todo',

  // ── Checkout Conflict ──
  'checkoutConflict.title': 'Cambios sin commitear',
  'checkoutConflict.desc': 'No se puede pasar a {{branch}} porque tenés cambios que serían sobrescritos. ¿Qué hacés?',
  'checkoutConflict.stashAndSwitch': 'Stashear y cambiar',
  'checkoutConflict.stashAndSwitchDesc': '"Stashear y cambiar" guarda tus cambios actuales en la pila de stash y hace el checkout. Después podés recuperarlos desde la sección STASH.',

  // ── Merge Needs Checkout ──
  'mergeCheckout.title': 'Cambiar a {{branch}} para mergear',
  'mergeCheckout.desc': 'Para mergear {{src}} en {{dst}}, primero hay que estar en esa branch.',
  'mergeCheckout.button': 'Cambiar a {{branch}} y mergear',

  // ── Rename Branch Modal ──
  'rename.title': 'Renombrar branch',
  'rename.renaming': 'Renombrando:',
  'rename.newName': 'nuevo-nombre',
  'rename.button': 'Renombrar',

  // ── Delete Branch Modal ──
  'deleteBranch.title': 'Eliminar branch',
  'deleteBranch.confirm': '¿Eliminar {{branch}}?',
  'deleteBranch.notMergedWarning': '⚠ Esta branch tiene commits que no fueron mergeados a ninguna otra branch. Si la borrás, esos commits se pierden (a menos que recuperés via reflog).',
  'deleteBranch.force': 'Forzar eliminación',
  'deleteBranch.delete': 'Eliminar',

  // ── Help Modal ──
  'help.title': 'Ayuda — Cómo funciona GitCron',

  // ── Error Toast ──
  'error.removeLock': 'Eliminar lock',
  'error.removeLockTooltip': 'Borra .git/index.lock y refresca el estado',

  // ── Errors / Messages from actions (most are user-facing) ──
  'error.electronApiUnavailable': 'Electron API no disponible',
  'error.openRepoFailed': 'No se pudo abrir el repositorio',
  'error.openRepoErr': 'Error al abrir el repositorio',
  'error.noFolderSelected': 'No se seleccionó ninguna carpeta',
  'error.notGitRepo': '"{{folder}}" no es un repositorio git',
  'error.commitEmpty': 'El mensaje del commit no puede estar vacío',
  'error.noStagedFiles': 'No hay archivos staged para commitear',
  'error.commitFailed': 'Error al commitear',
  'error.mergeConflict': 'Conflicto al mergear {{branch}}: {{err}}',
  'error.revertFailed': 'Error al revertir el commit {{hash}}: {{err}}',
  'error.discardFailed': 'Error al descartar cambios',
  'error.stageFailed': 'Error al stagear archivo',
  'error.checkoutFailed': 'Error al hacer checkout de {{branch}}',
  'error.createBranchFailed': 'Error al crear la branch {{name}}',
  'error.pushAuth': 'Push fallido: autenticación requerida. Configurá tu cuenta de GitHub.',
  'error.pushGeneric': 'Push fallido: {{err}}',
  'error.pullAuth': 'Pull fallido: autenticación requerida. Configurá tu cuenta de GitHub.',
  'error.pullGeneric': 'Pull fallido: {{err}}',
  'error.terminalFailed': 'No se pudo abrir el terminal',
  'error.stashApplyFailed': 'Error al aplicar stash',
  'error.stashDropFailed': 'Error al borrar stash',
  'error.tokenInvalid': 'Token de GitHub inválido',
  'error.tokenButNoUser': 'Token obtenido pero no se pudo leer el usuario',
  'error.deviceCodeExpired': 'El código expiró antes de autorizar. Probá de nuevo.',
  'error.deviceFlowCancelled': 'Login cancelado o expirado: {{err}}',
  'error.gitignoreFailed': 'Error al agregar al .gitignore',
  'error.resetFailed': 'Error al resetear',
  'error.stashFileFailed': 'Error al stashear archivo',
  'error.openFileFailed': 'No se pudo abrir el archivo',
  'error.deleteFailed': 'No se pudo eliminar',
  'error.lockNotRemoved': 'No se pudo eliminar el lock',
  'error.alreadyIgnored': '"{{path}}" ya estaba en .gitignore',
  'error.cannotMergeSelf': 'No podés mergear una branch en sí misma',
  'error.mergeFailed': 'Error al mergear',
  'error.rebaseFailed': 'Error en rebase',
  'error.rebaseConflict': 'Conflictos durante el rebase sobre {{branch}}. Resolvé y usá "git rebase --continue" en terminal.',
  'error.mergeWithConflicts': 'Conflictos al mergear {{branch}}. Resolvé los archivos y commiteá para completar el merge.',
  'error.fastForwardFailed': 'No se pudo hacer fast-forward',
  'error.renameFailed': 'Error al renombrar',
  'error.deleteBranchFailed': 'Error al eliminar branch',
  'error.pullDivergedManual': 'Pull fallido: las branches divergieron. Hacé checkout y resolvé manualmente.',
};

const en: Dict = {
  // ── Toolbar / Header ──
  'toolbar.openRepo': 'Open repository',
  'toolbar.undo': 'Undo',
  'toolbar.redo': 'Redo',
  'toolbar.pull': 'Pull',
  'toolbar.push': 'Push',
  'toolbar.branch': 'Branch',
  'toolbar.newBranch': 'New branch',
  'toolbar.stash': 'Stash',
  'toolbar.terminal': 'Open terminal in repo',
  'toolbar.settings': 'Settings',
  'toolbar.help': 'Help',
  'toolbar.profile': 'Profile',
  'toolbar.connectGitHub': 'Connect GitHub',
  'toolbar.connectedAs': 'Connected as {{user}}',
  'toolbar.filter': 'Filter (Ctrl + Alt + F)',

  // ── Tabs ──
  'tab.commit': 'Commit',
  'tab.graph': 'Graph',
  'tab.history': 'History',

  // ── Sidebar ──
  'sidebar.local': 'LOCAL',
  'sidebar.remote': 'REMOTE',
  'sidebar.stash': 'STASH',
  'sidebar.tags': 'TAGS',
  'sidebar.worktrees': 'WORKTREES',
  'sidebar.submodules': 'SUBMODULES',
  'sidebar.pullRequests': 'PULL REQUESTS',
  'sidebar.noBranches': 'Open a repo to see branches',
  'sidebar.noStashes': 'No stashes',
  'sidebar.noTags': 'No tags',
  'sidebar.noSubmodules': 'No submodules',
  'sidebar.noPRs': 'No open PRs',
  'sidebar.draft': 'draft',
  'sidebar.openInGitHub': 'Open #{{number}} on GitHub',
  'sidebar.branchTooltip': 'Double click: checkout · Right click: options',
  'sidebar.stashApply': 'Apply stash',
  'sidebar.stashDrop': 'Drop stash',
  'sidebar.upstreamGone': 'Upstream gone',

  // ── Staging ──
  'staging.unstaged': 'Unstaged',
  'staging.staged': 'Staged',
  'staging.stageAll': 'Stage all',
  'staging.unstageAll': 'Unstage all',
  'staging.noUnstaged': 'No unstaged changes',
  'staging.noStaged': 'Stage files to include in the commit',
  'staging.openRepoToSee': 'Open a repo to see changes',
  'staging.commitMsg': 'Commit message (required)',
  'staging.commitMsgShort': 'Commit message',
  'staging.commit': 'Commit',
  'staging.committing': 'Committing...',
  'staging.commitChanges': 'Commit Changes',
  'staging.commitWithCount': 'Commit Changes ({{count}})',
  'staging.resetAll': 'Discard ALL changes (reset --hard)',
  'staging.stageFile': 'Stage this file',
  'staging.unstageFile': 'Unstage this file',
  'staging.discardChanges': 'Discard changes',

  // ── Empty state ──
  'empty.welcome': 'Welcome to GitCron',
  'empty.choose': 'How would you like to start?',
  'empty.openExisting': 'Open existing',
  'empty.openExistingDesc': 'Select a folder that is already a git repo',
  'empty.createNew': 'Create new',
  'empty.createNewDesc': 'Initialize a new repo on your machine',
  'empty.cloneGitHub': 'Clone from GitHub',
  'empty.cloneGitHubDesc': 'Download an existing repo from a URL',
  'empty.loginPrompt': 'Sign in to GitHub to clone private repos',

  // ── Diff Viewer ──
  'diff.noChanges': 'No changes to show',
  'diff.binaryFile': 'Binary file or unparseable diff',
  'diff.backToGraph': 'Back to graph',

  // ── Commit Tab View ──
  'commitTab.workspace': 'Workspace',
  'commitTab.intro': 'Summary of what you have uncommitted. Click any file in the right column to see its colored diff here in the center.',
  'commitTab.cleanTree': 'Working tree clean',
  'commitTab.cleanTreeDesc': 'No uncommitted changes.',
  'commitTab.changesByType': 'Changes by type',
  'commitTab.flow': 'Flow',
  'commitTab.step1': 'Edit files in your editor',
  'commitTab.step2': 'Click the {{plus}} on each file in the right column to stage it',
  'commitTab.step3': 'Write a message in the bottom-right box',
  'commitTab.step4': 'Click {{commit}}',
  'commitTab.step5': 'Click {{push}} to upload to GitHub',
  'commitTab.unstaged': 'Unstaged',
  'commitTab.staged': 'Staged',

  // ── History View ──
  'history.header': 'History · {{count}} commits',
  'history.loading': 'Loading commits...',

  // ── File Status Labels ──
  'fileStatus.modified': 'Modified',
  'fileStatus.added': 'Added (staged)',
  'fileStatus.deleted': 'Deleted',
  'fileStatus.untracked': 'Untracked',
  'fileStatus.renamed': 'Renamed',

  // ── Modals: shared ──
  'modal.cancel': 'Cancel',
  'modal.confirm': 'Confirm',
  'modal.create': 'Create',
  'modal.close': 'Close',
  'modal.understood': 'Got it',

  // ── New Branch ──
  'newBranch.title': 'New branch',
  'newBranch.fromCommit': 'From commit:',
  'newBranch.namePlaceholder': 'feature/my-new-feature',
  'newBranch.create': 'Create',

  // ── Init Repo ──
  'initRepo.title': 'Create new repository',
  'initRepo.name': 'Repo name',
  'initRepo.namePlaceholder': 'my-new-project',
  'initRepo.nameHint': 'Only letters, numbers, dashes, dots and underscores',
  'initRepo.parent': 'Parent folder',
  'initRepo.pickFolder': 'Click to pick folder...',
  'initRepo.willCreate': 'Will be created at: {{path}}',
  'initRepo.alsoOnGitHub': 'Also create on GitHub (private) and connect',
  'initRepo.alsoOnGitHubNeedsAuth': 'Also create on GitHub (sign-in required)',
  'initRepo.creating': 'Creating...',
  'initRepo.createButton': 'Create repository',

  // ── Clone ──
  'clone.title': 'Clone repository',
  'clone.myRepos': 'My GitHub repos',
  'clone.manualUrl': 'Manual URL',
  'clone.search': 'Search...',
  'clone.loading': 'Loading your repos...',
  'clone.noResults': 'No results',
  'clone.urlLabel': 'Repo URL',
  'clone.urlPlaceholder': 'https://github.com/user/repo.git',
  'clone.parentFolder': 'Parent folder',
  'clone.folderName': 'Folder name',
  'clone.folderNamePlaceholder': 'my-repo',
  'clone.destination': 'Destination: {{path}}',
  'clone.cloning': 'Cloning...',
  'clone.cloneButton': 'Clone',

  // ── Settings ──
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.languageDesc': 'Choose the interface language',
  'settings.theme': 'Theme',
  'settings.themeDark': 'Dark',
  'settings.themeLight': 'Light (coming soon)',
  'settings.security': 'Security',
  'settings.viewSecurity': 'View SECURITY.md',
  'settings.about': 'About GitCron',
  'settings.version': 'Version',
  'settings.checkUpdates': 'Check for updates',
  'settings.openExternal': 'Open in browser',
  'settings.dataLocation': 'Your data is stored at: %APPDATA%/GitCron (OS-encrypted)',

  // ── Profile ──
  'profile.notConnected': 'Not signed in',
  'profile.notConnectedDesc': 'Sign in to push/pull, see PRs, and more',
  'profile.signInGitHub': 'Sign in with GitHub',
  'profile.useToken': 'Use personal token',
  'profile.viewOnGitHub': 'View profile on GitHub',
  'profile.copyUsername': 'Copy @{{user}}',
  'profile.signOut': 'Sign out',
  'profile.deviceCodeShown': 'Your browser opened. Enter this code in GitHub:',
  'profile.browserNotOpened': 'If the browser did not open:',
  'profile.waitingAuth': 'Waiting for authorization...',
  'profile.tokenInputDesc': 'If you prefer a Personal Access Token:',
  'profile.tokenGenerate': 'generate one here',
  'profile.tokenScope': 'with scope',
  'profile.tokenVerifying': 'Verifying...',
  'profile.tokenConnect': 'Connect with token',
  'profile.continueWithGitHub': 'Continue with GitHub',
  'profile.starting': 'Starting...',
  'profile.tabOAuth': 'Sign in with GitHub',
  'profile.tabToken': 'Manual token',
  'profile.oauthDesc': 'On click, GitHub opens in your browser (where you are already signed in). You just confirm access for GitCron.',
  'profile.oauthFooter': 'GitCron uses the OAuth Device Flow (no server, no passwords).',

  // ── Context menu: branches ──
  'branchMenu.mergeInto': 'Merge "{{src}}" into "{{dst}}"',
  'branchMenu.rebaseOnto': 'Rebase "{{src}}" onto "{{dst}}"',
  'branchMenu.fastForward': 'Fast-forward to origin/{{branch}}',
  'branchMenu.checkout': 'Checkout (switch to this)',
  'branchMenu.currentBranch': '(current branch)',
  'branchMenu.createFrom': 'Create new branch from here',
  'branchMenu.rename': 'Rename...',
  'branchMenu.delete': 'Delete',
  'branchMenu.copyName': 'Copy name',

  // ── Context menu: commits ──
  'commitMenu.mergeIntoCurrent': 'Merge into current branch',
  'commitMenu.revert': 'Revert commit',
  'commitMenu.checkout': 'Checkout',
  'commitMenu.createBranch': 'Create branch from here',
  'commitMenu.copySha': 'Copy SHA',

  // ── Context menu: files ──
  'fileMenu.stage': 'Stage',
  'fileMenu.unstage': 'Unstage',
  'fileMenu.addToGitignore': 'Add to .gitignore',
  'fileMenu.stashFile': 'Stash this file',
  'fileMenu.openInEditor': 'Open in editor',
  'fileMenu.showInFolder': 'Show in folder',
  'fileMenu.copyPath': 'Copy path',
  'fileMenu.discard': 'Discard changes',
  'fileMenu.delete': 'Delete file',

  // ── Reset All ──
  'resetAll.warning': 'This will discard ALL changes (staged, unstaged and untracked files). Sure?',
  'resetAll.button': 'Discard all',

  // ── Checkout Conflict ──
  'checkoutConflict.title': 'Uncommitted changes',
  'checkoutConflict.desc': 'Cannot switch to {{branch}} because you have changes that would be overwritten. What do you want to do?',
  'checkoutConflict.stashAndSwitch': 'Stash and switch',
  'checkoutConflict.stashAndSwitchDesc': '"Stash and switch" saves your current changes to the stash and does the checkout. You can recover them later from the STASH section.',

  // ── Merge Needs Checkout ──
  'mergeCheckout.title': 'Switch to {{branch}} to merge',
  'mergeCheckout.desc': 'To merge {{src}} into {{dst}}, you need to be on that branch first.',
  'mergeCheckout.button': 'Switch to {{branch}} and merge',

  // ── Rename ──
  'rename.title': 'Rename branch',
  'rename.renaming': 'Renaming:',
  'rename.newName': 'new-name',
  'rename.button': 'Rename',

  // ── Delete Branch ──
  'deleteBranch.title': 'Delete branch',
  'deleteBranch.confirm': 'Delete {{branch}}?',
  'deleteBranch.notMergedWarning': '⚠ This branch has commits that were not merged into any other branch. If you delete it, those commits will be lost (unless you recover them via reflog).',
  'deleteBranch.force': 'Force delete',
  'deleteBranch.delete': 'Delete',

  // ── Help ──
  'help.title': 'Help — How GitCron works',

  // ── Error Toast ──
  'error.removeLock': 'Remove lock',
  'error.removeLockTooltip': 'Deletes .git/index.lock and refreshes state',

  // ── Errors ──
  'error.electronApiUnavailable': 'Electron API not available',
  'error.openRepoFailed': 'Could not open repository',
  'error.openRepoErr': 'Error opening repository',
  'error.noFolderSelected': 'No folder selected',
  'error.notGitRepo': '"{{folder}}" is not a git repository',
  'error.commitEmpty': 'Commit message cannot be empty',
  'error.noStagedFiles': 'No staged files to commit',
  'error.commitFailed': 'Error committing',
  'error.mergeConflict': 'Conflict merging {{branch}}: {{err}}',
  'error.revertFailed': 'Error reverting commit {{hash}}: {{err}}',
  'error.discardFailed': 'Error discarding changes',
  'error.stageFailed': 'Error staging file',
  'error.checkoutFailed': 'Error checking out {{branch}}',
  'error.createBranchFailed': 'Error creating branch {{name}}',
  'error.pushAuth': 'Push failed: authentication required. Set up your GitHub account.',
  'error.pushGeneric': 'Push failed: {{err}}',
  'error.pullAuth': 'Pull failed: authentication required. Set up your GitHub account.',
  'error.pullGeneric': 'Pull failed: {{err}}',
  'error.terminalFailed': 'Could not open terminal',
  'error.stashApplyFailed': 'Error applying stash',
  'error.stashDropFailed': 'Error dropping stash',
  'error.tokenInvalid': 'Invalid GitHub token',
  'error.tokenButNoUser': 'Got token but could not read user',
  'error.deviceCodeExpired': 'Code expired before authorization. Try again.',
  'error.deviceFlowCancelled': 'Login cancelled or expired: {{err}}',
  'error.gitignoreFailed': 'Error adding to .gitignore',
  'error.resetFailed': 'Error resetting',
  'error.stashFileFailed': 'Error stashing file',
  'error.openFileFailed': 'Could not open file',
  'error.deleteFailed': 'Could not delete',
  'error.lockNotRemoved': 'Could not remove lock',
  'error.alreadyIgnored': '"{{path}}" was already in .gitignore',
  'error.cannotMergeSelf': 'Cannot merge a branch into itself',
  'error.mergeFailed': 'Error merging',
  'error.rebaseFailed': 'Error rebasing',
  'error.rebaseConflict': 'Conflicts during rebase onto {{branch}}. Resolve and use "git rebase --continue" in terminal.',
  'error.mergeWithConflicts': 'Conflicts merging {{branch}}. Resolve the files and commit to complete the merge.',
  'error.fastForwardFailed': 'Could not fast-forward',
  'error.renameFailed': 'Error renaming',
  'error.deleteBranchFailed': 'Error deleting branch',
  'error.pullDivergedManual': 'Pull failed: branches diverged. Checkout and resolve manually.',
};

const dicts: Record<Lang, Dict> = { es, en };

export function translate(key: string, lang: Lang = 'es', vars?: Record<string, string | number>): string {
  // Look up in target language, fall back to ES, fall back to the key itself
  let str = dicts[lang][key] ?? dicts.es[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
  }
  return str;
}
