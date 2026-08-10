# Los textos reales de Git

Capturados provocando cada fallo en repositorios descartables, con Git 2.x en Windows y la configuración
por omisión. **No son paráfrasis**: son la salida textual, y son la entrada de las pruebas de tabla del
reconocedor.

El de «vínculo con otro nombre» es el que recibió Ale al apretar PUSH; los demás se provocaron a propósito
para tener el patrón antes de escribirlo.

---

## 1. Vínculo con otro nombre

Se produce al renombrar una rama que ya tenía upstream y volver a empujar. **Es el caso de Ale.**

```
fatal: The upstream branch of your current branch does not match
the name of your current branch.  To push to the upstream branch
on the remote, use

    git push origin HEAD:main

To push to the branch of the same name on the remote, use

    git push origin HEAD

To choose either option permanently, see push.default in 'git help config'.

To avoid automatically configuring an upstream branch when its name
won't match the local branch, see option 'simple' of branch.autoSetupMerge
in 'git help config'.
```

El nombre de la rama del remoto se puede extraer de `git push origin HEAD:<nombre>`.

## 2. Sin upstream, con remoto configurado

```
fatal: The current branch main has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin main

To have this happen automatically for branches without a tracking
upstream, see 'push.autoSetupRemote' in 'git help config'.
```

Es el único que GitCron ya reconoce hoy (`electron/ipc/git-sync.ts:402`), y lo resuelve reintentando con
`--set-upstream`.

## 3. Sin ningún remoto configurado

Distinto del anterior, y no estaba previsto: apareció al intentar reproducir el caso 2 sin haber agregado
el remoto todavía.

```
fatal: No configured push destination.
Either specify the URL from the command-line or configure a remote repository using

    git remote add <name> <url>

and then push using the remote name

    git push <name>
```

La salida acá no es reapuntar nada: es que falta el remoto.

## 4. Rechazado por estar atrasado

```
To <ruta del remoto>
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to '<ruta del remoto>'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
```

Ojo: éste **no** empieza con `fatal:` sino con `error:`, y trae la ruta del remoto adentro. Un patrón que
sólo mire `fatal:` lo deja afuera.

## 5. Remoto inalcanzable

```
fatal: unable to access 'https://…/repo.git/': Could not resolve host: …
```

Es el que Ale supuso que tenía. Vale distinguirlo de los demás justamente por eso: es el único donde la
respuesta es mirar la red.

---

## Lo que no se capturó

**Sin permisos.** Necesita un remoto real que rechace la autenticación, y no se provocó. Su patrón queda
sin escribir hasta tener el texto: escribirlo de memoria es exactamente lo que este archivo existe para
evitar.
