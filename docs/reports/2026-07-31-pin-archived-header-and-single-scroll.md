# Reporte — pin-archived-header-and-single-scroll

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `pin-archived-header-and-single-scroll`

## Qué problema resolvía

Segunda pasada de QA sobre los arreglos de `fix-archive-panel-and-git-refresh`. **Los dos defectos
son de esos arreglos, no del código previo.**

**1. El panel de confirmación acotado no alcanzó.** Limitarlo a `46vh` con scroll propio dejó dos
áreas desplazables compitiendo dentro del centro. En ventanas bajas el reparto de alto no da, y los
botones `sticky` terminaban encimados sobre el texto del comando en vez de debajo.

Primero se interpretó "un solo scroll" como *el panel es el centro*: tomaba el alto disponible, era
el único desplazable, y el trabajo y la actividad se retiraban. Ale corrigió el criterio: **que
empuje, no que desaparezca**.

La versión final es la correcta y más simple: **el centro entero es el único con scroll**. Ninguna
región se desplaza por su cuenta —ni el panel, ni el área de trabajo, ni la ficha del archivado— así
que la confirmación empuja hacia abajo lo que sigue y todo se recorre de una pieza. Se retiraron el
scroll interno del panel, el `sticky` de sus botones y la regla que ocultaba a los hermanos: tres
mecanismos que dejaron de hacer falta.

**2. La ficha del archivado quedó desprolija — y el primer intento fue peor.** El resumen con el
tilde verde se iba con el scroll apenas llegaban los artefactos, así que se fijó arriba. El
resultado: el contenido pasaba por debajo asomándose contra su fondo, que además no era del todo
opaco.

Ale definió el criterio y es el correcto: **que el cuerpo se recorra entero, de una sola pieza**.
Se quitó el fijado y el fondo; la identidad queda agrupada y separada por una línea, pero dentro
del flujo. Con eso se retiró también el requirement que había escrito sobre mantenerla visible: una
spec no puede declarar una conducta que el código deliberadamente no implementa.

Vale registrar el patrón: dos veces seguidas en este change resolví un problema de layout agregando
un mecanismo —acotar con scroll propio, fijar con `sticky`— y las dos veces el mecanismo trajo un
artefacto peor que el problema. Lo que funcionó fue quitar, no agregar.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `components/pipeline/OpenSpecDashboard.tsx` | La identidad del archivado agrupada en su propio contenedor. |
| `components/pipeline/OpenSpecDashboard.module.css` | Panel de confirmación a alto completo con scroll único; ficha sin fijado ni fondo propio. |

## Tercera pasada: el salto y el scroll de la ficha

**El salto al seleccionar un completado.** Al hacer click, el primer render traía la ficha sin
artefactos y el segundo —tras la relectura— la pantalla entera: se veían dos vistas distintas
seguidas. La región de artefactos pasa a existir desde el primer render con su espacio reservado y
un aviso de actualización adentro, así que es una sola pantalla que se completa, no dos que se
suceden.

**El scroll de la ficha.** Había quedado `justify-content: safe center`. `safe` evita el recorte,
pero si el motor no lo soporta **la declaración entera se descarta** y vuelve a quedar `center` —el
defecto reaparecería sin ninguna señal—. Con los artefactos adentro el contenido siempre desborda,
así que centrar no aporta nada: se alinea al inicio y todo se recorre como una sola pieza, que es
el criterio que eligió Ale.

Antes de tocarlo se preguntó en vez de adivinar. En este mismo change ya se había errado dos veces
con layout —acotar con scroll propio, fijar con `sticky`— y las dos veces el mecanismo agregado
salió peor que el problema.

## Nota de método

Este change existe porque **implementé encima de un change ya archivado**. Ale archivó
`fix-archive-panel-and-git-refresh` y yo seguí corrigiendo sobre esos mismos arreglos, dejando
trabajo sin ningún change que lo cubriera. Abrir uno nuevo es lo que corresponde: un change
archivado es un registro cerrado y no se reabre.

Vale como señal de ritmo: cuando el QA y la implementación se pisan, conviene confirmar qué está
archivado antes de seguir tocando.

## Sobre las tareas sin tildar en los archivados

Consultado durante este QA, y **no es un defecto**. Cuatro changes se archivaron antes de que
existiera la tarea de firma, así que su último ítem quedó en `[ ]` y ahí se queda: reescribirlo para
simular una firma que no ocurrió sería justo lo que el mecanismo viene a evitar. Los siete
archivados después sí la tienen tildada.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` | **no verde de forma confiable** — ver abajo |
| `pnpm exec eslint` sobre los archivos tocados | **limpio** |
| `openspec validate pin-archived-header-and-single-scroll --strict` | **válido** |

## La suite no está verde de forma confiable

**No se tildó `pnpm test` en verde, y corresponde decir por qué.** En diez corridas completas de esta
tanda, tres fallaron. Los tests que caen son siempre los mismos —los que crean repositorios Git
reales en directorios temporales: `git-hunks-ipc`, `branch-delete-ipc`, `git-ops-worktree-submodule`,
`git-sync-ipc`— y **todos pasan corridos aislados**.

El error capturado no es el `EBUSY` de antes sino `Test timed out in 5000ms`. Es decir: la limpieza
con reintento de `make-temp-repo-cleanup-reliable` sí atacó el `EBUSY`, y lo que queda es que estas
pruebas hacen trabajo real de Git contra el disco con el timeout por defecto de 5 s, que bajo carga
paralela no siempre alcanza.

**No tengo evidencia de que la cola de `serialize-git-operations` lo haya empeorado** —el flake ya se
observaba al inicio de la sesión, antes de que esa cola existiera— pero tampoco de que sea ajena.
Afirmar cualquiera de las dos cosas sin medirlo sería inventar.

Esto viola el requirement que escribí en `testing-harness`: *la suite no se declara verde mientras
exista una diferencia entre correr aislado y correr completo*. Así que no se declara. Merece su
propio change: medir con y sin la cola, y subir el timeout de las pruebas que hacen Git real si esa
resulta ser la causa.

## Pendiente de QA visual

Los dos son de render y **ninguno es verificable con la suite actual**. El del panel necesita una
ventana baja; el de la identidad fija, un archivado con artefactos largos. Los dos los tiene que ver
Ale.
