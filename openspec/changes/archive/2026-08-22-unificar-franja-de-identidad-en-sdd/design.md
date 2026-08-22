## Lo que hay hoy

La franja de identidad del grafo lleva: la rama actual, el indicador de árbol limpio o con cambios,
el indicador de sincronización, y a la derecha el selector de modo. Vive en la pieza común y mide
44 px.

La barra de SDD —`summaryBar` en `components/pipeline/OpenSpecDashboard.module.css:73`— lleva seis
piezas en una grilla propia de cuatro pistas:

| Pieza | Qué es |
|---|---|
| `brand` | «Spec-Driven / Development», dos renglones, escrito a mano en el JSX |
| `summaryFacts` | cuántas especificaciones y qué porcentaje de tareas |
| `repoHealth` | el estado del árbol, que además abre la preparación del commit |
| rama actual | la misma que muestra el grafo |
| insignia del motor | «Motor OpenSpec v1.5.0 (Al día)» |

Declara `min-height: 6rem`, su propio fondo `rgba(15, 37, 57, 0.72)` y un `border-bottom` con
`--os-border`. El comentario que la encabeza explica que se pasó de tres pistas a cuatro porque los
contadores «desbordaban su pista y se encimaban con el estado del repositorio». Sigue pasando.

## Decisiones

### Qué sobrevive arriba y qué baja

Arriba queda lo que la franja común ya nombra —rama, estado del árbol, sincronización— más el
control de alcance de la vista, que en SDD es preparar el commit. Es la misma composición que el
grafo: identidad a la izquierda, control a la derecha.

Bajan al cuerpo los contadores y la insignia del motor. No son identidad ni control: son datos del
panel, y en el cuerpo tienen ancho para leerse. El encimado desaparece por sustracción, no por
agregar una quinta pista.

Se retira el título de marca. La vista ya se nombra en el selector de vistas, que dice SDD desde el
change anterior. Un segundo nombre, en dos renglones y en caja alta, ocupa el ancho que les falta a
los contadores para no encimarse — es la causa del defecto, no una víctima.

**Nota declarada:** ese título está escrito a mano en el JSX
(`components/pipeline/OpenSpecDashboard.tsx:1402`, `<span>Spec-Driven</span><span>Development</span>`)
y hay un test que lo fija por texto (`pipeline-panel-brand.test.tsx:78`). Es un incumplimiento del
invariante 8 que el relevamiento del change anterior no detectó, porque buscó la palabra «Pipeline»
y no textos escritos en componentes. Al retirarlo, el incumplimiento se va con él y el test se
reescribe para afirmar que ya no está.

### El control de la derecha no cambia de comportamiento

`Preparar commit` sigue abriendo lo que abre hoy, con el mismo estado y la misma condición sobre el
árbol limpio. Cambia de lugar, no de función. Su área clickeable sigue siendo toda la caja, como
declara el comentario del código actual.

## Preguntas abiertas

- **¿Dónde exactamente bajan los contadores y la insignia?** El cuerpo de SDD tiene tres columnas y
  este change no las toca. La primera tarea releva qué zona del cuerpo los recibe sin alterar la
  disposición, y lo declara antes de mover nada. Si no hubiera lugar sin rediseñar el cuerpo, frenar
  y reportar: eso pertenece al trabajo de los paneles laterales, no a éste.
