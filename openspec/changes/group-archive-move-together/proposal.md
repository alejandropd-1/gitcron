## Why

El panel de preparación parte en dos las mitades de un mismo movimiento, y eso rompe la detección de
renombres de Git. `fileOrigin` en `lib/change-commit-scope.ts:70` clasifica sólo por la ruta: después
de archivar, el `openspec/changes/<id>/design.md` **borrado** sigue cayendo en el grupo del cambio
`<id>`, mientras que el `openspec/changes/archive/<fecha>-<id>/design.md` **nuevo** cae en el grupo de
restos de archivado. Son el origen y el destino de un solo movimiento, presentados como dos cosas
distintas.

La consecuencia se midió sobre commits reales de este repositorio. Con el movimiento entero en un
commit —`9396978`— Git lo detectó como renombre: `design.md | 0`, cero líneas cambiadas, sólo la
ruta. Con las mitades repartidas en dos commits —`56ddab1` borra, `cde474f` agrega— no pudo: 91 líneas
borradas de un lado y 91 agregadas del otro, sin vínculo. La detección de renombres de Git opera
sobre el diff de un commit, así que separar las mitades la deshabilita.

Lo que se pierde es la trazabilidad. `git log --follow` sobre
`openspec/changes/archive/2026-08-04-raise-commit-to-repo-level/design.md` devuelve dos commits: el
archivado y aquel donde el archivo se escribió. El mismo comando sobre
`openspec/changes/archive/2026-08-05-add-pipeline-start-screen/design.md` devuelve uno solo, y la
historia previa queda inalcanzable. El contenido no se perdió; lo que se perdió es poder llegar a
cuándo se escribió esa propuesta sin buscarla a mano.

Nada de esto fue un error de uso. Ale commiteó grupo por grupo justamente para conservar los mensajes
sugeridos, que es lo que el panel invita a hacer, y el resultado fueron seis commits donde
correspondían tres.

## What Changes

Las dos mitades de un archivado quedan en un solo grupo. Cuando entre lo modificado hay archivos bajo
`openspec/changes/archive/<fecha>-<id>/` y también bajo `openspec/changes/<id>/`, los segundos son la
mitad borrada de ese movimiento y se presentan junto a la mitad nueva. Un grupo, una selección, un
commit, el renombre intacto.

Esto se deduce sólo de las rutas presentes en el conjunto modificado, sin mirar el estado de Git de
cada archivo: la función sigue siendo pura y probable con tablas. Un archivo borrado de un cambio que
**no** fue archivado sigue perteneciendo a ese cambio, porque no hay ninguna carpeta de archivo que lo
reclame.

El mensaje sugerido pasa a reconocer el identificador dentro de una ruta de archivado. Hoy los restos
de un archivado no aportan identificador —decisión de `raise-commit-to-repo-level`, tomada para que
no nombraran un trabajo ya cerrado dentro de un commit de trabajo—, pero cuando la selección **es** el
archivado, no nombrarlo deja la descripción vacía justo en el commit que mejor se puede describir. La
regla pasa a ser la misma de siempre, con la fuente ampliada: si en todo lo elegido aparece un solo
identificador, sea de un cambio activo o de uno archivado, se usa ese; si aparecen dos, la descripción
queda vacía como señal de mezcla.

Queda **fuera de alcance**: el ancho de los paneles de artefactos, que sigue sin poder reproducirse; el
grafo de OpenSpec; y cualquier cambio en qué hace `openspec archive`, que no se toca.

## Capabilities

### New Capabilities

Ninguna. Cómo se agrupa lo modificado y cómo se deriva el mensaje ya son requisitos de
`pipeline-guided-workflow`.

### Modified Capabilities

- `pipeline-guided-workflow`: «El alcance se deriva, no se declara» pasa a tratar las dos mitades de un
  archivado como un solo grupo. «El mensaje se sugiere y se puede editar» pasa a reconocer el
  identificador de un cambio archivado como fuente válida.

## Impact

En `lib/change-commit-scope.ts`, `fileOrigin` deja de ser una función de una sola ruta y pasa a
resolverse contra el conjunto, `deriveRepoCommitScope` calcula primero qué identificadores fueron
archivados, y `soleChangeId` lee también las rutas de archivado. En el renderer,
`components/pipeline/OpenSpecDashboard.tsx` no cambia de lógica: consume los grupos que la función ya
devuelve.

En pruebas, `lib/__tests__/change-commit-scope.test.ts` suma el caso del archivado completo con sus dos
mitades, y el caso de control de un archivo borrado de un cambio no archivado.

No se agregan dependencias. No se toca el proceso principal.
