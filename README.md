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
- **Multi-repo** _(en desarrollo)_: solapas en el header para tener varios repos abiertos y cambiar entre ellos sin perder estado

### Visualización del historial
- **Commit graph** estilo árbol: líneas de colores, divergencias y merges con curvas bezier
- **Columna Branch/Tag** con chips coloridos e iconos (local 🖥, remoto ☁, tag 🏷, activa ✓)
- **Fila WIP** al tope cuando hay cambios sin commitear
- **Iniciales del autor** dentro de cada dot del grafo
- **Vista History**: lista cronológica plana, más cómoda para escanear mensajes largos
- **Vista Commit**: resumen del staging area con flujo paso a paso

### Staging y commits
- **Columnas separadas** Unstaged ↑ / Staged ↓ — click `+` mueve archivos entre secciones
- **Stage all / Unstage all** con una operación batch (evita conflictos de `index.lock`)
- **Click en archivo** → diff viewer con colores (verde = añadido, rojo = eliminado, números de línea)
- **Commit** real con mensaje, autor y fecha
- **Reset All** con banner de confirmación antes de ejecutar
- **Recovery automático** de `index.lock` con botón en el toast de error

### Branches
- **Sidebar** con árbol de branches agrupadas en carpetas por prefijo (`feature/`, `claude/`, etc.)
- **Ahead/behind counts** por branch (cuántos commits adelante/atrás del remote)
- **Checkout** via doble click o menú contextual (con detección de conflictos)
- **Crear, renombrar, eliminar** branches
- **Merge** de una branch en otra con detección de conflictos
- **Rebase** de la branch actual sobre otra
- **Stash** de archivos individuales o de todo el working tree

### Integración con GitHub
- **OAuth Device Flow** — login vía navegador sin contraseñas ni tokens manuales (igual que `gh auth login`)
- **Token personal** como alternativa manual (PAT)
- **Pull / Push** con autenticación inyectada vía `GIT_ASKPASS` (el token nunca toca `.git/config`)
- **Lista de PRs** abiertas del repo actual en el sidebar (requiere login)
- **Crear repo** en GitHub directamente desde la app
- **Clonar repos privados** de tu cuenta con un click

### Menús contextuales
- **Click derecho en commit**: merge, revert, checkout, crear branch, copiar SHA
- **Click derecho en branch**: merge into current, rebase, fast-forward, checkout, rename, delete, copy name
- **Click derecho en archivo**: stage/unstage, add to .gitignore, stash file, abrir en editor, mostrar en carpeta, copiar path, descartar, eliminar

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
│  lib/i18n                  diccionarios ES/EN               │
└────────────────────────┬────────────────────────────────────┘
                         │  IPC (contextBridge tipado)
┌────────────────────────▼────────────────────────────────────┐
│  Main process (Electron)                                     │
│                                                              │
│  electron/main.ts          40+ handlers IPC                 │
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
| **Token en git** | Nunca toca `.git/config` — se usa `GIT_ASKPASS` con env vars por proceso |
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

# Con pnpm (recomendado)
pnpm install
```

### Modo desarrollo

```bash
pnpm run electron:dev
```

Levanta en paralelo:
1. **Next.js** en `http://localhost:3000` (hot reload del frontend)
2. **tsup** en modo watch (recompila `electron/main.ts` y `preload.ts` al cambiar)
3. **Electron** cargando desde localhost:3000

> **Nota**: cuando cambies archivos en `electron/`, Electron necesita reiniciarse (`Ctrl+C` + `electron:dev`). El frontend tiene hot reload automático.

### Build para producción

```bash
pnpm run package:win    # → release/GitCron Setup x.x.x.exe + portable
pnpm run package:mac    # → release/GitCron-x.x.x.dmg
pnpm run package:linux  # → release/GitCron-x.x.x.AppImage + .deb
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
│   ├── main.ts             # Main process: 40+ handlers IPC
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

### En desarrollo
- [ ] **Multi-repo**: solapas en el header para tener varios repos abiertos simultáneamente. Cada solapa muestra el nombre del repo y permite cambiar entre ellos manteniendo el estado de cada uno por separado (branch activa, commit seleccionado, etc.)
- [ ] **Branch context menu** completo (merge con checkout automático, rebase, fast-forward, pull/push por branch)

### Próximas features
- [ ] Light theme
- [ ] Auto-fetch en segundo plano
- [ ] Notificaciones del OS al terminar operaciones largas
- [ ] Carpeta default configurable para dialog open/clone
- [ ] Code signing para distribución (.exe firmado → sin SmartScreen warning)
- [ ] Auto-update via GitHub Releases
- [ ] Multi-cuenta GitHub (personal + work)
- [ ] GitLab / Bitbucket (mismo OAuth Device Flow)
- [ ] Atajos de teclado configurables
- [ ] Panel de Pull Requests con diff y review inline

---

## Licencia

Uso personal. Sin distribución pública por ahora.
