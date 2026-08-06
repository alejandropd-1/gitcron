## Why

`branch-on-change-creation` dejó funcionando la creación de `change/<slug>`, pero sólo en un camino: el
formulario "Tengo clara la tarea" de la aplicación, que es el único momento en que la aplicación conoce
el slug antes de que exista el cambio. Los cambios de este proyecto no se crean así. Los crea un
ejecutor con `openspec new change "<slug>"` desde la terminal, y ahí no interviene ninguna pantalla.

El resultado se mide: `git branch --list "change/*"` no devuelve nada sobre 35 ramas locales, aunque
desde que la función existe se archivaron quince cambios. La convención está implementada y no se
aplicó ni una vez, porque quien crea los cambios nunca pasa por donde está implementada.

Esto es el mismo anti-patrón que `AGENTS.md` describe y que este proyecto ya corrigió una vez: una
regla que sólo existe donde no la mira quien tiene que cumplirla no es vinculante. El canal por el que
la metodología llega a cualquier ejecutor es `openspec/config.yaml`, que el CLI entrega con
`openspec instructions <artefacto> --change <id> --json`. La regla de la rama tiene que viajar por ahí.

Cierra además un pendiente concreto: mientras no haya una rama por cambio, atribuir archivos de código
a un cambio no tiene ningún dato de Git sobre el cual apoyarse.

## What Changes

- `openspec/config.yaml` gana la regla de que todo cambio se trabaja en `change/<slug>`, con el mando
  concreto para crearla y qué hacer si ya existe, redactada para que un ejecutor sin la aplicación
  pueda cumplirla.
- La regla queda en el artefacto que corresponde para que el CLI la entregue al empezar, no al cerrar.
- `AGENTS.md` remite al canal en vez de repetir la regla, coherente con lo que ese archivo ya declara.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: la convención de rama por cambio deja de vivir sólo en el formulario de
  la aplicación y viaja por el canal de instrucciones que alcanza a cualquier ejecutor.

## Impact

**Producción:** `openspec/config.yaml` (regla nueva), `AGENTS.md` (remisión al canal).

**Sin tocar:** `components/pipeline/PipelineNewChangeFlow.tsx` y el canal `git:create-branch`, que ya
hacen lo suyo bien; el prefijo `change/`, decidido y fundamentado en el reporte del 2026-08-05.

**Fuera de alcance:** qué hace el archivado con la rama, fusionarla, borrarla, o pararse en ella al
abrir un cambio existente. Ale acotó ese alcance explícitamente cuando se hizo
`branch-on-change-creation` y el recorte sigue en pie. Tampoco entra que la aplicación verifique o
imponga la rama: la regla es para el ejecutor.

**Dependencias:** ninguna. Habilita `attribute-files-to-change`, que necesita que la rama exista para
poder apoyarse en ella.

**Riesgo:** bajo en código —no se toca ninguno— y real en adopción: una regla en el canal sólo se
cumple si el ejecutor pide instrucciones. No se puede prometer que se cumpla siempre; lo que sí se
puede medir después es si aparecen ramas `change/*`, y ésa es la comprobación honesta.
