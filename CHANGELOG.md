# Changelog — GitCron

Historial de cambios ordenado de más reciente a más antiguo.
Formato: `[v0.x.x]` con fecha y descripción de cada feature/fix.

---

## [v0.1.3] — 2026-05-15 — Restauración de repo, columnas resizables y colores de branch

### Último repo recordado al reiniciar

- **Nuevo IPC `git:open-path`**: abre una ruta conocida sin dialog (para restauración silenciosa)
- Al abrir cualquier repo (dialog, init, clone, crear en GitHub), la ruta se guarda en `safeStorage` (cifrado OS)
- Al iniciar la app, `restoreLastRepo()` la reabre automáticamente sin intervención del usuario
- Si la carpeta fue movida o borrada → no muestra error, vuelve al empty state normalmente

### Columnas resizables con drag handle

- **Drag handles** (1px, área ampliada) entre el sidebar y el centro, y entre el centro y el panel de detalles
- Cursor `col-resize` al pasar por el borde; borde se vuelve verde neón al hover/drag
- Sidebar: rango 160–400px (default 240px)
- Panel de detalles: rango 240–560px (default 320px)
- Los anchos se guardan en `localStorage` y se restauran entre reinicios

### Colores estables por nombre de branch en el commit graph

- **Hash por nombre**: cada branch siempre muestra el mismo color, derivado de un hash de su nombre
- La branch activa (current) siempre en `#a3f185` (neon green)
- Las ramas remote del mismo nombre comparten color con su local (`origin/main` = mismo color que `main`)
- El shortHash de cada commit se muestra en el color de su lane/branch
- Columna Branch/Tag expandida a **260px** para evitar truncado de chips

### Notificaciones de éxito completadas

- Toast verde para: merge, rebase, fast-forward (faltaban en la sesión anterior)
- Detección de "Already up to date" en merge: toast diferenciado `"X ya estaba integrada — nada para mergear"`
- El IPC `git:merge-branch` ahora devuelve `alreadyUpToDate: true` cuando no había nada para mergear

---

## [v0.1.2] — 2026-05-15 — Fix push en branches nuevas

### Fix de git push sin upstream

- **Auto `--set-upstream` en primer push**: cuando una branch fue creada localmente pero nunca se publicó en `origin`, git fallaba con _"The current branch has no upstream branch"_. Ahora `git:push` y `git:push-branch` detectan ese error y reintentan automáticamente con `git push --set-upstream origin <branch>`, configurando el tracking silenciosamente.
- Toast de éxito diferenciado: "Branch publicada en origin — upstream configurado automáticamente" vs "Push exitoso — cambios subidos al remoto"
- Aplica tanto al botón **Push** del toolbar como al **Push** del context menu de la branch

---

## [v0.1.1] — 2026-05-15 — Polish, feedback y fixes de seguridad

### Mejoras de UX

- **Notificaciones de éxito (toast verde, auto-dismiss 3s)**: commit, push, pull, stash, stash apply, checkout, create branch
- **Search bar funcional**: filtra commits en Graph y History por mensaje, shortHash, autor y email. `Ctrl+Alt+F` enfoca, `Esc` limpia. Badge "filtro activo" en el header. Contador "X de Y commits" en History.
- **Banner WIP en commit details**: cuando hay un commit seleccionado Y hay cambios sin commitear, aparece una barra naranja con botones "Stash" y "Ver cambios →"
- **Botón "limpiar todo" en STASH**: aparece cuando hay más de 1 stash. Click → confirmación inline (Sí/No) antes de ejecutar `git stash clear`
- **Padding izquierdo en columna Branch/Tag del graph**: las chips de branches ya no quedan pegadas al borde del sidebar

### Reducción de tipografía (DESIGN.MD — "chicas las fuentes")

- `text-xl` → `text-lg` (título de empty state "Bienvenido a GitCron")
- `text-2xl` → `text-xl` (título de Commit tab "Workspace")
- `text-3xl` → `text-2xl` (stats cards del Commit tab)
- `text-lg` → `text-base` (4 títulos de modal — via script)

### Fix de contraste (accesibilidad WCAG)

- Toast de error: `text-[#ffa8a3]` → `text-[#ffdad6]` (más visible sobre rojo oscuro)
- Botón Reset All: hover pastel `#ffa8a3` → `#ff8a86` (mantiene legibilidad)
- "Stage all": `hover:text-white` → `hover:text-[#052900]` (verde oscuro sobre verde claro ✓)
- "Unstage all": `hover:text-white` → `hover:text-[#020f1e]` (navy sobre gris ✓)
- Context menus: `hover:bg-[#a3f185] hover:text-white` → `hover:bg-[#a3f185]/20 hover:text-[#a3f185]` (sutil, legible)

### Fix crítico de autenticación

- **GIT_ASKPASS bloqueado por Electron 42**: Electron 42 bloquea `GIT_ASKPASS` en procesos hijos por seguridad. Revertido a URL injection temporal (`https://x-access-token:TOKEN@github.com/...`) con `try/finally` garantizando restauración. Aplica a `git:push`, `git:pull`, `git:pull-branch`, `git:push-branch`, `git:clone`.

### Nuevas acciones

- `git:stash-clear` — elimina todos los stashes a la vez (`git stash clear`)
- `stashClear()` en `use-git-actions.ts` con toast de confirmación
- `SidebarSection` acepta prop `extra` para contenido adicional en el header

---

## [v0.1.0] — 2026-05-14 — Release inicial

### Infraestructura

- Proyecto base: Next.js 15 + Electron 42 + TypeScript 5.9 + Zustand 5
- Bridge IPC tipado via `contextBridge.exposeInMainWorld`
- `safeStorage` para cifrado de preferencias y token en disco (OS keychain)
- `GIT_ASKPASS` para autenticación sin tocar `.git/config`
- Content Security Policy en `<head>`
- Scrollbars estilizados según paleta "The Compiled Soul"
- Tipografía: Inter (interfaz) + JetBrains Mono (código/diff)
- Design system aplicado: navy deep + neon green + flame + cyan, glassmorphism, ghost borders 15%

---

### Gestión de repositorios

- **Abrir repo existente**: dialog nativo del OS (`dialog.showOpenDialog`), valida que sea git repo
- **Crear repo nuevo**: `git init` + README + .gitignore + initial commit opcional, con opción de crear también en GitHub (privado) y clonar automáticamente
- **Clonar repo**: por URL o desde lista de repos del usuario en GitHub (si está logueado), con detección de auth requerida

---

### Commit graph

- Visualización SVG con lanes de colores (algoritmo de lane allocation por branch)
- Branch labels en columna izquierda con chips coloridos:
  - Monitor = branch local
  - Cloud = branch remoto
  - Tag = tag
  - Check = branch activa (current)
- Dots con iniciales del autor del commit
- Conexiones bezier para merges y divergencias entre lanes
- Fila WIP al tope cuando hay cambios sin commitear (dashed circle)
- Decoraciones `--decorate` en el git log: muestra qué branches/tags apuntan a cada commit
- Resalta la branch actual con verde

---

### Staging area (columna derecha)

- Secciones separadas: **Unstaged** arriba / **Staged** abajo
- Stage individual: botón `+` (archivo va a Staged)
- Unstage individual: botón `−` (archivo vuelve a Unstaged)
- Stage all / Unstage all: **batch operation** (un solo `git add <files...>`) para evitar conflictos de `index.lock`
- Commit message textarea + botón "Commit Changes"
- El botón solo está activo si hay archivos staged y hay mensaje
- Recovery de `index.lock`: botón "Eliminar lock" aparece automáticamente en el toast de error cuando el mensaje contiene "index.lock"

---

### Diff viewer

- Click en un archivo del staging → centro muestra el diff
- Número de línea old/new + marcador (+/-) + contenido coloreado
- Verde = líneas añadidas (`#a3f185`)
- Rojo = líneas eliminadas (`#ff716c`)
- Gris = contexto
- Botón "Volver al graph" para cerrar el diff
- Archivos untracked (U): muestra el contenido completo como additions
- Archivos staged: muestra `git diff --cached`
- Archivos modificados: muestra `git diff HEAD`

---

### History view

- Lista cronológica plana de commits (sin SVG)
- Cada fila: shortHash + badges (branches/tags) + mensaje completo + autor + email + fecha relativa
- Click derecho → mismo menú contextual que el graph
- Click → selecciona commit y muestra detalles en columna derecha

---

### Commit tab view

- Vista alternativa del staging con stats en el centro:
  - Cards de Unstaged / Staged count
  - Desglose por tipo de cambio (M/A/D/U/R)
  - Checklist de flujo que se marca automáticamente (paso 2 cuando hay staged)
  - Empty state cuando el working tree está limpio

---

### Branch management

- **Sidebar** con árbol jerárquico: branches agrupadas en carpetas por prefijo (`feature/`, `claude/`, etc.)
- **Ahead/behind counts**: `git for-each-ref --format='%(upstream:track)'` — un solo comando para todas las branches
- **Doble click** en branch: checkout con detección de conflictos (ofrece stash + checkout)
- **Menú contextual** en branch:
  - Merge [branch] into [current]
  - Rebase [current] onto [branch]
  - Fast-forward
  - Checkout
  - Create branch from here
  - Rename (modal con input)
  - Delete (con warning si no fue mergeada)
  - Copy branch name
- **Modales de confirmación** antes de merge, rebase, delete con explicación de consecuencias
- **Stash + checkout automático** cuando checkout falla por cambios sin commitear

---

### GitHub integration

- **OAuth Device Flow**: `POST /login/device/code` → muestra user_code → polling hasta autorización
- **Token manual (PAT)**: alternativa como fallback
- **Persistencia del token**: `safeStorage.encryptString` → archivo `storage.enc` en `%APPDATA%/GitCron`
- **Bootstrap al iniciar**: carga token cifrado → valida con GitHub API → restaura user info
- **Pull Requests**: lista las PRs abiertas del repo actual en el sidebar (si está logueado y el origin es github.com)
- **Push/Pull autenticado**: `GIT_ASKPASS` script + `GITCRON_TOKEN` env var por proceso — token NUNCA en `.git/config`
- **Crear repo en GitHub**: Octokit `repos.createForAuthenticatedUser` con `auto_init: true`

---

### Menús contextuales

- **Commit**: merge into current, revert, checkout, create branch here, copy SHA
- **Branch**: merge, rebase, fast-forward, checkout, create from here, rename, delete, copy name
- **Archivo** (staging panel, click derecho):
  - Stage / Unstage
  - Agregar a .gitignore (+ `git rm --cached` automático si el archivo está trackeado)
  - Stashear este archivo (`git stash push -- <file>`)
  - Abrir en editor (default del OS)
  - Mostrar en carpeta (Explorador de Windows / Finder)
  - Copiar path absoluto al clipboard
  - Descartar cambios
  - Eliminar archivo del disco (con validación de path traversal)

---

### Reset All

- Botón 🗑 en el header de Unstaged
- Banner de confirmación rojo aparece en el top de la pantalla
- Ejecuta `git reset --hard HEAD` + `git clean -fd`

---

### Settings y Profile

- **Menú Settings (engranaje)**:
  - Selector de idioma (ES/EN) con persistencia cifrada
  - Tema (oscuro activo, claro próximamente)
  - Acceso rápido a SECURITY.md
  - Información de versión y stack

- **Menú Profile (avatar)**:
  - Si no logueado: tabs OAuth Device Flow / Token manual
  - Si logueado: avatar + nombre + @login + email
  - Botones: Ver perfil en GitHub, Copiar @username, Cerrar sesión
  - OAuth: muestra user code con botón de copiar + spinner de espera
  - Token manual: input password + validate con Octokit

---

### Internacionalización (i18n)

- **~250 strings** traducidos en `lib/i18n.ts`
- **2 idiomas**: Español (default) / English
- Sistema liviano sin dependencias externas: diccionarios plain JS + hook `useT()`
- Interpolación de variables: `t('error.checkoutFailed', { branch: 'main' })`
- Fallback: EN → ES → key literal
- Persistencia del idioma via safeStorage (se recuerda entre reinicios)
- Hook reactivo: componentes se re-renderizan automáticamente al cambiar idioma

---

### Seguridad (hardening)

- Eliminada inyección de token en URL de remote
- `spawn` con `shell: false` + args array en lugar de `exec` con template strings
- `safeStorage` reemplaza `localStorage` para el token
- Script `gitcron-askpass.cmd/.sh` para autenticación sin exposición en disco
- `Content-Security-Policy` en el `<head>`: `connect-src` limitado a github.com
- `contextIsolation: true`, `nodeIntegration: false` en BrowserWindow
- Validación de path traversal en `fs:delete-file`
- Permisos `0600` en `storage.enc` en Unix
- `GIT_TERMINAL_PROMPT=0` para prevenir prompts interactivos de git

---

### Vistas / Tabs

| Tab | Columna central muestra |
|---|---|
| **Commit** | Resumen del workspace con stats de staging y flujo |
| **Graph** | Commit graph SVG con lanes, WIP row, branch labels |
| **History** | Lista cronológica plana de commits |

---

## Pendiente / En desarrollo

### Multi-repo (próxima feature prioritaria)

- Solapas en la parte superior del header para tener **múltiples repositorios abiertos** simultáneamente
- Cada solapa muestra el nombre del repo
- El estado de cada repo es independiente: branch activa, commit seleccionado, staging, etc.
- Click en una solapa → switch instantáneo sin perder estado del otro repo
- Botón `+` para abrir/clonar un nuevo repo en una nueva solapa
- Botón `×` para cerrar una solapa
- El store de Zustand necesitará una capa de "repos abiertos" similar a las pestañas de un navegador

### Branch context menu (completar)

- Pull específico para una branch
- Push específico para una branch
- Set upstream (vincular branch local con un remote)

### Features futuras

- Light theme
- Auto-fetch en segundo plano (chequear remote cada N minutos)
- Notificaciones del OS
- Carpeta default configurable
- Code signing
- Auto-update
- Multi-cuenta GitHub
- GitLab / Bitbucket
- Atajos de teclado configurables
- Panel de PRs con diff inline y comentarios
