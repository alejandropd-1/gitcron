## 1. Escala de tokens

- [x] 1.1 En `app/globals.css`, definir la escala de tipografía como variables CSS con un número acotado de pasos, junto a las variables `--color-*` existentes, documentando cuál es el piso de legibilidad y para qué sirve cada paso.
- [x] 1.2 En `app/globals.css`, definir la escala de espaciado como variables CSS con pasos acotados, aplicable a `padding`, `margin` y `gap`.
- [x] 1.3 Registrar en el reporte, antes de migrar nada, la medición de partida: cuántos valores distintos de `font-size` existen y cuántas declaraciones quedan por debajo del piso. El comando usado para medirlo debe quedar escrito.

## 2. Verificación automática

- [x] 2.1 En `lib/`, escribir una función pura que reciba el texto de una hoja de estilos y devuelva las declaraciones de `font-size`, `padding`, `margin` y `gap` que no usan un token de la escala. Sin dependencias nuevas y sin acceso al sistema de archivos.
- [x] 2.2 Cubrir 2.1 con tabla de casos, incluyendo al menos: `font-size: 0.625rem` (literal, debe detectarse), `font-size: var(--font-size-sm)` (correcto), `padding: 4px 8px` (literal), `padding: var(--space-2) var(--space-3)` (correcto), y una declaración dentro de un comentario que NO debe detectarse.
- [x] 2.3 Agregar un test que recorra las hojas de estilo de `components/` y `app/` usando 2.1 y falle enumerando archivo, línea y declaración fuera de escala. **Debe fallar al escribirse**: dejar en el reporte cuántas detecta.
- [x] 2.4 En `lib/`, escribir una función pura que calcule la relación de contraste entre dos colores y cubrirla con casos conocidos, incluyendo un par que dé exactamente 4,5:1.
- [x] 2.5 Agregar un test que verifique, sobre los pares de color de la paleta usados como texto sobre fondo, la relación 4,5:1 para texto y 3:1 para bordes de control e indicador de foco, informando cada par que no llega.
- [x] 2.6 Agregar un test que verifique el área objetivo de 44×44 px en los controles interactivos, informando cuáles quedan por debajo. Registrar el número de partida en el reporte: es la pregunta abierta declarada en `design.md`.

## 3. Armazón

- [x] 3.1 Aplicar `--color-bg-surface` como fondo de la barra superior y de la barra lateral, y `--color-bg-base` al área de contenido, sin agregar colores nuevos a la paleta.
- [x] 3.2 Resolver el encuentro entre armazón y contenido con esquina redondeada, verificando que se conserve al ocultar cada panel lateral y al ocultar ambos.
- [x] 3.3 Revisar los controles `onToggleSidebar` y `onToggleDetails` de `components/TopBar.tsx`: que cumplan el área objetivo de 2.6, conserven su posición entre vistas y declaren su acción por texto accesible. No reimplementar su funcionamiento.
- [x] 3.4 Verificar con test de componente que ocultar un panel lateral conserva la separación de fondos y la esquina redondeada contra el armazón restante.
- [x] 3.5 Desencapsular los paneles del armazón: quitar borde propio, radio propio y separación respecto del borde de la ventana en `components/RepoSidebar.tsx`, `components/RepoDetailsPanel.tsx` y los paneles laterales de la vista de grafo, de modo que se lean como una superficie continua con las barras. Las tarjetas dentro del área de contenido conservan su borde y su radio.
- [x] 3.6 Aplicar a la vista de grafo la misma composición que al resto: paneles integrados al armazón y lienzo del grafo como contenido apoyado, con la misma arista. No tocar la geometría interna del grafo, protegida por el invariante 12.
- [x] 3.7 Reemplazar todo `border-radius` literal por una variable de la escala ya existente en `app/globals.css` (`--radius-sm` a `--radius-full`), y extender la verificación de 2.3 para que detecte radios fuera de escala igual que hace con tamaños y espaciados.
- [x] 3.8 Aplanar el modo cronométrico, que es el que `app/page.tsx:303` resuelve por omisión y por lo tanto el único que se ve: la barra superior (`app/page.tsx:1464` y `:1470`), `components/RepoSidebar.tsx:272` y `components/RepoDetailsPanel.tsx:80` dejan de posicionarse en `absolute` con `bg-bg-overlay/60`, `backdrop-blur-md`, `border` y `rounded-xl`, y pasan a integrar el armazón como columnas continuas, igual que en el modo clásico.
- [x] 3.9 Reestructurar el lienzo del grafo en modo cronométrico para que ocupe el área de contenido entre los paneles, en lugar de extenderse por debajo de ellos: deja de necesitar el inset de panel flotante y se comporta como contenido apoyado. No tocar la geometría interna del grafo, protegida por el invariante 12.
- [x] 3.10 Corregir los tests de `components/__tests__/panel-layout-frame.test.tsx` para que ejerciten el modo que la aplicación resuelve por omisión. Hoy el caso se llama «RepoSidebar utiliza bg-bg-surface en modo clásico» y verifica la rama que nunca se ejecuta.
- [x] 3.11 Quitar la máscara de desvanecido del lienzo cronométrico en `components/ChronometricGraph.tsx:2136-2140`: el `maskImage`/`WebkitMaskImage` con `linear-gradient(to right, black 0%, black calc(100% - 370px), transparent calc(100% - 220px))` borra los últimos 370 píxeles del grafo. Existía para que el lienzo se disolviera bajo el panel derecho cuando éste flotaba con desenfoque; con el panel convertido en columna sólida, sólo deja un área vacía dentro del grafo. **Toca un archivo protegido por el invariante 12 y cuenta con validación visual explícita de Ale del 2026-08-19.** No modificar ninguna otra cosa de ese archivo.

- [x] 3.12 Retirar las líneas divisorias del armazón: las veintitrés declaraciones de borde repartidas en cinco opacidades distintas en `components/TopBar.tsx`, `components/RepoSidebar.tsx`, `components/RepoDetailsPanel.tsx`, `components/RepoTabs.tsx` y `app/page.tsx`. La separación queda a cargo del fondo y del espacio. Conservar únicamente el contorno del indicador de foco, y los bordes de las tarjetas que agrupan información dentro del área de contenido.
- [x] 3.13 Comprobar que los fondos de dos superficies contiguas del armazón se distinguen entre sí sin la línea que los separaba, y ajustar los tokens de fondo existentes si algún encuentro queda indistinguible. No agregar colores nuevos a la paleta: si hiciera falta un tono intermedio, frenar y reportar.
- [x] 3.14 Retirar el panel decorativo `LcarsDecorPanel` de `components/PageWidgets.tsx:74-140` y su invocación en `app/page.tsx:1791`. Es el arco curvo y las formas que ocupan el lateral derecho de la vista cronométrica; su propio comentario lo declara «pure decoration» y no cumple ninguna función. No está en un archivo protegido por el invariante 12.
- [x] 3.15 Retirar la capa `tcars-hud-overlay` de `components/ChronometricGraph.tsx:3289-3320`: es un SVG superpuesto al 40 % de opacidad que dibuja un crosshair central y dos rótulos técnicos inventados —`NAV_AXIS // AZIMUTH: 40.4° // DECLINATION: 0.85` y `SYS_CORRELATION // CHRONO_V2.0 // TIMELINE: RUNNING`—, con su filtro `hud-glow`. **Toca un archivo protegido por el invariante 12 y cuenta con validación visual explícita de Ale del 2026-08-19, acotada a esta capa.**
- [x] 3.16 CONSERVAR íntegro todo lo demás del lienzo: la diagonal temporal, los nodos de commit, los rótulos de rama y de mensaje, las ramas especulativas punteadas con sus porcentajes, la capa `instrumentation-layer` (línea 2302, que dibuja las órbitas de rama y las reglas métricas), la retícula del nodo HEAD `tcar-reticle-art` (línea 2654) con sus animaciones `chrono-tcar-enter` y `chrono-tcar-exit`, y toda la interacción de arrastre, zoom y selección. Lo que se retira es decorado de fondo, no el grafo.
- [x] 3.17 Verificar que al retirar 3.14 y 3.15 no queda ningún residuo: definiciones en `<defs>`, filtros, estilos, `@keyframes`, imports o props que ya no consuma nadie. Enumerar en el reporte qué se retiró y qué se conservó, con sus líneas.

## 4. Migración a la escala

- [x] 4.1 Migrar las hojas de estilo de `components/pipeline/` a los tokens de la sección 1, sin declarar ningún texto por debajo del piso, hasta que 2.3 no reporte declaraciones en ese directorio.
- [x] 4.2 Migrar las hojas de estilo del resto de `components/` y de `app/globals.css` a los tokens, hasta que 2.3 pase sobre todo el árbol.
- [x] 4.3 Corregir los controles que 2.6 reporte por debajo del área objetivo, hasta que la verificación pase. Si algún caso resultara inviable sin romper una vista, declararlo en el reporte con su motivo en lugar de bajar el umbral.
- [x] 4.4 Corregir los pares de color que 2.5 reporte por debajo del contraste exigido, hasta que la verificación pase.
- [x] 4.5 No tocar `components/ChronometricGraph.tsx` ni `components/CommitGraph.tsx`: el invariante 12 protege su geometría. Si la migración de tokens los alcanzara, frenar y reportar.

## 5. Prosa de la interfaz

- [x] 5.1 En `components/pipeline/OpenSpecUpdateReview.tsx`, eliminar la segunda aparición de `pipeline.openspec.engine.review.safetyHelp` —hoy renderizada en las líneas 138 y 147— conservando una sola, ubicada junto a la acción y no delante de ella.
- [x] 5.2 Recorrer las vistas de `components/pipeline/` buscando otras claves de i18n renderizadas más de una vez en la misma pantalla, y dejar la lista en el reporte aunque no se corrijan todas.

## 6. Accesibilidad de recorrido

- [x] 6.1 Verificar que el indicador de foco es visible en todo control alcanzable por teclado y que ninguna barra fija lo tapa, corrigiendo los casos que fallen.
- [x] 6.2 Verificar que la aplicación sostiene `line-height: 1.5`, `letter-spacing: 0.12em` y `word-spacing: 0.16em` sin recortes ni superposiciones, y dejar cubierto por test lo que sea automatizable.
- [x] 6.3 Verificar que a 200 % de ampliación todas las acciones siguen disponibles sin desplazamiento horizontal de la página.

## 7. Cierre y validación

- [x] 7.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [x] 7.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [x] 7.3 `openspec validate unificar-sistema-visual-gitcron --strict` en cero.
- [x] 7.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [x] 7.5 Informar la medición final contra la de 1.3: cuántos valores distintos de `font-size` quedan y cuántas declaraciones por debajo del piso.
- [x] 7.6 Revisión visual y funcional en la aplicación: armazón separado del contenido con su esquina redondeada, paneles que se ocultan y muestran conservando la composición, texto legible sin apretar, y que la densidad de información siga siendo la de una herramienta de trabajo. **La marca Alejandro.**
