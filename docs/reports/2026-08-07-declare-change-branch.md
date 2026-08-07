# El panel declara la rama del cambio y la base de la que sale

**Change:** `declare-change-branch` · **Fecha:** 2026-08-07 · **Tareas:** 28/29 (falta la validación
visual de Ale) · **Rama:** `change/declare-change-branch`

## Qué se hizo

El panel declara cuándo el cambio abierto no se está trabajando en su rama, y declara de dónde va a salir
la rama antes de crearla. Con trabajo sin confirmar, no la crea. Nada bloquea el trabajo.

Antes de esto se completó la regla en el canal, que era lo que faltaba para que el circuito tuviera final.

## El circuito, completo

La regla decía cómo **abrir** un cambio y no decía nada de después, y esa mitad faltante era el motivo
para plantearse retirarla: con doce cambios por día quedaban doce ramas sin camino de vuelta. Ale definió
el final y es más simple que las tres alternativas que se le presentaron: el ejecutor trabaja en la rama
todo el recorrido —propuesta, implementación, archivado—, y **fusionar y borrar son suyos, a mano**. La
rama no queda sin salida: la salida es una persona, igual que ya pasa con los commits.

Se corrigió además un agujero que se encontró releyendo la regla. Decía «si la rama ya existe, informarlo
y no reutilizarla», que está bien para una rama con trabajo ajeno pero **rompe el caso normal de retomar
un cambio propio**: la rama existe porque uno la creó, y la regla mandaba no usarla. Ahora distingue la
rama de este mismo cambio —pararse en ella— de la de otro cambio —informar y parar—.

Las dos cosas se escribieron en `openspec/config.yaml`, que es el canal, y se comprobó que sigue
entregando: 3759 caracteres de contexto y 4 reglas de propuesta.

## Por qué hacía falta el panel y no alcanzaba con el texto

La regla tenía **cero cumplimiento**: `git branch --list "change/*"` devolvió vacío cuatro días después
de escribirla, con unos diez cambios creados en ese lapso, todos en `main`. El ejecutor que ayudó a
escribirla la incumplió diez veces.

Eso descarta la explicación fácil —«no llegó»—, porque la regla viaja por el canal y el canal está
medido. Lo que faltaba era que se viera en el momento en que importa. Es exactamente la conclusión de
`offer-openspec-init`, y el mismo remedio: mostrar el estado, no decidir por la persona.

## La pregunta de Ale, que agregó un requisito

Preguntó si al crear la rama se puede saber si uno está parado en los últimos cambios, y señaló el caso
que lo hace no trivial: puede haber ramas sin fusionar **a propósito**, por ejemplo deprecadas.

Se puede, y se mide con dos números contra el `main` local
—`git rev-list --left-right --count main...HEAD`—. Medido sobre ramas reales de este repositorio:

| Rama | Faltan de `main` | Propios sin fusionar |
|---|---|---|
| `main` | 0 | 0 |
| `claude/jolly-khayyam-2be14c` | 501 | 0 |
| `fix/pipeline-launcher-empty-box` | 107 | 0 |
| `imagined/streaming-predicciones-via-ipc` | 296 | 1 |

Son dos números y no uno porque separan tres situaciones con respuestas distintas: al día, rama vieja ya
fusionada, y rama con trabajo propio sin fusionar. **La tercera es la que Ale nombró**, y es justamente
aquella en que la base correcta no es `main`; por eso el panel declara y ofrece, en vez de corregir solo.

La comparación es contra el `main` **local** y se rotula como tal. Saber si `main` mismo está atrasado
respecto del remoto exige `git fetch`, que es red, y esta lectura no hace red.

## El costo, medido

`rev-list` cuesta lo que cuesta abrir el proceso y no lo que cuesta contar:

| | tiempo |
|---|---|
| `rev-list --left-right --count`, 0 commits de divergencia | 63–105 ms |
| `rev-list`, caso peor de 501 commits | 57–114 ms |
| `git status --porcelain`, que la aplicación ya corre en cada refresco | 71–133 ms |

Entra en el refresco sin discusión. La estimación previa del `design.md` —«del orden de decenas de
milisegundos»— quedó confirmada, y ahora está medida en vez de estimada.

## El tercer requisito salió de pisarlo

Al proponer este mismo cambio no se pudo crear su rama: el trabajo de `offer-openspec-init` estaba sin
confirmar en `main`, y `git checkout -b` se lo habría llevado a una rama a la que no pertenece. La rama
se crea al **abrir** un cambio, que es justo el momento en que lo que hay sin confirmar es de otro
trabajo.

Así que el panel no la crea con el árbol sucio: lo declara y no arranca nada. Se descartó `git stash`,
que es una escritura que la persona no pidió y que deja trabajo donde no lo va a buscar.

## Decisiones de forma

Ale eligió que el aviso viva como **línea propia** y no en la franja de evidencia. Va arriba de todo lo
que se hace con el cambio, apenas debajo de su encabezado. Comparte la caja del aviso de OpenSpec porque
es el mismo tipo de cosa —algo del repositorio que conviene saber antes de seguir— y darle forma propia
lo haría leer como otra clase de mensaje; se distingue por color, cyan en vez de ámbar, porque no está
mal, está informando.

Sólo aparece para un cambio **activo**: uno archivado es de sólo lectura y ya no tiene rama que le
corresponda.

La casilla «crearla a partir de `main`» arranca desmarcada, y sólo aparece cuando hay algo que decir
sobre la base. Sin ella la rama sale de donde se está parado, que es lo que hace Git.

## El defecto que encontró la validación de Ale

Validando la declaración de base, Ale miró la franja de evidencia y decía **"Rama actual:
change/declare-change-branch"** cuando Git ya estaba parado en `change/para-borrar`, la que el propio
formulario acababa de crear. La barra lateral de ramas sí se había enterado; la franja de Pipeline no.

Es el peor modo de fallo posible para este cambio: el trabajo entero es que el panel declare en qué rama
se está, y justo después de que la aplicación cambia la rama declaraba la anterior. Ninguna de las siete
pruebas lo veía, porque todas miraban el formulario y el defecto estaba en lo que pasa después.

El arreglo es releer la evidencia al crear la rama, que es lo que ya hacía inicializar OpenSpec. Un fallo
al crearla no dispara relectura, y desmarcar la rama tampoco: en esos dos casos no se tocó Git, y releer
sugeriría que sí.

Entró como requisito con su escenario, tarea 3.7 y tres pruebas.

## Un error propio, y su rastro

Al escribir las pruebas se sobrescribió `pipeline-change-branch.test.tsx`, que ya existía y cubre la
creación de la rama. Se detectó en el acto, se restauró con `git checkout --` y las pruebas nuevas
quedaron en dos archivos con nombre propio. El archivo restaurado pasa: su aserción sobre
`gitCreateBranch` con dos argumentos sigue siendo cierta porque el punto de partida se pasa sólo cuando
se elige, en vez de mandar un tercer argumento `undefined`.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm exec eslint` limpio sobre los trece archivos tocados.
`openspec validate declare-change-branch --strict` válido.

`pnpm test` en **115 archivos / 843 tests**, corrida completa en verde. La base antes de esta tanda era
112 archivos / 815 tests: entran tres archivos y veintiocho casos.

## Lo que falta

La tarea 5.6: Ale valida abriendo un cambio desde otra rama y viendo el aviso. Se tilda antes de
archivar.

Y lo que la regla ahora dice que es suyo: el merge de `change/declare-change-branch` a `main`, a mano,
cuando corresponda.
