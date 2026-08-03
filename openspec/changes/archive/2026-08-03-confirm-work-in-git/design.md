## Context

GitCron ya tiene todo lo necesario para confirmar en Git, y funciona:

- `stageFiles(paths, true)` prepara una lista explícita de archivos, en un solo comando.
- `setCommitMessage(mensaje)` escribe el campo de commit, que vive por repositorio en el store.
- `commitChanges()` confirma lo preparado, exigiendo mensaje no vacío y al menos un archivo listo.

Lo único que falta es **qué** preparar y **con qué mensaje**, que es exactamente lo que `commit.md`
declaraba. `deterministicChangePaths(changeId, modificados)` —conservada al desacoplar el archivado—
ya responde la primera mitad derivándola del identificador.

## Goals / Non-Goals

**Goals:**

- Recuperar la comodidad de no escribir a mano qué entra y qué mensaje va.
- Que funcione sin que ningún artefacto declare nada de antemano.
- Que confirmar siga siendo un acto explícito y separado.

**Non-Goals:**

- Ejecutar el commit desde la guía. Prepara y nada más.
- Construir una interfaz de commit dentro de Pipeline. La que existe ya resuelve edición del
  mensaje, revisión de lo preparado y confirmación; duplicarla daría dos lugares donde confirmar y
  ninguno sería el canónico.
- Volver a acoplar esto al archivado.
- Adivinar el tipo del commit a partir del diff.

## Decisions

**Preparar en vez de confirmar.** La alternativa era un botón que confirmara directamente con el
mensaje derivado. Se descartó: el mensaje derivado es un punto de partida, y confirmarlo sin que
nadie lo lea convierte una sugerencia en un hecho registrado en la historia. Preparar deja el
trabajo hecho y la decisión intacta.

**El mensaje no pisa lo que ya haya escrito.** Si el campo de commit tiene texto, la sugerencia no
lo reemplaza. Perder un mensaje que alguien estaba escribiendo por apretar un botón de preparación
sería un daño silencioso y difícil de notar hasta después de confirmar.

**La forma del mensaje sugerido es `<tipo>(<alcance>): <identificador del cambio>`.**

- El **tipo** es `chore` por defecto. No se infiere del diff: un cambio que toca `components/` puede
  ser una corrección, una función nueva o una limpieza, y el diff no lo distingue. `chore` es la
  opción que menos afirma.
- El **alcance** se deriva del segmento común de los directorios tocados —`components/pipeline/…`
  da `pipeline`—. Si no hay uno común, se omite el paréntesis en vez de inventar uno.
- La **descripción** es el identificador del cambio, que ya está en kebab-case y describe el
  trabajo. Es lo más informativo que se puede afirmar sin entenderlo.

La alternativa considerada era derivar la descripción del `proposal.md`, tomando su primera línea o
el título. Se descartó porque el título del cambio en OpenSpec es igual a su identificador
—comprobado con `openspec show <id> --json`— y la prosa del proposal es un párrafo, no una línea de
asunto: recortarla produciría frases cortadas.

**Los archivos ajenos se listan pero no se preparan.** Mostrarlos es lo que hace visible una
omisión; prepararlos por defecto metería en el commit trabajo de otro cambio, que es el problema que
`commit.md` existía para evitar.

**La derivación vive en un módulo puro.** Recibe identificador, archivos modificados y mensaje
actual; devuelve qué preparar y qué sugerir. Sin disco ni IPC, se prueba entera con tablas de
entrada y salida, y el componente queda con la parte que no se puede probar así.

## Risks / Trade-offs

- **El mensaje sugerido va a ser peor que uno escrito a mano.** → Es explícito y asumido: por eso es
  editable y por eso el tipo es `chore` y no una inferencia. La comodidad que recupera es no tener
  que escribir la lista de archivos, que es la parte tediosa y la que se equivoca por omisión.
- **Preparar y confirmar en dos pasos es un click más que antes.** → A cambio, el mensaje se lee
  antes de quedar en la historia. El paso que se agrega es exactamente el que faltaba.
- **Un cambio que toca directorios dispares no va a tener alcance derivable.** → Se omite el
  paréntesis. Un alcance inventado sería peor que ninguno.
