## Context

GitCron posee dos recorridos que hoy no se conectan. La capa GitHub en `electron/ipc/github.ts` lista PRs y obtiene diffs; `PullRequestDiffView` los muestra y abre el navegador. Pipeline, por su parte, conoce el change, las tareas, la rama y el Archive, pero no tiene evidencia autoritativa del ciclo remoto. El cierre de `odontoPau` requirió pasar manualmente por GitHub para Ready y merge, volver a GitCron, refrescar un PR obsoleto, cambiar a `main`, interpretar `behind` y elegir fast-forward. El flujo funcionó, pero la aplicación no lo guió de extremo a extremo.

La capacidad debe servir tanto a repositorios sin OpenSpec como a proyectos desplegados por Netlify, Vercel u otros proveedores. GitHub es el denominador común para PR, checks, branch protection y deployments. Supabase no es un proveedor de merge: sus garantías deben llegar como checks definidos por cada repositorio. No se midió todavía el ahorro de tiempo ni la reducción de errores; ambos son resultados esperados que deberán medirse durante pruebas de uso.

Existe una deuda que condiciona el diseño: la autenticación GitHub actual cruza el renderer y contradice las invariantes de seguridad. Ninguna mutación nueva puede ampliar ese patrón. El ciclo PR migrará las consultas existentes al mismo servicio main-only que utilizarán Ready y merge.

## Goals / Non-Goals

**Goals:**

- Convertir el ciclo PR de GitHub en una capacidad central, optativa y reutilizable por PR view, Graph y Pipeline.
- Mantener cada merge como decisión humana sobre un SHA exacto, sin auto-merge ni bypass.
- Reconciliar estado externo e interno después de crear, actualizar, mergear o recuperar foco.
- Guiar la sincronización local por fast-forward y la limpieza posterior sin descartar trabajo.
- Normalizar checks y deployments por merge SHA sin acoplar el núcleo a Netlify o Vercel.
- Integrar gates OpenSpec sólo cuando Pipeline pueda atribuir un change a la rama.
- Confinar credenciales y llamadas autenticadas a Electron main.

**Non-Goals:**

- Soportar GitLab, Bitbucket o PRs de otros hosts en esta versión.
- Crear workflows CI, auditar universalmente seguridad, administrar RLS/migraciones Supabase o cambiar infraestructura de deploy.
- Implementar adapters directos de Netlify/Vercel antes de demostrar que GitHub Checks/Deployments es insuficiente.
- Hacer merge, checkout, pull, borrado o redeploy automáticos.
- Cambiar geometría de Graph/Cronométrico, README, CHANGELOG o dependencias.

## Decisions

### Capacidad central con adapter fino para Pipeline

El dominio PR vivirá fuera de `components/pipeline/`. Un servicio main-only consultará y mutará GitHub; un hook/store per-repo expondrá snapshots al renderer; una superficie reutilizable presentará estado y acciones. `PullRequestDiffView` consumirá esa superficie y Pipeline traducirá el mismo snapshot a su modelo de siguiente acción.

Alternativa descartada: implementar todo dentro de Pipeline. Reduciría integración inicial, pero excluiría repositorios sin OpenSpec, duplicaría la vista de PR y mezclaría gobernanza OpenSpec con una capacidad Git general.

### Servicio GitHub main-only y migración del IPC existente

Se extraerá un servicio de credenciales GitHub respaldado por `safeStorage`. Los handlers recibirán `repoPath`, número de PR y comandos tipados; main derivará owner/repo desde el origin validado. Listado y diff migrarán al servicio para que el renderer deje de enviar tokens. El preload expondrá métodos específicos, no un request genérico ni headers libres.

Alternativa descartada: conservar el token en Zustand para las lecturas y usar main-only sólo en merge. Mantendría dos modelos de confianza y la nueva superficie seguiría dependiendo de una deuda prohibida por las invariantes.

### Snapshot normalizado y comandos con precondiciones

`PullRequestLifecycleSnapshot` contendrá identidad, base/head, `headSha`, Draft, mergeability, conversaciones si están disponibles, métodos permitidos, checks, statuses y deployments con procedencia. Los comandos mutables serán `createDraft`, `markReady` y `merge`; `merge` exigirá `expectedHeadSha` y `mergeMethod`. Antes de mutar, main releerá el PR y comparará SHA. GitHub seguirá siendo la autoridad final sobre branch protection.

Alternativa descartada: habilitar el botón sólo con el snapshot cacheado. Una actualización entre render y click permitiría aprobar una revisión distinta.

### Reconciliación acotada en vez de polling global

GitCron refrescará después de cada acción, en refresh manual, al recuperar foco y mientras una vista de PR o checkpoint activo tenga estados pendientes. Cada petición llevará un generation/request id para descartar respuestas tardías. No habrá polling de todos los repositorios abiertos, evitando consumo innecesario de rate limit.

Alternativa descartada: webhook local. Una app de escritorio detrás de NAT exigiría infraestructura externa y ampliaría el alcance sin necesidad.

### Confirmación unificada y métodos explícitos

El merge reutilizará `DangerConfirmDialog` o su patrón visual, mostrando repo, PR, base, head, SHA y método. El núcleo presentará sólo métodos habilitados por GitHub. La preferencia por repositorio podrá recordar el último método, pero la confirmación siempre lo mostrará. Pipeline recomendará merge commit cuando el change contenga commits separados de cierre y Archive; no lo impondrá a repositorios ajenos.

Alternativa descartada: botón único con método predeterminado oculto. Haría fácil perder la estructura de commits mediante squash.

### Sincronización local compone operaciones Git existentes

Después del merge, GitCron hará fetch y calculará si la base local admite fast-forward. La acción guiada compondrá checkout seguro y el pull `ff-only` ya existente. Si hay cambios, divergencia o worktree que bloquea la rama, derivará al flujo de decisión actual. No se ejecutará un merge local adicional.

Alternativa descartada: actualizar `main` automáticamente. Cambiar de rama puede interrumpir otro trabajo y viola la confirmación exigida para escrituras Git.

### Verificación de release basada primero en GitHub

El primer adapter normalizará Check Runs, commit Statuses y Deployments/Deployment Statuses de GitHub para el merge SHA. Guardará app emisora, ambiente, URL, revisión y procedencia. Una URL HTTP podrá observarse por separado, pero no probará qué commit sirve. Los adapters directos de proveedor quedarán detrás de una interfaz y otro change si la evidencia real demuestra que son necesarios.

Alternativa descartada: integrar de entrada tokens Netlify, Vercel y Supabase. Multiplicaría credenciales, CSP, estados y planes comerciales antes de validar el núcleo.

### Preferencia por repositorio y feature flag de adopción

La capacidad aparecerá en la vista PR para cualquier remoto GitHub. Pipeline usará una preferencia per-repo `direct` o `protected-pr`; podrá recomendar `protected-pr` si observa branch protection u OpenSpec, pero sólo el usuario cambiará el modo. Durante la migración, una feature flag permitirá desactivar las mutaciones y conservar la lectura existente.

Alternativa descartada: activar PR protegido globalmente. Cambiaría el método de todos los repositorios sin consentimiento.

### Seguridad comprobable y sin nuevas dependencias

Los errores de Octokit pasarán por sanitización antes de volver al renderer. Los DTOs tendrán límites para checks, deployments y textos. Las pruebas usarán clientes GitHub simulados; ningún test hará llamadas reales ni consumirá tokens. Se reutilizarán Octokit, simple-git, safeStorage, Zustand y componentes existentes.

## Risks / Trade-offs

- [Migrar auth GitHub puede afectar login y lecturas existentes] → Cubrir Device Flow, token manual, persistencia, listado y diff con pruebas antes de habilitar mutaciones.
- [GitHub no entrega branch protection completa a todos los permisos] → Representar evidencia ausente y dejar que la API de merge sea autoridad; nunca inferir aprobación.
- [Carreras entre refresh y acciones] → Comparar `expectedHeadSha`, serializar mutaciones por repo/PR y descartar respuestas de generaciones viejas.
- [Rate limit por checks y deployments] → Refresco focalizado, caché breve per-repo y backoff visible.
- [Un proveedor no publica deployment correlacionable en GitHub] → Estado `unavailable`; adapter directo posterior sustentado por evidencia, no por anticipación.
- [Pipeline y PR view se contradicen] → Un único store/snapshot de dominio y componentes consumidores sin caché paralela.
- [La sincronización local interrumpe trabajo] → Acción separada, preflight de working tree/worktrees y fast-forward exclusivo.
- [El flujo parece una auditoría de seguridad universal] → Lenguaje explícito: GitCron observa gates; cada repositorio define qué prueban.

## Migration Plan

1. Incorporar tipos de dominio, clientes GitHub simulables y servicio de credenciales main-only; migrar listado/diff sin cambiar UI.
2. Añadir snapshot enriquecido y reconciliación, manteniendo las mutaciones detrás de feature flag.
3. Implementar creación Draft y transición Ready con pruebas de errores y refresco.
4. Implementar merge con SHA esperado, métodos permitidos y confirmación humana.
5. Integrar sincronización fast-forward y limpieza opcional reutilizando acciones Git existentes.
6. Añadir baseline de release mediante GitHub Checks/Statuses/Deployments.
7. Integrar el checkpoint en Pipeline y validar repositorios con y sin OpenSpec.
8. Ejecutar TypeScript, suite completa repetida si aparece el flake conocido, lint tocado, OpenSpec estricto y QA visual en tema oscuro.

Rollback: desactivar la feature flag de mutaciones conserva listado y diff; los commits GitHub ya realizados no se revierten automáticamente. Un merge fallido no desencadena otra estrategia. Las credenciales migradas mantienen un camino de logout/reautenticación sin volver a exponer tokens al renderer.

## Open Questions

- Medir durante implementación si GitHub Deployments correlaciona producción de Netlify y Vercel con suficiente fidelidad en repositorios reales. Si no, documentar la brecha y proponer adapters directos por separado.
- Confirmar en QA visual si el checkpoint central se presenta mejor como bloque persistente en la vista PR o como panel lateral reutilizable; no se tocará la geometría de los grafos.
