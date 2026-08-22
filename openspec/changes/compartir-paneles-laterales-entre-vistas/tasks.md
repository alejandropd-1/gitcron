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

## 4. La tarjeta con alto arrastrable

- [ ] 4.1 Hacer que el panel derecho tenga alto propio: sigue en su columna y sigue repartiendo el
  ancho con el contenido —no se superpone—, pero no llega al piso.
- [ ] 4.2 Agregar el arrastre de alto con el puntero, tomando como modelo `beginRelationsDrag` de
  `hooks/use-carto-layout.ts:57`: delta invertido si crece hacia arriba, acotado por un mínimo y un
  máximo declarados, y persistido. Declarar en el reporte los dos límites elegidos y su motivo.
- [ ] 4.3 Declarar si el alto se recuerda por repositorio o globalmente, y por qué. El ancho hoy es
  global; la preferencia de ramas especulativas es por repositorio.
- [ ] 4.4 Verificar que el arrastre de ancho sigue funcionando y que los dos ejes no se interfieren.
- [ ] 4.5 En tests, cubrir que el alto se acota entre sus límites, que se persiste y que se restituye.
  Afirmar sobre el valor guardado, no sobre el estilo aplicado.
- [ ] 4.6 Revisión visual: arrastrar el alto y el ancho, cerrar y reabrir la aplicación, y comprobar
  que el panel vuelve como quedó. **La comprueba Alejandro.**

## 5. El cuerpo de SDD

- [x] 5.1 Retirar del cuerpo de SDD las columnas cuya función pasó a los lugares de panel del
  armazón, según lo decidido en 1.3. Queda el contenido central.
- [ ] 5.2 Retirar las líneas divisorias del cuerpo, conforme al requisito vigente de que la
  separación se dé por fondo y espacio. Conservar las que comunican dato y no estructura —como el
  borde que señala estado de un archivo—, enumerando en el reporte cuáles se conservaron y por qué.
- [ ] 5.3 **No tocar los tokens `--os-*`.** Los resuelve `unificar-paleta-carbon-soul`. Contarlos y
  declararlos sin corregirlos.
- [ ] 5.4 En tests, extender la verificación de bordes que ya existe para que alcance al cuerpo de
  SDD, con las excepciones de 5.2 declaradas explícitamente en el test.
- [ ] 5.5 Informar cuántas líneas quedó más corta la hoja de estilos y cuántos bordes se retiraron.
- [x] 5.6 Revisión visual: el cuerpo de SDD se lee sin líneas y con aire, y nada quedó suelto ni
  amontonado. **La comprueba Alejandro.**

## 5bis. Conectar el flujo de commit que ya existe con la vista que lo necesita

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

- [ ] 5bis.1 Hacer que el panel derecho monte el flujo de commit existente —el de
  `components/StagingPanel.tsx`, con su campo de mensaje y su botón de confirmar— cuando la
  preparación está abierta en la vista del ciclo de especificación. Es una condición de render más
  sobre una pieza que ya funciona: NO escribas un panel nuevo. Si te parece que hace falta uno,
  frená y reportá.
- [ ] 5bis.2 El centro conserva la elección del alcance y la redacción del mensaje. La preparación
  NO se muda al lugar derecho: es superficie de trabajo, necesita ancho, y el lugar derecho pasa a
  ser una tarjeta de alto acotado.
- [ ] 5bis.3 Llevar la bitácora de redacción del modelo al flujo de commit común, visible cuando hay
  una redacción en curso y sin ocupar lugar cuando no la hay, como ya se comporta. El grafo gana lo
  que sólo tenía la otra vista.
- [ ] 5bis.4 Mostrar la rama destino también en el flujo del grafo. Un commit lo definen los
  archivos, el mensaje y la rama; hoy sólo una de las dos vistas declara las tres.
- [ ] 5bis.5 **No llevar a la vista del ciclo** quitar del stage, descartar, enmendar ni combinar.
  Operan sobre el árbol de trabajo y no sobre un change: ahí sí duplicarían superficie. Declararlo en
  el reporte como decisión, no omitirlo en silencio.
- [ ] 5bis.6 Actualizar el comentario de `OpenSpecDashboard.tsx` que declara «este panel no ejecuta
  ninguna operación de Git». Dejó de ser cierto cuando se le agregó la preparación: `stageFiles` lo
  es.
- [ ] 5bis.7 En tests, cubrir los cuatro estados del panel derecho y que confirmar desde la vista del
  ciclo invoca lo mismo que confirmar desde el grafo. Afirmar sobre el llamado, no sobre el render.
- [ ] 5bis.8 Revisión visual: terminar una tarea, preparar, y confirmar el commit sin cambiar de
  vista; y comprobar que el flujo libre del grafo sigue intacto. **La comprueba Alejandro.**

## 5ter. La información de SDD se remaqueta

Pendiente declarado por Alejandro el 2026-08-22, posterior al retiro de las columnas: con el cuerpo
en una sola pista hay que revisar cómo se presenta lo que quedó, no sólo dónde. Se planifica cuando
la fase 5 esté puesta y se pueda ver el resultado.

- [ ] 5ter.1 Relevar, con el cuerpo ya en una sola pista, qué secciones quedaron y en qué orden se
  leen. Declarar cuáles compiten por atención y cuáles quedaron sin jerarquía.
- [ ] 5ter.2 Proponer la disposición nueva sobre lo relevado, sin implementarla. **La decide
  Alejandro.**
- [ ] 5ter.3 Hacer que la navegación de SDD en el panel lateral use la misma sección plegable que el
  resto del lateral, la que hoy presenta ramas, remotos, solicitudes de incorporación y etiquetas:
  mismo tamaño de subtítulo, control de plegado a la izquierda y contador a la derecha. Hoy usa
  diecisiete clases de la hoja de estilos de la vista, así que sus secciones no se pliegan, no llevan
  control y pegan el contador al título.
  Es el mismo patrón que este change viene corrigiendo: el contenido se mudó y se llevó puesto el
  estilo del lugar de donde venía en vez de adoptar el del lugar donde ahora vive.
- [ ] 5ter.4 Verificar que las secciones de SDD recuerdan si quedaron abiertas o cerradas, con el
  mismo mecanismo por repositorio que ya usan las del lateral.
- [ ] 5ter.5 En tests, cubrir que la navegación de SDD monta la misma sección plegable que el resto
  del lateral y que se pliega al accionarla. Afirmar sobre el llamado y sobre el DOM montado.
- [ ] 5ter.6 Revisión visual: las secciones de SDD y las de Graph se ven y se comportan igual.
  **La comprueba Alejandro.**

## 6. Cierre y validación

- [x] 6.0 `pnpm build` sin errores. Se agrega el 2026-08-22 porque un selector rechazado por el
  compilador de hojas de estilo dejó la aplicación sin arrancar mientras las 1452 pruebas daban en
  verde: la suite no procesa los módulos de estilo con el compilador de producción, así que ninguna
  cantidad de pruebas verdes dice que la aplicación levanta.
- [ ] 6.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 6.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada
  una.
- [ ] 6.3 `openspec validate compartir-paneles-laterales-entre-vistas --strict` en cero.
- [ ] 6.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en
  Git.
- [ ] 6.5 Informar si en alguna fase hizo falta tocar `components/ChronometricGraph.tsx`. Si hizo
  falta y se frenó, declarar en qué punto y qué se necesitaba: la autorización del invariante 12 se
  pide entonces, acotada y con fecha, y no antes.
- [ ] 6.6 Revisión visual y funcional completa: los dos paneles se comportan igual en todas las
  vistas, cada uno muestra lo que corresponde, el alto y el ancho se arrastran y se recuerdan, y el
  lienzo cronométrico sigue legible. **La marca Alejandro.**
