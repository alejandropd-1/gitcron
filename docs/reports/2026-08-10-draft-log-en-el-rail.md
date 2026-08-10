# El pensamiento del modelo en el rail — tarea 4.26

**Fecha:** 2026-08-10 · **Change:** `draft-commit-message-with-local-ai` · **Rama:** `change/draft-commit-message-with-local-ai`

## Qué se cerró

La tarea 4.26 era lo último de producto que quedaba: durante los 25 a 98 segundos de una redacción,
el rail derecho no mostraba nada. La mitad de abajo ya estaba construida —el proveedor transmite por
SSE desde la tarea 4.34—, pero lo que llegaba moría en el proceso principal porque nadie lo cruzaba
al panel.

Se cerró la mitad visible con tres piezas:

**La ventana de agrupado** (`electron/ai/commit-message/chunk-pump.ts`). Los pedazos se acumulan 120
ms y se emiten juntos por `commit-ai:chunk`. El proveedor ya juntaba los contiguos dentro de cada
lectura del socket, pero eso no alcanza: una lectura puede traer un solo cuadro.

**El estado fuera de React** (`lib/commit-draft-log.ts`). No es una preferencia de estilo: está
medido en este mismo change que el temporizador de la espera, viviendo dentro de `OpenSpecDashboard`,
re-renderizaba el panel entero cada 2,8 segundos durante 40 segundos (tarea 4.18). Con el log en un
`useState` del panel serían ocho re-renderizados por segundo del árbol completo durante un minuto. Con
el store afuera y `useSyncExternalStore`, lo único que se vuelve a dibujar es el componente del log.

**El rail** (`components/pipeline/CommitDraftLog.tsx`). Va debajo de la lista de preparados y no en
otra solapa: durante una redacción esa lista está casi siempre vacía —es justo el caso de preparar el
primer commit— y esconder el log tras una solapa obligaría a ir a buscarlo.

Cada redacción lleva su propia marca, declarada por el renderer **antes** de pedir. Sin eso, cancelar
y volver a pedir mezclaba el pensamiento del stream muerto con el de la corrida nueva en el mismo
panel: los pedazos empiezan a llegar mientras la promesa del `invoke` todavía está esperando.

## La medición que contradice lo que se venía asumiendo

Verificado de punta a punta contra LM Studio **en la notebook de Ale** (`Ale-Book`), con
`google/gemma-4-e4b` —7.5B, 5,89 GB—, porque la PC de casa estaba apagada.

| Qué | En `Ale-CasaNew` (medido antes) | En la notebook (medido ahora) |
|---|---|---|
| Cuadros del stream | 308 en 6,9 s → **45/s** | 23 en 31,4 s → **0,7/s** |
| De ellos, razonamiento | 278 de 308 | **0 de 23** |
| Carga del modelo por HTTP | 8,8–11 s | **29,8 s** |
| Avisos con ventana de 120 ms | ~8/s | 12 en total |

**Los 45 cuadros por segundo no se reproducen en la notebook.** El cuello acá es la generación por
CPU, no el transporte. La ventana de agrupado no aporta nada en esta máquina —23 cuadros quedan en 12
avisos— y **no se retira**: es un techo, no un piso, y en la máquina rápida es donde hacía falta.

Lo que sí cambia es qué se ve. Sin razonamiento, el rail no muestra al modelo pensar: muestra la
respuesta construyéndose token a token durante esos 31 segundos. Sigue siendo mejor que una pantalla
quieta, pero es una experiencia distinta de la que se diseñó mirando los 278 cuadros de razonamiento
de la otra máquina. Conviene que Ale lo valide en las dos.

La redacción salió correcta y con el tipo acertado: `feat: Añadir canal IPC de progreso del modelo y
optimizar renderizado en el panel de borradores`.

## Verificación

- `pnpm exec tsc --noEmit` — **cero errores**.
- `pnpm exec eslint` sobre los doce archivos tocados — **limpio**.
- `openspec validate draft-commit-message-with-local-ai --strict` — **válido**.
- `pnpm test` — **130 archivos / 1006 tests, verde** en la primera corrida (base: 127/980).
- Segunda corrida: fallaron `git-hunks-ipc` y `git-ops-worktree-submodule`, los dos **flakes
  conocidos**. Corridos aislados, **9/9 pasan**. No son regresiones de esta tanda.

Los 26 tests nuevos cubren la ventana de agrupado (incluido que no sea un antirrebote, que con cuadros
cada 22 ms no emitiría nunca), el log (recorte declarado, marca de corrida, identidad del snapshot) y
el rail (que aparezca, que la respuesta vaya aparte, que lo viejo no se cuele, y que cerrar el panel dé
de baja el canal).

## Segunda vuelta: lo que encontró el QA de Ale

Validando en pantalla aparecieron cuatro defectos, tres de ellos del mismo patrón que ya había marcado
dos veces: **un control que se apaga sin decir por qué**.

**Un fallo del servidor se leía como «no contestó».** Es el más grave. La petición contesta 200 con
`text/event-stream` y el error llega *adentro* del stream, así que el código HTTP no lo delata: el
cuadro se descartaba por no tener `choices`, el stream terminaba vacío y se clasificaba como «el
modelo no contestó». Eso manda a probar otro modelo cuando el problema es otro. Ahora hay un cuadro
de tipo `error` y el motivo del servidor se devuelve y se muestra tal cual.

**La medición que lo destapó.** Con 65.536 de contexto y los 16 archivos elegidos —prompt de **4.199
tokens**, procesado a 75 tokens/s— la iGPU Intel Iris Xe de la notebook se cayó a los 46 segundos con
`vk::Device::getFenceStatus: ErrorDeviceLost`. El fallo es de la placa, no del modelo.

**El piso de contexto bajó de 32.768 a 16.384.** El 32.768 no salía de ninguna medición: el prompt más
grande medido son 4.649 tokens, y con 16.384 quedan más de 13.000 para la entrada después de reservar
los 3.000 de salida. El piso alto impedía bajar el contexto, que es justamente la salida cuando la
placa no aguanta. Las dos constantes se mudaron a `types/commit-message-ai.ts`: estaban escritas a
mano en el proveedor y en el panel, y cambiar una dejaba a la otra mintiendo.

**El botón de cargar se apagaba mudo.** Ale puso 16.328, quedó bajo el piso y el botón se puso gris
sin explicar nada. Ahora queda apretable y dice qué corregir; quien corta es `confirmAiLoad`.

**El estado del modelo mentía.** Decía «se va a cargar con 65536» —número escrito a mano en el
componente— mientras el campo de al lado mostraba 16.328.

**Dos cambios de disposición que pidió Ale.** Contexto, minutos y el botón de cargar ahora van juntos:
los tres son de la misma operación y estaban partidos en dos filas por el acomodo, no por criterio. Y
las frases de espera se mudaron al rail, donde ocupan el lugar en el que después aparece el texto real
—decían lo mismo que el rail ya decía con «Todavía no llegó nada»—. **El contador de segundos se queda
en el centro**: el rail sólo existe con la columna derecha abierta, y con ella cerrada el contador es
lo único que informa que algo está pasando.

Cierre de la segunda vuelta: `tsc` en cero, lint limpio, `openspec validate --strict` válido, y
`pnpm test` **verde en las dos corridas — 130 archivos / 1014 tests**, esta vez sin flakes.

## Tercera vuelta: ajustes de forma

Tres cosas más de la validación en pantalla, y una consulta que resultó no ser un defecto.

**«GitHub Copilot sin configurar» no era de este repositorio.** La captura era de `odontoPau`, que
tiene `.codex`, `.agent` y `.github` pero no `.claude` —gitCronos tiene `.claude` y no `.github`—. El
panel estaba haciendo exactamente su trabajo: avisar que en ese repositorio se usa Copilot sin las
skills de OpenSpec, o sea un ejecutor que no sabe que existe el canal de instrucciones. Es el mismo
caso que ya había pasado ahí con Antigravity. Se resuelve corriendo `openspec init` en odontoPau.

**El botón de expulsar pasa a ser sólo ícono**, cuadrado, con el símbolo de LM Studio y el nombre
«Eject». Con el rótulo entero competía en peso con la acción principal siendo la salida. El símbolo se
dibuja a mano: se comprobó que `lucide-react` no trae ninguno equivalente, y no vale sumar una
dependencia por un ícono. El nombre vive en `aria-label` y en el tooltip.

**La acción sube junto al selector** y los dos números quedan debajo.

**El rail dejaba verticalidad al pedo.** Tenía `flex: 1` con piso de 8rem, así que se llevaba todo el
alto sobrante; con un modelo que no razona quedaba un hueco enorme bajo dos líneas de texto. Ahora
crece con su contenido, el razonamiento sólo se dibuja si llegó algo, y el techo son 24rem con
desplazamiento propio.

**Por qué no se vio el pensamiento largo.** `gemma-4-e4b` devolvió **0 tokens de razonamiento** —se lee
en la propia pantalla: «0 tokens en pensar, sobre 15 generados»—. No hay defecto: ese modelo no razonó
para esta tarea. En la PC de casa, con `gemma-4-12b`, son 278 de 308 cuadros y el bloque se llena.

**Nota operativa sobre la suite.** Con la notebook cargada —Electron en desarrollo, LM Studio y el
navegador abiertos— la suite falla por contención: `[vitest-pool]: Failed to start forks worker`, y
tests que caen a los 5,1 segundos exactos, variando de archivo en cada corrida. Todos pasan aislados.
Con `pnpm exec vitest run --maxWorkers=2` pasa entera: **130 archivos / 1014 tests**.

## Qué queda

La tarea **6.6** —Ale valida que ningún mensaje redactado se lea como verificado por la aplicación— es
suya y va antes de archivar: un change archivado es de sólo lectura.
