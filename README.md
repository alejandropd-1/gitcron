# GitCron — Advanced Git Client

Cliente git de escritorio construido con tecnologías web modernas. Diseñado para manejar repositorios git de forma visual, intuitiva y segura, directamente desde tu máquina sin depender de servicios externos ni suscripciones.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Framework UI** | [Next.js 15](https://nextjs.org/) — App Router, SSG |
| **UI Library** | [React 19](https://react.dev/) — Hooks, Suspense |
| **Desktop runtime** | [Electron 42](https://www.electronjs.org/) — IPC bridge, safeStorage, dialog |
| **State management** | [Zustand 5](https://zustand-demo.pmnd.rs/) — stores modulares |
| **Git operations** | [simple-git 3](https://github.com/steveukx/git-js) — wrapper sobre git CLI |
| **GitHub API** | [@octokit/rest 22](https://github.com/octokit/rest.js) — REST API + OAuth |
| **Animations** | [Motion (Framer Motion 12)](https://motion.dev/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) — design system "The Compiled Soul" |
| **Typography** | [Inter](https://rsms.me/inter/) + JetBrains Mono (diff/código) |
| **Language** | TypeScript 5.9 strict |
| **Package manager** | pnpm (recomendado) / npm |
| **Bundler Electron** | tsup |

---

## Características

### Gestión de repositorios
- **Abrir** cualquier carpeta git existente vía dialog nativo del OS
- **Crear** un repo nuevo (inicializa con README + .gitignore + initial commit)
- **Clonar** desde cualquier URL o desde tus repos de GitHub con un click
- **Crear en GitHub + clonar** en un solo paso (requiere login)
- **Último repo recordado**: al reiniciar la app, se reabre automáticamente el último repo sin dialog
- **Multi-repo** _(en desarrollo — ver Roadmap)_: solapas para tener varios repos abiertos simultáneamente

### Visualización del historial
- **Commit graph** estilo árbol: líneas de colores, divergencias y merges con curvas bezier
- **Colores estables por branch**: cada branch tiene siempre el mismo color derivado de su nombre (hash); la branch activa siempre en verde
- **Columna Branch/Tag** (260px) con chips coloridos e iconos (local 🖥, remoto ☁, tag 🏷, activa ✓); los chips de remote comparten color con su local
- **Fila WIP** al tope cuando hay cambios sin commitear (con contador de staged/unstaged)
- **Iniciales del autor** dentro de cada dot del grafo, coloreado por lane/branch
- **Vista History**: lista cronológica plana, más cómoda para escanear mensajes largos
- **Vista Commit**: resumen del staging area con flujo paso a paso y stats de cambios

### Staging y commits
- **Columnas separadas** Unstaged ↑ / Staged ↓ — click `+` mueve archivos entre secciones
- **Stage all / Unstage all** con una operación batch (evita conflictos de `index.lock`)
- **Click en archivo** → diff viewer con colores (verde = añadido, rojo = eliminado, números de línea)
- **Commit** real con mensaje, autor y fecha
- **Reset All** con banner de confirmación antes de ejecutar
- **Recovery automático** de `index.lock` con botón en el toast de error
- **Banner WIP** en el panel de commit details cuando hay cambios sin commitear

### Branches
- **Sidebar** con árbol de branches agrupadas en carpetas por prefijo (`feature/`, `claude/`, etc.)
- **Ahead/behind counts** por branch (cuántos commits adelante/atrás del remote)
- **Checkout** via doble click o menú contextual (con detección de conflictos y opción stash-and-switch)
- **Crear, renombrar, eliminar** branches (con confirmación si no está mergeada)
- **Merge** de una branch en otra (con opción de checkout automático previo)
- **Rebase** de la branch actual sobre otra
- **Fast-forward** cuando no hay divergencia
- **Stash** de archivos individuales o de todo el working tree
- **Limpiar todos los stashes** con confirmación inline

### Integración con GitHub
- **OAuth Device Flow** — login vía navegador sin contraseñas ni tokens manuales (igual que `gh auth login`)
- **Token personal** como alternativa manual (PAT)
- **Pull / Push** con autenticación via URL injection temporal (Electron 42 bloquea `GIT_ASKPASS`)
- **Auto `--set-upstream`**: primer push de una branch nueva se publica automáticamente en origin
- **Lista de PRs** abiertas del repo actual en el sidebar (requiere login)
- **Crear repo** en GitHub directamente desde la app
- **Clonar repos privados** de tu cuenta con un click

### Menús contextuales
- **Click derecho en commit**: merge, revert, checkout, crear branch desde el commit, copiar SHA
- **Click derecho en branch**: merge into current, rebase, fast-forward, checkout, create from here, rename, delete, pull, push, copy name
- **Click derecho en archivo**: stage/unstage, add to .gitignore, stash file, abrir en editor, mostrar en carpeta, copiar path, descartar, eliminar

### Feedback y UX
- **Toasts de éxito** (verde, auto-dismiss 3s): commit, push, pull, stash, checkout, create branch, merge, rebase, fast-forward
- **Toasts de error** (rojo): con botón "Eliminar lock" cuando corresponde
- **Filtro de commits**: search bar con `Ctrl+Alt+F`, filtra por mensaje / hash / autor / email en Graph y History
- **Columnas resizables**: arrastrá el borde entre sidebar↔centro y centro↔detalles para ajustar el ancho. Los tamaños persisten entre reinicios.

### Diseño e internacionalización
- Tema oscuro (navy profundo) basado en el design system **"The Compiled Soul"**
- Glassmorphism en header y modales (`backdrop-blur`)
- Separación visual via tonal depth — sin bordes 1px entre columnas
- Scrollbars estilizados según la paleta
- **Idioma**: 🇦🇷 Español (default) / 🇺🇸 English — toggle en Settings, persiste entre sesiones
- ~250 strings traducidos en ambos idiomas

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer (Next.js + React)                                  │
│                                                              │
│  app/page.tsx              UI principal (3 columnas)        │
│  components/CommitGraph    grafo SVG con lanes de colores   │
│  components/DiffViewer     visor de diffs unificados        │
│  hooks/use-git-actions     acciones git (commit, merge...)  │
│  hooks/use-repo-loader     carga de datos del repo          │
│  hooks/use-translation     i18n reactivo al idioma          │
│  lib/git-store             estado global (Zustand)          │
│  lib/i18n                  diccionarios ES/EN (~250 strings) │
└────────────────────────┬────────────────────────────────────┘
                         │  IPC (contextBridge tipado)
┌────────────────────────▼────────────────────────────────────┐
│  Main process (Electron)                                     │
│                                                              │
│  electron/main.ts          50+ handlers IPC                 │
│  electron/preload.ts       bridge seguro al renderer        │
│                                                              │
│  Grupos de handlers:                                         │
│    git:*          operaciones git via simple-git            │
│    github:*       Octokit REST + OAuth Device Flow          │
│    storage:*      safeStorage cifrado por OS                │
│    shell:*        abrir archivo, mostrar en carpeta         │
│    fs:*           operaciones de filesystem                 │
│    terminal:open  abrir terminal en el repo                 │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de datos

```
UI Action → hook → window.api.method() → IPC → main.ts → simple-git / Octokit
                                                                ↓
UI re-render ← Zustand store update ← IPC response ←──────────┘
```

---

## Seguridad

Ver [`SECURITY.md`](SECURITY.md) para el análisis completo. Resumen:

| Aspecto | Implementación |
|---|---|
| **Token de GitHub** | Cifrado en disco via `safeStorage` (DPAPI en Windows, Keychain en macOS) |
| **Token en git** | URL injection temporal durante push/pull (GIT_ASKPASS bloqueado por Electron 42) |
| **CSP** | `Content-Security-Policy` en `<head>` — bloquea scripts y conexiones a dominios no permitidos |
| **Context isolation** | `contextIsolation: true` + `nodeIntegration: false` — el renderer no accede a Node |
| **Spawn seguro** | Terminal con `spawn` + args array, `shell: false` — sin interpolación de comandos |
| **Path traversal** | Validado en `fs:delete-file` — confinado dentro del directorio del repo |

---

## Instalación y desarrollo

### Requisitos
- Node.js >= 22 LTS
- pnpm (recomendado) o npm
- Git instalado en el sistema y disponible en PATH

### Setup

```bash
git clone <repo>
cd gitCronos
pnpm install
```

### Modo desarrollo

```bash
pnpm run electron:dev
```

> **Nota**: cuando cambies archivos en `electron/`, Electron necesita reiniciarse (`Ctrl+C` + `electron:dev`). El frontend tiene hot reload automático.

### Build para producción

```bash
# Requiere configurar electron-builder primero (ver Roadmap > Tier 3)
pnpm run package:win
pnpm run package:mac
pnpm run package:linux
```

### Auditoría de dependencias

```bash
pnpm audit --audit-level=moderate
```

---

## Estructura del proyecto

```
gitCronos/
├── app/
│   ├── layout.tsx          # Root layout (fuente Inter, CSP header)
│   ├── page.tsx            # UI principal — 3 columnas, todos los modales
│   └── globals.css         # Tailwind + scrollbars estilizados
├── components/
│   ├── CommitGraph.tsx     # Grafo SVG de commits con lanes de color
│   └── DiffViewer.tsx      # Visor de diffs unificados
├── electron/
│   ├── main.ts             # Main process: 50+ handlers IPC
│   └── preload.ts          # Context bridge tipado y seguro
├── hooks/
│   ├── use-git-actions.ts  # Commit, merge, push, pull, stash, etc.
│   ├── use-repo-loader.ts  # Carga asíncrona del estado del repo
│   └── use-translation.ts  # Hook i18n reactivo al idioma actual
├── lib/
│   ├── git-store.ts        # Store Zustand — estado global completo
│   ├── i18n.ts             # Diccionarios ES/EN (~250 strings)
│   └── utils.ts            # cn() helper de Tailwind
├── types/
│   └── electron.d.ts       # Interfaces TypeScript del bridge IPC
├── SECURITY.md             # Hardening de seguridad detallado
├── CHANGELOG.md            # Historial de cambios por versión
└── README.md               # Este archivo
```

---

## Design system — "The Compiled Soul"

Basado en el sistema de diseño del portfolio `DESIGN.MD`:

- **Paleta base**: `#020f1e` (navy) → `#a3f185` (neon green) → `#fd9d1a` (flame) → `#5ed8ff` (cyan)
- **Sin bordes duros** para separar secciones — la jerarquía la da el tono del fondo
- **Ghost borders** al 15% cuando son estrictamente necesarios por accesibilidad
- **Glassmorphism**: header y modales con `backdrop-blur-xl`
- **Gradientes** en CTAs primarios: `from-[#a3f185] to-[#68b24f]`
- **Tipografía** Inter (interfaz) + JetBrains Mono (código, hashes, diff)

---

## Roadmap

### ⬜ Tier 1 — Crítico (próximo)

- [ ] **Multi-repo con solapas**: refactor del store para soportar múltiples repos abiertos simultáneamente. Cada solapa = instancia independiente con su propio estado (branches, commits, staging). Persistencia de repos abiertos en safeStorage.

### ⬜ Tier 2 — Importante

- [ ] **Auto-fetch en segundo plano**: `git fetch --all` cada N minutos (configurable en Settings). Actualiza automáticamente los `ahead/behind` counts en el sidebar.
- [ ] **Filtro de commits por branch**: actualmente el search filtra por texto; agregar filtro para ver solo commits de una branch específica.
- [ ] **Carpeta default configurable** para los dialogs de open/clone (guardar en safeStorage).

### ⬜ Tier 3 — Producción / distribución

- [ ] **Setup electron-builder**: agregar `electron-builder` + `cross-env` a devDependencies, configurar sección `"build"` en `package.json`, scripts `package:win/mac/linux`, crear `build-resources/icon.ico`.
- [ ] **Code signing**: certificado EV (~300 USD/año) para Windows NSIS → elimina SmartScreen warning. Apple Developer Account (~99 USD/año) para macOS DMG.
- [ ] **Auto-update via electron-updater**: descarga y aplica updates desde GitHub Releases. Requiere releases firmados.

### ⬜ Tier 4 — Mejoras de UX

- [ ] **Notificaciones del OS**: `new Notification()` cuando termina un push/pull largo (en segundo plano).
- [ ] **Atajos de teclado configurables**: `Ctrl+S` = commit, `Ctrl+P` = push, etc. Modal de listado editable.
- [ ] **Light theme**: segundo set de paleta CSS (mucho trabajo; requiere variables Tailwind o dark/light class toggle).

### ⬜ Tier 5 — Futuro

- [ ] **Multi-cuenta GitHub**: personal + work. Requiere multi-token storage y selector de cuenta por repo.
- [ ] **GitLab / Bitbucket**: OAuth Device Flow específico de cada proveedor.
- [ ] **Panel de PRs con diff inline**: ver los cambios de una PR dentro de la app, con comentarios.
- [ ] **Amend commit**: reescribir el último commit (mensaje o archivos) con `git commit --amend`.
- [ ] **Squash / interactive rebase**: desde la UI, sin terminal.
- [ ] **Cherry pick desde context menu**: ya tiene el item de menú, falta implementar el IPC.

---

## Versión actual

**v0.1.3** — ver [`CHANGELOG.md`](CHANGELOG.md) para el historial completo de cambios.

---

## Licencia

Uso personal. Sin distribución pública por ahora.
