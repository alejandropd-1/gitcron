## Contexto

La regla de la rama por cambio existe, viaja por el canal y tiene cero cumplimiento: `git branch --list
"change/*"` vacío cuatro días después de escribirla, con unos diez cambios creados en ese lapso. El
propio ejecutor que ayudó a escribirla la incumplió diez veces. Eso descarta la explicación fácil —«no
llegó»— y deja la otra: nada la hace visible en el momento en que importa.

El panel ya declara la rama actual en la franja de evidencia, y el formulario de cambio nuevo ya crea la
rama con `gitCreateBranch`. Lo que falta no es capacidad, es evidencia: nadie ve que está trabajando
fuera de la rama del cambio, ni desde dónde va a nacer la rama que está por crear.

## Decisión: declarar, no bloquear

El panel dice qué pasa y ofrece la salida; no impide seguir.

**Alternativa descartada: impedir trabajar fuera de la rama del cambio.** Es tentador porque la regla
tiene cero cumplimiento y un bloqueo lo llevaría a cien. Se descarta porque el panel no es el único
camino: los cambios se crean desde la terminal, que es el caso habitual, y ahí no hay nada que bloquear.
Un bloqueo que sólo cubre una de las dos puertas produce fricción en la puerta equivocada, y además la
decisión de trabajar en `main` a propósito es legítima —un arreglo de una línea no necesita rama—. Es la
misma conclusión que en `offer-openspec-init`: mostrar para que se sepa, no decidir en lugar de la
persona.

## Decisión: la base se mide con dos números, no con uno

Antes de crear la rama se declaran dos cantidades respecto del `main` local: **cuántos commits de `main`
faltan bajo los pies** (`git rev-list --count HEAD..main`) y **cuántos commits propios sin fusionar**
tiene la rama actual (`git rev-list --count main..HEAD`).

Dos números y no uno porque distinguen tres situaciones que piden respuestas distintas, y un solo número
las confunde:

- Cero y cero: parado en `main` o al día. Crear acá es correcto y no hay nada que decir.
- Faltan commits, ninguno propio: una rama ya fusionada o abandonada. La rama nueva heredaría código
  viejo sin que nada lo declare. Medido hoy en este repositorio: `claude/jolly-khayyam-2be14c` a 501
  commits, `fix/pipeline-launcher-empty-box` a 107.
- Hay commits propios: una rama con trabajo deliberadamente sin fusionar —una línea deprecada, o algo en
  curso—. Puede ser exactamente donde se quiere estar, y por eso no se corrige solo: se declara.

**Alternativa descartada: comparar contra `origin/main`.** Sería la comparación que más gente espera.
Se descarta porque exige `git fetch`, que es red, y este panel no hace red sin que se la pida. La
comparación es contra el `main` local y se declara como tal, en vez de sugerir una frescura que no se
midió.

**Alternativa descartada: elegir la base automáticamente.** Crear siempre desde `main` resolvería el
caso común. Se descarta porque el caso que Ale nombró —ramas no fusionadas a propósito— es justamente
aquel en que la base correcta no es `main`, y elegir por él perdería trabajo de vista.

## Decisión: con el árbol sucio no se crea la rama

Si hay cambios sin confirmar, crear la rama los arrastra: quedan en la rama nueva, fuera del cambio al
que pertenecen. El panel lo declara y no la crea.

**Alternativa descartada: crearla igual, que es lo que hace Git.** `git checkout -b` lleva los cambios
sin confirmar y casi siempre es lo que se quiere. Acá no: la rama se crea al **abrir** un cambio, o sea
justo cuando lo que hay sin confirmar es de otro. Pasó mientras se escribía este documento —el trabajo de
`offer-openspec-init` estaba sin confirmar en `main`— y es el motivo por el que este cambio se propuso
sin su rama.

**Alternativa descartada: guardar con `git stash`.** Es una escritura de Git que la persona no pidió y
que deja trabajo en un lugar donde no lo va a buscar.

## Riesgos

**Un aviso más que se aprende a saltear.** El panel ya declara el estado de OpenSpec y el de las
herramientas. → Mitigación: aparece sólo cuando hay discrepancia, nunca cuando la rama coincide, y es una
línea. Un bloque que siempre está enseña a saltearlo.

**Medir la divergencia en cada refresco cuesta.** El watcher refresca en cada guardado. → Mitigación:
son dos `git rev-list --count`, del orden de las lecturas que el reader ya hace; se mide antes de
declararlo barato.

## Sin medir

No se midió el costo de `git rev-list --count` en este repositorio. Se estima del orden de decenas de
milisegundos por la escala de `git log --no-renames`, que tarda 97 ms para 602 caminos, pero es una
estimación y no una medición: entra como tarea.

## Fuera de alcance

Fusionar, borrar la rama y volver a `main`. Son acciones humanas y a mano, así quedó escrito en el canal,
y este cambio no agrega ninguna escritura de Git nueva.
