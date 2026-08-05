# Las dos mitades de un archivado van juntas

**Change:** `group-archive-move-together` · **Fecha:** 2026-08-05 · **Tareas:** 15/16 (falta la validación de Ale en el próximo archivado)

## Qué se hizo

El panel de preparación agrupa el archivado completo en una sola unidad. Cuando entre lo modificado hay
archivos bajo `openspec/changes/archive/<fecha>-<id>/` y también bajo `openspec/changes/<id>/`, los
segundos son la mitad borrada de ese movimiento y aparecen junto a la mitad nueva. Un grupo, una
selección, un commit.

El mensaje sugerido pasa a reconocer el identificador dentro de una ruta de archivado, así que el
commit del archivado se llama `chore: <id>` en vez de quedar con la descripción vacía.

## El defecto, con su medición

`fileOrigin` clasificaba mirando una ruta y nada más. Después de archivar, el
`openspec/changes/<id>/design.md` borrado seguía cayendo en el grupo del cambio `<id>`, mientras que el
`openspec/changes/archive/<fecha>-<id>/design.md` nuevo caía en restos de archivado. Origen y destino
del mismo movimiento, presentados como dos cosas distintas.

La consecuencia se midió sobre commits reales de este repositorio:

- `9396978`, con el movimiento entero en un commit: Git lo detectó como renombre. `design.md | 0`, cero
  líneas cambiadas, sólo la ruta.
- `56ddab1` y `cde474f`, con las mitades repartidas: 91 líneas borradas de un lado, 91 agregadas del
  otro, sin vínculo. La detección de renombres opera sobre el diff de un commit, así que separarlas la
  deshabilita.

Lo que se perdió es la trazabilidad:

```
git log --oneline --follow -- "openspec/changes/archive/2026-08-04-raise-commit-to-repo-level/design.md"
→ 93969781, ff388f57

git log --oneline --follow -- "openspec/changes/archive/2026-08-05-add-pipeline-start-screen/design.md"
→ cde474fc
```

El primero llega al commit donde el artefacto se escribió. El segundo no. El contenido está entero en
los dos casos; lo que se perdió es poder llegar a cuándo se escribió esa propuesta sin buscarla a mano.

Vale registrar cómo apareció: Ale commiteó grupo por grupo justamente para conservar los mensajes
sugeridos, que es lo que el panel invitaba a hacer, y el resultado fueron seis commits donde
correspondían tres. No fue un error de uso: el panel lo empujó ahí.

## Decisiones

**La pertenencia se resuelve contra el conjunto, no contra la ruta suelta.** `deriveRepoCommitScope`
calcula primero qué identificadores fueron archivados —los que aparecen en alguna ruta bajo
`archive/`— y recién entonces clasifica. Se descartó pasar el estado de Git de cada archivo
(`deleted` frente a `untracked`): sería el dato más directo, pero obligaría a la función a recibir la
forma de `GitFile` y la sacaría del terreno de las tablas de entrada y salida, que es la propiedad que
permite probar la derivación entera. Un archivado siempre deja sus dos mitades modificadas a la vez,
porque es un movimiento, así que el conjunto de rutas alcanza.

**El identificador sale de quitar el prefijo `YYYY-MM-DD-`.** Se descartó partir por el último guion
—rompe con cualquier identificador que contenga guiones, que es la norma— y buscarlo entre los cambios
activos —no funciona justamente para uno archivado—. Una carpeta sin el prefijo no aporta
identificador y sus archivos quedan como restos: es más seguro que adivinar.

**Un cambio archivado ahora nombra el mensaje.** La regla anterior se lo negaba, para que un trabajo
cerrado no nombrara un commit de trabajo en curso. Ese riesgo lo sigue cubriendo la regla del
identificador único: restos de un archivado más artefactos de un cambio activo son dos identificadores
y la descripción queda vacía igual. Hay un test para eso.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **98 archivos / 699 tests, verde en dos corridas
seguidas**. El flake conocido de los archivos que crean repositorios Git reales no apareció en ninguna;
eso no significa que esté resuelto. Lint limpio sobre los dos archivos tocados.
`openspec validate group-archive-move-together --strict` válido.

`change-commit-scope.test.ts` pasó de 20 a 28 casos. Ningún test del panel necesitó cambios: el
renderer consume los grupos que la función devuelve y no supo de esto.

## Lo que no se afirma

No se midió que esto ahorre commits. Que el ciclo pase de seis a tres es la consecuencia esperada del
cambio, no una medición. Lo verificable es lo de arriba: hoy las mitades caían en grupos distintos y
prepararlas por separado impedía la detección de renombres.

Los commits ya hechos no se tocan. `cde474f` conserva su historia rota, y arreglarlo exigiría reescribir
la historia, que no vale la pena por esto.
