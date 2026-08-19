## 1. Escala de tokens

- [ ] 1.1 En `app/globals.css`, definir la escala de tipografía como variables CSS con un número acotado de pasos, junto a las variables `--color-*` existentes, documentando cuál es el piso de legibilidad y para qué sirve cada paso.
- [ ] 1.2 En `app/globals.css`, definir la escala de espaciado como variables CSS con pasos acotados, aplicable a `padding`, `margin` y `gap`.
- [ ] 1.3 Registrar en el reporte, antes de migrar nada, la medición de partida: cuántos valores distintos de `font-size` existen y cuántas declaraciones quedan por debajo del piso. El comando usado para medirlo debe quedar escrito.

## 2. Verificación automática

- [ ] 2.1 En `lib/`, escribir una función pura que reciba el texto de una hoja de estilos y devuelva las declaraciones de `font-size`, `padding`, `margin` y `gap` que no usan un token de la escala. Sin dependencias nuevas y sin acceso al sistema de archivos.
- [ ] 2.2 Cubrir 2.1 con tabla de casos, incluyendo al menos: `font-size: 0.625rem` (literal, debe detectarse), `font-size: var(--font-size-sm)` (correcto), `padding: 4px 8px` (literal), `padding: var(--space-2) var(--space-3)` (correcto), y una declaración dentro de un comentario que NO debe detectarse.
- [ ] 2.3 Agregar un test que recorra las hojas de estilo de `components/` y `app/` usando 2.1 y falle enumerando archivo, línea y declaración fuera de escala. **Debe fallar al escribirse**: dejar en el reporte cuántas detecta.
- [ ] 2.4 En `lib/`, escribir una función pura que calcule la relación de contraste entre dos colores y cubrirla con casos conocidos, incluyendo un par que dé exactamente 4,5:1.
- [ ] 2.5 Agregar un test que verifique, sobre los pares de color de la paleta usados como texto sobre fondo, la relación 4,5:1 para texto y 3:1 para bordes de control e indicador de foco, informando cada par que no llega.
- [ ] 2.6 Agregar un test que verifique el área objetivo de 44×44 px en los controles interactivos, informando cuáles quedan por debajo. Registrar el número de partida en el reporte: es la pregunta abierta declarada en `design.md`.

## 3. Armazón

- [ ] 3.1 Aplicar `--color-bg-surface` como fondo de la barra superior y de la barra lateral, y `--color-bg-base` al área de contenido, sin agregar colores nuevos a la paleta.
- [ ] 3.2 Resolver el encuentro entre armazón y contenido con esquina redondeada, verificando que se conserve al ocultar cada panel lateral y al ocultar ambos.
- [ ] 3.3 Revisar los controles `onToggleSidebar` y `onToggleDetails` de `components/TopBar.tsx`: que cumplan el área objetivo de 2.6, conserven su posición entre vistas y declaren su acción por texto accesible. No reimplementar su funcionamiento.
- [ ] 3.4 Verificar con test de componente que ocultar un panel lateral conserva la separación de fondos y la esquina redondeada contra el armazón restante.

## 4. Migración a la escala

- [ ] 4.1 Migrar las hojas de estilo de `components/pipeline/` a los tokens de la sección 1, sin declarar ningún texto por debajo del piso, hasta que 2.3 no reporte declaraciones en ese directorio.
- [ ] 4.2 Migrar las hojas de estilo del resto de `components/` y de `app/globals.css` a los tokens, hasta que 2.3 pase sobre todo el árbol.
- [ ] 4.3 Corregir los controles que 2.6 reporte por debajo del área objetivo, hasta que la verificación pase. Si algún caso resultara inviable sin romper una vista, declararlo en el reporte con su motivo en lugar de bajar el umbral.
- [ ] 4.4 Corregir los pares de color que 2.5 reporte por debajo del contraste exigido, hasta que la verificación pase.
- [ ] 4.5 No tocar `components/ChronometricGraph.tsx` ni `components/CommitGraph.tsx`: el invariante 12 protege su geometría. Si la migración de tokens los alcanzara, frenar y reportar.

## 5. Prosa de la interfaz

- [ ] 5.1 En `components/pipeline/OpenSpecUpdateReview.tsx`, eliminar la segunda aparición de `pipeline.openspec.engine.review.safetyHelp` —hoy renderizada en las líneas 138 y 147— conservando una sola, ubicada junto a la acción y no delante de ella.
- [ ] 5.2 Recorrer las vistas de `components/pipeline/` buscando otras claves de i18n renderizadas más de una vez en la misma pantalla, y dejar la lista en el reporte aunque no se corrijan todas.

## 6. Accesibilidad de recorrido

- [ ] 6.1 Verificar que el indicador de foco es visible en todo control alcanzable por teclado y que ninguna barra fija lo tapa, corrigiendo los casos que fallen.
- [ ] 6.2 Verificar que la aplicación sostiene `line-height: 1.5`, `letter-spacing: 0.12em` y `word-spacing: 0.16em` sin recortes ni superposiciones, y dejar cubierto por test lo que sea automatizable.
- [ ] 6.3 Verificar que a 200 % de ampliación todas las acciones siguen disponibles sin desplazamiento horizontal de la página.

## 7. Cierre y validación

- [ ] 7.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 7.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 7.3 `openspec validate unificar-sistema-visual-gitcron --strict` en cero.
- [ ] 7.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [ ] 7.5 Informar la medición final contra la de 1.3: cuántos valores distintos de `font-size` quedan y cuántas declaraciones por debajo del piso.
- [ ] 7.6 Revisión visual y funcional en la aplicación: armazón separado del contenido con su esquina redondeada, paneles que se ocultan y muestran conservando la composición, texto legible sin apretar, y que la densidad de información siga siendo la de una herramienta de trabajo. **La marca Alejandro.**
