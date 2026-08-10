## Why

GitCron permite listar Pull Requests y leer su diff, pero obliga a abandonar la aplicación para cambiar un PR de borrador a revisión, comprobar sus checks, elegir el método de merge, fusionarlo y sincronizar la rama local. La evidencia está en `electron/ipc/github.ts:167-246`, donde sólo existen handlers de listado y diff, y en `components/RepoContentViews.tsx:390-477`, cuya única acción remota abre GitHub en el navegador. El cierre reciente de `odontoPau` mostró además que el estado externo queda obsoleto en la interfaz hasta refrescar manualmente.

El problema no es específico de Netlify ni de OpenSpec: cualquier repositorio alojado en GitHub puede necesitar un circuito de PR protegido, mientras que los checks y el proveedor de despliegue varían entre proyectos. GitCron necesita una capacidad central y optativa que preserve la decisión humana de merge, y Pipeline debe poder enriquecerla sin convertir OpenSpec en requisito para el resto de los usuarios.

## What Changes

- Incorporar un ciclo de vida de Pull Request operable dentro de GitCron: crear o detectar el PR de la rama, refrescar estado, mostrar revisión exacta, checks, mergeabilidad y protección; pasar de Draft a Ready; fusionar con método explícito; reconciliar la interfaz después del merge; sincronizar `main` por fast-forward y ofrecer limpieza posterior de ramas.
- Mantener el merge como decisión humana irreversible, con confirmación que muestre repositorio, PR, base, head SHA y método. GitCron no hará auto-merge, no usará bypass administrativo y rechazará la operación si cambió la revisión aprobada o no se satisfacen los checks requeridos.
- Exponer el flujo PR como capacidad central optativa, accesible desde la vista de Pull Requests y reutilizable por Graph y Pipeline. Los repositorios podrán seguir usando el flujo Git directo actual.
- Integrar en Pipeline un checkpoint de release que combine evidencia GitHub con tareas y Archive de OpenSpec cuando exista un cambio asociado, sin exigir OpenSpec a repositorios que no lo usen.
- Introducir un contrato de verificación posterior al merge independiente del proveedor. GitHub Checks y estados de deployment serán la base genérica; Netlify, Vercel u otros servicios se incorporarán como adaptadores opcionales, sin hardcodear `odontoPau`, dominios ni credenciales.
- Refrescar automáticamente PRs y estado Git después de acciones ejecutadas dentro de GitCron, y reconciliar acciones realizadas externamente al volver el foco o solicitar actualización.
- Conservar secretos de GitHub y proveedores exclusivamente en Electron main mediante `safeStorage`; el renderer recibirá DTOs sanitizados y comandos acotados, nunca tokens.

### Fuera de alcance

Este cambio no creará workflows CI universales, no afirmará que un build equivale a una auditoría de seguridad, no administrará políticas RLS de Supabase ni configurará proyectos Netlify/Vercel. Cada repositorio seguirá definiendo sus comandos y checks. Tampoco incorporará soporte para proveedores Git distintos de GitHub, auto-merge, merge con checks fallidos, force-push, eliminación automática de ramas ni cambios en la geometría de Graph/Cronométrico.

## Capabilities

### New Capabilities

- `github-pr-lifecycle`: Gestión segura y optativa del ciclo completo de Pull Requests de GitHub, desde detección o creación hasta merge humano, reconciliación y sincronización local.
- `release-verification-adapters`: Contrato proveedor-neutral para observar checks y despliegues posteriores al merge, con adaptadores opcionales y evidencia explícita de disponibilidad.

### Modified Capabilities

- `pipeline-guided-workflow`: Pipeline incorporará el checkpoint PR/release cuando corresponda y agregará gates OpenSpec sin duplicar la capacidad central ni bloquear repositorios sin OpenSpec.

## Impact

El cambio afectará los DTOs de PR en `types/electron.d.ts`, handlers y autenticación GitHub en `electron/ipc/github.ts`, preload tipado, carga y reconciliación de repositorios, la vista de PRs, notificaciones, i18n ES/EN/ZH y el modelo de siguiente acción de Pipeline. Se agregarán pruebas unitarias y de componente para estados, seguridad, confirmaciones, carreras de SHA, branch protection, merge, fast-forward y degradación de adaptadores. No se agregan dependencias: Octokit, `simple-git`, `safeStorage` y las superficies visuales existentes cubren el núcleo previsto.
