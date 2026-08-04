## Context

`markSignatureTask` hacía exactamente esta operación —cambiar `[ ]` por `[x]` en una línea— pero
sólo para una tarea de texto literal. Se retiró con la convención de la firma. Lo que queda por
construir es la versión general: cualquier tarea, en las dos direcciones.

La lista de tareas ya se renderiza en `OpenSpecDashboard`, con su estado en un ícono no interactivo.
Cada tarea trae `id` —un hash estable, útil como clave pero ilegible—, `text` con su numeración, y
`sourceRef` con archivo y línea.

Escribir en el repositorio ya tiene su lugar: `electron/ipc/pipeline-archive.ts` vive aparte
justamente porque el módulo de snapshot declara que no acepta operaciones de escritura.

## Goals / Non-Goals

**Goals:**

- Poder cerrar una tarea desde donde se la está mirando.
- Que el registro de quién cambió qué viva en el repositorio.
- Que desmarcar cueste un gesto más que marcar.

**Non-Goals:**

- Reintroducir tareas con texto literal o casillas que se marquen solas.
- Editar el texto de una tarea. Sólo su estado.
- Tocar el conteo de progreso ni el archivado: ambos ya derivan de `tasks.md` y seguirán haciéndolo.
- Editar cambios archivados.

## Decisions

**La tarea se ubica por número de línea y se verifica por texto.** `sourceRef` trae la línea, que es
la ubicación exacta; el texto se compara antes de escribir para confirmar que sigue siendo la misma
tarea. Con el watcher andando, el archivo puede cambiar entre que se dibujó la pantalla y llegó el
clic: sin la verificación se marcaría la tarea equivocada, en silencio.

La alternativa era buscar por texto solamente. Se descartó porque dos tareas pueden tener el mismo
texto en secciones distintas, y no hay forma de distinguirlas.

**El registro es un archivo markdown en el cambio, no una tabla en SQLite.** La base local de la
aplicación vive fuera del repositorio: no se versiona, no viaja y no la lee nadie que trabaje sobre
los archivos. Un registro que sólo existe dentro de la aplicación no sirve para el propósito que lo
motiva. Como archivo del cambio, además entra solo en su commit por ser una ruta derivable.

**Confirmar al desmarcar, no al marcar.** Se consideró aplicar directo y ofrecer deshacer, al estilo
de los avisos que se autocierran. Se descartó por el registro: deshacer dejaría escritas dos líneas
—el cambio y su reversión— por algo que nadie quiso hacer. El estado del archivo es reversible; el
registro no.

**La confirmación reutiliza el aviso con acciones que ya existe.** `PageToasts` tiene un toast de
decisión con botones dentro, usado para la decisión de pull. Es el patrón de la aplicación para
"esto requiere una respuesta"; agregar un diálogo propio sería una superficie nueva para lo mismo.

**La escritura vive en su propio módulo de IPC.** No se suma a `pipeline-archive.ts`: ese módulo
archiva, y mezclarle la edición de tareas volvería a juntar dos dominios que se acaban de separar.

## Risks / Trade-offs

- **El archivo puede haber cambiado entre el dibujado y el clic.** → Es el riesgo principal y por eso
  se verifica el texto antes de escribir. Si no coincide, no se escribe y se informa: es preferible
  pedir que se reintente a marcar la casilla equivocada.
- **Una tarea marcada a mano puede afirmar algo que no se hizo.** → Es inherente a que marcar sea un
  acto humano, y era igual de cierto editando el archivo con un editor. El registro deja rastro de
  cuándo se hizo cada cambio.
- **El registro agrega un archivo por cambio.** → Sólo aparece cuando hay algo que registrar, y
  entra en el commit del cambio sin declararlo, por vivir bajo su carpeta.
