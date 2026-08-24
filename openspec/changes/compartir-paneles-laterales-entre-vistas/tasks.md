# Tareas

Las fases se envían por separado. Cada una se valida entera antes de pasar a la siguiente, y entre
fase y fase hay revisión visual de Alejandro.

## 1. Relevamiento

- [x] 1.1 Declarar, con archivo y línea, todo lo que hoy depende de `sidebarOpen` y de `detailsOpen`:
  qué abre cada uno en cada vista, y qué componentes lo consumen.
- [x] 1.2 Declarar qué muestra hoy cada una de las tres zonas del cuerpo de SDD —`navigator`,
  `center`, `inspector`— y qué muestra el panel derecho del grafo. Señalar qué contenido de SDD
  corresponde a cada uno de los dos lugares de panel del armazón.
- [x] 1.3 Responder la pregunta abierta del `design.md`: si la navegación entre changes de SDD
  convive con la navegación entre ramas del lateral izquierdo o si se funden. Declarar la propuesta
  con su motivo. **La decide Alejandro** sobre lo relevado, antes de la fase 4.
  **Decisión de Alejandro del 2026-08-22: se funden.** En la vista SDD, el panel lateral izquierdo
  del armazón muestra la navegación de esa vista —cambios activos, completados y especificaciones—
  en lugar de la lista de ramas. El lateral pasa a significar «la navegación de la vista activa» en
  toda la aplicación, y la columna `navigator` del dashboard se retira con su estado.
- [x] 1.4 Contar cuántas declaraciones de borde y cuántos tokens `--os-*` hay hoy en la hoja de
  estilos de SDD, para poder medir la fase 5 contra ese número.

## 2. Desacoplar el estado de los paneles

- [x] 2.1 Hacer que `sidebarOpen` y `detailsOpen` gobiernen únicamente los dos lugares de panel del
  armazón. Las columnas internas del dashboard dejan de depender de ellos.
- [x] 2.2 Verificar que plegar y desplegar cada panel produce el mismo efecto en todas las vistas, y
  que cambiar de vista no altera qué paneles están abiertos.
- [x] 2.3 En tests, cubrir que el estado de cada panel se conserva al pasar de una vista a otra, y
  que un panel plegado sigue plegado al volver. Afirmar sobre el estado, no sobre el render.
- [x] 2.4 Revisión visual: plegar y desplegar cada panel en Graph y en SDD, y comprobar que hacen lo
  mismo en las dos. **La comprueba Alejandro.**
- [x] 2.5 El estado propio que recibieron las columnas de SDD quedó sin ningún control que lo
  gobierne: `toggleLeft` y `toggleRight` no tienen consumidor, así que esas columnas ya no se pueden
  plegar desde la interfaz. Retirarlo cuando su contenido se mude a los lugares del armazón, que es
  lo que resuelve el caso de raíz. Mientras tanto, ninguna columna puede quedar sin control.

**Corrección de rumbo del 2026-08-22.** El grupo 2 se planteó dando estado propio a columnas que el
grupo 5 iba a retirar, y el resultado fue estado huérfano: persistido, pero sin control que lo
accione. La secuencia correcta es mudar el contenido primero —el grupo 3— y retirar la columna con su
estado después. El grupo 3 pasa a ejecutarse antes de completar el 2.

## 3. El lugar derecho recibe contenido de las dos vistas

- [x] 3.1 Hacer que el lugar derecho del armazón sea una sola pieza que cada vista puebla: el grafo
  con el detalle del commit o la preparación del árbol, SDD con su actividad y sus herramientas.
- [x] 3.2 Retirar el forzado a `false` del panel de detalles en la vista SDD
  (`app/page.tsx:1721`), que existía porque no había contenido para ese lugar.
- [x] 3.3 Conservar el comportamiento de cada contenido: el detalle del commit sigue cargando sus
  archivos al seleccionar, y el rail de SDD conserva sus dos pestañas y su recuento pendiente.
- [x] 3.4 En tests, cubrir que el lugar derecho monta la pieza común en las dos vistas y que cada una
  aporta su contenido. Afirmar sobre el llamado de lo que cada contenido dispara, no sobre el render.
- [x] 3.5 Revisión visual: el panel derecho muestra lo que corresponde en cada vista y conserva su
  ancho arrastrable. **La comprueba Alejandro.**

## 4. El panel derecho como lista de secciones

Reemplaza a la fase que planteaba una tarjeta con alto arrastrable. El análisis que la motiva está en
`design.md`, sección «El panel derecho como lista de secciones, no como estados excluyentes»:
**leerlo antes de empezar.**

Los cuatro estados del panel contienen bloques con título y contenido, que es la forma de la sección
plegable de `components/RepoSidebarParts.tsx:32` —la misma que la fase 7 llevó al lateral—. Pasando
de estados excluyentes a lista de secciones se resuelven de una vez el acumulado de funciones, el
alto, la bitácora que empuja, y la clase de defecto que produjo el estado duplicado de la
preparación.

**Corrección de rumbo del 2026-08-24.** El relevamiento previo al rediseño encontró tres defectos que
hay que resolver antes de mover nada: uno de los cuatro estados dejó de alcanzarse en producción
cuando la fase 6 conectó el flujo de commit, el aviso de autoría de la redacción dejó de llegar con
el panel derecho cerrado, y ese aviso quedó guardado en dos lugares. Migrar a secciones un estado que
no corre sería migrar código muerto, así que las tres correcciones entran como 4.1, 4.2 y 4.3, y el
rediseño empieza en 4.4.

- [x] 4.1 Retirar del inspector el estado que producción ya no alcanza.
  `OpenSpecInspector.tsx:213` devuelve la lista de archivos preparados y la bitácora cuando la
  preparación está abierta, pero el único que lo monta —`RepoDetailsPanel.tsx:100`— lo hace con la
  condición contraria: con la preparación abierta el lugar derecho lo ocupa `StagingPanel`, y la
  bitácora sale por `StagingPanel.tsx:199`. Retirar también lo que quede huérfano, incluida la regla
  `.stagedList` de la hoja de estilos. Las dos pruebas que lo sostienen afirman sobre un camino que
  no corre: una pasa el estado como prop, la otra compone dos piezas que producción nunca compone
  juntas.
- [x] 4.2 Devolver la rotulación de autoría al camino que corre. `OpenSpecDashboard.tsx:2023` la
  presenta en el centro sólo con el panel derecho cerrado, pero `app/page.tsx:1674` dejó de pasar ese
  dato y el valor por omisión de `PipelineWorkspace.tsx:61` lo fija en abierto: hoy no se presenta
  nunca, y con el panel cerrado el aviso no está en ningún lado. Es la única declaración de que el
  mensaje lo escribió un modelo y no la aplicación.
- [x] 4.3 Dejar una sola copia del aviso de la redacción. `OpenSpecDashboard.tsx:656` lo guarda en un
  estado local y en el store a la vez. Es la forma exacta del defecto de `prepareOpen` que este
  change ya corrigió, con la suerte de tener un solo punto de escritura. Se elimina la copia local;
  no se sincronizan dos estados con un efecto.
- [ ] 4.4 Relevar qué bloques compone hoy cada uno de los estados del panel derecho, con archivo y
  línea, y proponer con qué sección se corresponde cada uno. Declararlo antes de mover nada.
- [ ] 4.5 Hacer que el panel derecho presente sus contenidos como secciones plegables, con la misma
  pieza que usa el panel lateral. NO escribir una pieza nueva ni una variante: si parece hacer falta,
  frenar y reportar.
- [ ] 4.6 Qué secciones existen lo decide la circunstancia; cuáles están abiertas lo decide quien usa
  la aplicación, y se recuerda por repositorio con el mecanismo que ya existe. Ese mecanismo
  —`hooks/use-sidebar-section-state.ts`— guarda hoy sólo los identificadores abiertos, así que todo
  lo que no figura arranca plegado. Se extiende para admitir secciones abiertas por omisión, leyendo
  el formato ya guardado; NO se escribe un segundo mecanismo.
- [ ] 4.7 La bitácora de redacción del modelo pasa a ser una sección más, plegable. Deja de tener
  tope de alto propio: el que aporta es el de su contenido, y el panel desplaza.
- [ ] 4.8 Conservar lo que cada bloque hace hoy: el detalle del commit carga sus archivos al
  seleccionar, el rail conserva su recuento pendiente, y el flujo de commit conserva su condición
  sobre el árbol y su acción de confirmar. La caja de commit del detalle del commit
  (`RepoDetailsPanel.tsx:236`) y la del árbol de trabajo (`StagingPanel.tsx:217`) habilitan confirmar
  con condiciones distintas —la primera no exige nada preparado—. Al quedar una sola sección de
  confirmar, declarar con qué condición quedó y por qué.
- [ ] 4.9 En tests, cubrir que el panel monta la misma sección plegable que el lateral, que las
  secciones se pliegan y lo recuerdan, y que las de cada vista son las que corresponden. Afirmar
  sobre el DOM montado y sobre el llamado.
- [ ] 4.10 Decidir qué queda del alto arrastrable con el panel ya hecho: si el panel no llega al piso
  y su alto se arrastra, o si el desplazamiento de la lista lo vuelve innecesario. **La decide
  Alejandro** con el rediseño a la vista.
- [ ] 4.11 Revisión visual: el panel acumula sus secciones, se pliegan las que no interesan, y
  ninguna empuja a las demás fuera de vista. **La comprueba Alejandro.**

## 5. El cuerpo de SDD

- [x] 5.1 Retirar del cuerpo de SDD las columnas cuya función pasó a los lugares de panel del
  armazón, según lo decidido en 1.3. Queda el contenido central.
- [x] 5.2 Retirar las líneas divisorias del cuerpo, conforme al requisito vigente de que la
  separación se dé por fondo y espacio. Conservar las que comunican dato y no estructura —como el
  borde que señala estado de un archivo—, enumerando en el reporte cuáles se conservaron y por qué.
- [x] 5.3 **No tocar los tokens `--os-*`.** Los resuelve `unificar-paleta-carbon-soul`. Contarlos y
  declararlos sin corregirlos.
- [x] 5.4 En tests, extender la verificación de bordes que ya existe para que alcance al cuerpo de
  SDD, con las excepciones de 5.2 declaradas explícitamente en el test.
- [x] 5.5 Informar cuántas líneas quedó más corta la hoja de estilos y cuántos bordes se retiraron.
- [x] 5.6 Revisión visual: el cuerpo de SDD se lee sin líneas y con aire, y nada quedó suelto ni
  amontonado. **La comprueba Alejandro.**

## 6. Conectar el flujo de commit que ya existe con la vista que lo necesita

Surge de la observación de Alejandro del 2026-08-22: no es agregar una funcionalidad, es usar lo que
ya está.

Las dos piezas existen y funcionan. `components/RepoDetailsPanel.tsx:98` ya alterna su contenido
según la circunstancia —el inspector en la vista del ciclo de especificación, el detalle del commit
cuando hay uno elegido, la preparación del árbol cuando no—. Y el flujo de commit, con su campo de
mensaje y su botón de confirmar, ya vive en `components/StagingPanel.tsx`.

Lo único que falta es la conexión: con la preparación abierta en la vista del ciclo, ese lugar sigue
mostrando el inspector en vez del flujo de commit que ya existe, y por eso hay que cambiar de vista
para apretar un botón. No se construye una superficie nueva ni se duplica ninguna: se monta la que
está. El centro conserva la superficie de trabajo —elegir el alcance, redactar el mensaje— y el lugar
derecho recibe el resultado listo para confirmar.

Los dos flujos se conservan: la vista del ciclo commitea un change; el grafo commitea cambios
sueltos. Poder confirmar lo que uno quiera cuando uno quiera es una funcionalidad declarada, no un
residuo del otro camino.

- [x] 6.1 Hacer que el panel derecho monte el flujo de commit existente —el de
  `components/StagingPanel.tsx`, con su campo de mensaje y su botón de confirmar— cuando la
  preparación está abierta en la vista del ciclo de especificación. Es una condición de render más
  sobre una pieza que ya funciona: NO escribas un panel nuevo. Si te parece que hace falta uno,
  frená y reportá.
- [x] 6.2 El centro conserva la elección del alcance y la redacción del mensaje. La preparación
  NO se muda al lugar derecho: es superficie de trabajo, necesita ancho, y el lugar derecho pasa a
  ser una tarjeta de alto acotado.
- [x] 6.3 Llevar la bitácora de redacción del modelo al flujo de commit común, visible cuando hay
  una redacción en curso y sin ocupar lugar cuando no la hay, como ya se comporta. El grafo gana lo
  que sólo tenía la otra vista.
- [x] 6.4 Mostrar la rama destino también en el flujo del grafo. Un commit lo definen los
  archivos, el mensaje y la rama; hoy sólo una de las dos vistas declara las tres.
- [x] 6.5 **No llevar a la vista del ciclo** quitar del stage, descartar, enmendar ni combinar.
  Operan sobre el árbol de trabajo y no sobre un change: ahí sí duplicarían superficie. Declararlo en
  el reporte como decisión, no omitirlo en silencio.
- [x] 6.6 Actualizar el comentario de `OpenSpecDashboard.tsx` que declara «este panel no ejecuta
  ninguna operación de Git». Dejó de ser cierto cuando se le agregó la preparación: `stageFiles` lo
  es.
- [x] 6.7 En tests, cubrir los cuatro estados del panel derecho y que confirmar desde la vista del
  ciclo invoca lo mismo que confirmar desde el grafo. Afirmar sobre el llamado, no sobre el render.
- [x] 6.8 Revisión visual: terminar una tarea, preparar, y confirmar el commit sin cambiar de
  vista; y comprobar que el flujo libre del grafo sigue intacto. **La comprueba Alejandro.**

## 7. La información de SDD se remaqueta

Pendiente declarado por Alejandro el 2026-08-22, posterior al retiro de las columnas: con el cuerpo
en una sola pista hay que revisar cómo se presenta lo que quedó, no sólo dónde. Se planifica cuando
la fase 5 esté puesta y se pueda ver el resultado.

- [ ] 7.1 Relevar, con el cuerpo ya en una sola pista, qué secciones quedaron y en qué orden se
  leen. Declarar cuáles compiten por atención y cuáles quedaron sin jerarquía.
- [ ] 7.2 Proponer la disposición nueva sobre lo relevado, sin implementarla. **La decide
  Alejandro.**
- [x] 7.3 Hacer que la navegación de SDD en el panel lateral use la misma sección plegable que el
  resto del lateral, la que hoy presenta ramas, remotos, solicitudes de incorporación y etiquetas:
  mismo tamaño de subtítulo, control de plegado a la izquierda y contador a la derecha. Hoy usa
  diecisiete clases de la hoja de estilos de la vista, así que sus secciones no se pliegan, no llevan
  control y pegan el contador al título.
  Es el mismo patrón que este change viene corrigiendo: el contenido se mudó y se llevó puesto el
  estilo del lugar de donde venía en vez de adoptar el del lugar donde ahora vive.
- [x] 7.4 Verificar que las secciones de SDD recuerdan si quedaron abiertas o cerradas, con el
  mismo mecanismo por repositorio que ya usan las del lateral.
- [x] 7.5 En tests, cubrir que la navegación de SDD monta la misma sección plegable que el resto
  del lateral y que se pliega al accionarla. Afirmar sobre el llamado y sobre el DOM montado.
- [x] 7.6 Revisión visual: las secciones de SDD y las de Graph se ven y se comportan igual.
  **La comprueba Alejandro.**

## 8. La franja recibe lo que el cuerpo duplicaba

Decisiones de Alejandro del 2026-08-24, sobre lo que quedó tras retirar las columnas del cuerpo.

- [x] 8.1 Retirar el pie de evidencia del cuerpo de SDD (`OpenSpecDashboard.tsx:2589`). De sus tres
  datos, la rama actual y el estado del árbol ya están en la franja de identidad.
- [x] 8.2 Subir «Validación OpenSpec» a la franja de identidad, junto a la rama y al estado del
  árbol. NO se retira: ejecuta `openspec validate <changeId> --strict --no-interactive` sobre el
  cambio seleccionado —por eso informa «No aplica» cuando no hay ninguno— y es la única señal en la
  aplicación de si un cambio está bien formado.
- [x] 8.3 Retirar del cuerpo los contadores de especificaciones y tareas. El de especificaciones ya
  figura como contador de su sección en el panel lateral.
- [x] 8.4 Llevar el porcentaje global de tareas al panel lateral, como rótulo de columna con el
  valor a su derecha. En el grafo ese lugar dice «Ramas y referencias»; en la vista del ciclo está
  vacío.
- [x] 8.5 Subir la versión del motor de OpenSpec a la franja de identidad.
- [x] 8.6 En tests, cubrir que el pie ya no se monta, que la validación y la versión del motor están
  en la franja, y que el porcentaje está en el lateral. Afirmar sobre el DOM montado.
- [ ] 8.7 Revisión visual: nada quedó duplicado entre la franja y el cuerpo, y no se perdió ningún
  dato. **La comprueba Alejandro.**

## 9. Cierre y validación

- [x] 9.0 `pnpm build` sin errores. Se agrega el 2026-08-22 porque un selector rechazado por el
  compilador de hojas de estilo dejó la aplicación sin arrancar mientras las 1452 pruebas daban en
  verde: la suite no procesa los módulos de estilo con el compilador de producción, así que ninguna
  cantidad de pruebas verdes dice que la aplicación levanta.
- [ ] 9.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 9.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada
  una.
- [ ] 9.3 `openspec validate compartir-paneles-laterales-entre-vistas --strict` en cero.
- [ ] 9.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en
  Git.
- [ ] 9.5 Informar si en alguna fase hizo falta tocar `components/ChronometricGraph.tsx`. Si hizo
  falta y se frenó, declarar en qué punto y qué se necesitaba: la autorización del invariante 12 se
  pide entonces, acotada y con fecha, y no antes.
- [ ] 9.6 Revisión visual y funcional completa: los dos paneles se comportan igual en todas las
  vistas, cada uno muestra lo que corresponde, el alto y el ancho se arrastran y se recuerdan, y el
  lienzo cronométrico sigue legible. **La marca Alejandro.**
