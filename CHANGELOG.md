# Changelog - GitCron

Changes are listed from newest to oldest.

---

## [v1.8.2] - 2026-06-13 - Staging granular + File History/Blame

### 🟢 Vista Clásica & Core

#### Added
- **Staging por hunk y líneas seleccionadas**: el diff viewer permite preparar, des-preparar y descartar cambios desde bloques o líneas seleccionadas, usando patches aplicados de forma acotada sobre el índice o el working tree.
- **File History por archivo**: el menú contextual de archivos abre un historial read-only basado en `git log --follow -- <file>`, con acceso al diff de cada commit para ese path.
- **Blame por archivo**: el menú contextual suma una vista read-only basada en `git blame --line-porcelain`, agrupando línea, autor, fecha, resumen y hash corto.

#### Changed
- `RepoContentViews.tsx` ahora concentra también las vistas de historial de archivo y blame, además de History/Commit/PR diff/file diff.
- Los handlers IPC de Git agregan operaciones read-only para historial/blame y mantienen validación de paths dentro del repositorio.

#### Quality
- TypeScript compila limpio con `npx.cmd tsc --noEmit`.
- Suite Vitest verde: **18 archivos / 142 tests**.
- Fallow queda en la deuda conocida: 3 issues de dead code (2 exports + 1 type), 8 clone groups, health 261 sobre umbral, MI 90.2.

---

## [v1.8.1] - 2026-06-13 - F1: Cierre de la descomposición de `app/page.tsx`

> Fase de refactor pura, **sin cambios de comportamiento ni de i18n**. Cada tanda cerró con
> `tsc` en 0, **122/122 tests**, Fallow sin regresión (dupes 8, dead-code 4 = baseline) y commit propio.

### 🧱 Modularización (sin cambios de comportamiento)

#### Changed
- **`app/page.tsx`: 2.166 → 1.711 líneas** (−455, −21% en esta fase). Extracciones:
  - **5 modales restantes → `components/RepoActionModals.tsx`**: New Branch, Create Tag, Merge-needs-checkout, Rename Branch y Force Push. Comparten un `ModalShell` interno (backdrop + panel glass + click-outside) para no introducir duplicación nueva.
  - **Panel decorativo LCAR → `components/PageWidgets.tsx`** (`LcarsDecorPanel`), pixel-idéntico.
  - **Lógica del repo chooser → `hooks/use-repo-chooser.ts`** (abrir existente / crear —opcionalmente en GitHub— / clonar, incluyendo el flujo de confirmación de force-push). El hook recibe las funciones del loader por props para no duplicar el watcher de filesystem.
  - **Vistas de diff → `components/RepoContentViews.tsx`** (`PullRequestDiffView` y `FileDiffView`), junto a las ya existentes History/Commit.
- Los handlers que tocan Git permanecen en `page.tsx` y se pasan por props a los componentes/hook extraídos; las claves i18n no cambiaron.

#### Removed
- 2 `useState` muertos en `page.tsx` (`amendCurrentMessage`, `showStashClearConfirm` — este último sigue vivo y en uso en `RepoSidebar.tsx`).
- Bloque grande de imports `lucide-react` sin uso en `page.tsx` (orfanados por las extracciones de esta fase y de fases previas) + imports de `DiffViewer`/`ConflictResolver` ya no usados directamente desde la página.

#### Notes
- La meta de `page.tsx < 1.400 LOC` quedó **pendiente**: el resto vive en el view-switcher central (graph tab clásico + cronométrico), cuya extracción toca área visualmente sensible del grafo y se difiere a una fase futura con validación visual. Reporte completo en [docs/reports/F1_REPORT.md](/docs/reports/F1_REPORT.md).

---

## [v1.8.0] - 2026-06-12 - Modularización Integral + Hardening de Seguridad

### 🛡️ Seguridad (Electron)

#### Added
- **Guard de navegación**: la ventana queda fijada a su origen (`localhost` en dev, `app://` en prod); todo link http(s) externo se abre en el navegador del SO vía `shell.openExternal` y los popups arbitrarios se bloquean (`setWindowOpenHandler` + `will-navigate`/`will-redirect`).
- **Contención de paths en el protocolo `app://`**: el handler valida que el archivo resuelto quede dentro de `out/` (bloquea traversal con `../`) y usa `pathToFileURL` para rutas Windows correctas.
- **Hardening de handlers shell**: `shell:show-in-folder` y `shell:open-item` validan contención dentro del repo; `shell:open-path` enruta URLs https por `openExternal` y solo acepta directorios existentes (ya no puede lanzar ejecutables arbitrarios).

### 🧱 Modularización (sin cambios de comportamiento)

#### Changed
- **`electron/main.ts`: 2.542 → 285 líneas**. Los ~55 handlers IPC ahora viven en `electron/ipc/` por dominio: `git-ops`, `git-sync`, `git-repo`, `github`, `ai`, `shell`, `storage`, `watchers`, `app-window`, con helpers compartidos en `shared.ts`.
- **`hooks/use-git-actions.ts`: 1.272 → 33 líneas**. Ahora es una fachada que compone 6 sub-hooks por dominio en `hooks/git-actions/` (working-tree, branches, history, remote, github-auth, preferences). API pública intacta.
- **`app/page.tsx`: 3.984 → ~2.430 líneas**. Extraídos: `usePanelLayout` (layout/resize persistido), `useAppUpdate` (flujo de updates), `UpdateControls`, `GraphSearchControl`, `BranchFilterDropdown`, `RepoSidebar`, `RepoDetailsPanel`, `PageToasts`, `PageWidgets` y helpers puros en `lib/page-helpers.ts`.

#### Fixed
- **`use-shortcuts`**: el ref de handlers se actualiza en un `useEffect` (antes se escribía durante el render, incompatible con concurrent rendering de React 19).

### 🧹 Limpieza

#### Removed
- 10 exports muertos detectados por Fallow (`runPrediction`, `openingTurnFromBranch`, constantes SQL internas, etc.); Fallow queda en 0 issues con `node:sqlite` y el barrel de `ProviderId` documentados en `.fallowrc.json`.


### 🔵 Vista Cronométrica

#### Changed
- **Viewport estable al crear commits**: La vista cronométrica deja de recentrar el canvas cuando solo cambia el tamaño del mundo por un commit nuevo; el reset visual se mantiene al cambiar de repositorio.

#### Added
- **Entrada animada de commits nuevos**: Los hashes recién incorporados entran con fade y el conector principal se dibuja progresivamente desde el commit padre, respetando `prefers-reduced-motion`.

---

## [v1.7.0] - 2026-06-03 - Optimización Estructural: Componentización de Paneles, Modales y Correcciones de Visibilidad

### 🔵 Vista Cronométrica — Temporal Agent

#### Changed
- **Brief copiable en Materializar Futuro**: El preview de materialización separa la metadata fija (`branch`, `tag`, nivel de vuelo, tipo, confianza y commit) del bloque copiable para agentes. El `IDEA.md` creado en la rama real conserva el contenido completo, pero el botón de copiar ahora toma solo el brief de ejecución.

### 🟢 Vista Clásica & Core

#### Refactored
- **Extracción de Ajustes (SettingsPanel)**: Movimos todas las secciones de configuración (idioma, tema, tamaño de fuente, carpeta predeterminada, vista cronométrica, auto-fetch, notificaciones del sistema, atajos de teclado, seguridad, actualizaciones, temporal agent y acerca de) a un componente separado en [SettingsPanel.tsx](file:///c:/www/gitCronos/components/SettingsPanel.tsx). Esto limpia también las funciones auxiliares de renderizado del tope del archivo.
- **Extracción de Ayuda (HelpPanel)**: Mapeamos la documentación y los tutoriales de flujo Git a [HelpPanel.tsx](file:///c:/www/gitCronos/components/HelpPanel.tsx).
- **Extracción de Perfil de GitHub (ProfilePanel)**: Centralizamos los flujos de inicio de sesión mediante OAuth (código de dispositivo) y Token Personal de GitHub a [ProfilePanel.tsx](file:///c:/www/gitCronos/components/ProfilePanel.tsx).
- **Extracción de Modales de Acción (RepoActionModals)**: Modulamos los modales de Checkout Conflict, Reset All Confirmation, Clean Untracked, Amend Last Commit y Squash Commits en [RepoActionModals.tsx](file:///c:/www/gitCronos/components/RepoActionModals.tsx).
- **Reducción de Complejidad de `app/page.tsx`**: El archivo monolito principal bajó de **4883 LOC** a **3926 LOC** (un ahorro neto acumulado de **957 líneas de código**), bajando la complejidad cognitiva del componente principal a **398**.

#### Fixed
- **Chip de Futuros en Vista Clásica**: Corregimos el bug por el cual el tag cyan `"N futuros →"` se seguía mostrando en la cabecera del grafo clásico aun cuando el usuario desactivaba la línea de tiempo cronométrica desde la configuración de preferencias.

#### Quality
- **Type Safety intacta**: TypeScript compila de forma perfectamente limpia con `npx.cmd tsc --noEmit`.
- **Suite de Pruebas**: Confirmamos que las 80 pruebas unitarias en 9 archivos pasan con éxito total.
- **Mantenibilidad Global**: Fallow confirma que el maintainability index general del proyecto se mantiene excelente en `90.9 (good)`.

## [v1.6.8] - 2026-06-02 - Optimización, Componentización y Handoff de Mantenibilidad

### 🟢 Vista Clásica & Core

#### Refactored
- **Componentización de `app/page.tsx` sin pérdida funcional**: Extrajimos piezas de UI vivas hacia componentes dedicados para reducir el tamaño de la página principal sin tocar los flujos de idioma, predicción de futuros, grafo clásico/cronométrico, stash avanzado, limpieza de untracked ni resolución de conflictos.
- **Tab bar modular**: Las pestañas multi-repo con drag-to-reorder viven ahora en `components/RepoTabs.tsx`, conservando `motion/react`, mitigación de clicks durante drag y controles de ventana Electron.
- **Sidebar modular**: La navegación lateral de ramas locales/remotas, agrupadores, stashes, tags y submódulos se concentró en `components/RepoSidebarParts.tsx`, manteniendo colores de rama, ahead/behind, checkout remoto, acciones hover y descarte de branches `imagined/*`.
- **Confirmaciones destructivas reutilizables**: Los diálogos de eliminar branch/futuro materializado, eliminar tag y descartar archivo usan `components/DangerConfirmDialog.tsx`, reduciendo JSX repetido y manteniendo los callbacks async originales.
- **Vistas internas separadas**: `HistoryView` y `CommitTabView` viven en `components/RepoContentViews.tsx`, con `lib/display-format.ts` como helper común de fechas e iniciales.
- **Parsing de proveedores de IA centralizado**: `electron/ai/provider-parsing.ts` concentra normalización, extracción de JSON tolerante y shape mapping para Claude/OpenRouter, evitando duplicación entre adapters.
- **Loader de repos más selectivo**: `hooks/use-repo-loader.ts` usa selectores más granulares de Zustand y helpers de refresh/persistencia, reduciendo renders derivados de suscripciones amplias.
- **Helpers del flujo Crear Repo/GitHub**: `app/page.tsx` ahora nombra explícitamente la construcción de path, detección de push rechazado y recuperación de clone URL ante repos GitHub existentes, bajando la complejidad del handler de creación.

#### Quality
- **Validación estática y tests verdes**: `npx.cmd tsc --noEmit` y `pnpm test` pasaron después de la tanda de refactors. La suite reportó 9 archivos de test y 80 tests OK.
- **Fallow actualizado**: No hay dead files ni dead exports. La mantenibilidad global queda en `90.9 (good)`. La duplicación baja de `4.5%` a `4.3%`, aunque Fallow todavía falla por deuda de duplicación y complejidad conocida.
- **`app/page.tsx` reducido**: El cuerpo principal bajó de aproximadamente 5.4k LOC a 4.8k LOC durante esta optimización, pero sigue siendo el objetivo principal para próximas extracciones.

#### Remaining
- **Pendientes principales de saneamiento**: Fallow sigue marcando `app/page.tsx`, `hooks/use-git-actions.ts`, `hooks/use-repo-loader.ts`, `components/ChronometricGraph.tsx`, `components/StagingPanel.tsx` y tests diagnósticos de grafo como próximos objetivos.
- **Duplicación aún presente**: Persisten clone groups entre `CommitGraph.tsx`/tests diagnósticos, `ChronometricGraph.tsx`/tests diagnósticos, algunas ramas de error en `electron/main.ts` y operaciones parecidas en `use-git-actions.ts`.

---

## [v1.6.7] - 2026-06-02 - Auditoría General de Operaciones Git

### 🟢 Vista Clásica & Core

#### Added
- **Auditoría Exhaustiva de Operaciones Git**: Completamos un inventario profundo del código vivo de la aplicación (v1.6.5/v1.6.6) para mapear el estado real de las funcionalidades básicas de Git.
- **Plan de Backlog**: Registramos en la documentación el listado completo de operaciones Git faltantes o parcialmente implementadas para priorizar futuros desarrollos sin duplicados.
- **Clean untracked en bloque**: El panel de staging ahora muestra `Limpiar...` cuando hay archivos sin trackear. La acción abre un modal con checklist basado en un dry-run fresco de `git clean -n -d`, permite seleccionar archivos individuales y borra únicamente los paths elegidos después de una advertencia explícita de eliminación física del disco.
- **Stash avanzado**: El botón Stash ahora abre un modal para nombrar opcionalmente el stash. Cada stash en la barra lateral suma acciones hover para previsualizar archivos/diff, aplicar sin remover, hacer `pop` aplicando y removiendo, o eliminarlo.
- **Editor interactivo de conflictos**: Los archivos con conflictos ahora muestran un resolver por bloques dentro del Diff Viewer. Cada hunk permite elegir Local, Entrante, combinar ambos órdenes o editar el resultado final; al guardar, GitCron escribe el archivo resuelto, valida que no queden marcadores y lo stagea automáticamente.

---

## [v1.6.6] - 2026-05-31 - Temporal Agent — Predicción de Ramas Futuras con IA

### 🔵 Vista Cronométrica — Temporal Agent (Beta)

#### Added
- **Temporal Agent funcional end-to-end**: La feature de predicción de ramas especulativas ahora funciona completamente. El agente envía contexto del repositorio a OpenRouter, recibe predicciones de la IA y las dibuja como ramas punteadas semitransparentes sobre la diagonal cronométrica.
- **Dropdown de modelos de IA**: Selector de modelo en Settings → Temporal Agent con 7 modelos verificados de OpenRouter — Gemini 3 Flash, Gemini 3.5 Flash, DeepSeek V4 Pro, MiMo V2.5 Pro, MiniMax M2.7, Claude Sonnet 4.5 y GPT-5.5, más opción "Custom" para modelos no listados. Cada modelo muestra su precio por millón de tokens.
- **Fingerprint de API key (SHA-256)**: La validación de API key ahora usa un hash criptográfico irreversible en lugar de enviar caracteres reales al renderer. El usuario ve una huella de 8 hex que permite identificar cuál key está cargada sin exponer el secreto.
- **Feedback de guardado en Settings**: Toast "Guardado ✓" (se auto-oculta a los 3s) y resumen persistente de la configuración activa (modelo, scope, threshold, frequency, focus areas) debajo del botón Save.
- **Auto-prender FUTUROS tras predicción**: Al disparar "Predecir futuros", el toggle FUTUROS se activa automáticamente si la IA devuelve ramas. No hay que ir al grafo a prenderlo manualmente.
- **Chip "N futuros →" en vista clásica**: Cuando hay predicciones disponibles, la cabecera del grafo clásico muestra un chip cyan que al clickear cambia a vista cronométrica y prende FUTUROS automáticamente.
- **Labels especulativas legibles**: Los textos de las ramas futuras ahora usan word-wrap multilínea (sin truncamiento con puntos suspensivos). Mayor espaciado entre ramas (`reach: 320`, `fanFactor: 60`) para evitar amontonamiento.
- **Parser de IA tolerante**: `parseBranches()` ahora extrae JSON de respuestas con markdown, texto adicional o formato impreciso. Loguea ramas válidas y descartadas para diagnóstico.

#### Changed
- **Panel CENTAURO sin competencia**: Se eliminó la card `CHRONO_DEPTH` (radar verde con conteo de nodos y rango de fechas) del HUD inferior. El panel CENTAURO ahora ocupa ese espacio sin competir visualmente con los detalles de commit del panel derecho.
- **Prompt de IA más explícito**: El system prompt ahora incluye el schema JSON exacto esperado (`id`, `message`, `rationale`, `type`, `confidence`) y pide rationales de máximo 100 caracteres para evitar truncamiento.
- **`max_tokens` ampliado**: De 1024 a 2048 tokens. El modelo anteriormente truncaba el JSON a mitad de una string.

#### Fixed
- **Error handling en Settings**: El botón Save ahora tiene try/catch y muestra mensajes de error visibles en naranja si falla la persistencia.
- **Toggle FUTUROS corregido**: Se revirtió un cambio que movía `showSpeculative` al store de Zustand, lo cual impedía que el toggle funcionara al cambiar de vista. Ahora usa `useState` local que sobrevive correctamente entre Settings y Graph.
- **Puerto 3001 EADDRINUSE**: El servidor Next.js en dev ahora usa puerto 3001. Si queda un proceso zombie, matarlo con `netstat -ano | findstr :3001` + `taskkill /PID <pid> /F`.

---

## [v1.6.5] - 2026-05-26 - Changelog Integrado en Buscar Actualizaciones

### 🟢 Vista Clásica & Core

#### Added
- **Cambios Recientes dentro de Buscar Actualizaciones**: La pantalla de Configuración → Buscar actualizaciones ahora muestra una sección de **Cambios recientes** alimentada desde el `CHANGELOG.md` local. La última versión queda expandida por defecto y las versiones anteriores se muestran como historial colapsable para una lectura rápida, contextual y sin salir de GitCron.
- **Parser de Changelog para UI de Usuario**: Se incorporó un parser liviano que transforma el Markdown del changelog en tarjetas legibles, agrupando cambios por versión, fecha, área y tipo de cambio (`Novedades`, `Correcciones`, `Mejoras internas`, etc.) en lugar de mostrar el archivo crudo.
- **Bridge IPC para Changelog Local**: Electron expone `app:get-changelog` mediante preload seguro (`window.api.getChangelog()`), leyendo el changelog desde el workspace en desarrollo y desde recursos empaquetados en producción.

#### Changed
- **GitHub Releases como Acción Secundaria**: La experiencia principal para entender qué cambió queda dentro de la app, mientras que GitHub Releases se mantiene como enlace complementario de historial completo para usuarios técnicos.
- **Empaquetado del Changelog**: `CHANGELOG.md` se incluye en `extraResources` para que la vista de Cambios recientes funcione también en builds instalados, sin depender de red ni de GitHub.
- **Flujo de Inicio de Repositorios Integrado**: Las acciones **Abrir existente**, **Crear nuevo** y **Clonar de GitHub** reemplazan el chooser central y los modales flotantes por una navegación real desde el sidebar izquierdo, usando la misma arquitectura visual que Configuración, Ayuda y Perfil.
- **Panel Central de Repositorios**: Los formularios de creación, apertura y clonado ahora se muestran en un cuerpo central acotado, con card glass, fondo de sección consistente y contenido preparado para lectura y operación sin estirarse a todo el ancho.

#### Fixed
- **Aislamiento Visual de Repositorios**: Al entrar en Abrir / Crear / Clonar se ocultan el TCAR/LCAR y el selector Clásico/Cronométrico para evitar superposiciones y mantener el mismo fondo limpio de las vistas de Perfil, Ayuda y Configuración.
- **Transición de Regreso al Graph**: Se corrigió la animación de resize/slide al volver al repositorio desde las vistas de repositorios, incluyendo el botón **Volver al Repositorio** y la flecha del sidebar izquierdo. El cambio ahora se comporta como el resto de paneles integrados, con salida sin deformar el contenido.

---

## [v1.6.4] - 2026-05-26 - Máscara Curva Bézier de Precisión en Grafo Cronométrico y Reordenamiento Dinámico de Pestañas

### 🟢 Vista Clásica & Core

#### Added
- **Reordenamiento de Pestañas por Arrastre (Drag-to-Reorder Repo Tabs)**: Integración de la API `<Reorder.Group>` y `<Reorder.Item>` de `motion/react` sobre las pestañas de repositorios abiertos en la barra superior. Los usuarios ahora pueden ordenar visualmente sus pestañas arrastrándolas horizontalmente, con mitigación de clics falsos mediante referencias de estado durante el arrastre (`isDraggingRef`), previniendo autoselecciones indeseadas al reordenar pestañas.
- **Paneles Laterales Integrados para Configuración, Ayuda y Usuario**: Reemplazo completo de los antiguos modales flotantes por paneles semánticos integrados en el layout principal. Los contenidos se adaptan fluidamente a la anchura del contenedor (`w-full` y `max-w-2xl` para el perfil de usuario), eliminando límites heredados del contenedor modal.
- **Transición Suave de Desvanecimiento Puro (Fade-Only)**: Eliminación definitiva de las distorsiones de escalado bruscas por defecto. Implementación de transiciones puras basadas en opacidad para una experiencia visual de alta gama al abrir/cerrar paneles de Ajustes, Ayuda o Perfil de usuario.
- **Guardia de Hidratación de Josh W. Comeau**: Implementación de una barrera de renderizado síncrono en el cliente para erradicar discrepancias de hidratación SSR, introduciendo una pantalla de carga y esqueleto premium durante la sincronización inicial.

### 🔵 Vista Cronométrica (Beta)

#### Added
- **Máscara en Curva Bézier de Precisión (Solid Curved Bézier Backing Mask)**: Rediseño completo del sólido de ocultación derecho usando curvas Bézier cúbicas (`C`) en lugar de segmentos poligonales rígidos. Logramos una silueta perfectamente fluida, orgánica y circular que calza de manera idéntica al milímetro con el barrido del arco del SVG LCARS decorativo de la consola.
- **Enmascarado con Degradado sobre el Canvas del Grafo (Linear Gradient Canvas Masking)**: Implementación de un `mask-image` / `-webkit-mask-image` de CSS directamente sobre el `<svg>` del lienzo del grafo cronométrico (`components/ChronometricGraph.tsx`). Las líneas y commits ahora se desvanecen suavemente a transparente (`opacity: 0`) entre los `370px` y `220px` antes del borde derecho, ocultándolos por completo antes de aproximarse al panel.
- **Bordes y Esquinas Ultra-Nítidos (Cero Neblinas de Borde)**: Eliminamos los filtros de desenfoque y capas de corte del fondo decorativo que desbordaban la pantalla superior, inferior y lateral. La máscara curvo-vectorial ahora es 100% sólida y perfectamente nítida, permitiendo que el grafo se funde de forma invisible antes de tocar la consola.

#### Fixed
- **Visualización Condicional por Contexto (Context-Aware Layout Mounting)**: Restringimos la visualización del panel decorativo e interactivo LCARS y su máscara de ocultación para que solo se rendericen en el DOM si el usuario está activamente en la solapa de **`Graph`** (`activeTab === 'Graph'`) y no hay ningún visualizador de Diff de archivos (`selectedFile`) o Pull Request abierto. Esto soluciona la superposición visual en las vistas de **Commit**, **History** y lectura de diferencias de código.
- **Comportamiento Cohesivo del TCAR y Sidebar**: Ocultamiento dinámico inteligente de la barra lateral técnica derecha (TCAR) y el switch clásico/cronométrico al navegar hacia los paneles de Configuración, Ayuda o Ajustes de Usuario. Ahora la interfaz se comporta de manera simétrica en todas las vistas de administración y configuración global.

---

## [v1.6.3] - 2026-05-25 - Tooltips Flotantes Premium, Control de Word-Wrap en Diff y Transición Suave de Layout

### 🟢 Vista Clásica & Core

#### Added
- **Word-Wrap Toggle en Diff Viewer**: Incorporación de un botón interactivo premium en la cabecera del visor de diferencias (a la izquierda de la etiqueta 'MODIFIED') que permite alternar instantáneamente entre modo de ajuste de línea ("wrap text") y modo continuo ("align left"). Incluye iconos interactivos customizados (`<WrapText>` y `<AlignLeft>`).
- **Atajo de Teclado Global `Alt+Z`**: Implementación de una escucha global de teclado (`Alt+Z` o `Option+Z`) para alternar rápidamente el modo de ajuste de línea en el visor de diferencias actual, emulando la experiencia del editor de Visual Studio Code.

#### Fixed
- **Fondo de Líneas Completas en Diff Viewer**: Corrección de la anchura del fondo destacado de las líneas agregadas (verde) y eliminadas (rojo) en `components/DiffViewer.tsx`. El color de fondo ahora se expande horizontalmente a lo largo de toda la extensión del texto con scroll horizontal, eliminando el corte abrupto del color al desplazarse a la derecha.
- **Transición Suave de Layout en Cambio de Vistas**: Implementación de la técnica de diseño de Josh W. Comeau para evitar distorsiones visuales ("squishing" / encogimiento) en el lienzo del grafo y en el visor de diferencias. Extendimos el bypass de transición temporal (`isTabChanging`) activándolo de forma síncrona e instantánea directamente en los controladores de eventos principales: cambio de solapas (`handleTabChange`), selección de archivos/diffs (`handleSelectFile` y el click en la lista de archivos de un commit), selección de Pull Requests (`handleSelectPullRequest`) y cierre del diff (`handleCloseDiff`). Esto asegura de manera absoluta que al alternar vistas, el tamaño del contenedor principal `<main>` cambie síncronamente en 0ms y el contenido se revele con una animación fluida de opacidad sin deformaciones.
- **Animación de Fundido (Fade-In) en Visor de Diferencias**: Envolvimos las secciones del panel de detalles de Pull Request (`selectedPullRequest`) y visor de diferencias de archivos (`selectedFile`) en elementos `<motion.div>` con claves e inicializadores de Framer Motion. Esto elimina la aparición instantánea o la distorsión física por defecto, logrando que el diff del archivo se hidrate con un fundido de opacidad impecable y fluido.

### 🔵 Vista Cronométrica (Beta)

#### Added
- **Tooltips Flotantes de Altísima Fidelidad con React Portal**: Rediseñamos los tooltips de información interactiva en `components/ChronometricGraph.tsx` para proyectarse en la raíz del documento (`document.body`) mediante `createPortal`. Esto garantiza de forma absoluta que los tooltips floten sobre cualquier barra lateral o elemento z-index, eliminando superposiciones o recortes visuales.
- **Líneas Conectoras de Curva Bezier Cúbica en Amarillo**: Implementación de elegantes curvas Bezier interactivas en color amarillo vibrante (`git-mod` de `DESIGN.MD`) que conectan dinámicamente el nodo enfocado con su tooltip flotante correspondiente.
- **Efecto Radial Breath en Nodo Seleccionado**: Se añadió un aro circular concéntrico más grande con un `radialGradient` animado que realiza una transición de respiración ("breathing effect") suave al seleccionar un nodo en la línea de tiempo.

---

## [v1.6.2] - 2026-05-25 - Saneamiento Estático de Fallow y Simplificación Visual Cronométrica

### 🟢 Vista Clásica & Core

#### Refactored
- **Modularización de Preferencias (Análisis de Fallow)**: Extrajimos la hidratación individual de preferencias desde storageGet en `use-git-actions.ts` hacia helpers puros e independientes a nivel de módulo (`bootstrapLanguage`, `bootstrapFontSize`, `bootstrapDefaultFolder`, `bootstrapAutoFetch`, `bootstrapOsNotifications`, `bootstrapShortcuts`, `bootstrapTheme`, `bootstrapCronometric`), simplificando `bootstrapPreferences` de forma drástica y reduciendo su complejidad cognitiva en un 90%.
- **Optimización Algorítmica del Grafo (`computeGraph`)**: Extrajimos la lógica matemática de asignación de carriles (`getOrCreateLaneForCommit`) y propagación de conexiones de commits padres (`calculateConnections`) en `components/CommitGraph.tsx` hacia funciones puras externas a nivel de módulo, reduciendo su complejidad cognitiva de `30` a menos de `8` y removiendo este componente de la lista de hotspots críticos de Fallow.
- **Remoción de Exportaciones Muertas**: Saneamos quirúrgicamente interfaces y constantes de `CommitGraph.tsx` sin uso externo para limpiar el árbol de dependencias públicas.
- **Maintainability Score de 90.0%**: La suite completa de saneamiento e incremento de calidad de código elevó el índice de mantenibilidad global de GitCron al **90.0% ("Good")**.

### 🔵 Vista Cronométrica (Beta)

#### Added
- **Simplificación Visual y Declutter del HUD**: Removimos elementos estéticos decorativos invasivos del lienzo cronométrico para una visualización inmersiva ultra-limpia y moderna:
  * Eliminamos la red de radar de círculos punteados concéntricos de fondo sobre toda la vista.
  * Eliminamos las guías y marcos angulares sólidos de color neón en las 4 esquinas perimetrales de la pantalla, logrando una sensación minimalista y espaciosa de "Full Bleed" que prioriza el árbol de commits.

---

## [v1.6.1] - 2026-05-25 - Preservación de Layout Flotante y Corrección de Vista por Defecto

### 🔵 Vista Cronométrica (Beta)

#### Fixed
- **Preservación del Layout Flotante Unificado**: Rediseñamos `graphMode` en `app/page.tsx` para ser estrictamente `'chronometric'` en todo momento. Esto asegura que la envoltura premium glassmorphic de la aplicación (RepoTabs, Header y Sidebars izquierdo/derecho flotantes) permanezca activa de forma permanente, independientemente del estado del Feature Flag en Ajustes. Se eliminó la regresión visual al antiguo layout plano e inline.
- **Comportamiento por Defecto en Nuevos Proyectos**: Implementamos la variable reactiva `activeGraphMode = enableCronometric ? rawGraphMode : 'classic'` y la utilizamos para renderizar condicionalmente el `<CommitGraph>` clásico o el `<ChronometricGraph>` diagonal. Esto soluciona un problema por el cual proyectos recién abiertos o sin preferencia guardada (como `odontoPau`) arrancaban de forma predeterminada en la vista cronométrica al tener la bandera experimental activada en Ajustes, respetando ahora la vista clásica vertical por defecto.
- **Chequeo de Tipos TypeScript**: Envolvimos la definición de `graphMode` en un helper de función `getGraphMode()` para evitar que el motor de inferencia de control de flujo de TypeScript estreche el tipo a un único literal `'chronometric'`, resolviendo un error de compilación estática al compararlo con `'classic'`.

---

## [v1.6.0] - 2026-05-25 - Vista Cronométrica Avanzada: Nodo HEAD Agrandado, HUD de Alta Fidelidad y Animación Temporal

### 🔵 Vista Cronométrica (Beta)

#### Added
- **Nodo HEAD Agrandado al Doble**: Rediseñamos el nodo HEAD activo en la línea de tiempo cronométrica para otorgar una presencia imponente en el lienzo:
  * El círculo core del commit ahora posee un radio de `21` (diámetro de `42px`) y su grosor de borde se incrementó a `4` (o `6` cuando está seleccionado).
  * Las iniciales de autoría del comitente dentro del círculo se escalaron proporcionalmente de un tamaño de fuente de `fs(7.5)` a `fs(15)` para una legibilidad superior.
  * Las guías concéntricas de hover y selección se incrementaron a radios de `28` y `30` respectivamente.
- **Retículo Star Trek LCARS Táctico Estático**: Reemplazamos el indicador concéntrico por defecto con la intrincada e increíblemente detallada geometría del SVG LCARS personalizado (`lcar-29-main-branch.svg`):
  * Centrado quirúrgicamente en las coordenadas de HEAD y escalado a `scale(0.18)` para enmarcar con holgura al nuevo nodo gigante.
  * Se removió por completo la animación de rotación (`animation: 'spin 28s...'`) haciéndolo estable y estático para lograr una estética de radar militar de alta precisión de ciencia ficción.
- **HUD de Telemetría con Mayor Aire**: Ampliamos la visualización de metadatos del HUD de telemetría de HEAD:
  * Incrementamos la separación vertical entre líneas de texto de `12` a `16` para darles un aspecto mucho más espacioso y premium.
  * Elevamos la separación física (`baseClearance`) de la primera línea respecto al centro de `52` a `78`, extendiendo dinámicamente la línea de conexión HUD punteada.
- **Evasión Dinámica de Fechas y Ticks (`isNearHead`)**: Añadimos un desvío inteligente en el canvas para evitar solapamientos de texto con el retículo:
  * Las etiquetas técnicas extremas del canvas (`[CHRONO_START // T_MIN]` y `[CHRONO_END // T_MAX]`) se separaron a `95px` de distancia de las puntas de la diagonal.
  * Implementamos un cálculo que evalúa si la marca cronológica (ej. `T+005`, `24 may`) está a menos de `80px` de HEAD; si es así, la desplaza automáticamente `95px` hacia abajo y estira su dotted guía de conexión a `90px`.
- **Animación del Flujo Cronológico en las Conexiones**: Diseñamos una corriente de datos luminosa que recorre la línea de tiempo principal:
  * Declaramos una animación keyframe `@keyframes chrono-flow` que modula la opacidad (entre `0.18` y `0.9`) y desplaza el `stroke-dashoffset` en un loop continuo de 3 segundos.
  * Dividimos los conectores del grafo en una base sólida y una sobrecapa punteada (`strokeDasharray="4 6"` y `"3 3"` para fusiones) que transporta el flujo de luz.
  * Revertimos el trazado del overlay punteado de padre (`px, py`) a hijo (`cx, cy`) para forzar a los impulsos de luz a fluir visualmente de forma cronológica (del pasado al presente).
  * Aplicamos un retardo dinámico de inicio (`animationDelay`) calculado con el residuo del índice del commit (`${(node.chronologicalIndex * 0.4) % 3}s`) para crear una onda staggered que viaja tramo a tramo.

#### Fixed
- **Área Interactiva y Hit-Testing de HEAD**: Solucionamos un bloqueo de clics e interacciones sobre el nodo HEAD:
  * Añadimos la clase `pointer-events-none` al contenedor del retículo LCARS para que los clics pasen a través del overlay.
  * Cambiamos el relleno y el trazo del círculo core de HEAD de `'none'` a `'transparent'`, logrando que el círculo sea 100% invisible para apreciar el fondo y las iniciales libres, pero manteniendo activa su superficie física interactiva para el hit-testing. Esto habilita perfectamente la manito de selección (`cursor-pointer`) y la apertura del panel de detalles al hacer clic.

---

## [v1.5.0] - 2026-05-24 - Unificación en Rama Única con Feature Flags & Aislamiento Estético

### 🟢 Vista Clásica & Core

#### Added
- **Unificación Segura bajo Feature Flags (Trunk-Based Development)**: Integración completa de la vista clásica estable y el nuevo motor cronométrico interactivo en un único flujo de trabajo unificado (`16-FlagToggle`), eliminando la necesidad de mantener ramas paralelas propensas a desajustes de versiones y conflictos de código:
  * **Feature Flag Core (`enableCronometric`)**: Variable global en el store Zustand persistida de forma encriptada en el llavero de Electron (`safeStorage` con la clave `'enableCronometric'`), apagada por defecto (`false`) para resguardar con total garantía la estabilidad de la vista clásica en producción.
  * **Toggles de Activación**: Añadido un interruptor ilustrado en el modal de Ajustes / Settings para que los desarrolladores activen dinámicamente la vista cronométrica en sus entornos locales.
  * **Ocultamiento Inteligente de UI**: El segmented switch del topbar se oculta y la app fuerza síncronamente el modo clásico si el feature flag está apagado.
  * **Integración del Lienzo Cronométrico**: Importados de forma segura `components/ChronometricGraph.tsx`, proyecciones visuales espaciales, hooks y tests unitarios.

#### Docs
- **Guía de Flujo de Trabajo en Rama Única (Single-Branch Workflow)**:
  * *Cómo desarrollar*: Todo nuevo componente o funcionalidad experimental debe desarrollarse directamente en la rama principal, pero protegido detrás de una Feature Flag condicional: `{showFeature && <NewFeature />}`.
  * *Cómo probar*: En desarrollo local, activa el toggle respectivo. En producción, permanece apagado por defecto hasta que esté 100% probado y listo para liberarse.
- **Lineamientos de Aislamiento Estético (Evitar Conflictos de Estilos)**:
  * **Uso de Namespaces en `globals.css`**: Todos los tokens de diseño de Tailwind v4 en [globals.css](file:///c:/www/gitcron/app/globals.css) se dividen y etiquetan en namespaces explícitos (`Shared / Global`, `Classic Specific`, `Cronometric Specific`). Cualquier cambio en estilos o colores de la vista cronométrica debe usar el prefijo `--crono-` o `--cronometric-`.
  * **Layouts Aislados**: Estructurar los insets flotantes y manejadores de layouts dentro de condicionales limpios o shells aislados en `app/page.tsx` para evitar colisiones de márgenes y paddings.
  * **Detección y Limpieza de Código Muerto**: Al compilar para producción (`npm run build`), Tailwind v4 analiza las dependencias activas del árbol JSX. Si una vista se desactiva o elimina, el compilador remueve automáticamente del CSS final cualquier clase que ya no se utilice.

---

## [v1.4.1] - 2026-05-24 - Support for Selective Text Selection

### 🟢 Vista Clásica & Core

#### Added
- **Soporte de Selección y Copia de Texto Quirúrgico**: Habilitación selectiva de la propiedad `select-text` (`user-select: text` de Tailwind) exclusivamente en elementos que renderizan textos legibles y metadatos clave para permitir su copia nativa al portapapeles sin sacrificar la sensación de aplicación de escritorio:
  * **Barra Lateral Izquierda**: Nombres de ramas locales y remotas (incluyendo carpetas de agrupación recursivas), tags, submódulos y mensajes de stashes (`StashItem`).
  * **Panel de Detalles de Commit (Derecha)**: Hash del commit (`shortHash`), mensaje de commit completo, timestamp/fecha del commit, autor (nombre y correo electrónico) e historial de rutas de archivos modificados.
  * **Grafo e Historial Clásicos**: Mensajes principales de commits en las filas (`mainMessage`), chips de referencias/ramas/tags (`RefChip`) y hashes cortos a la derecha.

#### Docs
- Bumped the app version to `v1.4.1` in `package.json`.
- Updated the README version badges, installation filenames, and current-version note.

---

## [v1.4.0] - 2026-05-24 - Design Tokens Migration & Premium Modal Layout Polish

### 🟢 Vista Clásica & Core

#### Added
- **Arquitectura de Design Tokens (Tailwind v4 `@theme`)**: Migración completa de todos los estilos inline y clases de Tailwind arbitrarias a un sistema de tokens de diseño semánticos en [globals.css](file:///c:/www/gitcron/app/globals.css). Se centralizaron colores primarios, espaciados de panel, bordes redondeados y opacidades de cristal en variables `@theme`.
- **Efectos Glassmorphism y Tipografía Semántica**: Creación de utilidades compuestas avanzadas en Tailwind v4 (`glass-overlay`, `glass-header`, `glass-sticky-header`, `glass-alert-success/warning/error`) y clases tipográficas semánticas (`text-ui-header`, `text-ui-body`, `text-ui-mono`, `text-ui-small`) basadas en la especificación de `DESIGN.MD`.
- **División de Namespaces de Tokens (Classic vs. Cronometric)**: 
  > [!NOTE]
  > **Nota Crítica para Agentes de IA en el Futuro:**
  > Se implementó una clara segmentación arquitectónica y de comentarios dentro de [globals.css](file:///c:/www/gitcron/app/globals.css) para dividir el impacto de los tokens:
  > 1. **Shared / Global Tokens**: Afectan a los contenedores, sidebars, tipografías y popovers de toda la aplicación.
  > 2. **Classic Specific Tokens** (`components/CommitGraph.tsx`): Controlan la paleta de carriles dinámicos de commits (`--color-graph-branch-1` a `--color-graph-branch-12`) y el acento `--color-secondary` del commit HEAD y ramas activas.
  > 3. **Cronometric Specific References** (`components/ChronometricGraph.tsx`): Controlan la coloración del canvas, órbitas de tags, satélites de archivos WIP y andamios de stashes, enlazándose semánticamente a las variables core compartidas de forma limpia y aislada.
- **Resolución de Solapamiento Visual (z-[100])**: Se reestructuró la prioridad de apilamiento en la aplicación. El envoltorio superior de pestañas y barras de herramientas tiene `z-[80]`, por lo que migramos el backdrop de todos los modales flotantes (Settings, Ayuda, Crear/Clonar repo, Nueva Branch, conflictos de checkout, reset, amend y squash) de `z-50` a **`z-[100]`**, garantizando que se superpongan perfectamente sin ningún recorte.
- **Ampliación y Distribución Premium de Contenedores**:
  * Se ensanchó el modal de **Settings** de `560px` a **`680px`** para mejorar la legibilidad de la grilla de atajos e inputs.
  * Se expandió el modal de **Ayuda (HelpModal)** de `max-w-3xl` a **`max-w-4xl` (`896px`)** para espaciar las explicaciones de columnas y flujos.
  * Se ampliaron los modales de repositorio (Crear a `540px`, Clonar a `680px`, Perfil a `540px`) y los diálogos de rama (`New Branch`/`Rename` a `420px`, `Delete` a `540px`, `Merge`/`Checkout Conflict`/`Amend`/`Squash` a `580px`).

#### Fixed
- **React Hook Rules Compliancy**:
  * Se reubicaron los hooks `useMemo` del árbol de branches en `app/page.tsx` (`BranchNodeView` y `RemoteBranchNodeView`) arriba de los retornos tempranos condicionales, resolviendo el error `react-hooks/rules-of-hooks`.
  * Se renombró el prop `ref` del componente `RefChip` en `components/CommitGraph.tsx` a **`gitRef`** para evitar colisiones y advertencias críticas de React (`react-hooks/refs`).
  * Se silenciaron advertencias pre-existentes de `setState` en efectos y accesos de referencias de dragging en la página principal mediante comentarios localizados a nivel de archivo.

#### Docs
- Bumped the app version to `v1.4.0` in `package.json`.
- Updated the README version badge, installation filenames, and current-version note.

---

## [v1.3.8] - 2026-05-23 - Recursive Branch Grouping (Sidebar Folders)

### 🟢 Vista Clásica & Core

#### Added
- **Recursive Branch Grouping (Infinite Depth Tree)**: Replaced the flat single-level branch sidebar grouping with an elegant, recursive `TreeNode` tree structure. Local and remote branch sidebars now support infinite nested subfolders (e.g. `feature/cronometric/tcars-hud-shell`) rendered with dynamic responsive indent padding, folder-first sorting, exact recursive leaf counts, and special priority positioning for `main`/`master` branches.

#### Docs
- Bumped the app version to `v1.3.8` in `package.json`.
- Updated the README version badge, installation filenames, and current-version note.

### 🟣 Vista Cronométrica (Chronometric View)

- *(Ningún cambio en esta versión en el Core - Desarrollo en paralelo en su respectiva rama de feature)*

---

## [v1.3.7] - 2026-05-23 - Remote Checkout & Premium Visual Conflict Resolution

### 🟢 Vista Clásica & Core

#### Added
- **Remote Branch Checkout**: Double-clicking a remote branch in the sidebar or right-clicking to use the new `RemoteBranchContextMenu` will automatically download it as a local tracking branch (`git checkout -t`) or switch to it if it already exists, featuring custom pointers and hover guides.
- **Premium Conflict Resolver Card**: Displays a glassy, high-fidelity HSL gradient card in the Diff Viewer when a selected file has merge or rebase conflicts, allowing the user to resolve the file completely with a single click ("Aceptar Local (HEAD)" or "Aceptar Entrante (Merge)") or providing instructions for side-by-side editing in their IDE.
- **State-Clearing Context Menus**: Introduced unifed setter functions for context menus (`BranchContextMenu`, `RemoteBranchContextMenu`, `CommitContextMenu`, `FileContextMenu`) to prevent overlapping rendering by closing all other active menus upon opening a new one.

#### Fixed
- Handled outside-click behavior for the new remote branch context menu, ensuring it closes naturally.

#### Docs
- Bumped the app version to `v1.3.7` in `package.json`.
- Updated the README version badge, branches list, and current-version note.

### 🟣 Vista Cronométrica (Chronometric View)

- *(Ningún cambio en esta versión en el Core - Desarrollo en paralelo en su respectiva rama de feature)*


## [v1.3.6] - 2026-05-22 - Session rescue & Viewport-aware context menus

### Fixed

- Robust login session preservation: updated `bootstrapGitHub` to only delete the GitHub credentials token from local secure storage (`safeStorage`) if the validation error is explicitly an authentication/credentials failure (HTTP `401 Unauthorized`). Temporary offline states or network timeouts no longer log the user out.
- Silent avatar & profile re-connect: added an automatic, silent re-validation trigger that fetches the user profile and updates the UI avatar as soon as the application recovers its internet connection (using window `'online'` event) or when the user opens their profile menu.
- Viewport-aware context menus: implemented `useAdjustedPosition` in all context menus (Branch, Commit, and File) to dynamically detect screen boundaries (height/width) and shift/render menus upwards or leftwards to prevent them from overflowing the viewport.
- Extended type mappings for `GitResult` to support `isAuthError` and status properties.

### Docs

- Bumped the app version to `v1.3.6` in `package.json`.
- Updated the README version badge, installer filenames, and current-version note.

---

## [v1.3.4] - 2026-05-21 - Intelligent Init in existing folders, GitHub Rescue & premium Force Push

### Added

- Support for initializing Git repositories inside existing, non-empty folders (`git:init` no longer blocks on non-empty directories).
- Intelligent flow that checks if the directory is non-empty before creation, performs a local git initialization (which commits all existing files without overwriting `README.md` or `.gitignore`), creates a bare remote repository on GitHub if checked, associates the `origin` remote, and automatically pushes the initial `main` branch.
- Collision rescue for GitHub: if the repository already exists on the user's GitHub account during the "Create also on GitHub" flow, it catches the 422 collision gracefully, fetches the repository's clone URL, and links it as the remote `origin`.
- Premium React-based Force Push overlay modal (`z-[300]`) styled with dark HSL glassmorphism and warning indicators, prompting the user for approval when branch history has diverged on initial push.
- Safe `--force` push handler in `electron/main.ts` using simple-git's standard signature to bypass diverged branch history securely.
- Added `fs:exists-and-not-empty` IPC handler to detect if folder is empty.

### Docs

- Bumped the app version to `v1.3.4` in `package.json`.
- Updated the README version badge, installer filenames, and current-version note.

---

## [v1.3.3] - 2026-05-20 - Safe directory recovery

### Fixes

- Added recovery for Git's `fatal: detected dubious ownership` / `safe.directory` error when opening a repo owned by another Windows account or Administrators.
- The error toast now explains the ownership issue and offers `Confiar carpeta`, which runs `git config --global --add safe.directory <repo>` and reopens the repo.

### Docs

- Bumped the app version to `v1.3.3` in `package.json`.
- Updated the README version badge, installer filenames, and current-version note.

---

## [v1.3.2] - 2026-05-20 - Splash polish + Graph reveal

### UX

- Reworked the Electron splash screen with the GitCron icon, subtle geometric fade animation, and a minimum visible duration to avoid startup flicker.
- Added a stable startup loading state for the Graph while the initial repo restore/load completes.
- Revealed the Graph container with a short fade-in after initial repo data is ready, avoiding the visual effect of lanes and layout settling on screen.

### Docs

- Bumped the app version to `v1.3.2` in `package.json`.
- Updated the README version badge, installer filenames, startup polish note, and current-version note.

---

## [v1.3.1] - 2026-05-20 - Update UX polish + dev mock

### UX

- Replaced the native Windows update dialogs with an in-app update experience driven from the version tag in the topbar.
- Added a notification dot on the version tag when an update is available, plus a dropdown that shows the new version and a `Descargar` / `Download` action.
- Moved update download progress and the final `UPDATE` install action next to the GitHub releases icon so the version tag remains visible.
- Added the same update status, download action, progress bar, and `UPDATE` action to the bottom of Settings.
- Aligned the Search and Branch Filter popovers with the toast-style blurred background treatment.

### Development

- Added `NEXT_PUBLIC_MOCK_UPDATE=1` support for `pnpm run electron:dev` so the update dot, dropdown, progress bar, and `UPDATE` button can be tested without publishing a release.

### Docs

- Bumped the app version to `v1.3.1` in `package.json`.
- Updated the README version badge, installer filenames, auto-update behavior notes, and current-version note.

---

## [v1.3.0] - 2026-05-19 - Pull decisions + branch sync guidance

### Features

- Added a branch-sync decision toast for the current branch when Pull or Push is triggered while the branch is behind or diverged.
- Behind-only branches now offer explicit in-app actions for `Fast-forward` or `Pull con merge`.
- Diverged branches now offer explicit in-app actions for `Pull con rebase` or `Pull con merge`, so the user can choose how to integrate local and remote history before pushing.
- Added hover explanations to the ahead / behind chips in the branch sidebar so `↑` and `↓` counts read as clear branch status instead of raw Git shorthand.

### Docs

- Bumped the app version to `v1.3.0` in `package.json` and refreshed the README badge, installer filenames, and current-version notes.
- Added future roadmap entries for a visual merge/rebase conflict resolver and local AI workflows via LM Studio.

---

## [v1.2.0] - 2026-05-19 - PR diff view + auth hardening

### Features

- Added an in-app Pull Request diff view: clicking a PR in the sidebar now loads its unified diff through GitHub, shows PR metadata, branch/base info, changed-file chips, and opens GitHub only via the explicit external-link action.

### Security

- Removed token-bearing temporary `origin` URLs from authenticated push/pull/fetch. GitCron now authenticates GitHub HTTPS remotes with a process-scoped `http.https://github.com/.extraheader` and leaves `.git/config` untouched.
- Updated authenticated clone to use the same extraheader flow, so private clones keep a clean `origin` URL without `x-access-token`.
- Extended log sanitization to redact `AUTHORIZATION: basic ...` values in addition to token-in-URL patterns.

### Docs

- Added README version/platform/runtime badges and refreshed release filenames for `v1.2.0`.
- Marked Pull request diff view and token-bearing temporary `origin` removal as completed in the roadmap.
- Updated SECURITY.md to document the extraheader auth flow and remove the old crash-window residual risk.

---

## [v1.1.7] - 2026-05-18 - Fix push (simple-git unsafe guard)

### Fixes

- El error "Configuring credential.helper is not permitted without enabling allowUnsafeCredentialHelper" también lo podía lanzar `simple-git@3.36.0` antes de ejecutar Git: su guard interno bloquea `credential.helper` y `core.askpass` salvo que se habiliten `unsafe.allowUnsafeCredentialHelper` y `unsafe.allowUnsafeAskPass` en la instancia. Las instancias autenticadas de clone/push/pull/fetch ahora usan una opción compartida con ambos permisos `unsafe`, manteniendo el URL token temporal y sin volver a `GIT_CONFIG_GLOBAL`.
- Bump de versión a `v1.1.7` para publicar el fix como release nuevo sobre el draft de GitHub.

---

## [v1.1.6] - 2026-05-18 - Fix push (safe.allowUnsafeCredentialHelper)

### Fixes

- v1.1.5 cambió el approach a `-c credential.helper= -c core.askpass=` (valores vacíos), que funcionaba en MSYS bash pero no en el git-for-windows que usa Electron. Error: "Configuring credential.helper is not permitted without enabling allowUnsafeCredentialHelper". Git-for-windows bloquea `-c credential.helper=...` **incluso con valor vacío**, a diferencia del upstream que solo bloquea valores no vacíos. Fix: agregar `safe.allowUnsafeCredentialHelper=true` al config array para autorizar el override vacío en Git.

---

## [v1.1.5] - 2026-05-18 - Fix push (sin GIT_CONFIG_GLOBAL, push fix incompleto)

### Fixes

- **El fix de v1.1.4 no resolvía el push en git-for-windows ≥2.40**. El error "Use of `GIT_CONFIG_GLOBAL` is not permitted without enabling `allowUnsafeConfigPaths`" seguía apareciendo aunque se pasara `-c safe.allowUnsafeConfigPaths=true`. Resolución: **eliminar el approach de `GIT_CONFIG_GLOBAL` + gitconfig temporal por completo** y pasar `-c credential.helper= -c core.askpass=` directamente. Los valores vacíos siempre son aceptados (CVE-2022-24765 solo bloquea valores no vacíos), no requieren `safe.allowUnsafeConfigPaths` ni `allowUnsafeCredentialHelper`. Se borra la lógica del temp file y la limpieza al `quit`.

---

## [v1.1.4] - 2026-05-18 - Fix push + UNSTAGED auto-refresh (push fix incompleto)

### Fixes

- **Push fallido por `GIT_CONFIG_GLOBAL`**: se agrega `safe.allowUnsafeConfigPaths=true` al config de simple-git en `withGitHubToken()`. Git ≥2.35.2 (CVE-2022-24765) consideraba "unsafe" la ruta del `.gitconfig` temporal usado para deshabilitar credential helpers; ahora el flag autoriza el path.

### UX

- **Panel UNSTAGED se refresca solo** al editar archivos en el working tree:
  - Watcher de FS con `chokidar` en el main process (ignora `.git`, `node_modules`, `.next`, `dist`, `release`, `out`).
  - Evento IPC `repo:fs-change` con debounce 250 ms en main + 150 ms en renderer.
  - Listener de `focus` en la ventana como defensa en profundidad.
  - Cleanup automático al cambiar de repo o cerrar la app.

---

## [v1.1.0] - 2026-05-18 - Auto-update con electron-updater

### Auto-update

- Chequeo silencioso de actualizaciones 3 s después del splash al iniciar la app (solo en producción, no en dev).
- Diálogo nativo cuando hay versión nueva disponible — botones **Descargar** / **Después**.
- `autoDownload = false`: la descarga solo arranca tras confirmación del usuario.
- Diálogo nativo cuando la descarga termina — botones **Instalar ahora** / **Más tarde**.
- `autoInstallOnAppQuit = true`: si el usuario elige "más tarde", la actualización se instala al cerrar la app.
- Sin update disponible → sin dialog, sin toast (modo silencioso).
- Nuevo handler IPC `app:check-update` para trigger manual desde el renderer.
- Botón **"Buscar actualizaciones"** en Settings → muestra spinner y toast con el resultado.
- Todos los errores del updater pasan por `sanitizeForLog()` y llegan al renderer con `errMsg()`.
- Los textos de los diálogos nativos se adaptan al idioma guardado en safeStorage (ES/EN).

### Publishing

- Nuevos scripts: `pnpm publish:win`, `pnpm publish:mac`, `pnpm publish:linux`.
- `electron-builder.publish` configurado con provider `github` (`alejandropd-1/gitcron`, repo privado).
- Requiere env `GH_TOKEN` con scope **`repo` completo** (el repo es privado).
- Los scripts crean un draft release en GitHub — publicarlo manualmente desde la UI de Releases.

### Limitaciones

- macOS auto-update queda inactivo hasta que se agregue code-signing. Los releases DMG siguen siendo descargables manualmente.

---

## [v1.0.1] - 2026-05-17 - Packaging stability fixes

### Critical fixes for packaged app

- **"Electron API no disponible" on every IPC call**: `tsup.config.ts` preload entry had `noExternal: [/.*/]` which matched everything including `electron`, causing tsup to bundle the electron package into `preload.js`. The bundled electron silently crashed the preload at runtime, leaving `window.api` undefined in both dev and packaged modes. Fixed by using the same exclusion regex as the main entry: `/^(?!electron$).+/`. Preload size dropped from 9.33 KB → 6.29 KB.
- **`sandbox: true` removed** from `BrowserWindow.webPreferences`. In combination with ASAR packaging and the bundled preload, sandbox mode prevented `contextBridge.exposeInMainWorld` from working correctly. `contextIsolation: true` + `nodeIntegration: false` is the canonical Electron security model and sufficient.
- **`app://` protocol SPA fallback**: the custom protocol handler now falls back to `out/index.html` for any path that doesn't resolve to a real file, enabling client-side routing to work correctly in the packaged app.
- **`trailingSlash: true`** added to `next.config.ts` static export so pages are generated as `page/index.html` (more compatible with the index.html fallback strategy).
- **Branch `06-Architectural`** created from `main` for these stability changes.

---

## [v1.0.0] - 2026-05-17 - First distributable release

### Packaging

- `electron-builder` v26 configured for Windows (NSIS installer), macOS (DMG) and Linux (AppImage).
- `pnpm package:win` generates `release/GitCron Setup 1.0.0.exe`.
- `next.config.ts` outputs `export` mode in production (static `out/`) so electron-builder can bundle the renderer. Dev server still uses the default Next.js mode.
- App icon uses `public/gitcron-icon.png` (512×512) for all platforms.

### Startup experience

- **Splash screen**: frameless 420×280 window with the GitCron logo and an animated green progress bar appears while the renderer loads. No extra file — the HTML is inlined.
- **Maximized on start**: the window fills the screen on first launch.
- **No auto DevTools**: DevTools no longer open automatically. In dev mode toggle with `Ctrl+Shift+I` (Win/Linux) or `Cmd+Option+I` (macOS).

### Credential caching fix

- `GIT_ASKPASS=echo` was blocked by git 2.35.2+ (same CVE-2022-24765 that blocked `credential.helper=`).
- New approach: write a temp `.gitconfig` at startup with `credential.helper =` and `core.askpass =`, then point `GIT_CONFIG_GLOBAL` to it for every token-authed operation. Git reads its own config files without restrictions, so the empty helper takes effect cleanly.

### Commit detail panel

- Clicking a commit in the graph or history now shows the **files changed in that commit** (via `git diff-tree --no-commit-id -r --name-status`), not the current working tree.
- Each file shows a colored status badge (A/M/D/R). Clicking a file loads the diff at that specific commit (`git diff <hash>^ <hash> -- <file>`).

### Squash commits

- New **Squash** button next to Amend in the staging panel.
- Modal lets you select 2–5 commits to combine, shows a live preview, and accepts a new message (defaults to the current HEAD message).
- Implementation: `git reset --soft HEAD~N` + `git commit -m <message>`. Warns about force-push if commits were already shared.

### Tests

- Vitest v4 set up with 2 test files and 14 passing unit tests.
- `lib/__tests__/shortcuts.test.ts`: `eventToShortcut`, `formatShortcut`, `defaultShortcutsMap`.
- `lib/__tests__/os-notify.test.ts`: token URL sanitization regex.
- Scripts: `pnpm test` (run), `pnpm test:ui` (browser UI), `pnpm test:watch`.

### Codebase refactor

- `app/page.tsx` reduced from 3,931 → 3,081 lines (−22%) by extracting:
  - `components/ContextMenus.tsx` — `CommitContextMenu`, `BranchContextMenu`, `FileContextMenu`, `ContextMenuItem`
  - `components/HelpModal.tsx` — `HelpModal`, `StatusBadge`, `FlowStep`
  - `components/RepoModals.tsx` — `EmptyStateCard`, `InitRepoModal`, `CloneRepoModal`, `ProfileMenu`

---

## [v0.1.8] - 2026-05-16 - UI polish, sidebar hierarchy, filter dropdown, app icon

### Sidebar hierarchy (GitKraken-style)

- LOCAL and REMOTE section headers now use `Monitor` and `Cloud` icons in cyan `#5ed8ff`.
- Section header padding reduced (`px-2`) so the chevron and icon sit at the leftmost position.
- Root branch items aligned to `pl-[26px]` so their branch icon lines up exactly with the section header icon (chevron 12px + gap 8px from the `px-2` baseline).
- Folder children (`claude/`, `origin/`) aligned to `pl-[46px]` so their icon lines up with the parent folder's icon.
- Removed the duplicate cyan cloud icon from `RemoteFolderView` (origin); cloud now lives only in the REMOTE header.
- Removed vertical guide lines (`border-l`) from both LOCAL and REMOTE folder children — pure padding hierarchy as in GitKraken.

### Branch filter dropdown

- Moved the "All branches / Current branch" segmented toggle from the graph's sticky header to a dropdown menu in the topbar, next to Terminal.
- Filter button only renders when the Graph tab is active. A small green dot appears on the icon when the "Current branch" filter is on, as a visual indicator.
- Dropdown uses `header relative z-50` + `dropdown z-50` so it always renders above the graph content (was clipping behind it before).
- Eliminated the now-empty 34px gap at the top of the graph (`sticky top-[34px]` → `sticky top-0`).

### Theme transition

- Added `transition: filter 0.35s ease, background-color 0.35s ease` to `html.light body` so the dark ↔ light switch animates smoothly instead of snapping.

### App icon

- `public/favicon.ico` (Windows-friendly multi-size) and `public/gitcron-icon.png` shipped.
- Electron `BrowserWindow` resolves the icon with a `.ico` first / `.png` fallback strategy.
- Next.js `metadata.icons` now references `favicon.ico` (replaces the default `N` Next.js favicon in the window title bar).

### Stability

- Native `File / Edit / View / Window` menu removed in production via `Menu.setApplicationMenu(null)`. Dev keeps a minimal menu for DevTools toggle.
- Spinner-stuck-on-tab race condition fixed: `use-repo-loader.ts` now captures `prevPath` before switching active repo and clears its `isLoading` in the `finally` block via `updateRepoByPath(prevPath, { isLoading: false })`.
- `git -c credential.helper=` removed (Git 2.35.2+ blocks it as CVE-2022-24765 hardening). Replaced with `GIT_ASKPASS=echo` and `GIT_CREDENTIAL_HELPER=''` env vars — same effect, no security warning.

### Context menu

- Items now use `text-left` so labels align to the left edge instead of centering.

---

## [v0.1.7] - 2026-05-16 - Amend, cherry-pick, codebase cleanup, security hardening, credential isolation

### Amend last commit

- New IPC handler `git:amend(repoPath, newMessage?)` in `electron/main.ts`. Runs `git commit --amend -m <new>` when a message is provided, or `--amend --no-edit` to fold staged changes without rewording. Refuses to amend when HEAD does not exist yet.
- New action `amendLastCommit(newMessage?)` in `hooks/use-git-actions.ts` that wraps the IPC, shows a success toast, and refreshes log/status/branches so any staged changes that got folded into the amended commit disappear from the UI.
- New **Amend** button in the staging panel next to **Commit Changes**, styled in orange to flag that this rewrites history.
- Modal that shows the current commit message (read-only), a textarea for the new message (empty = keep the existing one), and a warning about needing a force-push if the commit was already shared.

### Cherry-pick from context menu

- New IPC handler `git:cherry-pick(repoPath, hash)` with a 7-40 hex regex validation and conflict detection in the error stream. Returns `{ conflict: true }` so the renderer can show the appropriate guidance.
- New action `cherryPickCommit(hash, shortHash?)` mirrors the `mergeIntoCurrent` conflict-handling pattern (status is refreshed on conflict so the user sees the conflicted files immediately).
- New **"Cherry-pick este commit"** entry in the commit context menu — right-click any commit in the graph or the history view.

### Codebase cleanup (Fallow)

- Ran Fallow (`fallow dead-code`) over the project and removed everything it flagged as truly unreachable:
  - Deleted `hooks/use-mobile.ts` (zero importers).
  - Removed unused exports `notificationsSupported`, `notificationsPermission` from `lib/os-notify.ts`.
  - Removed unused exports `normalizeKeys`, `matchesShortcut` from `lib/shortcuts.ts`.
  - Unexported 5 internal-only types from `types/electron.d.ts` (`ElectronAPI`, `GitResult`, `RemoteOpResult`, `DeviceCodeInfo`, `CreatedRepoInfo`) — they are only referenced inside the same file.
- Removed 6 unused dependencies from `package.json`: `@google/genai`, `@hookform/resolvers`, `class-variance-authority`, `electron-is-dev`, `@tailwindcss/typography`, `firebase-tools`. Lockfile shrank by ~4700 lines.
- Cleaned the matching `@google/genai` entry from `pnpm-workspace.yaml`'s `allowBuilds`.
- Added `fallow` as a dev dependency and `.fallowrc.json` config so the analyzer can be re-run anytime.

### Security hardening — round 1

- **`sandbox: true` + explicit `webSecurity: true`** added to `BrowserWindow.webPreferences`. The preload only uses `contextBridge` + `ipcRenderer` so it remains fully sandbox-compatible.
- **URL-encoded GitHub tokens** before injecting them into clone/push URLs. `encodeURIComponent(token)` protects against tokens containing `@`, `:`, `/` or other URL-special characters that would break URL parsing.
- **`sanitizeForLog()` helper** that strips `x-access-token:<TOKEN>@` patterns from any string/Error before it reaches `console.log/error`. Applied to the three existing logging call sites in `electron/main.ts`.

### Security hardening — round 2

- **Generalized `errMsg()` helper** applied to all 48 IPC return paths that previously did `error: error.message`. Any token-bearing URL that leaks into git CLI output (e.g. `fatal: unable to access https://x-access-token:abc@github.com/...`) is now redacted before reaching the renderer.
- **Production-strict CSP** in `app/layout.tsx`: drops `'unsafe-eval'` from `script-src` and removes `localhost`/`ws://localhost` from `connect-src` when `NODE_ENV === 'production'`. Dev keeps the relaxed rules for HMR/Turbopack.
- **TOCTOU-resistant `fs:delete-file`** in `electron/main.ts`: uses `path.relative()` for traversal detection (catches both `..` segments and absolute paths) and switches to `lstatSync()` + `isFile()` guard so symlinks pointing outside the repo cannot be followed.
- **postcss override** in `pnpm-workspace.yaml` to force `>=8.5.10` (fixes GHSA-qx2v-qp2m-jg93, XSS via unescaped `</style>` in stringify output). `pnpm audit` now reports zero vulnerabilities.

### Credential helper isolation

- GitCron's token-in-URL trick was leaking into the OS credential store (Windows Credential Manager, macOS Keychain, libsecret) as a ghost `x-access-token` account that polluted the GitHub account selector on other git operations.
- Fix: every token-authed git invocation now runs with `-c credential.helper= -c core.askpass=true` via simple-git's `config` option, plus env vars `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never`.
- Applied to `withGitHubToken` (push, pull, fetch, push-branch, pull-branch) and to `git:clone` when a token is injected.
- `withGitHubToken` keeps a separate "plain" `simpleGit` instance for reading/writing the origin URL so the no-helper config doesn't bleed into unrelated git plumbing.

### Settings modal polish

- Wider (560px) with `max-h-[90vh]`, scrollable body, sticky header. Long preference lists (shortcuts table, auto-fetch interval grid) no longer overflow the viewport.

---

## [v0.1.6] - 2026-05-15 - OS notifications, configurable shortcuts, light theme, polish

### Dynamic version (Feature 0)

- The version shown in Settings is now read from `package.json` at build time (`import pkg from '../package.json'`), so a single `version` bump propagates everywhere.

### Merge / fast-forward toasts (Feature 6)

- `mergeBranch` now shows a success toast (was missing).
- Unified merge/FF/up-to-date messages into reusable i18n keys: `success.merge`, `success.mergeUpToDate`, `success.fastForward` in ES and EN.

### OS notifications (Feature 7)

- New `lib/os-notify.ts` wraps the browser/Electron `Notification` API with permission handling and a global enable/disable toggle.
- Notifications fire on push/pull completion when the operation took more than 3 seconds OR the GitCron window is not focused.
- Push/pull authentication errors also notify when the window is unfocused.
- Auto-fetch now diffs the per-branch `behind` count before and after the cycle; if any branch gained remote commits, it sends a notification with the count and affected branches.
- Settings: new "Notificaciones del sistema" section with a single on/off toggle. Persisted in encrypted storage as `osNotifications`.

### Configurable keyboard shortcuts (Feature 8)

- New central shortcut system in `lib/shortcuts.ts` with 14 default bindings: `commit` (Ctrl+Enter), `push` (Ctrl+P), `pull` (Ctrl+Shift+P), `newBranch` (Ctrl+B), `search` (Ctrl+Alt+F), `fetchNow` (Ctrl+R), `settings` (Ctrl+,), `help` (F1), `closeRepo` (Ctrl+W), `nextRepo` (Ctrl+Tab), `prevRepo` (Ctrl+Shift+Tab), `graphTab` (Ctrl+G), `historyTab` (Ctrl+H), `commitTab` (Ctrl+Shift+C).
- New `hooks/use-shortcuts.ts` registers one global `keydown` listener, normalizes the combo via `eventToShortcut`, and dispatches the matching action. Skips events from inputs/textareas (except `Ctrl+Enter` for the commit textarea).
- Settings: new "Atajos de teclado" section with a table per binding. Click to capture, press the new combo to save, `Esc` cancels. "Restaurar valores por defecto" button clears the overrides.
- Persisted in encrypted storage as `shortcuts` (JSON map of id → keys).

### Light theme — experimental (Feature 9)

- Added a Theme preference (`dark` | `light`) persisted in encrypted storage as `theme` and applied as a class on `<html>`.
- Implementation: rather than rewriting every hardcoded hex across the components, light mode uses a global CSS filter inversion (`filter: invert(0.92) hue-rotate(180deg)`) on `<body>`. Elements that must keep their original colors (GitHub avatars, branch lane colors in the SVG graph) are marked with `data-keep-color` and double-inverted to compensate.
- Settings: the Theme placeholder is now a working toggle. A short note marks light mode as experimental.

---

## [v0.1.5] - 2026-05-15 - Tier 2: per-repo status, auto-fetch, branch filter, default folder + polish

### Polish and fixes (post-v0.1.5)

- Moved the fetch indicator button to the center toolbar, next to Stash, matching the size and style of Pull/Push/Branch/Stash.
- Added a `Filter` icon to the left of the branch filter toggle for visual clarity.
- Fixed a stale closure bug in the branch filter toggle where `repoPath` was read from a React closure instead of the live store, causing the refresh to silently no-op.
- Branch/tag chips in the graph now truncate long names with ellipsis (`max-w-[120px]`, `overflow-hidden`). Icons inside chips use `shrink-0` so they never collapse.
- Commits with more than 3 refs now show the first 3 chips plus a `+N` badge; hovering the badge reveals the remaining ref names via `title`.

---

## [v0.1.5] - 2026-05-15 - Tier 2: per-repo status, auto-fetch, branch filter, default folder

### Auto-fetch in background

- Added a configurable background fetch loop (`git fetch --all --prune`) that updates remote-tracking refs and ahead/behind counts without interrupting the user's view.
- Toggle, interval picker (5 / 10 / 30 / 60 minutes), and "last sync" timestamp live in Settings.
- New `git:fetch` IPC handler (separate from `git:pull`; never merges).
- Subtle indicator in the topbar that spins while fetching and shows the last sync on hover; click to fetch all open repos now.
- Preferences persisted in encrypted storage as `autoFetch`.

### Filter commits by branch

- Added a per-repo toggle in the Graph header to switch between "All branches" and "Current branch" (omits `--all` from `git log` when set to current).
- The toggle state lives in `RepoState` so each tab remembers its own preference and re-runs the log when toggled.

### Per-repo `isLoading`, `error`, `success`

- Moved the loading/error/success fields from the global store into `RepoState` so a slow operation on repo A no longer shows a spinner or error banner on repo B.
- Legacy top-level fields are kept as mirrors of the active repo for backward compatibility.
- Repo tabs now show a per-repo spinner when that tab's `isLoading` is true.

### Default folder for open/clone

- Added a configurable starting folder for the native open/clone dialogs (per-user preference, persisted in encrypted storage as `defaultFolder`).
- Settings UI with current path, Change, and Clear actions.
- Both `git:open-repo` and `fs:pick-folder` accept a `defaultPath` argument; rendered defaults flow from the store at call time.

---

## [v0.1.4] - 2026-05-15 - Multi-repo, graph polish, topbar, and preferences

### Multi-repo tabs

- Added first-class multi-repo support with `openRepos` and `activeRepoIdx` in the Zustand store.
- Kept the legacy active-repo store API so the rest of the UI could migrate safely.
- Added repo tabs with switch, close, and `+` actions.
- Restored open repos and the active tab on app start.
- Kept backward compatibility with the old `lastRepoPath` restore flow.

### Repo-scoped data loading

- Updated async repo refresh flows to write by repo path instead of always writing into the currently active repo.
- Scoped `loadDiff` updates to the intended repo to avoid cross-tab diff leaks.
- Changed `gitCommand` to be repo-scoped end to end, including Electron main, preload, types, and hooks.

### Search and topbar UX

- Reworked the topbar layout so repo navigation stays on the left, Git actions are centered, and tools live on the right.
- Replaced the always-visible search field with a search button near terminal.
- Search now opens in a floating popover and still supports `Ctrl + Alt + F`.
- Fixed the search popover layering so it renders above the main content.

### Graph and layout polish

- Added resizable graph-table columns for Branch/Tag, Graph, Date, and Commit.
- Persisted graph column widths in `localStorage`.
- Added subtle divider lines to graph headers.
- Added colored lane bands in graph rows to make message-to-branch association easier to scan.
- Refined the graph header spacing and the Date header alignment.

### Settings and typography

- Added a global text size preference in Settings with `Compact`, `Normal`, and `Large`.
- Persisted `fontSize` in encrypted storage, alongside other preferences.
- Applied the chosen size through the root document font size so Tailwind `rem`-based classes actually respond.

### Stability fixes

- Fixed a hydration mismatch caused by restoring persisted widths too early on the client.
- Hardened the GitHub Device Flow login path and error handling for transient network failures.
- Fixed persistence edge cases when closing the last repo tab.

---

## [v0.1.3] - 2026-05-15 - Restore last repo, resizable panels, stable branch colors

- Added silent repo restore on startup.
- Added resizable sidebar and details panels.
- Added stable branch colors in the commit graph.
- Expanded the branch/tag column to reduce chip truncation.
- Completed success toasts for merge, rebase, and fast-forward flows.

---

## [v0.1.2] - 2026-05-15 - First push upstream fix

- Detected "no upstream branch" push failures.
- Retried automatically with `git push --set-upstream origin <branch>`.
- Applied the fix both to toolbar push and branch-context push.

---

## [v0.1.1] - 2026-05-15 - UX polish, feedback, and auth hardening

- Added more success toasts across common Git actions.
- Added commit filtering in Graph and History.
- Added WIP banner improvements in commit details.
- Added clear-all stash with inline confirmation.
- Improved contrast in a few low-readability UI states.
- Moved Git auth back to temporary URL injection after Electron 42 blocked `GIT_ASKPASS`.

---

## [v0.1.0] - 2026-05-14 - Initial release

- Next.js + Electron + Zustand + TypeScript project base.
- Typed IPC bridge and `safeStorage` integration.
- Visual commit graph, staging area, diff viewer, and history view.
- Branch tree, stash flows, and context menus.
- GitHub OAuth Device Flow and token persistence.
- Design system foundation and dark UI.
