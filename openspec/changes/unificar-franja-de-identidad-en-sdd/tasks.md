# Tareas

## 1. Relevamiento

- [x] 1.1 Declarar qué compone hoy la franja de identidad del grafo y qué compone la barra de SDD,
  pieza por pieza, con archivo y línea. Señalar cuáles coinciden.
- [x] 1.2 Relevar qué zona del cuerpo de SDD puede recibir los contadores y la insignia del motor sin
  alterar su disposición de tres columnas, que este change NO toca. Declararlo antes de mover nada.
  Si no hubiera lugar sin rediseñar el cuerpo, frenar y reportar: eso pertenece al trabajo de los
  paneles laterales.

## 2. SDD adopta la franja común

- [x] 2.1 Hacer que la vista SDD use la misma pieza de encabezado que el grafo, con la rama actual y
  los indicadores de estado del árbol y de sincronización a la izquierda.
- [x] 2.2 Ubicar `Preparar commit` a la derecha de esa franja, donde el grafo ubica su selector de
  modo. Conserva su estado, su condición sobre el árbol limpio, su `aria-expanded` y su área
  clickeable completa: cambia de lugar, no de función.
- [x] 2.3 Retirar `summaryBar` de `components/pipeline/OpenSpecDashboard.tsx` y las reglas de
  `summaryBar`, `brand`, `summaryFacts` y `repoHealth` que queden sin consumidor en su hoja de
  estilos. Enumerar en el reporte cuáles se retiraron.
- [x] 2.4 Bajar los contadores de especificaciones y tareas, y la insignia del motor de OpenSpec, a
  la zona del cuerpo que declaró 1.2. Conservan lo que muestran y sus claves de traducción.
- [x] 2.5 Retirar el título de marca «Spec-Driven / Development», hoy escrito a mano en el JSX
  (`OpenSpecDashboard.tsx:1402`). El selector de vistas ya nombra a SDD. Con él se va un
  incumplimiento del invariante 8 que el change anterior no detectó.

## 3. Pruebas

- [x] 3.1 Cubrir que la vista SDD monta la misma pieza de encabezado que el grafo, afirmando sobre el
  `data-testid` de la pieza y no sobre las clases que copie.
- [x] 3.2 Cubrir que la franja de SDD muestra la rama actual y los indicadores de estado, con los
  mismos rótulos que el grafo.
- [x] 3.3 Cubrir que `Preparar commit` sigue invocando lo que invocaba y respetando la condición
  sobre el árbol limpio. Afirmar sobre el llamado, no sobre el render.
- [x] 3.4 Reescribir `components/pipeline/__tests__/pipeline-panel-brand.test.tsx`, que hoy afirma
  que el título de marca dice «Spec-Driven», para que afirme que ya no está. Reescribirlo, no
  borrarlo, y declarar el cambio en el reporte.
- [x] 3.5 Cubrir que los contadores y la insignia del motor siguen presentes en su ubicación nueva,
  con los mismos valores.
- [x] 3.6 Cubrir que ninguna vista declara ya un encabezado propio fuera de la pieza común.

## 4. Cierre y validación

- [x] 4.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [x] 4.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada
  una.
- [x] 4.3 `openspec validate unificar-franja-de-identidad-en-sdd --strict` en cero.
- [x] 4.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en
  Git.
- [x] 4.5 Informar cuántas reglas de estilo se retiraron y cuántas líneas quedó más corta la hoja de
  estilos de SDD. Declarar también cuántas declaraciones de borde y cuántos tokens `--os-*` siguen
  en pie, sin corregirlos: los resuelven otros changes.
- [ ] 4.6 Revisión visual en la aplicación: la franja de SDD se ve igual que la del grafo, la rama y
  el estado se leen sin encimarse, `Preparar commit` opera desde su lugar nuevo, y los contadores y
  la insignia del motor se leen en el cuerpo. **La marca Alejandro.**
