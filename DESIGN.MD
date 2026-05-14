---
name: GitCron Design System
colors:
  surface: '#15121b'
  surface-dim: '#15121b'
  surface-bright: '#3b3842'
  surface-container-lowest: '#0f0d15'
  surface-container-low: '#1d1a23'
  surface-container: '#211e27'
  surface-container-high: '#2c2832'
  surface-container-highest: '#37333d'
  on-surface: '#e7e0ed'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e7e0ed'
  inverse-on-surface: '#322f39'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3b0091'
  primary-container: '#9f78ff'
  on-primary-container: '#330080'
  inverse-primary: '#6d3bd6'
  secondary: '#5cde94'
  on-secondary: '#00391e'
  secondary-container: '#06a662'
  on-secondary-container: '#003119'
  tertiary: '#ffb868'
  on-tertiary: '#482900'
  tertiary-container: '#c9811f'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5417be'
  secondary-fixed: '#7afbae'
  secondary-fixed-dim: '#5cde94'
  on-secondary-fixed: '#00210f'
  on-secondary-fixed-variant: '#00522e'
  tertiary-fixed: '#ffddbb'
  tertiary-fixed-dim: '#ffb868'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#15121b'
  on-background: '#e7e0ed'
  surface-variant: '#37333d'
  bg-base: '#0D0E12'
  bg-surface: '#1A1B23'
  bg-overlay: '#252630'
  border-subtle: '#2D2E39'
  text-primary: '#E1E1E6'
  text-secondary: '#9BA1B0'
  accent-purple: '#8A5CF5'
  git-add: '#2EB872'
  git-delete: '#E94E4E'
  git-mod: '#F5A623'
typography:
  ui-header:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  ui-body:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  ui-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  ui-label-bold:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  ui-small:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  panel-gap: 1px
  container-padding: 1rem
  element-gap: 0.5rem
  list-item-y: 0.25rem
---

# Prompt de UI para Clon de Cliente Git

Crea una maqueta de interfaz de usuario de alta fidelidad para un IDE de escritorio de gestión de Git (un cliente Git moderno), basado en la estética oscura de las capturas de pantalla proporcionadas (inspirado en GitKraken, usando la paleta de colores oscuro y los acentos púrpuras). La maqueta debe generarse como componentes modernos de UI web (por ejemplo, React con Tailwind, o Next.js). La UI debe recrear las siguientes vistas y elementos principales, incluyendo el menú contextual:

**Estilo General:** Tema oscuro técnico, tipografía limpia, iconos de línea, bordes de panel sutiles y botones de acción claramente definidos.

## Vista 1: Panel de Control Principal

* **Diseño:** Un diseño de tres columnas con una barra de herramientas superior.
* **Barra de herramientas superior:** Tabs de repositorio (ej. `Launchpad`, `Portfolio_2026`, `odontoPau`, `Portfolio_2026_astro`). Barra de búsqueda central ("Filter (Ctrl + Alt + F)"). Botones de acción de Git con iconos (`Undo`, `Redo`, `Pull`, `Push`, `Branch`, `Stash`, `Pop`, `Terminal`). Indicador de estado de rama y repositorio actual. Icono de perfil de usuario en la esquina derecha.
* **Columna izquierda (Sidebar):** Categorías expandibles (`LOCAL`, `REMOTE`, `WORKTREES`, `CLOUD PATCHES`, `PULL REQUESTS`, `ISSUES`, `TEAMS`). Debe mostrar la estructura de archivos/ramas, avatares de autor y números de recuento para PRs y Issues.
* **Columna central (Grafo de Commits):** Un árbol visual de commits que usa líneas de colores y nodos de puntos. Una línea de tiempo vertical de mensajes de commit con marcas de tiempo (ej. "1 hour ago"). Incluye avatares de autor junto a los mensajes de commit. Etiquetas de rama (ej. `main`, `14-UpdateInfo`, `11-PortraitHomeImage`).
* **Columna derecha (Detalles del Commit):** Un panel que muestra el hash del commit (`commit: 371838`), un botón "Explain commit", el mensaje de commit completo, información del autor (`Alejandro Delgado`) con avatar y fecha. Sección de archivos cambiados con opciones de visualización (`Path`, `Tree`) y una lista de archivos con indicadores de adición (`+`) y eliminación (`-`).
* **Menú Contextual Interactivo:** Recrea un menú contextual superpuesto. Este menú debe contener una lista de acciones de Git ordenadas: `Pull (fast-forward if possible)`, `Push`, `Set Upstream`, `Fast-forward 14-UpdateInfo to main`, `Merge main into 14-UpdateInfo`, `Rebase 14-UpdateInfo onto main`, `Checkout main`, `Create worktree from main`, `Create branch here`, `Cherry pick commit`, `Reset 14-UpdateInfo to this commit`, `Revert commit`, `Explain Branch Changes (Preview)`, `Rename main`, `Delete main`, `Copy branch name`, `Copy commit sha`, `Copy link to branch: origin/main`.

## Vista 2: Gestión de Repositorios

* **Diseño:** Una vista de cuadrícula/lista para gestionar múltiples repositorios.
* **Sección superior:** Botones de acción principales (`Browse`, `Clone`, `+Init`, `New Workspace`, `Integrations`). Enlace "Manage Cloud Workspaces". Barra de búsqueda ("Search repositories") con casilla de verificación "WIP summary".
* **Grupos de repositorios:** Secciones expandibles/colapsables: `Open repositories`, `Favorites`, `Recent repositories`.
* **Lista de repositorios:** Una tabla con columnas para Nombre del repositorio (ej. `ejercicios`, `odontoPau`, `Portfolio_2026`, `Portfolio_2026_astro`), Usuario Remoto, Nombre de la Rama (`main`), y iconos de acción en el extremo derecho (Sincronización, Ver detalles, etc.).

## Vista 3: Diálogo de Clonación de Repositorio

* **Diseño:** Un diálogo modal superpuesto.
* **Navegación izquierda del modal:** Lista de servicios con iconos: `Clone with URL`, `GitHub.com`, `GitHub Enterprise Server`, `GitLab.com`, `GitLab (Self-Managed)`, `Bitbucket.org`, `Bitbucket Data Center`, `Azure DevOps`.
* **Panel principal (Clone a Repo):**
    * Texto de título: "Clone a Repo".
    * Campos de entrada: `Where to clone to` (con botón 'Browse'), `Repository to clone` (dropdown de búsqueda/selección).
    * Casillas de verificación: `Shallow Clone`, `Sparse Checkout`.
    * Botón principal: `Clone the repo!`.

**Instrucción final:** Genera el código de plantilla y la estructura de componentes para estas vistas, asegurando que la estética oscura y los iconos de línea se mantengan consistentes en todas las partes.