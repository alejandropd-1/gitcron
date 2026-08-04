## Why

Hoy ninguna tarea se puede marcar desde la aplicación, y ninguna se marca sola.

Antes, archivar tildaba la tarea de firma. Esa convención se retiró en `align-method-with-openspec`
porque era propia de este repositorio y OpenSpec no la define. La decisión fue correcta, pero dejó un
hueco: **el mecanismo que iba a reemplazarla nunca se hizo**.

El resultado se ve en el último cambio archivado. `improve-commit-panel-readability` cerró con esto:

```
- [ ] 6.5 Ale valida visualmente el panel: agrupación, distintivos de estado y selección de texto
```

La validación se hizo. La casilla quedó sin marcar, congelada así en el archivo, porque el archivado
no marca nada y no hay forma de tildarla sin abrir el archivo a mano. Toda tarea de validación
humana —"Ale valida", "Ale comprueba con la aplicación"— tiene el mismo destino: el registro dice
que quedó pendiente algo que sí se hizo.

## What Changes

- Las tareas del cambio activo se pueden tildar y destildar desde la lista, con un clic.
- Tildar es inmediato. **Destildar algo ya tildado pide confirmación**, porque borra la constancia
  de algo que alguien afirmó haber hecho.
- Cada cambio de estado queda registrado en `openspec/changes/<id>/task-log.md`, dentro del
  repositorio: viaja con el trabajo y lo puede leer cualquiera, con o sin la aplicación.
- Un cambio archivado no se edita: su registro describe cómo se trabajó entonces.

Fuera de alcance, declarado: no se reintroduce ninguna tarea con texto literal ni ninguna casilla
que se marque sola. Marcar sigue siendo un acto humano; lo que cambia es que ahora se puede hacer
desde donde se está mirando. Tampoco se toca el archivado ni el conteo de progreso, que ya se derivan
de `tasks.md`.

## Capabilities

### New Capabilities

- `task-checkbox-editing`: quién puede cambiar el estado de una tarea, con qué resguardos, y qué
  queda registrado al hacerlo.

## Impact

- Módulo nuevo con el cambio de estado sobre el markdown, puro y testeable sin disco.
- Módulo nuevo de IPC con permiso de escritura, separado del que declara no escribir.
- `components/pipeline/OpenSpecDashboard.tsx` — la casilla en la lista de tareas y la confirmación.
- `electron/preload.ts` y `types/electron.d.ts` — el canal nuevo.
- `lib/i18n.ts` (ES/EN/ZH).
- Sin dependencias nuevas. El refresco ya existe: escribir dispara el watcher y el snapshot vuelve.
