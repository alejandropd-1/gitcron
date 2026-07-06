# Git-core Fase 02 — Borrado de branches (local / remota / ambas) con confirmación

> Menú contextual (click derecho) sobre una branch del sidebar que ofrece borrar local, remota o ambas, con DangerConfirmDialog que distingue mergeada (seguro) de no-mergeada (consciente). El borrado local ya existe en backend; falta el remoto y toda la UX. Requiere Fase 01 mergeada. Branch `git-core/fase-02-branch-delete`. Cierra con `tsc` + `pnpm test` + reporte + push + STOP (no merge).

```
Contexto: GitCron, sidebar de branches (RepoSidebar.tsx + RepoSidebarParts.tsx). Tras la Fase 01,
cada branch conoce su estado local/remoto. Infra que YA EXISTE y hay que reutilizar:
- electron/ipc/git-ops.ts → handler git:delete-branch(targetPath, branch, force) ya borra la
  LOCAL con -d / -D según force. Tiene lógica especial para branches 'imagined/' (respetala).
- components/DangerConfirmDialog.tsx → dialog con props { open, title, message, warning,
  confirmLabel, cancelLabel, disabled, onCancel, onConfirm }. El prop `warning` es para el aviso
  de no-mergeada.
- components/ContextMenus.tsx → sistema de menú contextual con posicionamiento y useT (i18n).

FEATURE DESTRUCTIVA: todo borrado pasa SIEMPRE por DangerConfirmDialog. Sin excepción.

BRANCH: git-core/fase-02-branch-delete desde main (con Fase 01 mergeada). COMMITEÁ CADA TANDA.
Push y STOP. No merge.

INVARIANTES (condición de aceptación):
- El borrado remoto (git push origin --delete) es un handler NUEVO en git-ops.ts. El borrado
  local reutiliza git:delete-branch existente — NO lo reescribas.
- NUNCA borrar sin confirmación explícita del usuario en el dialog. La branch activa (checked
  out) no se puede borrar: deshabilitá la opción.
- Distinción mergeada vs no-mergeada es OBLIGATORIA: para la local, -d si está mergeada, -D solo
  si el usuario confirma conscientemente en un dialog que AVISA los commits que se pierden.
- Strings via lib/i18n.ts (ES/EN/ZH). Secretos en main con safeStorage. CSP no se toca.
- El borrado remoto necesita credenciales que YA maneja el flujo push existente: reutilizá ese
  camino, no inventes manejo de auth nuevo en el renderer.
- codegraph_context / codegraph_impact antes de grep.

TANDA 1 — Backend del borrado remoto:
- Nuevo handler git:delete-remote-branch(targetPath, remote, branch) en git-ops.ts que ejecuta
  push origin --delete via simple-git, reutilizando el mismo manejo de credenciales/errores que
  el push existente. Exponer en preload + types/electron.d.ts.
- Un helper que dado (branch) devuelva si está mergeada a la branch por defecto (para decidir
  -d vs -D y para el texto del dialog). Tests Vitest con fixtures.
- COMMIT. CHECKPOINT: firma de los handlers + resultado de tests. Esperá OK.

TANDA 2 — Menú contextual:
- Click derecho sobre una fila de branch abre un menú (via ContextMenus.tsx) cuyas opciones
  dependen del estado de la Fase 01:
  · solo-local → "Borrar rama local".
  · local+remota → "Borrar local", "Borrar remota", "Borrar ambas".
  · branch activa → opciones de borrado DESHABILITADAS con tooltip "no se puede borrar la rama
    activa".
- Cada opción NO borra directo: abre el DangerConfirmDialog correspondiente.
- COMMIT. CHECKPOINT: screenshot del menú en una branch solo-local y en una con remoto.

TANDA 3 — Diálogos de confirmación:
- Local mergeada → dialog normal, confirmar → git:delete-branch(force=false).
- Local NO mergeada → dialog con `warning` explícito ("Esta rama no está fusionada. Vas a perder
  los commits que solo existen acá.") y confirmar → git:delete-branch(force=true).
- Remota → dialog propio que aclara que afecta a origin y a quien colabore; confirmar →
  git:delete-remote-branch.
- Ambas → confirma una vez, ejecuta local y remota; si una falla, reportá cuál y no dejes estado
  a medias silencioso.
- Tras borrar, refrescar la lista de branches. Manejo de error visible (no stack trace crudo).
- COMMIT. CHECKPOINT: screenshot de los dialogs (mergeada, no-mergeada, remota).

TANDA 4 — Cierre:
- tsc --noEmit en 0 y pnpm test verde.
- Reporte en docs/reports/: handler remoto nuevo, cómo se decide -d/-D, textos de los dialogs,
  claves i18n. Nota para el backlog: "limpieza masiva en lote" queda DIFERIDA a fase posterior.
- COMMIT + push. STOP.

CRITERIOS DE ACEPTACIÓN:
- [ ] Click derecho en branch ofrece borrado según estado local/remoto.
- [ ] La branch activa no se puede borrar (opción deshabilitada).
- [ ] Todo borrado pasa por DangerConfirmDialog; el no-mergeado avisa los commits a perder.
- [ ] Borrado remoto funciona reutilizando credenciales del push existente.
- [ ] Errores mostrados de forma legible, sin stack trace. Lista se refresca tras borrar.
- [ ] i18n ES/EN/ZH. tsc/test verdes. Reporte escrito. Branch pusheada sin merge.
```
