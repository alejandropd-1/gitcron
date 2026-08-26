## 1. Verificación de procedencia del color

- [x] 1.1 En `lib/`, escribir una función pura que reciba el texto de un archivo y devuelva los colores declarados que no provienen de un token de la paleta: valores hexadecimales, `rgb()`, `hsl()` y nombres de color literales. Tiene que alcanzar tanto a las hojas de estilo como a los componentes, donde el color se escribe como clase de utilidad con valor entre corchetes. Sin dependencias nuevas y sin acceso al sistema de archivos, igual que las verificaciones de escala que ya existen.
- [x] 1.2 Distinguir el color que compone la interfaz del que pertenece a un contenido —un color dentro de un SVG de dato, por ejemplo—. Una verificación que señala todo deja de mirarse. Declarar en el reporte qué criterio se adoptó.
- [x] 1.3 Cubrir 1.1 y 1.2 con tabla de casos, incluyendo: `color: #a3f185` (literal, se detecta), `color: var(--color-secondary)` (correcto), `--os-green: #a3f185` (token propio, se detecta), un color dentro de un comentario (no se detecta) y el caso de contenido que 1.2 haya declarado.
- [x] 1.4 Agregar la verificación al conjunto de pruebas, con **línea de base declarada**. Decisión de
  Alejandro del 2026-08-24, sobre la alternativa de dejarla en rojo toda la migración.
  El procedimiento tiene tres pasos y el primero no se saltea:
  **(a)** correrla una vez **sin** línea de base y comprobar que **falla**. Un detector nuevo que da
  verde sobre código que se sabe sucio es un detector roto, y es exactamente lo que pasó con
  `visual-scale-scan`, que nació verde y ciego. Registrar en el reporte cuántas violaciones detecta y
  en qué archivos: ésa es la medición de partida.
  **(b)** congelar esa lista exacta en un archivo versionado, con una entrada por archivo, valor y
  cantidad. La cantidad importa: sin ella, un literal nuevo en un archivo que ya figura pasaría sin
  que nadie lo note, y la hoja de la vista del ciclo tiene 213.
  **(c)** desde ahí la verificación falla **sólo** ante una violación que no esté en la lista, o ante
  una cantidad que crezca. La lista se achica tanda a tanda y llega a cero en el grupo 6.
  Así la guarda queda viva desde el primer día contra literales nuevos, que es el motivo por el que
  el trabajo se duplicó entre la medición del 22/08 y la del 24/08, y la suite no queda en rojo
  durante toda la migración.
- [x] 1.5 Corregir el punto ciego de la verificación de escala que ya existe.
  `lib/__tests__/visual-scale-scan.test.ts` escanea exactamente dos archivos —`app/globals.css` y
  `components/pipeline/OpenSpecDashboard.module.css`— y ningún `.tsx`. Pasa en verde con 95 tamaños
  literales fuera de escala porque no mira donde están. Que recorra el mismo conjunto de archivos
  que la verificación de color de 1.4, y con **la misma línea de base**: correrla primero sin ella
  para comprobar que ahora sí falla —y registrar el número—, congelar la lista, y a partir de ahí
  fallar sólo ante lo nuevo.
- [x] 1.7 Partir la línea de base en dos partes declaradas: **pendiente** y **exento**.
  El relevamiento del 2026-08-25 encontró que el **21% del color y el 25% de la escala** viven en
  `components/ChronometricGraph.tsx` (163 de color, 76 de escala) y `components/CommitGraph.tsx`
  (6 y 4), protegidos por el invariante 12 y sin autorización vigente. **Decisión de Alejandro del
  2026-08-25: excepción declarada.** Los dos archivos siguen escaneados —un literal nuevo ahí se
  tiene que seguir detectando, que es el grueso del valor de la guarda— pero sus entradas quedan en
  la parte exenta, con el motivo y la fecha escritos en el propio archivo. Sacarlos del escaneo
  sería abrir el mismo agujero que el invariante 22 acaba de nombrar, y no se hace.
  La parte pendiente es la que tiene que llegar a cero. La exenta se vacía el día que haya una
  autorización acotada, en un change propio.
- [x] 1.6 Declarar qué archivos recorre cada verificación, en el propio archivo de prueba y con el
  motivo. Es la lección que dejó `compartir-paneles-laterales-entre-vistas`: una comprobación vale
  lo que abarca, y cuatro veces en ese change una prueba prometió más de lo que revisaba.

## 2. Relevamiento de la paleta propia de Pipeline

- [x] 2.1 Los tres tokens que la hoja **usa sin declarar**: `--os-fg` (7 usos), `--os-bg-deep` (4) y
  `--os-red` (1). Siempre gana su valor de reserva, y `--os-fg` tiene tres valores de reserva
  distintos, así que son literales con nombre de token. Resolverlos contra la paleta general igual
  que a los declarados, y declarar en el reporte qué valor terminó valiendo cada uno.
- [x] 2.2 Enumerar los tokens de `components/pipeline/OpenSpecDashboard.module.css`. Medición del
  2026-08-25, a verificar antes de usarla: **trece nombres en juego, 268 usos**. Diez declarados
  —`--os-muted` (84 usos), `--os-cyan` (63), `--os-border-strong` (26), `--os-amber` (26),
  `--os-border` (23), `--os-green` (17), `--os-surface` (13), `--os-violet` (3), `--os-bg` (1) y
  **`--os-surface-strong`, que está declarado y tiene CERO usos**: es un token muerto, no uno
  propio, y sale sin discusión—. Más los tres sin declarar de la tarea 2.1.
  Los diez tokens de la enumeración original —`--os-bg`, `--os-surface`, `--os-surface-strong`, `--os-muted`, `--os-border`, `--os-border-strong`, `--os-green`, `--os-cyan`, `--os-amber`, `--os-violet`— y para cada uno declarar a qué token de la paleta general corresponde, o que no tiene equivalente.
- [x] 2.3 Informar cuántas declaraciones de esa hoja consumen cada token. Es la pregunta abierta declarada en `design.md` y dice cuánto trabajo implica la migración.
- [x] 2.4 Proponer la incorporación a la paleta general, con nombre general, únicamente de los matices sin equivalente.
  **Decisiones de Alejandro del 2026-08-25**, sobre la propuesta entregada y la auditoría:
  **(a) Entra un token de advertencia.** La paleta general no tiene ninguno —tiene error, git-add,
  git-mod y git-delete, y nada para «necesita atención»—, así que mandar los 26 usos de `--os-amber`
  a `--color-git-mod` colapsaría «hay que atender esto» con «archivo modificado». Es el único caso
  sin equivalente del relevamiento, y la tarea 4.2 prohíbe explícitamente ese colapso.
  **(b) El resto de la tabla se aprueba** tal como se propuso, incluido el cambio más visible: los 84
  usos de `--os-muted` (`#93a5ba`) pasan a `--color-text-secondary` (`#d8dee9`).
  **(c) Ocho ámbares en 113 apariciones.** `#fd9d1a` (40), `#ffd98a` (27), `#d8a657` (20), `#f4b942`
  (18), `#ffbf47` (3), `#ffb462` (2), `#fdb33a` (2), `#fbbf24` (1). Tres son tokens declarados y
  cinco son literales sueltos. Todos mueren en dos: advertencia y modificado.
  **(d) La paleta general se duplica a sí misma:** `--color-secondary` y `--color-git-add` valen los
  dos `#a3f185`. Se resuelve en el grupo 4.
- [x] 2.5 Los catorce tokens `--color-carto-*` se parten por el criterio de la tarea 1.2, no por
  domicilio. **Decisión de Alejandro del 2026-08-25.** Viven dentro de `app/globals.css`, así que la
  verificación no los marca, pero son una segunda paleta propia y el diagnóstico del change decía
  que había una sola.
  **Interfaz de la vista, entran al alcance (4):** `--color-carto-canvas` (`#04101d`),
  `--color-carto-grid` (`#16324a`), `--color-carto-text` (`#cfe3fb`) y `--color-carto-text-muted`
  (`#7d93ad`). Son fondo, grilla y rótulos: cromo, y son azules propios sin motivo.
  **Dibujo del dato, excepción declarada (10):** `--color-carto-node`, `--color-carto-edge`,
  `--color-carto-accent` y los siete `--color-carto-role-*`. Los siete `role-*` son una escala
  categórica que codifica qué es cada archivo: su requisito es distinguirse **entre sí**, no
  pertenecer a la paleta. Forzarlos a doce tokens generales los volvería indistinguibles.
  Esta excepción es **por criterio**, no por falta de autorización: se declara en el archivo y no
  espera a nadie. No agregar equivalentes de los que ya existen: eso conserva el problema con otro nombre. Si algún matiz propuesto no resuelve un caso concreto, no se agrega.

## 3. Migración de Pipeline

- [x] 3.0 Relevar los dos archivos del invariante 12 antes de pedir nada.
  **Instrucción de Alejandro del 2026-08-25:** «no dejar por no querer tocar, o por invariantes
  inquebrantables, un mamarracho de colores; usemos el criterio». El invariante 12 no prohíbe tocar:
  pide validación visual suya, acotada y con fecha. Usarlo de excusa es leerlo mal.
  Antes de pedirle esa autorización hay que darle el número: de las **169 violaciones de color y 80
  de escala** de `ChronometricGraph.tsx` y `CommitGraph.tsx`, cuántas son **cromo de interfaz**
  —fondos, bordes, rótulos, controles— y cuántas son **dibujo del dato** —órbitas, trazos, nodos—,
  con el mismo criterio de la tarea 1.2 que separó los `--color-carto-*`. Relevar y declarar; **no
  migrar nada de esos dos archivos** hasta que la autorización exista, esté acotada y tenga fecha.

- [x] 3.1 Incorporar a `app/globals.css` el único matiz que 2.4 aprobó agregar: un token de
  advertencia, con nombre general. Es el que recibe los 26 usos de `--os-amber` y el que evita
  colapsar «necesita atención» con «archivo modificado».
  Después, reemplazar en `components/pipeline/OpenSpecDashboard.module.css` cada uso de los tokens
  propios por el token general que 2.2 determinó, y retirar las declaraciones locales —las diez
  declaradas, incluida `--os-surface-strong` que no usa nadie, y los tres nombres fantasma.
- [x] 3.2 Revisar el resto de `components/pipeline/` en busca de colores literales, y migrarlos igual.
- [x] 3.3 Verificar que la vista Pipeline conserva sus estados distinguibles —lo hecho, lo pendiente, lo bloqueado, lo que requiere atención— tras la migración. Si dos estados dejan de distinguirse, declararlo en lugar de inventar un color.
- [x] 3.4 Confirmar que la verificación de 1.4 ya no reporta nada en `components/pipeline/`.

## 4. Revisión de acentos

- [x] 4.0 La paleta general también tiene fantasmas y duplicados, y hay que resolverlos antes de
  tocar los acentos. Los encontró Alejandro el 2026-08-25 mirando la solapa Artefactos, que quedó
  con un bloque cian pleno mientras el resto de la vista quedaba sobrio:
  **(a)** `.pipeline-details__header`, `.pipeline-details__tabs`, `.pipeline-details__tab` y
  `.pipeline-details__tab--active` están declarados **dos veces** en `app/globals.css` —el primer
  bloque cerca de la línea 2252, el segundo cerca de la 3732— con reglas contradictorias. La solapa
  activa tiene una versión sobria (`:2275`) que la posterior (`:3747`) pisa con `background-color:
  var(--color-primary)` y texto oscuro. Queda una sola, y se declara cuál y por qué.
  **(b)** `--color-bg-hover` (1 uso, 0 declaraciones) y `--color-border` (3 usos, 0 declaraciones)
  se usan y no existen. Son los `--os-fg` de la paleta general: por eso la regla sobria de la solapa
  no hacía nada aunque no la pisaran. Resolverlos contra tokens que sí existan, o declararlos.
  **(c)** `--color-secondary` y `--color-git-add` valen los dos `#a3f185`. Dos nombres, un color.
- [x] 4.5 Los cuatro `--color-carto-*` de interfaz que la tarea 2.5 dejó dentro del alcance:
  `--color-carto-canvas` (`#04101d`), `--color-carto-grid` (`#16324a`), `--color-carto-text`
  (`#cfe3fb`) y `--color-carto-text-muted` (`#7d93ad`). Son fondo, grilla y rótulos de la vista de
  Cartografía: cromo, y azules propios sin motivo. Los diez restantes son escala categórica de datos
  y NO se tocan — es excepción por criterio, ya declarada.

- [x] 4.1 Revisar los acentos generales contra los fondos vigentes: éxito, error, advertencia, información y los estados de Git. El caso declarado es el verde `#a3f185`, un lima saturado elegido contra fondo azul marino que sobre carbón desentona aunque cumpla el contraste.
- [x] 4.2 Conservar el significado de cada acento. No adoptar en bloque los acentos de otra familia de color por venir armonizados: los colores de Git cargan un vocabulario aprendido y cambiarlo por razón estética tiene un costo propio.
- [x] 4.3 Verificar que cada acento revisado sigue cumpliendo el contraste exigido contra su fondo, con la comprobación que ya existe.
- [x] 4.4 Comprobar que los acentos siguen distinguiéndose **entre sí**, no sólo de su fondo, mirando un diff real donde agregado, eliminado y modificado conviven. La verificación automática mide cada color contra su fondo y no puede responder esto. **La comprueba Alejandro.**

- [x] 4.6 El verde de éxito pasa a un verde que pertenezca a la familia carbón.
  **Decisión de Alejandro del 2026-08-25.** Es el caso testigo con el que se escribió la propuesta:
  `#a3f185` es un lima saturado elegido contra fondo azul marino, y sobre carbón desentona aunque
  cumpla el contraste. El grupo 4 lo dejó sin cambios midiendo contraste, que es justamente lo que
  la propuesta declara incapaz de contestar la pregunta.
  **Valor: `#a3be8c`.** El fundamento es verificable y no es de gusto: los fondos de la aplicación
  son Nord exactos —`#2e3440` es nord0, `#3b4252` nord1, `#4c566a` nord3, `#d8dee9` nord4, `#eceff4`
  nord6—, o sea que «Carbon Soul» es esa familia. `#a3be8c` es su verde, nord14. Contraste medido:
  6.13:1, por encima del exigido.
  **Consecuencia declarada sobre el invariante 12:** `--color-secondary` es alias de
  `--color-git-add` y se usa 6 veces en `ChronometricGraph.tsx` y 1 en `CommitGraph.tsx`. El verde
  les cambia **sin editar los archivos**: el token resuelve distinto. No es tocarlos, pero sí es
  cambiar cómo se ven, así que la comprobación visual de esos dos vuelve a ser necesaria.
  **No se tocan los demás acentos**, aunque tampoco sean Nord: la tarea 4.2 lo prohíbe.
- [x] 4.8 El grafo quedó con **dos verdes**, y hay que elegir uno.
  Consecuencia no anticipada de la 4.6, encontrada en la auditoría del 2026-08-25. Los siete usos
  que llegan por `--color-secondary` pasaron al verde nuevo `#a3be8c` sin editar los archivos, pero
  **quedan 19 usos del lima viejo `#a3f185` escritos a mano** —17 en `ChronometricGraph.tsx`, 2 en
  `CommitGraph.tsx`— que están en la parte exenta y nadie tocó. Resultado: la mira de HEAD es Nord y
  los paneles de aceptado y especulativo siguen lima, en la misma pantalla.
  No es un defecto de la migración: es el costo de la excepción, que nadie previó al decidirla —yo
  incluido—. Pero ahora sí hay un motivo concreto para la autorización del invariante 12, y no es de
  prolijidad: **es que el grafo tiene dos verdes distintos**. La autorización la da Alejandro,
  acotada y con fecha, después de mirarlo.
  *(Aparte y menor: `--color-carto-role-database` también sigue en `#a3f185`. Ése es excepción por
  criterio —escala categórica, tarea 2.5— y su requisito es distinguirse de sus hermanos, no
  pertenecer a la paleta. No entra acá.)*

- [x] 4.7 Rehacer la comprobación de 4.4 con el verde nuevo. Alejandro la dio por buena el
  2026-08-25 **antes** de este cambio, así que no la cubre: el verde es el acento más presente de la
  aplicación y el que se movió. **La comprueba Alejandro**, mirando un diff con agregado, eliminado
  y modificado juntos, y además el lienzo cronométrico.

## 5. El resto de la interfaz

Hueco encontrado en la auditoría del 2026-08-25: los grupos escritos cubren la vista del ciclo, los
acentos y la escala, y **ninguno cubre el resto**. Quedan **398 violaciones de color en 30 archivos**
sin dueño, y el cierre exige que la parte pendiente llegue a cero. Sin este grupo, el change no puede
cerrar. Es también lo que Alejandro vio en la solapa Artefactos: sus fichas siguen con los colores de
antes —incluido `#ffbf47`, el ámbar que la 3.1 retiró— porque viven en `app/globals.css` y nadie las
migró todavía.

Se hace por tandas, de mayor a menor, podando la línea de base en cada una.

- [x] 5.1 `components/RepoActionModals.tsx` (107) y `components/temporal/AgentDashboard.tsx` (61).
  Son la mitad de lo que queda.
- [x] 5.2 Lo que resta de `app/globals.css` (35), empezando por las fichas de artefactos
  (`.pipeline-artifact-graph li[data-state]`, líneas 2335 a 2351), que todavía declaran `#6fac39`,
  `#a3f185`, `#5ed8ff` y `#ffbf47` a mano.
- [ ] 5.3 `DiffViewer` (23), `PageToasts` (23), `PredictionDetail` (22) y `RepoDetailsPanel` (21).
- [ ] 5.4 La cola: los veintitrés archivos restantes, de 13 violaciones para abajo.
- [ ] 5.5 En cada tanda, conservar el significado de lo que se migra y declarar si algún estado dejó
  de distinguirse. Vale sobre todo para `DiffViewer`, donde conviven agregado, eliminado y
  modificado, que es el caso de la tarea 4.4.
- [ ] 5.6 Confirmar que la parte pendiente quedó en cero.

- [x] 5.7 Ampliar el detector: define «literal» demasiado angosto y por eso la línea de base llegó a
  cinco con setenta y uno a la vista. Auditoría del 2026-08-25. No ve tres formas:
  **(a)** hex en constantes y objetos de JavaScript —`const GREEN = '#a3f185'` en
  `TemporalAgentSettings.tsx:23`—: **71 apariciones fuera de los archivos protegidos**, en archivos
  que nunca entraron a la línea de base.
  **(b)** el respaldo de `var(--token, #literal)`, invisible porque el patrón arranca en `var(`.
  **(c)** referencias a tokens que ya no existen. Ampliar, volver a medir, y **la línea de base se
  rehace con el número nuevo**: el actual mide lo que el detector ve, no lo que hay.
- [x] 5.8 Retirar las diez referencias a tokens borrados que dejó nuestra propia migración:
  `var(--os-muted)` ×4, `var(--os-text)` ×2, `var(--os-amber)` ×2, `var(--os-orange)` ×1 y
  `var(--os-cyan)` ×1, en `OpenSpecUpdateReview.tsx` y `OpenSpecDashboard.tsx:1520`. Las que llevan
  respaldo pintan el literal viejo; las que no, **no pintan nada**.
- [x] 5.9 Declarar `color-scheme` en `app/globals.css`. Sin eso el navegador pinta los controles
  nativos en claro porque no sabe que la aplicación es oscura: Alejandro lo vio el 2026-08-25 en el
  desplegable de modelos, que abre en blanco. Alcanza también a las barras de desplazamiento del
  sistema y a cualquier control nativo.

## 6. La escala tipográfica

Entra al mismo change por decisión de Alejandro del 2026-08-24: comparte la norma incumplida, el
escáner y la guarda con el color. Lo que NO entra es la maquetación —dónde va cada cosa—, que es un
change aparte.

- [ ] 6.1 Relevar los rótulos en versalita de la aplicación y declarar el número de partida. La
  medición del 2026-08-24 dio **129 rótulos con 74 tratamientos distintos**, de los cuales **95
  declaran un tamaño literal** —7px, 8px, 9px, 10px y 11px— por debajo del piso de 12px que
  `app/globals.css:26` define como «piso de legibilidad».
- [ ] 6.2 Para cada uso, resolver contra el escalón de la escala que le corresponde según el
  propósito que la propia escala declara: `xs` para metadatos y badges, `sm` para texto secundario y
  controles compactos, `md` para títulos de sección. No agregar escalones: si algo no encaja en
  ninguno, declararlo en lugar de inventar uno.
- [ ] 6.3 En la hoja de estilos de la vista del ciclo hay doce rótulos y **los doce están en `xs`**,
  con cinco pesos y cinco colores distintos. Ahí el problema no es sólo el tamaño: un encabezado con
  el mismo tamaño, peso y color que un botón se lee como un botón. Distinguir familia por familia y
  declarar el criterio.
- [ ] 6.4 Confirmar que la verificación de 1.5 ya no reporta nada.
- [ ] 6.5 Revisión visual: los rótulos se distinguen del texto y de los controles, y la jerarquía se
  lee sin depender del color. **La comprueba Alejandro.**

## 7. Cierre y validación

- [ ] 6.0 `pnpm build` sin errores. Va primero y no es una formalidad: un selector rechazado por el
  compilador de hojas de estilo deja la aplicación sin arrancar mientras la suite entera da en verde,
  porque las pruebas no procesan los módulos de estilo con el compilador de producción. En un change
  que reescribe hojas de estilo, es la validación que más puede fallar. Si falla con «build worker
  exited with code 1», correrlo solo antes de reportarlo: pasa con dos builds sobre el mismo `.next`.
- [ ] 7.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 7.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 7.3 `openspec validate unificar-paleta-carbon-soul --strict` en cero.
- [ ] 7.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [ ] 7.5 Informar la medición final contra la de 1.4 y la de 1.5: cuántos colores fuera de la paleta
  y cuántos tamaños fuera de escala quedan, y dónde. **La parte pendiente de la línea de base tiene
  que quedar vacía**: si queda una sola entrada ahí, declarar cuál y por qué, y el change no cierra
  hasta que esté decidido.
  La parte **exenta** no se vacía en este change: son los archivos del invariante 12, y se declaran
  con su cuenta final. Mientras exista una entrada exenta, el archivo de línea de base se conserva —
  se retira el día que quede vacío del todo.
- [ ] 7.6 Revisión visual en la aplicación: Pipeline afinado con el resto, estados distinguibles entre sí, y acentos que pertenecen a la misma familia sin perder su significado. **La marca Alejandro.**
