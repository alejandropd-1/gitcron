## ADDED Requirements

### Requirement: Contrato proveedor-neutral de release
GitCron SHALL normalizar la verificación posterior al merge como evidencia correlacionada por repositorio, ambiente y merge SHA, con estados `unavailable`, `pending`, `success` o `failure`. Un HTTP 200 o un deployment reciente MUST NOT atribuirse al cambio si no se demuestra la revisión desplegada.

#### Scenario: Deployment correlacionado
- **WHEN** GitHub informa un deployment de producción exitoso para el merge SHA
- **THEN** GitCron muestra proveedor, ambiente, revisión, estado y enlace con procedencia

#### Scenario: Sitio responde sin correlación
- **WHEN** una URL pública responde pero no existe evidencia de qué commit está publicado
- **THEN** GitCron puede mostrar disponibilidad HTTP separada y no declara verificado el release

### Requirement: Baseline mediante GitHub Checks y Deployments
GitCron SHALL usar Checks, Statuses y Deployments de GitHub como baseline sin requerir credenciales directas de Netlify, Vercel o Supabase. La aplicación MUST conservar el nombre y app emisora para distinguir validaciones de código, previews y producción.

#### Scenario: Integración Netlify o Vercel publica estado en GitHub
- **WHEN** el proveedor registra checks o deployments para el PR y el merge SHA
- **THEN** GitCron los representa mediante el mismo contrato normalizado

#### Scenario: Check de Supabase definido por el repositorio
- **WHEN** CI publica un check de migraciones, RLS o tipos Supabase
- **THEN** GitCron muestra y exige su resultado según branch protection sin afirmar que ejecutó la auditoría

### Requirement: Adaptadores directos opcionales
GitCron MAY incorporar adaptadores directos de proveedor cuando GitHub no exponga evidencia suficiente, pero cada adaptador MUST declarar capacidades, autenticación, ambientes y criterio de correlación. La ausencia de un adaptador no deberá romper el flujo PR central salvo que una política explícita lo haga obligatorio.

#### Scenario: Proveedor sin adapter
- **WHEN** GitHub no ofrece deployment correlacionable y no hay adapter configurado
- **THEN** la verificación figura `unavailable` y el usuario conoce qué evidencia falta

#### Scenario: Política exige producción verificada
- **WHEN** el repositorio configura release exitoso como condición para limpiar la rama
- **THEN** GitCron conserva la rama mientras el adapter esté ausente, pendiente o fallido

### Requirement: Credenciales y errores sanitizados
GitCron MUST confinar cualquier credencial de adapter a Electron main mediante `safeStorage`, y SHALL devolver al renderer sólo estado, fingerprint y evidencia sanitizada. Los logs MUST ocultar tokens, cookies, bodies sensibles y URLs firmadas.

#### Scenario: Adapter autenticado
- **WHEN** un adapter consulta el proveedor
- **THEN** la credencial se descifra y usa exclusivamente en main sin cruzar IPC

#### Scenario: Error del proveedor
- **WHEN** la API devuelve un error que incluye headers o parámetros sensibles
- **THEN** GitCron presenta un mensaje útil después de sanitizar esos valores

### Requirement: Política configurable sin hardcode de proyecto
GitCron SHALL resolver la política de release desde configuración por repositorio y capacidades observadas, sin nombres de cliente, dominios ni ramas codificados en la aplicación. Netlify, Vercel y proyectos sin deploy MUST compartir el mismo modelo de estado.

#### Scenario: Dos repositorios con proveedores distintos
- **WHEN** un repositorio publica con Netlify y otro con Vercel
- **THEN** GitCron muestra ambos mediante el contrato común y conserva sus detalles de proveedor

#### Scenario: Repositorio de biblioteca
- **WHEN** el proyecto no tiene ambiente productivo
- **THEN** el cierre puede terminar en checks y merge sin inventar un deployment faltante

### Requirement: Observación sin mutación de infraestructura
GitCron SHALL limitar la verificación de release a observar estados y enlaces; no deberá configurar proyectos, variables, dominios, Supabase, Netlify o Vercel desde este flujo. Separar observación de administración evita que una operación de merge amplíe permisos sobre infraestructura.

#### Scenario: Deployment fallido
- **WHEN** el proveedor informa fallo después del merge
- **THEN** GitCron muestra la evidencia y acciones de diagnóstico, pero no cambia configuración ni redeploya automáticamente
