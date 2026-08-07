## Contexto

`RepoMainView` resuelve la solapa activa con una cadena de `return`: `History`, `Commit`, `Pipeline` y el
grafo son componentes distintos y sólo uno está montado a la vez. Cambiar de solapa no oculta Pipeline,
lo desmonta, y React se lleva con él todo `useState` del árbol: `flowMode` —que es lo que hace visible el
formulario—, el modo, el objetivo, el slug, las restricciones, las dos casillas y la instrucción ya
compuesta.

La sesión de runtime **no** se pierde: vive en el proceso principal y vuelve por el snapshot. Lo que se
pierde es lo anterior a arrancarla, que es justamente donde está el trabajo humano.

## Decisión: el borrador va a un store, no se evita el desmontaje

El estado del flujo sale del componente y pasa a un store de Zustand, del mismo tipo que el que la
aplicación ya usa para el estado de Git.

**Alternativa descartada: mantener Pipeline montado y ocultarlo con CSS.** Es menos código y salva más
—selección, scroll y solapa del rail, además del borrador—. Se descarta por lo que deja corriendo: el
panel quedaría suscrito a los refrescos mientras se mira otra solapa, y cada refresco hace trabajo de Git
real. Está medido en este proyecto: la pasada de `git log` para las marcas cuesta 97 ms, `rev-list` 63–105
ms y `git status` 71–133 ms, y el watcher refresca en cada guardado de archivo. Pagar eso mientras nadie
mira el panel es un costo sin contrapartida, y peor: el grafo es la vista que más trabajo hace, así que
se le sumaría carga justo donde más molesta.

La contrapartida asumida está declarada abajo, en «Fuera de alcance».

**Alternativa descartada: guardar el borrador en disco.** Sobreviviría a cerrar la aplicación. Se
descarta porque el problema medido es cambiar de solapa, no reiniciar, y persistir texto a medio escribir
crea una pregunta nueva que hoy no existe —cuándo caduca, qué pasa si el repositorio cambió— sin que
nadie la haya pedido.

## Decisión: el borrador es por repositorio

La clave del store es la ruta del repositorio. Volver a Pipeline en otro repositorio no muestra lo que se
estaba escribiendo en el primero.

**Alternativa descartada: un único borrador global.** Es más simple. Se descarta porque `PipelineWorkspace`
ya se remonta a propósito al cambiar de repositorio —tiene `key={repoPath}` justamente para no mostrar el
snapshot del anterior— y un borrador global reintroduciría el defecto que esa `key` evita, con el
agravante de que aparecería como si fuera del repositorio nuevo.

## Decisión: cuándo se descarta

El borrador se limpia en dos momentos, y sólo en esos: al cerrar el flujo con «Cerrar sin empezar» y al
arrancar la sesión.

Son los dos momentos en que la persona declara que terminó con él. Cambiar de solapa, elegir un cambio o
cerrar el panel no lo tocan, porque en ninguno de esos casos dijo que ya no lo quería.

**Alternativa descartada: limpiarlo al salir de Pipeline.** Sería lo que pasa hoy, escrito a propósito en
vez de por accidente. Es exactamente el defecto.

## Riesgos

**Un borrador viejo reaparece y confunde.** Volver a Pipeline días después muestra algo que se escribió en
otro momento. → Mitigación: muere con la aplicación, no se persiste, y el flujo sólo se muestra si estaba
abierto, no se abre solo.

**Mover estado al store pierde algo por el camino.** Son ocho campos y es fácil olvidar uno. → Mitigación:
la prueba recorre el ciclo entero —escribir, desmontar, montar de nuevo— y verifica campo por campo.

## Fuera de alcance

El cambio seleccionado, la posición del scroll y la solapa del rail siguen perdiéndose al cambiar de
solapa. Ale acotó el alcance a lo escrito, que es lo caro de rehacer; lo demás son un clic. Si alguna vez
se decide que también tienen que sobrevivir, la decisión de fondo cambia y hay que volver a la
alternativa descartada —no desmontar—, midiendo antes qué cuesta dejar el panel vivo.

## Sin medir

No se midió cuánto costaría mantener Pipeline montado en segundo plano. La estimación se apoya en los
tiempos ya medidos de las lecturas de Git que hace cada refresco, pero nadie corrió el caso.
