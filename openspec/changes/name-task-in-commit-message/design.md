## Contexto

La sesión de runtime lleva `changeId` **y `taskId`**, y los dos llegan al renderer: el panel los muestra
juntos en la columna de actividad. `suggestCommitMessage` no los mira: compone sólo con rutas y, desde
`attribute-files-to-change`, con la rama. Al llegar al commit, la aplicación ya se olvidó de qué tarea
estaba haciendo la sesión.

Eso parecía la ruta obvia y barata. La medición dice otra cosa.

## Ruta A: nombrar la tarea de la sesión. Descartada por lo medido.

La propuesta era `chore(pipeline): mi-cambio — 3.2`. Se midió cuántos commits cubre cada change en este
repositorio:

| Change | Commits | Tareas |
|---|---|---|
| `declare-change-branch` | 3 | 30 |
| `keep-new-change-draft` | 2 | 25 |
| `attribute-files-to-change` | 4 | 22 |

Entre siete y quince tareas por commit. Nombrar **una** sería afirmar que el commit es de esa tarea
cuando abarca doce, y eso es precisión falsa: el mismo defecto que este panel viene evitando en la
atribución de archivos, donde una afirmación que parece verificada y no lo es es peor que ninguna.

Se descarta como fuente principal. El dato no sobra —sirve para declarar el contexto de la sesión— pero
no para nombrar el commit.

## Ruta B: que lo declare el ejecutor. Propuesta.

La aplicación ya **compone la instrucción** que recibe el ejecutor, y ya la usa para pedirle cosas
concretas. Puede pedirle que, al terminar, declare una línea con el tipo y una descripción breve de lo
que hizo. La aplicación la captura y la ofrece como sugerencia.

Esto no es inferencia sobre restos: es el actor diciendo lo que hizo mientras todavía lo tiene en la
cabeza. Es la única de las tres fuentes que puede saber si fue `feat` o `fix`, porque eso no está en el
diff.

**Alternativa descartada dentro de esta ruta: derivar el tipo del contenido del change.** El `## Why` de
la propuesta suele decir si corrige un defecto. Se descarta porque es una heurística sobre prosa y falla
en silencio, que es peor que quedarse en `chore`.

**Contrapartida asumida y no medida:** depende de que el ejecutor cumpla el pedido. Un runtime que no lo
haga deja la sugerencia como está hoy, que es el comportamiento actual y no una regresión. Cuánto lo
cumplen en la práctica **no está medido** y es la primera tarea antes de construir nada.

## Decisión: lo sugerido declara de dónde salió

Venga de donde venga, el panel dice junto al campo de qué se derivó la sugerencia: de las rutas, de la
rama, o de lo que declaró la sesión.

**Alternativa descartada: mostrar el mensaje sin más.** Es lo que pasa hoy y funciona mientras la
sugerencia es trivial —el identificador del cambio—. Deja de funcionar en cuanto la sugerencia afirma
algo que la aplicación no verificó: quien confirma tiene que poder ver que eso lo dijo un agente y no la
aplicación.

## Riesgos

**Una descripción declarada por el ejecutor que no coincide con lo que se está confirmando.** El commit
puede incluir archivos de otra tanda. → Mitigación: la sugerencia declara su origen, sigue siendo
editable y nunca confirma sola; y el conjunto que se prepara ya se elige archivo por archivo.

**Pedirle una cosa más al ejecutor alarga la instrucción.** → Mitigación: una línea al final, y medir
antes si la cumplen.

## Sin medir

Cuántos runtimes cumplen un pedido de esa forma, y con qué fidelidad. Es lo primero de las tareas y
condiciona si la ruta B se construye o se abandona.
