## Por qué

La configuración de OpenSpec que se maneja con `openspec config` es de la máquina, no del
repositorio: el propio CLI lo declara (`--scope`: only "global" supported currently).
Afecta a todos los repositorios abiertos a la vez. Hoy el único control que GitCron
ofrece sobre ella —el perfil de workflows— vive en el panel lateral del repositorio, que
es el lugar de lo que pertenece a ese repositorio. Es configuración de máquina metida en
un panel de repositorio, y es la primera de una familia: el CLI expone siete claves
(profile, delivery, workflows, defaultStore, featureFlags, telemetry, completionTipSeen)
y siete operaciones (list, get, set, unset, reset, edit, profile).
Decisión de Alejandro del 2026-09-11: todo lo que sea configuración de base de OpenSpec
se administra desde la Configuración de GitCron, donde ya viven Temporal Agent y
Cartograph, y no desde el panel del repositorio.

## Qué cambia

- La administración de la configuración global de OpenSpec se muda a la Configuración de
  GitCron, como una sección más junto a las existentes.
- El panel lateral del repositorio conserva sólo lo que es del repositorio: qué resuelve
  el perfil para ese repositorio y qué tienen instalado sus agentes. Lo muestra; no lo
  edita.
- El perfil de workflows construido en gestionar-ciclo-openspec-desde-gitcron (tareas 7.1
  y 7.2) se reubica; su lógica y su canal de escritura se reutilizan tal cual.
- Se incorporan las demás claves y operaciones que el CLI exponga, leyéndolas del propio
  CLI y no de una lista escrita en el código.

## Qué no cambia

- Ninguna regla del método: openspec/config.yaml de cada repositorio no se toca.
- La versión del motor instalada y el rango que la aplicación declara soportar.

## Dependencias

Se encara después de cerrar gestionar-ciclo-openspec-desde-gitcron, que hoy tiene 22
tareas pendientes.
