# Git-core Fase 04 — Init con vínculo a remoto existente

> Extiende el cartel de la Fase 03: además de "solo init local", ofrece "inicializar y vincular a un remoto que ya existe en GitHub" (remote add + primer push). Crear el repo en GitHub desde cero (Octokit) queda DIFERIDO a una iteración posterior. Requiere Fase 03 mergeada. Branch `git-core/fase-04-init-remote`. Cierra con `tsc` + `pnpm test` + reporte + push + STOP (no merge).

```
Contexto: GitCron. Tras la Fase 03, abrir una carpeta sin git muestra un cartel que ofrece init
local. Esta fase agrega la segunda opción: init + vincular a un remoto YA EXISTENTE (el usuario
ya creó el repo vacío en GitHub y tiene la URL). NO creamos el repo en GitHub en esta fase —
eso es iteración futura con Octokit.

BRANCH: git-core/fase-04-init-remote desde main (con Fase 03 mergeada). COMMITEÁ CADA TANDA.
Push y STOP. No merge.

INVARIANTES (condición de aceptación):
- Reutilizá git:init y el flujo de push/credenciales existentes. El remote add puede ser un
  handler nuevo chico (git:add-remote) o parte del init: elegí lo que menos duplique.
- La URL del remoto la ingresa el usuario en el cartel. NUNCA pongas la URL ni credenciales en
  parámetros de URL ni en el renderer persistente: credenciales siguen en main con safeStorage.
- Validá la URL antes de usarla (formato https://github.com/... o git@...). Si el primer push
  falla (repo no existe, sin permisos), mostrá error legible y NO dejes el repo en estado raro:
  el init local ya quedó hecho, aclarale al usuario que puede reintentar el vínculo.
- CSP: connect-src sigue limitado a api.github.com y github.com. No agregues dominios.
- Strings via lib/i18n.ts (ES/EN/ZH). codegraph_context / codegraph_impact antes de grep.

TANDA 1 — Backend del vínculo:
- Handler (nuevo o extensión) que, dado (targetPath, remoteUrl), haga: git remote add origin
  <url> y luego el primer push de main a origin, reutilizando el manejo de credenciales del push
  existente. Validación de URL. Manejo de error del push que NO rompa el repo local ya creado.
- Tests Vitest: validación de URL (ok / inválida), y el path de error del push (mockeado).
- COMMIT. CHECKPOINT: firma del handler + tests. Esperá OK.

TANDA 2 — Cartel con dos caminos:
- Extender el cartel de la Fase 03 para tener dos acciones:
  · "Solo inicializar (local)" → comportamiento de la Fase 03.
  · "Inicializar y vincular remoto" → revela un input para la URL del remoto; al confirmar:
    git:init → add-remote → primer push, con feedback de progreso.
- Estados de error visibles y accionables (URL inválida, push rechazado). Nada de stack traces.
- COMMIT. CHECKPOINT: screenshot del cartel con el input de URL y del caso de error.

TANDA 3 — Cierre:
- tsc --noEmit en 0 y pnpm test verde.
- Reporte en docs/reports/: handler del vínculo, validación de URL, manejo de error del push,
  i18n. Nota backlog EXPLÍCITA: "crear repo nuevo en GitHub via Octokit
  (createForAuthenticatedUser), con elección público/privado y manejo de nombre ya existente"
  queda para una iteración futura, fuera de esta fase.
- COMMIT + push. STOP.

CRITERIOS DE ACEPTACIÓN:
- [ ] El cartel ofrece init-solo-local o init+vincular-remoto.
- [ ] Vincular hace remote add + primer push reutilizando credenciales existentes.
- [ ] URL validada; push fallido muestra error legible sin romper el repo local ya creado.
- [ ] CSP sin dominios nuevos. Credenciales solo en main con safeStorage.
- [ ] i18n ES/EN/ZH. tsc/test verdes. Reporte escrito. Branch pusheada sin merge.
```
