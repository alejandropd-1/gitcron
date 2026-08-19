## Context

GitCron expone seis canales IPC bajo `pipeline:openspec:*` y ninguno escribe artefactos: todos son
diagnóstico o actualización del motor. La única escritura sobre un change es
`pipeline:set-task-checked`, que cambia el estado de una casilla y nada más. Alrededor de eso ya
existe infraestructura que este change reutiliza en lugar de rehacer: `PipelineNewChangeFlow` crea
changes con los modos propose y explore y puede crear su rama; `PipelineRuntimeLauncher` es el único
punto que abre procesos de agente; `pipeline-archive.ts` archiva con plan previo; `DiffViewer.tsx`
parsea diffs unificados, permite seleccionar líneas dentro de cada hunk y ejecuta acciones por hunk;
`task-checkbox.ts` es una función pura con verificación de coincidencia previa a escribir.

El proyecto no tiene dependencias de edición ni de diff: todo eso es código propio. AGENTS.md exige
aprobación explícita para agregar cualquier paquete, lo que condiciona el diseño más que cualquier
preferencia técnica.

Del lado de OpenSpec, la restricción determinante es que el CLI ya entrega el método. `openspec
instructions <artefacto> --change <slug> --json` devuelve la ruta de salida, la plantilla, la
instrucción, las reglas y el contexto del proyecto; `openspec status --json` devuelve el grafo de
artefactos con su estado; `openspec config list` devuelve el perfil y los workflows habilitados. Este
repositorio ya midió el costo de duplicar eso: de dieciséis reglas propias, ocho repetían lo que el
CLI entregaba y se retiraron.

## Goals / Non-Goals

**Goals:**

Operar el ciclo de un change sin salir de la aplicación: redactar y corregir sus artefactos, llevar
su lista de tareas, sincronizar sus specs, archivarlo con su motivo, y mantener el motor al día.
Dejar constancia en el repositorio de cada operación, legible sin la aplicación. Y que todo lo
anterior siga funcionando cuando OpenSpec cambie su modelo, porque nada de ese modelo vive en
GitCron.

**Non-Goals:**

Borrar un change: OpenSpec no expone la operación y define el archivado como cierre formal.
Reimplementar la validación de artefactos: la hace `openspec validate`. La escala de tipografía y
espaciado, la accesibilidad y el armazón visual, que alcanzan a toda la aplicación y viven en
`unificar-sistema-visual-gitcron`. Agregar un editor de texto enriquecido o una librería de diff.
Confirmar nada en Git.

## Decisions

**El modelo de OpenSpec se consulta, no se declara.** La lista de workflows, el conjunto de
artefactos, sus dependencias, sus plantillas y sus reglas se leen del CLI en cada uso. La alternativa
—declarar el conjunto en tipos y constantes de GitCron— es más simple de escribir y más rápida de
leer, y fue descartada porque OpenSpec pasó de un flujo de fases fijas a workflows configurables por
organización entre la versión 1 y la 1.9. Un enum cerrado convierte cada cambio del motor en un
defecto de GitCron, y el spec vigente ya pedía modelar el perfil «sin enum cerrado». El costo
aceptado es que sin motor disponible no hay redacción posible: se declara y no se suple con
plantillas propias.

**Un modo de propuesta en el DiffViewer, en vez de un componente nuevo.** Lo que un agente redacta se
presenta como diferencia contra el contenido actual, reutilizando el `parseDiff` y la selección de
líneas por hunk que ya existen; lo que cambia es el juego de acciones, que pasa de preparar y
descartar en Git a aplicar y descartar sobre un archivo en memoria. Se evaluó un componente aparte y
se descartó: duplicaría el parser y la selección, que son la parte difícil, para no compartir tres
rótulos. También se evaluó incorporar una librería de edición y quedó fuera por la regla de
dependencias.

**La escritura de tareas extiende la función pura existente, con su verificación de coincidencia.**
Agregar, corregir, reordenar y eliminar se implementan al lado de `toggleTaskCheckbox`, con la misma
firma de entrada y salida y la misma comprobación de que la línea sigue diciendo lo que decía. Esa
comprobación existe porque el archivo puede cambiar entre que se dibuja la pantalla y llega la orden
—hay un watcher, y puede haber un agente escribiendo—; sin ella, cada operación nueva multiplica la
posibilidad de escribir sobre la tarea equivocada. La alternativa de reescribir el archivo entero a
partir de una estructura en memoria se descartó: obligaría a reproducir con exactitud sangrías,
numeraciones y texto libre ajeno, y cualquier diferencia se lleva puesto contenido que nadie pidió
tocar.

**El gestor de paquetes se resuelve como ya se resuelve el motor.** Se localiza en el sistema, se
canonicaliza la ruta y se ejecuta como proceso hijo, igual que `openspec.cmd` hoy. La afirmación de
que Electron «no trae npm» describe lo que se empaqueta, no lo que se puede invocar; la aplicación ya
ejecuta un binario del entorno del usuario. La resolución se hace en cada uso y no se memoriza,
porque con un administrador de versiones de Node la ruta cambia al cambiar de versión. La ejecución
es no interactiva y con tope de tiempo, porque el proceso hijo no tiene terminal donde responder un
pedido de confirmación o de elevación.

**La instalación local es la opción recomendada y la global es una decisión informada.** Instalar en
el repositorio queda anotado en el manifiesto, versionado, reversible con Git, alcanzado sólo a ese
proyecto, y la resolución existente ya prefiere el binario local sobre el global. Instalar
globalmente escribe fuera de todo repositorio y le cambia el motor a todos los proyectos de la
máquina. Se descartó ofrecer sólo una: la local no aplica sin manifiesto, y la global es la que la
persona pidió explícitamente. Se descartó también elegir automáticamente, porque la diferencia entre
ambas no se deduce del botón.

**La guarda de rama se define por riesgo de la operación.** Actualizar la integración y archivar se
bloquean sobre la rama principal; redactar artefactos y editar tareas se permiten en cualquier rama.
La alternativa de bloquear todo sobre la principal es más simple de explicar y fue descartada porque
impediría empezar un cambio, que es lo que se hace estando ahí.

**El estado de integración se deriva de los targets.** Se reemplaza el recuento de skills por la
evidencia por target que la inspección ya produce. Esto corrige un defecto observado en la
aplicación: con los workflows instalados sólo en el esquema anterior, la tarjeta declaraba la
integración al día mientras el panel de abajo informaba que el target vigente estaba sin configurar.

**La presentación se reordena, pero la escala no se toca acá.** Este change mueve acciones y
diagnóstico de lugar y suma controles nuevos; los tamaños y espaciados los define
`unificar-sistema-visual-gitcron`, que alcanza a toda la aplicación. Se evaluó resolver ambas cosas
juntas y se descartó: fallan por motivos distintos —uno rompe funciones de OpenSpec, el otro rompe la
composición de cualquier pantalla— y mezclarlas obligaría a revisar las dos cada vez que una falle.
Las pantallas que este change toca adoptan la escala si ya está disponible y conservan los valores
vigentes si no, porque la disposición no depende de ella.

## Risks / Trade-offs

**Escribir en `tasks.md` mientras un agente trabaja sobre el mismo archivo** → La verificación de
coincidencia previa a escribir rechaza la operación en vez de pisar contenido; el rechazo se informa
y la vista se recarga. No elimina la carrera, la vuelve visible.

**La instalación global no se revierte con Git** → La elección es explícita y la confirmación
enumera comando, rutas y repositorios alcanzados. Aun así queda fuera del alcance de cualquier
deshacer de la aplicación, y así se declara.

**La resolución del gestor puede fallar en la aplicación empaquetada** → El PATH que hereda un
proceso lanzado desde el escritorio puede no coincidir con el de una terminal. No está medido en la
aplicación empaquetada; es una hipótesis basada en cómo hereda el entorno un proceso de escritorio.
La mitigación es declarar la falta de forma accionable en vez de fallar en silencio, y el caso debe
comprobarse sobre el ejecutable instalado antes de dar el trabajo por terminado.

**El diff por bloque sobre markdown puede producir bloques poco naturales** → El parser trabaja sobre
diffs unificados, cuya granularidad no coincide necesariamente con la de un párrafo. La mitigación es
que el resultado se puede corregir a mano antes de guardar. No está medido cuán molesto resulta en la
práctica.

**Las pantallas nuevas pueden quedar desalineadas con el sistema visual si éste llega después** →
Los dos changes son independientes y se pueden hacer en cualquier orden, pero si éste va primero, sus
pantallas se construyen con los valores vigentes y las alcanza después la migración del otro. El
costo es un retoque, no una reescritura, porque lo que este change define es disposición y no escala.

## Migration Plan

El trabajo se ordena del proceso principal hacia la interfaz: primero las operaciones —tareas,
artefactos, sync, motivo de archivado, instalación del motor— cada una con su canal y su registro;
después la interfaz, que reordena acciones y diagnóstico y suma el modo de propuesta al visor de
diferencias. La corrección del estado de integración es independiente del resto y va primero, porque
hoy la aplicación muestra un dato falso.

No hay migración de datos. Ningún archivo del repositorio cambia de forma: `tasks.md` conserva su
formato, el registro conserva el suyo y le agrega entradas de tipos nuevos, y los artefactos se
escriben con las plantillas que entrega el CLI. Revertir cualquier operación es descartar cambios no
confirmados en Git, salvo la instalación global, que se declara como irreversible desde la
aplicación.

## Open Questions

Cómo se comporta la resolución del gestor de paquetes en la aplicación empaquetada e instalada, que
no está medido y debe comprobarse antes del cierre.

Si el registro de operaciones debe consolidarse cuando una misma tarea se corrige varias veces
seguidas, o si conviene conservar cada paso. Se implementa conservando todo, que es lo que hace hoy
para el marcado, y se revisa si el archivo resulta incómodo de leer.
