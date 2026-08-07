# A qué cambio pertenece un archivo de código

**Change:** `attribute-files-to-change` · **Fecha:** 2026-08-07 · **Tareas:** 21/22 (falta la validación
de Ale) · **Rama:** `change/attribute-files-to-change`

## Qué se hizo

El panel de preparación dice a qué cambio pertenece un archivo de código cuando la rama lo declara, con
la fuente a la vista y su punto ciego declarado en el mismo lugar. Y el mensaje sugerido puede nombrar el
cambio en el caso en que hasta ahora salía vacío pudiendo no salirlo.

## Lo medido, sobre este mismo trabajo

| | antes | ahora |
|---|---|---|
| Archivos modificados | 8 | 8 |
| Atribuidos por ruta —un hecho— | 1 | 1 |
| Atribuidos por rama —una declaración— | 0 | **7** |
| Sin atribuir | 7 | 0 |

El dato no existía en el repositorio: un artefacto se atribuye por su ruta porque **vive** bajo la carpeta
de su cambio, y un archivo de código no lleva encima ninguna marca de por qué se editó.

## Las dos fuentes no valen lo mismo, y viaja cuál fue

`CommitFileOrigin` lleva ahora `source`. `path` es un hecho de ubicación y no se puede equivocar.
`branch` es una declaración: alguien puso el trabajo en `change/<slug>`, Git la sostiene con
independencia de quién editó y con qué herramienta, pero afirma sobre el archivo **por dónde se lo
editó, no por lo que el archivo es**.

De ahí salen tres reglas que se implementaron y se probaron:

- **El hecho manda sobre la declaración.** Tocar un artefacto de `otro-cambio` estando parado en
  `change/mi-cambio` lo deja atribuido a `otro-cambio`. La rama no lo pisa.
- **Las dos fuentes no se mezclan en un grupo.** Un grupo no podría declarar una sola procedencia si
  adentro conviven las dos cosas; por eso las claves son `change:X` y `branch:X`.
- **Sin fuente, sin atribución.** Un archivo no hereda el cambio seleccionado en la pantalla. No saber no
  es saber que no.

`lib/change-commit-scope.ts` sigue puro: la atribución entra como parámetro. Esa propiedad es la que
permite probarlo con tablas y ya sobrevivió a varios refactors.

## El punto ciego, donde se atribuye

El grupo atribuido por rama dice, junto al grupo y no en un reporte que nadie abre al confirmar: *«Los
archivos no llevan ninguna marca de por qué se editaron: esto lo dice change/X. Si estando parado acá
tocaste algo para otra cosa, también aparece en este grupo. Revisalo antes de sumarlo.»*

Ese límite crece con el tiempo que se pasa en una rama —un typo, una dependencia, un arreglo no
relacionado, hechos durante días—, y es el modo de fallo real de esta fuente: **atribuir de más**, nunca
en silencio.

Nada entra preseleccionado por efecto de la atribución, y hay una prueba que lo sostiene.

## El alcance retirado, con su motivo

El complemento por sesión salió del cambio, aprobado por Ale. No por costo:

Cuando se escribió el diseño, `git branch --list "change/*"` devolvía **cero** sobre 35 ramas locales, y
la observación por sesión era lo único que iba a atribuir algo. Mientras se implementaba la otra mitad,
la convención empezó a cumplirse: el circuito completo se cerró dos veces y la rama atribuye 7 de 8
archivos acá. El hueco que justificaba esa fuente se cerró solo.

Para lo que queda del hueco —trabajo fuera de una rama de cambio— el complemento sirve poco: sólo alcanza
a los agentes lanzados desde la aplicación, así que el trabajo a mano y el de un agente desde la terminal
sigue sin atribuir. Y no ataca el modo de fallo de lo que sí se construyó: una sesión no separa el typo
que se arregló durante esa misma sesión.

## Lo que sí ataca ese problema, y queda anotado

La pregunta de Ale fue precisa: *«vos que estás viendo todo sabés qué poner en el mensaje, ¿cómo se puede
lograr algo así?»*. La respuesta es que la intención existe en el momento de la acción y la aplicación
está reconstruyéndola después, a partir de los restos. Hay que capturarla en el origen:

1. **La tarea, que ya está en memoria.** Una sesión lleva `changeId` **y `taskId`**, y el panel los
   muestra juntos en la columna de actividad; `suggestCommitMessage` sólo mira rutas y para el commit ya
   se olvidó de qué tarea se estaba haciendo. No es inferencia: es un dato que se tiene y se tira. Va en
   un cambio aparte, porque es otra pregunta —qué dice el mensaje— y no la de éste —de quién es el
   archivo—.
2. **El tipo del commit, declarado por quien lo sabe.** El diff no distingue una corrección de una
   función nueva y afirmarlo sería inventar, pero la aplicación ya compone la instrucción del ejecutor y
   puede pedirle que declare tipo y descripción al terminar, como sugerencia y nunca como commit
   automático.
3. **Sin decidir:** un `tool.completed` de `Edit` o `Write` no es una correlación temporal sino una
   escritura declarada por quien la hizo, y sería la fuente más fuerte —elimina el punto ciego de las dos
   sesiones solapadas, porque cada llamada pertenece a una sola—. No se propone porque los normalizadores
   redactan las rutas antes de que lleguen a la proyección
   (`electron/pipeline/runtime/runtime-projection.ts:56`), y revertir esa redacción es una decisión de
   privacidad de Ale.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm exec eslint` limpio sobre lo tocado.
`openspec validate attribute-files-to-change --strict` válido.

`pnpm test` en **118 archivos / 866 tests**, corrida completa en verde. La base antes de esta tanda era
116 archivos / 850 tests: entran dos archivos y dieciséis casos. `pipeline-prepare-commit.test.tsx` pasa
sin haberlo tocado, que es la red contra meter el commit en la preparación.

## Lo que falta

La tarea 6.6: Ale valida en la aplicación que ninguna atribución se lee como más segura de lo que es. Se
tilda antes de archivar.
