# Subir el commit a nivel de repositorio

**Change:** `raise-commit-to-repo-level` · **Fecha:** 2026-08-04 · **Tareas:** 22/23 (falta la validación visual de Ale)

## Qué se hizo

La preparación del commit dejó de colgar del cambio seleccionado y pasó al nivel del repositorio. El
bloque de estado del árbol del encabezado —que ya era lo único del panel que hablaba del repositorio
entero— se volvió un control que abre un panel central con todo lo modificado agrupado por
procedencia: un grupo por cada cambio activo rotulado con su identificador, uno para los restos de
archivado y uno para el código sin atribuir.

Se eliminó la pestaña Commit, creada pocos changes atrás. Era consecuencia declarada en la propuesta,
no un descubrimiento: sostener las dos superficies daría dos caminos a la misma acción con alcances
distintos. Los dos ajustes de UX que se commitearon en `40c2382` se conservaron en el panel nuevo —las
acciones arriba a la derecha compartiendo fila con el título, y el área clickeable extendida a la fila
entera en vez del tamaño de la casilla—.

## El defecto que corrige, con su evidencia

Antes, la pestaña de commit se renderizaba dentro de la rama `selectedChange ? (…)` de
`OpenSpecDashboard.tsx`, cuya alternativa era `selectedArchive`. Sin cambio activo seleccionado la
superficie de preparación no existía, y el alcance se colapsaba explícitamente a vacío cuando no había
selección.

Eso importaba justo después de archivar: `openspec archive` mueve el cambio al histórico y consolida
specs sin tocar Git, así que quedan `openspec/changes/archive/…` y `openspec/specs/…` sin confirmar.
La derivación los clasificaba como ajenos, de modo que para confirmarlos había que entrar a un cambio
activo cualquiera y tildarlos a mano. Sin ningún cambio activo, no había dónde entrar.

El test `pipeline-repo-commit.test.tsx` guarda exactamente ese caso: monta el dashboard con cero
cambios activos y sólo restos de archivado modificados, y verifica que la preparación se alcanza y
prepara esos archivos.

## Cambios de contrato

`deriveChangeCommitScope` se reemplazó por `deriveRepoCommitScope`, que ya no recibe un cambio de
referencia y devuelve los archivos agrupados por procedencia, sin `own` ni `foreign`. La distinción
propio/ajeno existía porque había un cambio desde el cual mirar; sin él, todos los grupos son pares y
ninguno entra preseleccionado. Preseleccionar el grupo del cambio enfocado en la lista lateral se
descartó: produciría un commit distinto según dónde estuviera el foco.

`suggestCommitMessage` pasó a recibir el conjunto elegido en vez de un identificador. Nombra el cambio
cuando todo lo elegido pertenece a uno solo —los archivos sin atribuir no contradicen, porque no
tienen dueño con el cual entrar en conflicto—; cuando abarca varios o ninguno, devuelve el prefijo con
el alcance y la descripción vacía. Que deje de nombrar un cambio es deliberado: es la señal visible de
que el commit está mezclando trabajos, y llega antes de confirmar. Concatenar identificadores se
descartó porque produce mensajes ilegibles en cuanto son tres.

`.repoHealth` dejaba de mostrarse por debajo de cierto ancho, porque era un rótulo decorativo. Ahora
es la única puerta a la preparación, así que se encoge en vez de ocultarse: ocultarlo retiraba la
capacidad entera en anchos angostos.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **96 archivos / 678 tests, verde en tres corridas
seguidas**. El flake conocido de los archivos que crean repositorios Git reales no apareció en ninguna
de las tres; eso no significa que esté resuelto, sólo que no se manifestó. Lint limpio sobre los siete
archivos tocados. `openspec validate raise-commit-to-repo-level --strict` válido.

La suite pasó de 673 a 678 tests: `change-commit-scope.test.ts` se reescribió contra la firma nueva
(20 casos), `pipeline-commit-tab.test.tsx` se reemplazó por `pipeline-repo-commit.test.tsx` (7 casos,
uno de ellos el de cero cambios activos), y las claves de `prepare.*` se sumaron a `PIPELINE_KEYS`
para que las tres lenguas queden exigidas. El caso que verifica que preparar no llama a ninguna API
que confirme se conservó sin tocar: esa garantía no cambió de nivel.

## Lo que no se midió y lo que falta

No se midió que esto reduzca pasos ni tiempo, y no se afirma que lo haga. Lo verificable es que existía
un estado del repositorio sin ninguna superficie de preparación y ahora la tiene.

Queda pendiente la validación visual de Ale (tarea 5.5), y con ella una decisión que se implementó por
lo reversible: el panel se abre a pedido y no solo al detectar el árbol sucio después de archivar. Se
ajusta si la revisión visual dice otra cosa.
