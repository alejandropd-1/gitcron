## Decisión: ejecutar la inicialización desde la aplicación

Se propone que el panel ejecute `openspec init` sobre el repositorio abierto, tras una confirmación
humana explícita que enumere qué archivos se van a escribir.

**Alternativa descartada: entregar el mando para correrlo a mano.** El panel ya sabe componer
instrucciones autosuficientes, y mostrar `openspec init` como texto para copiar no agrega ninguna
superficie de escritura. Se descarta porque el pendiente que este cambio atiende no es "la persona no
sabe el mando": es que el panel muestra cuatro ceros y no ayuda a salir de ahí. Alguien que abrió un
repositorio en la aplicación y se encontró con una pantalla vacía no está en posición de saber que le
falta un paso que nadie le nombró; entregarle un mando para pegar en otra ventana deja el trabajo a
mitad de camino. La ejecución desde la aplicación es lo que convierte el estado muerto en una salida.

**Contrapartida asumida:** es una escritura nueva en un repositorio del usuario, y de las que crean
archivos, no de las que editan uno existente. Se asume declarándola antes de ocurrir, con la lista
concreta de lo que se va a escribir y sin ninguna preselección que la dispare por descuido.

## Decisión: distinguir la ausencia del vacío en la evidencia, no en la vista

El lector de evidencia pasa a diferenciar tres estados del repositorio: sin `openspec/`, con
`openspec/` y sin cambios activos, y con cambios activos. La vista consume esa distinción en vez de
inferirla.

**Alternativa descartada: inferirlo en el renderer a partir de los contadores en cero.** Es menos
código y no toca el proceso principal. Se descarta porque cero cambios activos y ausencia de OpenSpec
son estados distintos que piden respuestas distintas, y ya coinciden en los contadores: un repositorio
correctamente inicializado y recién empezado muestra los mismos cuatro ceros. Inferir el estado desde
un valor que ambos comparten produce el fallo que Ale ya detectó una vez —la guía diciendo "no hay
ningún cambio activo" debajo de una lista con cuatro—, que es exactamente lo que pasa cuando la vista
deduce en vez de recibir.

## Decisión: nombrar la consecuencia, no sólo la falta

El estado explica que sin `init` crear un cambio igual funciona, pero el ejecutor recibe el encargo sin
contexto ni reglas.

**Alternativa descartada: decir sólo "este repositorio no usa OpenSpec".** Es más corto y suficiente
para identificar el estado. Se descarta porque no comunica lo que hace peligroso al caso: el sondeo
mostró que `openspec new change` funciona sin `init` y deja un `config.yaml` vacío del que
`openspec instructions` devuelve contexto vacío y ninguna regla. El fallo es silencioso, y un aviso que
no nombra la consecuencia deja a la persona creyendo que inicializar es opcional.

## Riesgos

**La inicialización falla a mitad y deja el repositorio a medio escribir.** Mitigación: informar el
error real sin normalizarlo —el mismo criterio que se aplicó al fallo de creación de rama— y volver a
leer la evidencia para que el panel muestre el estado que hay, no el que se esperaba.

**El binario de OpenSpec no está disponible.** Mitigación: es el mismo problema de disponibilidad que
ya tiene el resto del panel; se reporta como tal y no se ofrece una acción que no se puede ejecutar.

## Sin medir

No se midió cuánto tarda `openspec init` en un repositorio grande. Si la acción necesita estado de
progreso, se sabrá al implementarla; darlo por descontado ahora sería presentar una expectativa como
resultado.
