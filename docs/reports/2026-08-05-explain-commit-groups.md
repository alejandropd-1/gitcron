# El panel de preparación explica de qué está hecho cada grupo

**Change:** `explain-commit-groups` · **Fecha:** 2026-08-05 · **Tareas:** 15/16 (falta la validación visual de Ale)

## Qué se hizo

Tres cosas, las tres observadas por Ale sobre el panel funcionando.

Los controles de sumar y quitar un grupo pasaron de texto plano a botones con marco e ícono. Como
texto suelto al lado del rótulo se leían como parte del título.

El mensaje sugerido pasó de un `<code>` de sólo lectura a un campo editable, cuyo valor **es** el
`commitMessage` del store. Lo que se lee en el panel es literalmente lo que se va a confirmar, no una
copia. Antes había que recordar la corrección hasta la vista de Commit.

Cada grupo suma una línea que declara qué contiene: los artefactos de un cambio en curso, el archivado
completo nombrando qué se archivó, y lo que ningún cambio reclama. El estado de cada archivo dejó de
ser una inicial y se dice con palabra —nuevo, modificado, borrado—, conservando el color. En el grupo
sin atribuir, cada archivo declara además de qué tipo es: código, prueba, documentación, configuración.

## El límite que se declara en vez de simularse

Un archivo de código **no se puede atribuir a un cambio**: ese dato no existe en el repositorio. Es la
misma razón por la que se retiró la división propio/ajeno en `raise-commit-to-repo-level` —con dos
cambios en curso, la aplicación estaba adivinando—.

Por eso el grupo sin atribuir dice qué clase de archivo es cada cosa, que es lo que sí se puede
afirmar, y su descripción declara explícitamente que ningún cambio los reclama y que la aplicación no
puede saber de qué trabajo vienen. Se descartó redactarlo como advertencia: no hay nada anómalo en que
un archivo de código no tenga cambio, es el estado normal, y tratarlo como sospecha enseña a ignorar
el aviso.

## Decisiones

**El tipo se muestra sólo en el grupo sin atribuir.** En los grupos de un cambio o de un archivado la
procedencia ya está dicha arriba, y repetir el tipo por fila sería ruido. Se descartó mostrarlo siempre
por uniformidad: la uniformidad no es el objetivo, que se vea una omisión sí.

**El campo del mensaje no tiene estado propio.** Escribe directo en `commitMessage`. Con un estado
local que se sincronizara al preparar habría dos fuentes para el mismo texto, y la que se ve podría no
ser la que se confirma — que es exactamente el modo de fallo que este panel existe para evitar.

**El estado se dice con palabra, no en el `title`.** Un dato que sólo aparece al pasar el mouse no está
presentado. Es el mismo criterio por el que el control de tarea dejó de ser un elemento sin señal.

**La clasificación por tipo se deriva de la ruta, no del contenido.** Leer archivos es del proceso
principal, y una convención de carpetas que este repositorio respeta da lo mismo sin esa vuelta. Lo que
no encaja cae en `código`, que es el caso más común y el más inocuo si se equivoca; una categoría
"desconocido" no ayudaría a decidir nada.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **98 archivos / 704 tests, verde en dos corridas
seguidas**. El flake conocido de los archivos que crean repositorios Git reales no apareció en ninguna;
eso no significa que esté resuelto. Lint limpio sobre los seis archivos tocados.
`openspec validate explain-commit-groups --strict` válido.

Tres tests de `pipeline-repo-commit.test.tsx` fallaron al implementar, los tres por consecuencia
directa del cambio y ninguno por regresión: el rótulo del grupo pasó a colisionar con su descripción al
buscarlo por prefijo, el estado dejó de tener `aria-label` porque ahora es texto visible, y el mensaje
dejó de ser un nodo de texto para ser un campo. Se actualizaron al recorrido nuevo y se sumaron dos
casos: que el tipo aparezca sólo donde corresponde, y que corregir el mensaje en el panel sea lo que
queda para confirmar.

## Sobre atribuir código a un cambio

Ale preguntó qué haría falta para que algo lo registre. Se investigó y quedó fuera de este change, pero
vale dejar anotado el hallazgo: `captureWorkingTree` en
`electron/pipeline/runtime/runtime-session-evidence.ts:35` ya ejecuta `git status` y arma una firma con
**todas las rutas** modificadas, y las descarta quedándose con el string de firma y los contadores. El
hub la llama antes (`runtime-session-hub.ts:203`) y después (`:324`) de cada sesión, y la sesión conoce
su `changeId`. La atribución por observación —qué archivos cambiaron durante una sesión de un cambio
conocido— está a un paso de existir. No se implementó nada de eso acá.
