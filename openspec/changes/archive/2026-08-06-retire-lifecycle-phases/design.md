## Context

La barra de fases y el contador son la última pieza del modelo propio que el panel usaba antes de
poder leer el estado real. `lifecycle()` deriva sus cinco etapas de tres señales —si el cambio existe,
si su propuesta existe, si las tareas están completas y si la validación pasó— y las ordena. Ese
invento tenía sentido cuando no había otra fuente; desde `consume-openspec-graph` la hay, y para los
artefactos es del CLI.

Las cinco etapas no se traducen una a una al grafo: `proposal`, `design`, `specs` y `tasks` son
artefactos y tienen estado propio; `apply`, `validate` y `archive` no lo son. Por eso este change no
reemplaza la barra por el grafo: la retira, y deja que cada pregunta se conteste donde ya se contesta
con evidencia.

## Goals / Non-Goals

**Goals:**

Que el panel deje de afirmar que hay una secuencia obligatoria. Que nada de lo que la barra mostraba
quede sin respuesta en otro lugar. Que el indicador de relectura sobreviva a la mudanza.

**Non-Goals:**

Mover el grafo de artefactos al encabezado. Rediseñar la guía del siguiente paso más allá de sacarle
el contador. La atribución de código a un cambio.

## Decisions

**Se retira, no se reemplaza.** El encabezado queda con la identidad del cambio y su intención, y su
segunda columna desaparece. Se descartó poner el grafo de artefactos ahí: Zai ya lo descartó con
fundamento —dos superficies de progreso en el mismo encabezado compiten y obligan a explicar por qué
no coinciden, que es el texto explicativo que la invariante 11 prohíbe— y ese razonamiento no cambió
porque la barra se vaya. Se descartó también inventar un indicador nuevo para llenar el espacio: el
objetivo es que el panel afirme menos, no que afirme distinto.

**Cada pregunta se contesta donde ya hay evidencia.** Qué estado tiene cada artefacto: el grafo del
CLI en la pestaña Artefactos. Si la validación pasó: la barra de evidencia inferior, que ya lo declara
con su propio estado. Cuánto falta de tareas: la lista lateral y la pantalla de entrada. Qué conviene
hacer ahora: la guía del siguiente paso, que se conserva entera. Ninguna de esas cuatro respuestas se
crea en este change; todas ya existen.

**`step` se retira del tipo, no se deja en `null`.** Dejar el campo siempre nulo conservaría la forma
de un modelo que ya no se sostiene y volvería a llenarse en cuanto alguien quisiera «mostrar el
progreso». Sacarlo del tipo hace que reintroducirlo sea una decisión visible.

**El atributo de relectura se muda al encabezado.** Hoy cuelga de la lista de etapas por estar ahí, no
porque le pertenezca: informa que la evidencia se está releyendo, que es del encabezado entero. Se
descartó retirarlo junto con la barra: es una garantía verificada por
`pipeline-workspace-revalidate.test.tsx`, y perderla de contrabando sería la clase de regresión
silenciosa que ese test existe para impedir.

**Los textos de las etapas se retiran de las tres lenguas.** Se descartó dejarlos por si acaso: una
clave sin consumidor es deuda que el próximo lector tiene que investigar para descubrir que no se usa.

## Risks / Trade-offs

**El encabezado queda con la mitad del contenido que tenía.** → Es el resultado buscado: la mitad que
se va afirmaba algo falso. La validación visual de Ale es condición de aceptación y es la que decide
si el vacío pide algo o simplemente respira.

**Alguien puede extrañar la posición en el ciclo.** → Es exactamente lo que hay que dejar de sugerir.
OpenSpec permite trabajar cualquier artefacto habilitado en cualquier momento; el grafo lo muestra
artefacto por artefacto, que es más informativo que una posición en una fila.

**Retirar `step` toca once retornos de una función con cobertura amplia.** → Ninguno de los tests
asierta sobre `step` —verificado: cero ocurrencias en `pipeline-next-action.test.ts`—, así que el
cambio es mecánico y los casos existentes deben pasar sin editarse. Si alguno se rompe, es señal de
que se cambió más de lo que corresponde.

**El indicador de relectura puede perderse en la mudanza.** → Hay un test que lo busca por atributo y
no por elemento, así que sobrevive al cambio de anfitrión y falla si desaparece.

## Open Questions

Ninguna que bloquee. Queda para la validación visual si el encabezado, ya sin la barra, pide alguna
otra cosa o queda mejor así.
