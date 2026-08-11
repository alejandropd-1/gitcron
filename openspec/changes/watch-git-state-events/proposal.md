## Why

GitCron ignora el directorio `.git/` por completo cuando observa un repositorio. La evidencia está en
`electron/ipc/watchers.ts:12-19`, donde `IGNORED_PATTERNS` arranca con `/(^|[/\\])\.git([/\\]|$)/` y ese
patrón se pasa como `ignored` a chokidar. En consecuencia, todo cambio que ocurre **dentro** de `.git/`
—preparar o quitar archivos del index, cambiar de rama, un merge o un rebase que arranca, un commit
hecho desde la terminal— no produce ningún evento de filesystem, y la aplicación se entera únicamente
cuando el latido de `hooks/use-repo-loader.ts:719` corre `git status` cada 2 segundos.

Eso invierte los papeles declarados: el comentario de ese latido lo describe como red de seguridad para
eventos que Windows, los editores o los guardados atómicos pudieran perder, pero hoy es la **única**
fuente de la mitad de los cambios de estado del repositorio. Por eso no se lo puede espaciar sin
degradar la aplicación, y por eso su costo —medido en `git status --porcelain` sobre este repositorio:
mediana de 42 ms, unos 76 segundos de CPU por hora con la ventana enfocada— no tiene hoy ninguna
alternativa. El change `reduce-idle-rerenders` ya eliminó el re-dibujado que ese latido provocaba, pero
dejó el proceso intacto y declaró el costo como pendiente conocido.

## What Changes

- Observar dentro de `.git/` los caminos que declaran un cambio de estado, en vez de ignorar el
  directorio entero: `index`, `HEAD`, `MERGE_HEAD`, los directorios de rebase en curso y `refs/heads/`.
  La lista es cerrada y explícita —una lista blanca, no el directorio completo— porque Git escribe en
  `.git/` con muchísima frecuencia: objetos, logs de referencia y archivos de bloqueo que no cambian
  nada de lo que la aplicación muestra.
- Antes de releer el estado, comprobar con una operación barata si algo cambió efectivamente, para que
  un disparo redundante no pague el `git status` completo.
- Recién con lo anterior en pie, espaciar el latido de respaldo y hacerlo adaptativo: frecuente después
  de actividad reciente, espaciado cuando el repositorio está quieto. Deja de ser la fuente principal y
  pasa a cubrir sólo lo que el sistema de archivos no informó.
- Declarar, con medición, cuánto cuesta observar `.git/` durante una operación que escribe mucho ahí
  —un `checkout` entre ramas distantes, un rebase— y demostrar que el agrupado de eventos lo absorbe.

### Fuera de alcance

No se cambia qué lee la aplicación cuando detecta un cambio, ni cómo lo muestra: sólo **cuándo** se
entera. No se elimina el latido de respaldo —los eventos de filesystem se pierden de verdad en Windows,
y quitarlo cambiaría un costo medible por un fallo silencioso—. No se toca la observación del árbol de
trabajo, que ya funciona. No se adopta `core.fsmonitor` de Git como parte de este cambio: puede abaratar
cada `git status`, pero es una decisión aparte, con su propia medición y su propio riesgo de
compatibilidad de versiones.

## Capabilities

### Modified Capabilities

- `repo-watch-lifecycle`: la observación pasa a incluir los caminos de estado de `.git/`, y el
  temporizador de respaldo cambia de cadencia fija a adaptativa. Los disparadores existentes se
  conservan: ninguno se pierde, se agregan los que faltaban.

## Impact

- `electron/ipc/watchers.ts`: la lista de patrones ignorados y la configuración de chokidar.
- `hooks/use-repo-loader.ts`: la cadencia del temporizador de respaldo y la guardia previa a releer.
- `electron/__tests__/watchers.test.ts` y `hooks/__tests__/use-repo-watch.test.ts`: cubren el
  comportamiento que cambia.
- Sin dependencias nuevas: chokidar ya está en el proyecto y es el mismo observador.
