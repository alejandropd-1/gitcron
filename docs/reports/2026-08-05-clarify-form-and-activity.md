# Dos superficies que no decían qué eran

**Change:** `clarify-form-and-activity` · **Fecha:** 2026-08-05 · **Tareas:** 15/16 (falta la validación visual de Ale)

## Qué se hizo

Las dos cosas salieron de preguntas de Ale mirando el panel funcionando, y las dos preguntas eran
síntoma: si hubo que preguntar, la interfaz no lo estaba diciendo.

**El formulario para empezar un cambio** declara ahora que lo que se escribe arma la instrucción que
recibe el ejecutor, no los artefactos. Cada campo dice dónde termina: el objetivo y el alcance como
líneas de la instrucción, el nombre como identificador del cambio y como carpeta bajo
`openspec/changes/`. El cuerpo pasó de `44rem` al ancho del centro, porque con las ayudas por campo el
ancho anterior los apretaba.

**La columna de actividad** declara cuándo corrió la sesión que muestra, y —sólo cuando no hay ningún
cambio abierto— declara que lo mostrado es lo último del repositorio.

## Los dos defectos, con su evidencia

Nada de lo que se completa en el formulario se guarda en un archivo. `composeProposeInstruction`
(`components/pipeline/pipeline-next-action.ts:199`) compone un texto con `Objetivo:` y
`Alcance y restricciones:`, y ese texto lo recibe un ejecutor que después escribe `proposal.md`,
`design.md` y `tasks.md`. La instrucción entera sí se ve, pero recién en el paso siguiente, en el
textarea del lanzador (`PipelineRuntimeLauncher.tsx:265`). Entre completar el formulario y verla había
un tramo en que no se sabía qué se estaba armando.

La columna, sin cambio abierto, cae a la última sesión del repositorio —lo decidido en
`filter-activity-by-change`— y su encabezado declaraba el ejecutor y el estado pero no la fecha.
`formatSessionOption` sí componía la fecha, pero sólo alimentaba las opciones del selector, y el
selector se renderiza únicamente con más de una sesión. El caso observado por Ale: una sesión del día
anterior, con una sola sesión en el repositorio y por lo tanto sin selector, presentada sin ninguna
marca temporal. Se lee como actividad en curso.

## Decisiones

**La declaración va por campo y una frase arriba, no en un bloque.** Un bloque explicativo sería el
texto que la invariante 11 prohíbe, y además se lee una vez y se ignora. Decir dónde termina un campo
es declarar el efecto de un control, que es lo mismo que ya hacía la ayuda del identificador al declarar
su formato.

**No se adelanta la instrucción al formulario.** Verla completa mientras se escriben los campos
duplicaría la superficie del lanzador y obligaría a mantener dos vistas del mismo texto. Se declara qué
va a pasar; la instrucción sigue apareciendo entera y editable en el paso siguiente.

**La fecha se muestra siempre, no sólo cuando hay selector.** Dejarla en las opciones hacía que el dato
apareciera o desapareciera según cuántas sesiones hubiera, y el caso donde falta —una sola sesión,
posiblemente vieja— es exactamente donde más se necesita.

**El alcance se declara sólo sin cambio abierto.** Con un cambio abierto el panel entero ya declara de
cuál es, y repetirlo sería ruido.

**No se cambió qué sesión se elige mostrar.** La decisión de `filter-activity-by-change` no se revisa:
lo que faltaba era declarar qué es lo que se está viendo, no cambiarlo.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **99 archivos / 720 tests, verde en dos corridas
seguidas**. El flake conocido de los archivos que crean repositorios Git reales no apareció en estas dos;
apareció en una corrida de una tanda anterior de esta misma sesión, así que sigue sin estar resuelto.
Lint limpio sobre los seis archivos tocados. `openspec validate clarify-form-and-activity --strict`
válido.

## Nota sobre la tanda anterior

Se verificó que el arreglo de `group-archive-move-together` funcionó en el archivado real de los cuatro
changes previos: `git show --name-status -M 7c6a69e` da **24 renombres al 100%** más una modificación
—la consolidación de specs—. Las dos mitades de cada archivado viajaron en el mismo commit y Git
mantuvo la trazabilidad, que es lo que se había roto en `56ddab1` / `cde474f`.
