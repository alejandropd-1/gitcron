## Why

Ale apretó PUSH y recibió esto, tal cual, en un cartel rojo:

> *fatal: The upstream branch of your current branch does not match the name of your current branch. To
> push to the upstream branch on the remote, use `git push origin HEAD:change/name-task-in-commit-message`
> … To choose either option permanently, see push.default in 'git help config'. To avoid automatically
> configuring an upstream branch when its name won't match the local branch, see option 'simple' of
> branch.autoSetupMerge in 'git help config'.*

Ocho líneas en inglés que nombran `push.default`, `branch.autoSetupMerge` y dos formas distintas de
`git push`. Su primera reacción fue preguntar si era un problema de conexión, que es exactamente lo que
pasa cuando el texto no se entiende: se adivina la causa equivocada.

El caso real era simple de decir: **la rama se renombró y el vínculo con el remoto quedó apuntando al
nombre anterior.** Y no era un error de GitCron: Git se negó a adivinar a cuál de los dos nombres empujar,
que es la conducta correcta.

Pero además hay un agujero peor que el texto. **GitCron no sabe reapuntar un upstream desalineado.**
`git:push-branch` sólo agrega `--set-upstream` cuando el primer intento falla por «sin upstream»; acá el
primer intento funciona, así que el vínculo queda desalineado para siempre y el botón PUSH sigue fallando.
Renombrar una rama es normal, y la aplicación deja a la persona sin salida dentro de sí misma: la obliga a
la terminal.

## What Changes

- Los fallos habituales de `push` se explican en el idioma de la aplicación, diciendo qué pasó y qué se
  puede hacer, con el texto original de Git disponible para quien lo quiera.
- Cuando el vínculo con el remoto apunta a otro nombre, GitCron ofrece **reapuntarlo**, que es la acción
  que hoy obliga a salir a la terminal.
- Lo que la aplicación no reconoce se muestra como viene, sin adornarlo: inventar una explicación para un
  fallo que no se entendió sería peor que el texto crudo.

## Capabilities

**New Capabilities**
- `git-failure-language`: cómo se le cuenta a una persona que una operación de Git falló, y qué salida se
  le ofrece.

## Impact

- `lib/` — el reconocedor de fallos, puro y probado con tablas sobre textos reales de Git.
- `hooks/git-actions/remote.ts` y la superficie de avisos, para mostrar la explicación y la acción.
- `electron/ipc/git-sync.ts` — un canal para reapuntar el vínculo.

**Fuera de alcance:** traducir toda la salida de Git. Sólo se explican los fallos que se reconocen con
certeza; el resto se muestra crudo.

**Fuera de alcance:** cambiar `push.default`. Es una configuración de la persona y su valor actual
—`simple`— es el que produjo la protección que funcionó.

**Riesgo:** una explicación que reconoce mal el fallo lleva a hacer lo que no corresponde sobre el
historial. Mitigación: el reconocimiento se prueba contra textos reales, y ninguna acción se ejecuta sin
que la persona la pida.
