## 1. Base y sondas

- [x] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Ruta A descartada por medición: cada commit cubre entre 7 y 15 tareas —3/30, 2/25, 4/22—, así
      que nombrar una sola tarea es precisión falsa
- [x] 1.3 Ruta B descartada por medición: los tres commits reales tocan todas las secciones de
      `tasks.md`, así que nombrarlas no discrimina nada
- [x] 1.4 Comprobado con un commit real: gemma-4-12b devolvió
      `feat(pipeline): implementar la atribución de archivos a cambios`, acertando el tipo
- [x] 1.5 Medido: 4.649 tokens de prompt para 12k caracteres de diff; 25–47 s con un 12B; un 27B con
      razonamiento superó los 240 s y hubo que abortarlo
- [x] 1.6 Medido: con 200 y con 1.200 tokens de techo la respuesta llega vacía con `finish_reason=length`
      por el razonamiento. Con 3.000 sale el contenido. `enable_thinking: false` fue ignorado
- [x] 1.7 Medido: `loaded_context_length` (65536, 69120) no es `max_context_length` (262144). Y con LM
      Link el catálogo mezcla dispositivos: casi todo vive en `Ale-CasaNew`
- [x] 1.8 **Corregido con los logs del servidor que pasó Ale.** Existe `POST /api/v1/models/load`, acepta
      `{model, context_length}` y cargó gemma-4-12b con 65.536 en 11 s. El camino por CLI se retira: no
      llega a la máquina remota, devuelve códigos ANSI y depende de que `lms` esté instalado
- [x] 1.9 Medida la calidad con dos modelos y tres commits. gemma-4-12b acierta el tipo en los dos que
      contesta y falla en el archivado —donde la sugerencia determinista ya es correcta—; qwen3.5-9b no
      contesta con techo 3.000 y con 8.000 tarda 98 s y erra el tipo. La tabla está en `design.md`

## 2. Proveedor local

- [x] 2.1 Proveedor con endpoint configurable, hermano del de Cartografía, que hoy tiene `localhost:1234`
      escrito en el código
- [x] 2.2 Leer el catálogo con estado, contexto cargado y dispositivo por modelo
- [x] 2.3 Distinguir `loaded_context_length` de `max_context_length` en el tipo, no sólo en la vista
- [x] 2.4 Tratar `finish_reason=length` sin contenido como «no contestó», con su propio resultado
- [x] 2.5 Que el servidor caído degrade con un motivo legible y no con una excepción cruda
- [x] 2.6 Cargar un modelo por HTTP con el contexto pedido, validando la clave contra el catálogo antes
- [x] 2.7 Declarar el costo desde el propio catálogo: `size_bytes` es el mismo número que estimaba el CLI

## 3. Composición del pedido

- [x] 3.1 Armar la entrada con el diff de lo elegido, el cambio, su intención y las tareas cerradas
- [x] 3.2 Acotar el diff al presupuesto del contexto cargado, declarando cuando se recorta
- [x] 3.3 Presupuesto de tokens que contemple el razonamiento, con el número medido como piso
- [x] 3.4 Que la respuesta se valide contra la forma esperada —una línea, prefijo convencional— y que una
      respuesta que no la cumpla no se imponga en el campo

## 4. Panel

- [x] 4.1 Selector de modelo con estado y contexto a la vista, sin nada preseleccionado y uniendo el mismo
      modelo repetido por dispositivo, que con LM Link llega dos veces con la misma clave
- [x] 4.2 Acción explícita para redactar, con estado visible y cancelación
- [x] 4.3 Rotular el mensaje como redactado por el modelo, nombrándolo
- [x] 4.4 Comprobar que no pisa lo que una persona escribió
- [x] 4.5 Declarar el contexto insuficiente antes de intentar la redacción
- [x] 4.6 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`
- [x] 4.7 La espera se llena con frases que rotan, como ya hace el Agente Temporal. Extraer **el
      mecanismo** a un hook compartido: hoy vive dentro de `TemporalAgentSettings.tsx` y copiarlo dejaría
      dos ciclos iguales que se separan con el primer arreglo
- [x] 4.8 Vocabulario propio para este caso, en los tres idiomas. Las del Agente Temporal hablan de
      predecir futuros y ramas especulativas; acá se está leyendo un diff
- [x] 4.9 Fundido de entrada y salida, y que `prefers-reduced-motion` lo apague sin perder el texto
- [x] 4.10 Que la rotación se corte al llegar la respuesta, y que las frases no queden nunca en el campo:
      son un estado de espera, no un valor
- [x] 4.11 Ofrecer cargar el modelo desde el panel cuando no lo está. Ale lo encontró validando: el aviso
      de contexto insuficiente era un callejón sin salida, con `commit-ai:load` construido y sin conectar
- [x] 4.12 Las características del modelo elegido como lista, una por línea —estado, tamaño, parámetros,
      contexto y si razona—. Ale lo pidió viendo un párrafo con seis datos adentro y caracteres ANSI
- [x] 4.13 **Retirado del alcance.** Declarar en qué máquina vive cada modelo exige el CLI —el dato no
      está en HTTP ni siquiera en las instancias cargadas— y el CLI se degrada: medido, 1,7 s / 9,2 s /
      37,8 s en tres corridas seguidas, tirando abajo el propio HTTP por timeout y trabando la notebook
      de Ale. La función no vale ese precio. El pedido y el motivo del retiro quedan en `design.md`
- [x] 4.14 Las frases de espera van debajo del campo, no encima: con el campo vacío se leían encimadas
      con el texto de ayuda
- [x] 4.15 El motivo del servidor se muestra sin el JSON alrededor
- [x] 4.17 Que el servidor desaloje el modelo solo tras media hora sin uso, con `ttl_seconds` en la carga.
      Ale preguntó si no se podían sacar al terminar la consulta: esto es mejor, porque dos mensajes
      seguidos reusan el modelo y no pagan los 11 s de recarga. Comprobado contra el servidor, que
      devuelve `ttl_seconds: 1800` en la respuesta
- [x] 4.16 Descargar la instancia anterior al cargar otra. Cargar dos veces las apilaba y Ale terminó con
      dos modelos de 7 GB tomados a la vez. Se libera **sólo lo que cargó la aplicación**: desalojar una
      instancia que él levantó a mano para otra cosa sería peor que el problema

- [x] 4.18 La frase de espera vive en su propio componente. Medido descartando a LM Studio: durante una
      carga de 8,8 s el lado de la notebook consume ~5 s de CPU repartidos y la memoria libre no se mueve
      —6,66 a 6,9 GB—, porque el modelo se carga en la otra máquina. El costo era nuestro: el temporizador
      vivía en `OpenSpecDashboard` y cada 2,8 s re-renderizaba el panel entero durante 40 segundos
- [x] 4.19 Cancelar corta la petición de verdad, abortándola en el proceso principal. La versión anterior
      sólo descartaba la respuesta y el modelo seguía trabajando: un control que dice cancelar y no
      cancela es peor que no tenerlo
- [x] 4.20 No apilar instancias: comprobado que cargar un modelo ya cargado devuelve `instance_id: '…:2'`
      en vez de reemplazar. Si ya está con contexto suficiente no se recarga, y si está con uno menor se
      descarta esa instancia antes de pedir otra

- [x] 4.21 Contexto y minutos de inactividad configurables **antes** de cargar: los dos se fijan en la
      carga y no se pueden cambiar después. El TTL es lo que hace que el modelo se cierre solo, y media
      hora es un punto de partida, no una imposición

- [x] 4.22 Seis defectos encontrados por un análisis multiagente, corregidos: cancelar corta también la
      carga —que era incancelable—; una carga a la vez por servidor; todas las peticiones con techo de
      tiempo, porque `LOCAL_TIMEOUT_MS` estaba declarado y sin usar en ningún lado; no se desaloja lo que
      la persona cargó a mano; un asunto sin la forma convencional se muestra en vez de tirarse como «no
      contestó»; y cerrar el panel corta lo que esté en vuelo

- [x] 4.23 Partir `aiBusy` en fases —quieta, cargando, redactando—. Ale marcó que las frases de espera
      arrancaban durante la carga: era un solo booleano para dos operaciones distintas
- [x] 4.24 Contador de segundos y barra indeterminada durante la carga, en un componente propio con su
      temporizador. «Me gustaría estar un poco más enterado de lo que está pasando», dijo Ale
- [x] 4.28 Los dos estados de la IA agrupados en un contenedor propio. Sueltos peleaban con los márgenes
      negativos de sus vecinos y la barra quedaba encimada con el borde del desplegable. Ale lo marcó
- [x] 4.29 Descargar el modelo a mano desde el panel. GitCron tomaba 7 GB de la placa y no daba ninguna
      salida salvo esperar el TTL o ir a LM Studio. Ale lo pidió
- [x] 4.30 «Sacar el modelo» en vez de «Descargar», con icono de apagado. En castellano «descargar» se lee
      primero como bajar de internet, que es lo contrario de lo que hace. Ale lo marcó
- [x] 4.31 Los campos numéricos a la altura de los botones, con caja propia y sin las flechitas del
      spinner. Eran una línea baja al lado de controles de 2,65rem y la fila quedaba desprolija
- [x] 4.32 En qué máquina vive cada modelo, por el WebSocket del propio servidor. Medido: 42 ms contra los
      1,7–37,8 s del CLI que se retiró por costoso, con el mismo resultado —13 remotos y 3 locales—. Sin
      credenciales: comprobado que el handshake pasa con la contraseña vacía
- [x] 4.33 El nombre de la máquina —«Ale-CasaNew»— y no el identificador crudo. El WebSocket no lo trae:
      se barrieron cinco canales y treinta nombres de RPC. Lo da `lms link status --json`, que **solo**
      cuesta 300–700 ms medidos —el caro era `lms ls`, que ya no hace falta porque el mapeo lo da el
      WebSocket—, y se guarda en disco porque el nombre de una computadora no cambia
- [x] 4.25 Barra de progreso **real** durante la carga: los diseños encontraron que el servidor expone la
      fracción por WebSocket (0 → 0,376 → 1). Sin consumir todavía; hoy la barra es indeterminada, y
      fingir una fracción que no se midió sería inventar
- [x] 4.26 El log en el rail derecho, que hoy no muestra nada durante la redacción.
      **Verificado: `diagnostics.streamLogs` existe** —el rechazo inicial era de forma,
      `creationParameter: Expected void, received object`, no un endpoint inexistente—, **pero exige un
      permiso que un cliente anónimo no tiene**: «the client does not have the required permission
      `diagnostics.streamLogs`». Obtenerlo obliga a leer la clave local de LM Studio, y eso es una
      decisión de Ale sobre manejo de credenciales.
      La alternativa sin credencial es pedir nuestra propia redacción con `stream: true` y mostrar el
      razonamiento del modelo según llega — que además es lo que Ale describió querer ver, y no el log
      HTTP del servidor.
      **Verificado el 2026-08-09**: la redacción con `stream: true` devuelve `text/event-stream` y
      produjo **308 cuadros en 6,9 s, 278 de ellos de razonamiento** y 28 de contenido, más el cuadro
      final de `usage` con `reasoning_tokens: 278`. Lo que se ve pensar al modelo es la mayor parte del
      stream. Los ~45 cuadros por segundo obligan a agrupar antes de cruzar el IPC
- [x] 4.34 El proveedor transmite: lector de SSE puro y probado con cuadros grabados, y `draftCommitSubject`
      avisa lo que llega ya agrupado por tipo. El resultado final es idéntico al de la respuesta única
      —`parseDraftResponse` no se tocó—, y un servidor que no transmite se lee como antes
- [x] 4.27 Volver a mostrar de qué máquina es cada modelo, sin el costo que obligó a retirarlo

- [x] 4.35 Contexto y TTL se muestran siempre, inertes con el modelo ya cargado, con el motivo en el
      tooltip. Antes desaparecían al cargar y Ale los vio irse sin explicación: los dos se fijan **en la**
      **carga**, así que dejarlos editables sería mentir y esconderlos deja sin ver con qué valores quedó.
      Para cambiarlos hay que sacar el modelo, y ese botón está al lado

- [x] 4.36 La otra mitad de 4.26: los pedazos cruzan el IPC por `commit-ai:chunk` con ventana de
      agrupado de 120 ms (`electron/ai/commit-message/chunk-pump.ts`), el estado vive **fuera de React**
      en `lib/commit-draft-log.ts` y el rail lo lee con `useSyncExternalStore` desde
      `components/pipeline/CommitDraftLog.tsx`. Está afuera de React por lo medido en 4.18, no por
      estilo: con el estado en el panel, ocho avisos por segundo son ocho re-renderizados por segundo
      del árbol entero. Cada redacción lleva su propia marca, así que lo que quede en vuelo de una
      corrida cancelada no se mezcla con la nueva
- [x] 4.37 Medido en la notebook de Ale contra `google/gemma-4-e4b`, y **no reproduce los 45 cuadros
      por segundo** de `Ale-CasaNew`: 23 cuadros en 31,4 s, o sea **0,7 por segundo**, con 0 de
      razonamiento y 22 tokens de contenido; la carga tardó **29,8 s** contra los 8,8–11 s medidos por
      HTTP en la otra máquina. La ventana de agrupado no aporta nada acá —23 cuadros quedan en 12
      avisos— porque el cuello es la generación por CPU. No se retira: es un techo, no un piso, y en la
      máquina rápida es donde hacía falta. Lo que sí cambia es qué se ve: sin razonamiento, el rail
      muestra la respuesta construyéndose token a token durante esos 31 s

- [x] 4.38 **Un fallo del servidor deja de leerse como «no contestó».** La petición contesta 200 con
      `text/event-stream` y el error llega **adentro** del stream, así que no lo delata el código HTTP:
      el cuadro se descartaba por no tener `choices`, el stream terminaba vacío y `parseDraftResponse`
      lo clasificaba como «no contestó», que manda a probar otro modelo. Ahora hay un cuadro de tipo
      `error` y el motivo del servidor se devuelve tal cual
- [x] 4.39 Medido en la notebook de Ale, y es el caso que destapó 4.38: con 65.536 de contexto cargado
      y los 16 archivos elegidos —prompt de **4.199 tokens**, procesado a 75 tokens/s— la iGPU Intel
      Iris Xe se cayó a los 46 s con `vk::Device::getFenceStatus: ErrorDeviceLost`, y la aplicación
      informó «no devolvió un asunto utilizable». El fallo es de la placa, no del modelo; la salida es
      mandar menos archivos o bajar el contexto
- [x] 4.40 **El piso de contexto baja de 32.768 a 16.384**, y las dos constantes se mudan a
      `types/commit-message-ai.ts` para que el panel las lea sin duplicarlas —escritas a mano en los
      dos lados, cambiar una dejaba a la otra mintiendo—. El 32.768 no salía de ninguna medición: el
      prompt más grande medido son 4.649 tokens, y con 16.384 quedan más de 13.000 para la entrada
      después de reservar los 3.000 de salida. El piso alto impedía bajar el contexto, que es
      justamente lo que hace falta cuando la placa no aguanta. Decisión de Ale, tomada con el número
      de 4.39 a la vista
- [x] 4.41 **El botón de cargar explica qué falta en vez de apagarse mudo.** Ale bajó el contexto a
      16.328, quedó bajo el piso y el botón se puso gris sin decir nada: es el tercer caso del mismo
      patrón que él ya marcó dos veces —los campos que desaparecían, el botón de redactar apagado—.
      Ahora queda apretable, con el motivo debajo y en el tooltip; `confirmAiLoad` es quien corta
- [x] 4.42 El estado del modelo declara el contexto **elegido** y no un número escrito a mano: decía
      «se va a cargar con 65536» mientras el campo de al lado mostraba 16.328. Ale lo vio en pantalla
- [x] 4.43 Contexto, minutos y el botón de cargar quedan juntos: la acción pegada al selector y los
      dos números debajo. Estaban partidos en dos filas por el acomodo y no por criterio —el contexto
      arriba a la derecha, lejos de sus dos compañeros—, siendo que los tres son de la misma operación.
      Ale lo pidió señalando las dos posiciones
- [x] 4.44 Las frases de espera se mudan al rail, donde ocupan el lugar en el que después aparece el
      texto real. Ale lo propuso viendo que decían lo mismo que el rail ya decía con «Todavía no llegó
      nada»: dos avisos de lo mismo en dos lugares. **El contador de segundos se queda en el centro**
      a propósito, porque el rail sólo existe con la columna derecha abierta y con ella cerrada el
      contador es lo único que informa que algo está pasando
- [x] 4.45 El rail muestra el fallo del servidor, arriba de todo y en ámbar: antes quedaba en «Todavía
      no llegó nada / terminó», acompañando la mentira de 4.38. El motivo va sin suavizar porque
      «ErrorDeviceLost» es la única pista con la que se puede buscar el problema

- [x] 4.46 «Sacar el modelo» pasa a ser un botón de sólo ícono, cuadrado de 2,65rem, con el símbolo de
      expulsar y el nombre «Eject» —el gesto y el rótulo son los de LM Studio, de donde viene—. Con el
      rótulo entero competía en peso con la acción principal, siendo que es la salida y no lo que se
      viene a hacer. El símbolo se dibuja a mano: se comprobó que `lucide-react` no trae ninguno
      equivalente, y no vale sumar una dependencia por un ícono. El nombre queda en `aria-label` y en
      el tooltip, porque un botón de sólo ícono sin nombre accesible no existe para un lector de
      pantalla. Ale lo pidió señalando el botón de LM Studio
- [x] 4.47 La acción —«Redactar con IA» o «Cargar el modelo»— sube junto al selector, y los dos números
      quedan debajo. Ale marcó las dos posiciones sobre la captura
- [x] 4.48 El bloque del rail crece con lo que tiene adentro en vez de llevarse todo el alto sobrante:
      tenía `flex: 1` con un piso de 8rem, y con un modelo que no razona —el caso medido, 0 de 23
      cuadros— quedaba un hueco enorme debajo de dos líneas. El razonamiento sólo se dibuja si llegó
      algo, y su techo son 24rem con desplazamiento propio. Ale lo marcó como «verticalidad al pedo»

- [x] 4.49 El estado del modelo declara **también** los minutos elegidos: decía «se libera solo tras
      media hora sin uso» con el campo puesto en 5. Es el mismo defecto que 4.42 en la otra mitad de la
      misma frase —un valor escrito a mano dentro de una promesa sobre lo que va a hacer—, y Ale lo vio
      igual que el anterior
- [x] 4.50 El motivo del servidor se acompaña de **qué pasó y qué hacer, en castellano llano**
      (`lib/stream-error-advice.ts`). «decode() failed: vk::Device::getFenceStatus: ErrorDeviceLost» es
      exacto y no le dice a nadie qué hacer; ahora arriba se lee que se cayó la placa y que hay que
      elegir menos archivos o bajar el contexto. El técnico **no se reemplaza**: es la única pista con
      la que se puede buscar en el registro de LM Studio. Se reconocen cuatro familias —placa caída,
      sin memoria, conexión cortada, contexto insuficiente— y **un error desconocido no recibe consejo
      inventado**, porque mandar a hacer algo que no tiene que ver es peor que no decir nada. Ale lo
      pidió: «tendría que decir coloquialmente qué pasó, para que alguien como yo pueda entender qué
      hacer»
- [x] 4.51 El aviso del centro deja de volcar el JSON crudo de LM Studio y muestra el consejo. El
      motivo técnico completo queda en el rail, que es donde se lo va a buscar

- [x] 4.52 El aviso de la redacción se muda al rail: en el centro decía lo mismo que el rail ya cuenta,
      a dos columnas de distancia, y Ale lo marcó viendo el error repetido en las dos. **Con la columna
      derecha cerrada vuelve al centro**, y eso no es una comodidad: «Lo escribió tal modelo, no la
      aplicación» es la rotulación de autoría de la tarea 6.6, y no puede desaparecer porque alguien
      haya plegado un panel
- [x] 4.53 Todo el sector de la IA queda encapsulado en un contenedor propio con fondo (`.aiPanel`), y
      cada grupo de archivos en el suyo (`.fileGroup`). Eran bloques sueltos separados sólo por líneas
      y por el orden: había que leerlos para saber cuáles iban juntos, y con dos o tres grupos de
      archivos eso obliga a rastrear qué explicación corresponde a qué lista. El fondo es **más claro**
      que el panel, no más oscuro, para que se lea como algo apoyado encima y no como un hueco. Ale lo
      pidió señalando los dos sectores

- [x] 4.54 El aviso general se calla cuando el fallo vino por el stream: los dos decían lo mismo uno
      encima del otro en el rail, y de los dos sobra el general porque el bloque del error trae además
      el motivo técnico. Ale los vio duplicados. Sigue apareciendo para todo lo demás —quién redactó,
      «no contestó», un fallo al cargar—, que nunca llega por ese camino
- [x] 4.55 El contador y la barra se mudan al hueco que dejan los dos números, dentro de la fila de la
      IA. Estaban en una línea propia arriba: aparecían de golpe al apretar el botón y empujaban el
      panel entero hacia abajo, justo en el momento en que se lo estaba mirando. La fila ya tiene su
      altura, así que ahora aparecer no mueve nada. Ale lo pidió señalando el hueco. De paso quedan
      retirados `.aiStatus` y el import de `DraftingThought` en el panel, que quedaron sin uso

## 5. Tests

- [x] 5.1 Prueba del proveedor con respuestas de tabla: contenido, vacío por `length`, servidor caído
- [x] 5.2 Prueba: la clave del modelo que no está en el catálogo no llega al proceso
- [x] 5.3 Prueba del panel: el mensaje redactado se muestra rotulado con el modelo
- [x] 5.4 Prueba del panel: lo escrito por una persona no se pisa
- [x] 5.5 Prueba: sin modelo disponible, la sugerencia es exactamente la de hoy
- [x] 5.6 Comprobar que sigue pasando `pipeline-prepare-commit.test.tsx` sin tocarlo
- [x] 5.7 Prueba del hook de frases: rota sin repetir la anterior y se detiene cuando termina la espera
- [x] 5.8 Prueba: una frase de espera nunca queda como mensaje del commit
- [x] 5.9 Prueba: con un modelo en disco se ofrece cargarlo, y no se carga sin declarar antes el costo
- [x] 5.10 Prueba: la instancia cargada se transporta para poder descargarla, y en disco no hay ninguna
- [x] 5.11 Prueba: el motivo del servidor se lee sin llaves ni comillas, y una forma rara no se inventa
- [x] 5.12 Prueba: la carga pide el desalojo por inactividad, con el nombre de parámetro comprobado
- [x] 5.13 Prueba: cancelar llama al canal que corta la petición, no sólo descarta la respuesta
- [x] 5.14 Prueba: toda petición del proveedor lleva señal, y la carga acepta la cancelación de quien llama
- [x] 5.15 Prueba: las frases no aparecen durante la carga y la barra no aparece durante la redacción
- [x] 5.16 Prueba: se ofrece descargar el modelo cargado, y no se ofrece con uno en disco
- [x] 5.17 Pruebas del índice de dispositivos: el identificador nulo es esta máquina, un modelo en las dos
      lleva las dos, y sin el dato no se dice «esta máquina» por omisión
- [x] 5.18 Prueba: con los nombres resueltos el desplegable dice «Ale-CasaNew», no el identificador

- [x] 5.19 Pruebas del lector de SSE: razonamiento y contenido, el cuadro de `usage` sin opciones, JSON
      partido entre dos lecturas, línea ilegible que se saltea y se cuenta, y el agrupado por tipo
- [x] 5.20 Prueba de contrato: el mismo contenido servido en pedazos da el mismo resultado que en una
      respuesta única, incluido el «no contestó» por presupuesto

- [x] 5.21 Pruebas de la ventana de agrupado (`electron/__tests__/commit-message-chunk-pump.test.ts`):
      nada se emite antes de que venza, los 45 cuadros por segundo medidos quedan en 8 avisos sin perder
      una letra, el temporizador no se reinicia con cada pedazo —si fuera un antirrebote no emitiría
      nunca—, vaciar manda lo pendiente y cortar lo descarta
- [x] 5.22 Pruebas del log (`lib/__tests__/commit-draft-log.test.ts`): razonamiento y respuesta se
      acumulan por separado, el recorte se declara y conserva lo último, lo rotulado con otra marca se
      descarta, y cada actualización entrega un objeto nuevo —`useSyncExternalStore` compara por
      identidad—
- [x] 5.23 Prueba del rail (`components/pipeline/__tests__/pipeline-commit-ai-log.test.tsx`): sin
      redacción no ocupa lugar, lo que llega se muestra, la respuesta va aparte del razonamiento, lo de
      una corrida vieja no se cuela, el conteo de tokens se ve, y cerrar el panel da de baja el canal

- [x] 5.24 Pruebas del cuadro de error (`electron/__tests__/commit-message-sse.test.ts`): un cuadro con
      `error.message` se reconoce en vez de descartarse, y dos errores seguidos no se funden en uno
      —el cierre y el error son eventos, no texto corrido—
- [x] 5.25 Pruebas del formulario y del rail (`pipeline-commit-ai-log.test.tsx`): con 16.328 aparece el
      motivo en vez de un botón mudo, con 16.384 no aparece nada, el estado declara el contexto elegido
      y no 65.536, y un `ErrorDeviceLost` se muestra tal cual en el rail

- [x] 5.26 Observado al cerrar: con la notebook cargada —Electron en desarrollo, LM Studio y el
      navegador abiertos— la suite falla por **contención**, no por aserción. Los síntomas son
      `[vitest-pool]: Failed to start forks worker` y tests que caen a los 5,1 s exactos, y varían de
      archivo en cada corrida. Con `pnpm exec vitest run --maxWorkers=2` pasa entera: **130 archivos /
      1014 tests**. Es el mismo flake ya conocido de los archivos que crean repositorios Git reales,
      pero disparado por la máquina y no por el archivo

- [x] 5.27 Pruebas del explicador (`lib/__tests__/stream-error-advice.test.ts`) con los mensajes
      **reales** del registro de LM Studio, crudos y envueltos en el JSON del motor: se reconocen las
      cuatro familias, y un motivo desconocido o vacío devuelve `null` en vez de un consejo inventado
- [x] 5.28 Prueba del rail: un `ErrorDeviceLost` muestra las dos cosas —el consejo y el motivo crudo—,
      y un error que no se reconoce muestra sólo el motivo. Prueba del estado: declara el contexto y
      los minutos elegidos, no valores escritos a mano

- [x] 5.29 Prueba de dónde vive el aviso: con el rail a la vista aparece **una sola vez** y no repetido
      en las dos columnas, y con la columna derecha cerrada sigue apareciendo en el centro. Lo segundo
      protege la rotulación de autoría de 6.6, que si no se perdería al plegar un panel

- [x] 5.30 Prueba de que el fallo del stream aparece **una sola vez**. Reproduce el caso completo: el
      error llega por el stream **y** la promesa termina en `unavailable` con el mismo motivo. La
      primera versión dejaba la promesa colgada, así que no había aviso y la prueba pasaba sin probar
      nada — se corrigió antes de darla por buena

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [x] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 6.4 `openspec validate draft-commit-message-with-local-ai --strict` válido
- [x] 6.5 Reporte en `docs/reports/`, con las mediciones y la calidad de 1.9
- [x] 6.6 Ale valida que ningún mensaje redactado se lea como verificado por la aplicación
