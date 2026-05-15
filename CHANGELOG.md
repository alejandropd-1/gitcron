# Changelog — GitCron

Historial de cambios ordenado de más reciente a más antiguo.
Formato: `[v0.x.x]` con fecha y descripción de cada feature/fix.

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
