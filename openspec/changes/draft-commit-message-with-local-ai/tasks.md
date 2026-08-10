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
- [ ] 4.26 El log en el rail derecho, que hoy no muestra nada durante la redacción.
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

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [x] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 6.4 `openspec validate draft-commit-message-with-local-ai --strict` válido
- [x] 6.5 Reporte en `docs/reports/`, con las mediciones y la calidad de 1.9
- [ ] 6.6 Ale valida que ningún mensaje redactado se lea como verificado por la aplicación
