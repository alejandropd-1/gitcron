## Context

`selectedId` se resuelve hoy con una cadena de descartes en `OpenSpecDashboard.tsx:254`:
`selection` (lo que la persona tocó) → `openSpec.selectedChangeId` (lo que el backend derivó de la
rama) → `activeChanges[0]` → `archivedChanges[0]`. Los dos últimos eslabones existen para que el panel
tenga algo que mostrar, y son los que producen la entrada sin contexto: eligen por ordenamiento.

Alrededor de esa cadena hay maquinaria que la sostiene. `unreportedSelection` (línea 270) avisa al
backend cuál es el cambio que la vista terminó mostrando, precisamente porque la vista elige uno que
el backend no eligió; sin ese aviso se leía la evidencia de ningún cambio y el mostrado quedaba con
`validation: 'unknown'` y sin artefactos aunque validara. Ese mecanismo es correcto mientras la vista
elija sola, y deja de tener objeto cuando no elige.

La restricción de producto es la invariante 11: denso, oscuro, productivo, sin textos explicativos ni
aire de landing page. Una pantalla de entrada es exactamente el lugar donde esa invariante se degrada
sola si no se cuida, así que lo que se muestre tiene que ser estado, no bienvenida.

## Goals / Non-Goals

**Goals:**

Que abrir Pipeline muestre el estado del repositorio y no el interior de un cambio que nadie eligió.
Que entrar a un cambio sea una acción con su control. Que un repositorio sin nada archivado se lea
como lo que es —un proyecto antes de su primer archivado— y no como uno vacío. Que la correspondencia
entre la rama y un cambio, cuando el backend la deriva, se declare en vez de navegar sola.

**Non-Goals:**

Reemplazar el ciclo de vida fijo por el grafo de OpenSpec. La preparación del commit, que ya vive en
el encabezado. El ancho de los paneles de artefactos y el filtro de ACTIVIDAD. Cualquier lectura nueva
del CLI o de Git: la pantalla se arma con lo que el snapshot ya transporta.

## Decisions

**Sin elección explícita no hay cambio seleccionado.** `selectedId` pasa a ser `selection` y nada más;
los descartes `activeChanges[0]` y `archivedChanges[0]` se retiran. Se descartó conservar el descarte
al primer activo y limitar la pantalla de entrada al arranque —una bandera de "todavía no navegó"—
porque produce dos estados distintos que se ven igual, y porque volver a la pantalla de entrada
después de haber entrado a un cambio dejaría de ser posible sin inventar un control de "salir".

**`openSpec.selectedChangeId` se declara, no navega.** Cuando el backend derivó una correspondencia
entre la rama y un cambio, la pantalla de entrada lo señala en la tarjeta de ese cambio en vez de
abrirlo. Se descartó seguir tratándolo como selección automática: es la información más útil que hay
para decidir por dónde seguir, y gastarla en saltar adentro la vuelve invisible —hoy nadie puede
distinguir si entró ahí por la rama o por ser el primero de la lista—.

**La pantalla de entrada absorbe `noActiveChange`.** Hoy hay una pantalla de repositorio que sólo
aparece sin cambios ni archivados. Mantener las dos daría dos lecturas del mismo estado según cuántos
cambios haya, que es el defecto que este trabajo corrige en otro plano. La sección se retira y su
contenido —el acceso a abrir un OpenSpec nuevo y el flujo de creación— pasa a la pantalla única.

**Los ceros se declaran, no se cuentan.** Con cambios en curso y ningún archivado, la pantalla dice
que todavía no se archivó nada en lugar de mostrar un `0` junto a otros números. Se descartó
mostrarlos como cifras uniformes: un cero de archivados y un cero de cambios activos significan cosas
opuestas —uno es normal al principio, el otro es un repositorio sin trabajo abierto— y presentarlos
igual es lo que hace que odontoPau se lea como vacío. Es el mismo principio que la invariante de que
un valor desconocido no es cero, aplicado a un valor que sí es cero pero no significa ausencia.

**`unreportedSelection` se retira junto con la cadena.** Su razón de ser era avisar de una elección
que hacía la vista y el backend no; sin esa elección no queda nada que avisar. `selectChange` ya
notifica con `onSelectChange` cuando la persona entra a un cambio, que es el único momento en que hay
una selección nueva. Se descartó dejarlo por las dudas: un efecto que notifica algo que nadie eligió
es la forma exacta del defecto que se está sacando.

## Risks / Trade-offs

**Un paso más para llegar al cambio en el que se estaba trabajando.** → Es el costo aceptado de que
la entrada no mienta, y se compensa señalando en la pantalla el cambio que corresponde a la rama
actual: en el caso corriente —una rama por trabajo— el que se busca queda marcado. No se midió que el
saldo sea favorable en clics, y no se afirma que lo sea.

**Una pantalla de entrada tiende a volverse una landing.** → Lo que se muestra es estado —cambios en
curso con su avance, qué falta, qué se archivó— y ninguno de sus textos explica qué es OpenSpec ni da
la bienvenida. La invariante 11 es condición de aceptación de este change, no una recomendación, y la
validación visual de Ale es la que la comprueba.

**Retirar la cadena de descartes rompe `pipeline-selection-sync.test.tsx`.** → Su primer caso verifica
justamente que la vista informa el cambio al que cayó por descarte; ese comportamiento deja de existir
y el caso se reemplaza por su contrario: sin elección explícita no se informa ninguno y no se muestra
ningún cambio. El tercer caso —que seleccionar no despliega— se conserva, porque esa garantía es
independiente.

**El caso que motiva el trabajo no está en ningún fixture.** → Se suma cobertura del estado de
odontoPau: cambios activos, cero archivados, cero especificaciones y tareas mayormente hechas. Sin ese
caso escrito, la mejora que se busca no queda comprobada por nada.

## Open Questions

Cuál es el orden de los cambios en curso dentro de la pantalla. Se implementa por avance de tareas
descendente, que pone adelante lo que está por cerrarse; queda para la validación visual de Ale si
conviene ese orden o el de última actividad. No bloquea: cambiar el criterio es una comparación.
