## Context

`deriveChangeCommitScope` ya clasifica internamente cada archivo en tres clases —`change`,
`archived`, `code`— pero devuelve sólo dos listas: `own` y `foreign`. Toda la procedencia que
calcula se pierde al salir, y la interfaz la muestra como una bolsa única.

El panel de staging de la aplicación (`components/StagingPanel.tsx`) ya resuelve mostrar el estado de
un archivo: un recuadro de una letra —`M`, `A`, `D`, `R`, `U`— con color por estado y un caso
aparte para conflictos. Es la representación que el usuario ya conoce.

## Goals / Non-Goals

**Goals:**

- Que no haya que recordar qué se tocó en cada trabajo para elegir qué preparar.
- Que el mensaje sugerido describa el commit que se va a hacer.
- Reutilizar la representación de estado que ya existe, en vez de inventar otra.

**Non-Goals:**

- Cambiar la regla de atribución. Qué entra en `own` y qué no queda igual: sólo se expone el motivo.
- Adivinar a qué cambio pertenece un archivo de código. Sigue sin ser deducible, y decirlo es más
  honesto que inventarlo.
- Sacar la preparación de su pestaña, ni agregar acciones que confirmen en Git.
- Rediseñar el panel de staging.

## Decisions

**La derivación devuelve grupos, y `own`/`foreign` se calculan desde ellos.** La alternativa era
agregar un tercer arreglo suelto y dejar que la interfaz lo cruzara con los otros dos. Se descartó
porque tendría dos fuentes para la misma pregunta —qué se prepara y de dónde viene cada archivo— que
pueden desincronizarse. Con los grupos como fuente, `own` es el grupo del cambio y `foreign` es la
suma del resto: no pueden contradecirse.

**Cuatro grupos, no más.** Del cambio, de otro cambio, restos de archivado, y sin atribuir. Se
consideró separar `archive/` de `openspec/specs/`, que hoy comparten la clase `archived`; se
descartó porque ambos son producto de la misma operación y aparecen siempre juntos: separarlos daría
dos grupos que el usuario trata igual.

**Los artefactos de otro cambio muestran su identificador; el código no muestra nada.** No es una
omisión: para el código no hay identificador que mostrar, y poner "desconocido" al lado de cada
archivo repetiría en cada fila lo que el rótulo del grupo ya dice una vez.

**El mensaje se deriva de `own` más los elegidos a mano.** Es el arreglo del defecto observado. La
firma de `deriveChangeCommitScope` no alcanza para eso, porque los elegidos son estado de la
interfaz y cambian con cada clic sin que la derivación se entere. Se expone `suggestCommitMessage`
—que ya existe y ya es pública— para que la interfaz la llame con el conjunto real en el momento de
preparar. La sugerencia que la derivación devuelve queda como valor inicial, para mostrarla antes de
que se elija nada.

**La selección de texto se habilita en el contenedor del panel, no archivo por archivo.** Una regla
en el contenedor alcanza y no hay que acordarse de repetirla en cada elemento nuevo.

## Risks / Trade-offs

- **Cuatro grupos ocupan más alto que una lista plana.** → Cada grupo se muestra sólo si tiene
  archivos, así que en el caso normal —un trabajo por vez— se ve un solo grupo y queda más corto que
  hoy.
- **Cambiar la forma que devuelve `deriveChangeCommitScope` toca a sus consumidores.** → Tiene dos:
  el dashboard y sus tests. `own` y `foreign` se conservan con el mismo significado, así que lo
  existente sigue funcionando y los grupos son información adicional.
- **El mensaje ahora depende de un estado de interfaz.** → Por eso se calcula al preparar y no en el
  render: lo que se escribe en el campo es lo que corresponde al conjunto que efectivamente se
  envía, no a lo que había cuando se dibujó la pantalla.
