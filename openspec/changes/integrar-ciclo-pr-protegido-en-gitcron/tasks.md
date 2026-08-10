## 1. Línea base y contratos

- [ ] 1.1 Confirmar que el change sigue activo en `change/integrar-ciclo-pr-protegido-en-gitcron`, registrar HEAD y revisar que el worktree no contiene cambios ajenos antes de implementar.
- [ ] 1.2 Inventariar con CodeGraph los callers y el impacto de `PullRequestEntry`, `PullRequestDiffView`, los handlers `github:list-prs`/`github:get-pr-diff`, `use-repo-loader` y `derivePipelineNextAction`; registrar los archivos exactos que deberán migrarse.
- [ ] 1.3 Caracterizar mediante tests existentes o fixtures el comportamiento actual de login GitHub, listado, diff, refresh, pull `ff-only` y borrado de ramas para conservarlo durante la migración.
- [ ] 1.4 Definir en `types/electron.d.ts` y módulos de dominio acotados los DTOs de identidad PR, checks, statuses, deployments, disponibilidad, merge gates y comandos con `expectedHeadSha`.

## 2. Credenciales GitHub main-only

- [ ] 2.1 Extraer un servicio de credenciales GitHub en Electron main que persista mediante `safeStorage`, exponga sólo estado/fingerprint y reutilice el Device Flow y token manual existentes sin enviar secretos al renderer.
- [ ] 2.2 Migrar listado y diff de PRs para que `electron/ipc/github.ts` derive owner/repo desde el origin validado y deje de aceptar el token desde preload o renderer.
- [ ] 2.3 Extender `sanitizeForLog()` y los errores del dominio GitHub para ocultar Authorization, cookies, tokens, bodies sensibles y URLs firmadas antes de cruzar IPC.
- [ ] 2.4 Actualizar preload y tipos IPC con métodos específicos de PR, sin canales genéricos, argv libres ni destinos remotos suministrados por el renderer.
- [ ] 2.5 Agregar pruebas de login, logout, migración, listado, diff y errores que demuestren que ningún token o header sensible llega al renderer o a logs.

## 3. Snapshot remoto y reconciliación

- [ ] 3.1 Implementar en Electron main la lectura correlacionada de PR, Draft, base/head, head SHA, mergeabilidad, métodos permitidos, checks, statuses, conversaciones disponibles y deployments GitHub.
- [ ] 3.2 Representar permisos insuficientes, rate limit y campos ausentes como evidencia `unavailable`, sin defaults exitosos ni bloqueo total de las funciones Git locales.
- [ ] 3.3 Incorporar un store/hook per-repo para snapshots PR con generation id, cancelación lógica de respuestas obsoletas y límites de tamaño para checks y deployments.
- [ ] 3.4 Refrescar el snapshot tras cada mutación, refresh manual, recuperación de foco y polling acotado mientras la vista activa conserve estados pendientes.
- [ ] 3.5 Actualizar la lista de PRs abiertos inmediatamente cuando GitHub informe `closed` o `merged`, eliminando etiquetas Draft y diffs obsoletos sin reiniciar el repositorio.
- [ ] 3.6 Cubrir con tests respuestas fuera de orden, merge externo, PR cerrado, evidencia parcial, rate limit y repositorio no GitHub.

## 4. Creación, Ready y merge seguro

- [ ] 4.1 Implementar detección inequívoca por head/base y creación de Draft PR con título, cuerpo y ramas visibles, evitando duplicados.
- [ ] 4.2 Implementar la transición Draft -> Ready como comando humano explícito y reconciliar el snapshot devuelto por GitHub.
- [ ] 4.3 Implementar merge mediante Octokit con método permitido y `expectedHeadSha`; releer el PR antes de mutar y rechazar cualquier carrera de revisión.
- [ ] 4.4 Bloquear la acción frente a checks requeridos pendientes/fallidos o merge state bloqueante conocido, sin auto-merge, bypass administrativo ni segundo método automático.
- [ ] 4.5 Construir la confirmación de merge reutilizando el patrón de `DangerConfirmDialog`, mostrando repo, PR, base, head, SHA, método y consecuencias.
- [ ] 4.6 Agregar pruebas de creación duplicada, Ready, método deshabilitado, check fallido, conversación bloqueante, SHA cambiado, rechazo GitHub y merge exitoso.

## 5. Superficie PR central

- [ ] 5.1 Extraer una tarjeta/panel reutilizable de ciclo PR e integrarla en `PullRequestDiffView` sin duplicar el diff existente ni modificar geometría de Graph/Cronométrico.
- [ ] 5.2 Mostrar estados verificables para Draft, Ready, checks, mergeabilidad, métodos, merge, deployments y datos no disponibles, con enlaces externos como complemento y no como única acción.
- [ ] 5.3 Agregar preferencia per-repo `direct`/`protected-pr` y una feature flag de mutaciones; ninguna detección deberá cambiar el modo sin aceptación humana.
- [ ] 5.4 Incorporar todas las strings nuevas en `lib/i18n.ts` para ES, EN y ZH, manteniendo español como fuente de verdad.
- [ ] 5.5 Agregar pruebas de componente para estados loading, pending, failure, unavailable, race de SHA, confirmación y reconciliación de merge externo.
- [ ] 5.6 Validar visualmente la tarjeta en tema oscuro con anchos normal y angosto, sin solapamientos, overflow horizontal ni confusión entre evidencia real y recomendación.

## 6. Sincronización y limpieza posteriores

- [ ] 6.1 Componer fetch, checkout seguro y pull `ff-only` existentes para ofrecer sincronización de la base local al merge commit sin crear merge local.
- [ ] 6.2 Bloquear la sincronización ante working tree incompatible, worktree que ocupa la base o divergencia; derivar a las decisiones Git existentes sin stash, reset o descarte automático.
- [ ] 6.3 Reutilizar el flujo de borrado de ramas y `DangerConfirmDialog` para ofrecer limpieza local, remota o ambas sólo después del merge y según la política de release.
- [ ] 6.4 Agregar pruebas con repositorios temporales para fast-forward, base actualizada, base divergida, cambios locales, worktree ocupado y rama no mergeada.

## 7. Verificación de release proveedor-neutral

- [ ] 7.1 Implementar el contrato normalizado `unavailable`/`pending`/`success`/`failure` correlacionado por repo, ambiente y merge SHA.
- [ ] 7.2 Crear el adapter baseline que combine GitHub Check Runs, commit Statuses y Deployments/Deployment Statuses, preservando app emisora, ambiente, revisión, URL y procedencia.
- [ ] 7.3 Separar disponibilidad HTTP de correlación de release para impedir que un 200 se presente como prueba del commit publicado.
- [ ] 7.4 Definir la interfaz para adapters directos futuros sin incorporar credenciales, CSP ni llamadas Netlify/Vercel/Supabase en este change.
- [ ] 7.5 Agregar fixtures y tests con señales equivalentes a Netlify, Vercel, checks Supabase, proyecto sin deploy, deployment fallido y evidencia no correlacionable.

## 8. Integración guiada en Pipeline

- [ ] 8.1 Adaptar el snapshot PR central al estado de Pipeline sin crear una segunda caché, API GitHub ni diálogo de merge.
- [ ] 8.2 Derivar gates OpenSpec verificables: rama asociada, tareas completas, validación humana atribuida, commit de cierre, Archive, commit posterior, head SHA y checks.
- [ ] 8.3 Extender `derivePipelineNextAction` con crear Draft, esperar checks, Ready, merge humano, sincronizar base, observar release y limpiar rama, distinguiendo acción, espera y decisión.
- [ ] 8.4 Invalidar la aprobación de Pipeline cuando cambie el head SHA y prohibir que runtimes/agentes disparen o confirmen merge.
- [ ] 8.5 Mantener funcionales repositorios sin OpenSpec y el modo `direct`; Pipeline no deberá inventar gates ni exigir deployment a bibliotecas.
- [ ] 8.6 Agregar pruebas de dominio y componentes para OpenSpec incompleto, Archive ausente, revisión nueva, checks verdes, merge externo, release pendiente/fallido/exitoso y repo sin OpenSpec.

## 9. QA técnico y seguridad

- [ ] 9.1 Ejecutar `pnpm exec tsc --noEmit` y dejar cero errores atribuibles al change.
- [ ] 9.2 Ejecutar `pnpm test`; si aparece el flake conocido de repositorios Git reales, repetir y registrar ambos resultados sin ocultar el primero.
- [ ] 9.3 Ejecutar ESLint sobre cada archivo tocado y corregir errores atribuibles sin expandir el alcance a deuda heredada.
- [ ] 9.4 Ejecutar `openspec validate integrar-ciclo-pr-protegido-en-gitcron --strict` y `git diff --check`.
- [ ] 9.5 Auditar IPC, logs y bundles para confirmar que no aparecen tokens, cookies, headers Authorization, credenciales de proveedor ni URLs firmadas.
- [ ] 9.6 Revisar el diff completo y confirmar que no modifica README, CHANGELOG, geometría de Graph/Cronométrico, dependencias ni cambios ajenos de otros worktrees.

## 10. Validación humana final

- [ ] 10.1 Alejandro valida en un repositorio descartable el ciclo Draft -> checks -> Ready -> merge commit -> refresh -> fast-forward -> release observado -> limpieza opcional, confirma la experiencia visual y autoriza commit de cierre, OpenSpec Archive y preparación del merge de esta rama. Ningún agente puede marcar esta tarea en su nombre.
