## Why

Al desacoplar el archivado del commit, `align-method-with-openspec` retiró una comodidad real:
antes, archivar dejaba el trabajo confirmado en Git con un mensaje ya escrito. Lo que se retiró
correctamente fue el acoplamiento y el artefacto `commit.md` —una convención que sólo existía acá y
que ningún ejecutor podía descubrir consultando el CLI—; la comodidad no tenía por qué irse con él.

La diferencia entre lo que se fue y lo que se puede recuperar es **declarar contra derivar**.
`commit.md` exigía que alguien escribiera de antemano qué archivos y qué mensaje; si no lo escribía,
no funcionaba. Todo eso puede salir del estado real, sin que nadie declare nada:

- qué archivos pertenecen al cambio, con `deterministicChangePaths`, que se conservó justamente por
  esto y deriva las rutas del id del cambio;
- qué está modificado, que lo sabe Git;
- qué especificaciones toca el cambio y con qué operación, con `openspec show <id> --json`.

Lo que no se puede derivar con honestidad es el tipo de commit y una descripción que explique por
qué se hizo el cambio. Eso requiere entender el trabajo, y por eso el mensaje se propone editable en
vez de imponerse.

## What Changes

- La guía ofrece **preparar** el commit del cambio cuando hay archivos suyos sin confirmar: deja los
  archivos listos y el mensaje sugerido escrito, en el mismo campo que ya usa la pestaña de commit.
- El mensaje sugerido se deriva del cambio: alcance a partir de los directorios tocados e
  identificador del cambio como descripción. Es un punto de partida editable, no una imposición.
- Los archivos del propio cambio se preparan siempre; los demás modificados se listan para que se
  vea qué queda fuera, y se preparan sólo si se eligen.
- **Confirmar sigue siendo un acto aparte.** La guía prepara; el commit lo ejecuta el flujo que ya
  existe, con su mensaje a la vista y su botón propio.

Fuera de alcance, declarado: la guía **no** ejecuta `commit`, ni `push`, ni `merge`, ni `tag`. No se
reintroduce ninguna acción que confirme en Git sin que una persona la dispare explícitamente desde
el flujo de commit. Tampoco se crea una interfaz de commit propia dentro de Pipeline: duplicaría la
que ya existe y que el usuario ya conoce.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: la guía suma la preparación del commit del cambio, con alcance y
  mensaje derivados del estado real.

## Impact

- `components/pipeline/OpenSpecDashboard.tsx` — el control y la lista de lo que se prepara.
- Un módulo nuevo con la derivación del alcance y del mensaje, puro y testeable sin disco.
- `lib/i18n.ts` (ES/EN/ZH) — los textos del control.
- Sin cambios de IPC: `stageFiles`, `setCommitMessage` y `commitChanges` ya existen y se reutilizan.
- Sin dependencias nuevas.
