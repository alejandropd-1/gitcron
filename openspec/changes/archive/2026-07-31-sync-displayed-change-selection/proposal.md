## Why

La vista puede estar mostrando un change del que no se leyó evidencia.

Cuando la rama no identifica ningún change activo y hay varios, el backend correctamente **no
selecciona ninguno**: la invariante de selección no ambigua le prohíbe adivinar. Pero el renderer
igual tiene que mostrar algo, y cae a `activeChanges[0]` — sin informárselo al backend.

El resultado es que la evidencia leída y el change mostrado no son el mismo. Mientras la validación
corría para todos los changes activos, la divergencia pasaba desapercibida. Al acotarla al change
seleccionado —por costo, en `fix-pipeline-refresh-cost`— quedó a la vista: el change que se muestra
figura con `validation: 'unknown'` aunque valide, y sus artefactos no viajan.

Caso real: con la rama `fix/openspec-artifacts-selection` y ese change ya archivado, ninguno de los
cuatro activos matchea. `add-explicit-change-archival` se muestra en pantalla, `openspec validate`
lo declara válido, y la app dice "Todavía no se validó" y deja el archivado deshabilitado.

## What Changes

- El renderer SHALL informar al backend el change que efectivamente está mostrando cuando la
  selección automática no resolvió ninguno, para que la evidencia leída corresponda a lo que se ve.
- No cambia la selección automática ni la invariante que le prohíbe adivinar: el backend sigue sin
  elegir por su cuenta. Lo que se corrige es que la elección de la vista deje de ser un secreto.
- No se toca la precedencia: una selección manual explícita del usuario sigue mandando sobre todo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-repo-evidence`: se declara que la evidencia leída debe corresponder al change que la
  vista muestra, incluso cuando quien lo resolvió fue el fallback del renderer.

## Impact

- `components/pipeline/OpenSpecDashboard.tsx` — informa la selección mostrada.
- Tests de sincronización entre lo mostrado y lo leído.
- Sin cambios en Electron main, IPC, SQLite ni i18n. Sin dependencias nuevas.
