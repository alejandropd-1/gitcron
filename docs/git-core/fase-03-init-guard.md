# Git-core Fase 03 — Guard de arranque: carpeta sin `git init`

> Cuando abrís una carpeta que no es repo Git, hoy sale un error crudo. Esta fase lo reemplaza por un cartel amable que ofrece inicializarla en el acto (init local). El init ya existe en backend; falta reencauzar el error hacia una UX. Independiente de las fases 01-02. Branch `git-core/fase-03-init-guard`. Cierra con `tsc` + `pnpm test` + reporte + push + STOP (no merge).

```
Contexto: GitCron, Electron main. En electron/ipc/git-repo.ts YA existe:
- checkIsRepo() usado en los handlers git:open-path y git:open-repo — hoy, si !isRepo, se
  propaga un error que el renderer muestra crudo.
- git:init(parentPath, name, withInitialCommit) que hace `git init --initial-branch=main`.
DECISIÓN de producto: si el usuario abre una carpeta que no es repo, en vez del error mostrar un
CARTEL que le ofrezca inicializarla ahí mismo (init local simple). El link a remoto es la Fase 04.

Esta es la misma familia que el UX gap del stack trace de Node cuando falta el binario de Git:
reemplazar errores crudos por guards amables. Resolvé SOLO el caso "carpeta sin init" en esta
fase; dejá anotado el del binario faltante para después.

BRANCH: git-core/fase-03-init-guard desde main. COMMITEÁ CADA TANDA. Push y STOP. No merge.

INVARIANTES (condición de aceptación):
- No reescribas checkIsRepo ni git:init: reutilizalos. Lo que cambia es QUÉ hace el renderer
  cuando checkIsRepo da false: en vez de error, dispara el cartel.
- El init lo ejecuta el handler existente en el main process. El renderer solo pide y muestra.
- Strings via lib/i18n.ts (ES/EN/ZH). Secretos en main con safeStorage. CSP no se toca.
- codegraph_context / codegraph_impact antes de grep para trazar cómo viaja hoy el error de
  !isRepo hasta la UI.

TANDA 1 — Señalizar "no es repo" limpio:
- En git-repo.ts: que los handlers git:open-path / git:open-repo devuelvan un resultado
  estructurado tipo { ok: false, reason: 'not-a-repo', path } en vez de tirar un error opaco
  (mantené compatibilidad con los demás callers — si otro código espera el throw, adaptá con
  cuidado y confirmá con codegraph_impact).
- Tests Vitest del nuevo shape de respuesta.
- COMMIT. CHECKPOINT: forma del resultado + confirmación de que ningún caller se rompe. Esperá OK.

TANDA 2 — Cartel de inicialización:
- Cuando el renderer recibe reason:'not-a-repo', mostrar un cartel (no un error): título tipo
  "Esta carpeta todavía no es un repositorio Git", mensaje explicando, y acción primaria
  "Inicializar repositorio" + secundaria "Cancelar".
- Confirmar → llama al git:init existente sobre esa carpeta → al terminar, abrir el repo recién
  creado como si nada (mismo flujo que abrir un repo normal).
- Estética TCARS/LCARS, tokens existentes. No es un DangerConfirmDialog (init no es destructivo):
  usá el estilo de diálogo informativo/positivo que corresponda, o un componente nuevo simple si
  no hay uno adecuado.
- COMMIT. CHECKPOINT: screenshot del cartel y del repo abierto tras inicializar.

TANDA 3 — Cierre:
- tsc --noEmit en 0 y pnpm test verde.
- Reporte en docs/reports/: cómo se reencauzó el error, shape del resultado, flujo del cartel,
  i18n. Nota backlog: "guard del binario de Git faltante" queda pendiente (misma familia).
- COMMIT + push. STOP.

CRITERIOS DE ACEPTACIÓN:
- [ ] Abrir una carpeta sin git ya NO muestra error crudo, sino un cartel con opción de init.
- [ ] Inicializar crea el repo (git init --initial-branch=main) y lo abre sin fricción.
- [ ] Ningún otro flujo que dependía de open-path/open-repo se rompió (verificado con codegraph).
- [ ] i18n ES/EN/ZH. tsc/test verdes. Reporte escrito. Branch pusheada sin merge.
```
