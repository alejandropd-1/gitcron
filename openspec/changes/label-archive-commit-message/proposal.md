## Why

El circuito de un cambio produce dos commits: el del trabajo y el del archivado. El mensaje sugerido
es el mismo en los dos, así que en el historial quedan dos entradas indistinguibles salvo por su
contenido.

Se puede ver en este mismo repositorio. `e5081b8 chore: carry-branch-rule-in-config` es el trabajo y
`8f96418 chore: archived carry-branch-rule-in-config` es el archivado, pero la palabra "archived" la
escribió una persona: la aplicación había sugerido lo mismo que en el commit anterior. El patrón se
repite hacia atrás —`chore: archived render-openspec-markdown`,
`chore: archived retire-stale-agent-instructions`— siempre agregado a mano.

El mecanismo está localizado. `suggestCommitMessage` en `lib/change-commit-scope.ts:206` compone
`${prefix} ${changeId}` con el identificador que devuelve `soleChangeId`, y esa función suma el
identificador de las rutas de archivado igual que el de los artefactos activos
(`change-commit-scope.ts:183-184`). Un commit de archivado son renombres de
`openspec/changes/<slug>/` a `openspec/changes/archive/<fecha>-<slug>/` más la spec consolidada
—comprobado sobre `8f96418` con `git show --name-status -M`: cuatro `R100` y una `M`—, así que todas
las rutas que aportan identificador aportan el mismo, y el mensaje sale idéntico al del trabajo.

Que `soleChangeId` cuente los archivados es deliberado y no se toca: sin eso, el commit de archivado
—el que mejor se puede describir— quedaba sin descripción. Lo que falta es distinguir de qué commit se
trata.

## What Changes

- Cuando el conjunto que se va a preparar corresponde a un archivado, el mensaje sugerido intercala
  `archived` antes del identificador: `chore: archived <slug>`.
- El resto de los casos no se toca: un cambio activo sigue sugiriendo `chore: <slug>`, y un conjunto
  que abarca varios cambios sigue devolviendo la descripción vacía para que la escriba una persona.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el mensaje sugerido distingue el commit de archivado del commit del
  trabajo.

## Impact

**Producción:** `lib/change-commit-scope.ts`, únicamente `suggestCommitMessage`.

**Sin tocar:** `soleChangeId`, `fileOrigin`, `deriveScope` y el agrupamiento. En particular, las dos
mitades de un archivado siguen yendo juntas en un grupo: separarlas rompe la detección de renombres de
Git y `git log --follow` deja de alcanzar el commit donde se escribió el artefacto.

**Fuera de alcance:** cambiar el tipo `chore` por otro, traducir la palabra al español —el patrón que
ya se escribe a mano es `archived`, y el resto del mensaje es un slug en kebab-case—, y describir el
contenido del archivado más allá del identificador.

**Dependencias:** ninguna.

**Riesgo:** bajo. `suggestCommitMessage` es una función pura sobre una lista de rutas, sin estado de Git
ni forma de `GitFile`, y se prueba con tablas. El mensaje sugerido no pisa lo que haya escrito una
persona, así que el peor caso es una sugerencia que se corrige antes de confirmar.
