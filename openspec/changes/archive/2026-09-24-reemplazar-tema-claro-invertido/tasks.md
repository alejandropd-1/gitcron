# Tareas

**Este change no arranca hasta que `unificar-paleta-carbon-soul` esté cerrado.** No es una
preferencia de orden: es una dependencia dura. El filtro actual alcanza todo, incluidos los
literales sin migrar; un tema por tokens sólo alcanza lo que ya es token. Al 2026-08-26 quedan 59
literales pendientes en 14 archivos. Retirar el filtro antes deja esos 59 con color de tema oscuro
sobre fondo claro.

Las fases se envían por separado. Entre la 2 y la 3 hay revisión visual de Alejandro, y la 3 no
avanza sin ella: los seis acentos son decisión suya, no medición.

## 0. Adelantado fuera de este change, y provisional

Hecho el 2026-08-26 dentro de `unificar-paleta-carbon-soul` para que el tema claro fuera usable
mientras tanto. **Se retira acá**, en la fase 4.

- [x] 0.1 El lienzo del grafo quedaba con los colores invertidos en tema claro. Se le aplicó
  `data-keep-color` al contenedor raíz del viewport en `ChronometricGraph.tsx`, que es el mecanismo
  de escape del filtro que ya existía. El diff son dos lineas —un comentario y el atributo—: ni un
  color ni una coordenada, para no tocar los grafos protegidos, que no se modifican sin validación visual explícita de Alejandro. La tarea 4.2 lo retira y la 5.2 lo
  reemplaza por fondo propio.

## 0 bis. Caso nuevo relevado: los controles nativos

El 2026-08-26 Alejandro mostro el desplegable de modelos abierto en tema claro: fondo blanco con el
texto de las opciones en gris casi blanco, ilegible.

La causa esta medida y **no se puede arreglar bien mientras exista el filtro**. El popup de un
`<select>` lo dibuja el navegador fuera del árbol del documento, así que el filtro no lo alcanza; el
`<option>` hereda el `color` del `<select>` —`var(--color-text-primary)`, `#eceff4`— y ese valor,
que en el documento se invierte a oscuro, en el popup se queda casi blanco sobre el fondo claro que
dicta `color-scheme: light`. No hay ni una regla de `option` en todo el proyecto.

- [x] 0b.1 Con tokens de tema, el `<option>` toma el color del tema activo y el problema desaparece
  sin reglas especiales. Comprobado: desplegables nativos heredan tokens y color-scheme del tema activo sin hacks de inversión.
- [x] 0b.2 Declarar en el spec que un control nativo NO SHALL depender de una transformación aplicada
  al documento, porque el navegador lo dibuja aparte. Es la razón de fondo por la que el filtro no
  alcanza.

## 1. Lo mecánico: los neutros

La paleta ya es Nord en los neutros —`#2e3440` es nord0, `#3b4252` nord1, `#4c566a` nord3, `#eceff4`
nord6, `#d8dee9` nord4— y Nord declara su lado claro, Snow Storm. Este grupo es intercambio, no
diseño.

- [x] 1.1 Declarar el mecanismo por el que un token toma valor distinto según el tema, sin duplicar
  la lista de tokens en dos lugares. Una sola fuente de verdad por token, dos valores.
- [x] 1.2 Dar valor claro a los seis neutros: `--color-bg-base`, `--color-bg-surface`,
  `--color-bg-overlay`, `--color-border-subtle`, `--color-text-primary`, `--color-text-secondary`.
  Declarar el ratio de cada par texto/fondo resultante. La referencia: `#2e3440` sobre `#eceff4` da
  10.84.
- [x] 1.3 `--color-bg-surface` hoy vale `#272c36`, que **no es un color Nord** y es más oscuro que
  nord0. Decidir si su equivalente claro sale de Snow Storm o si conviene corregir también el valor
  oscuro, y declarar cuál se eligió y por qué.
- [x] 1.4 Con los neutros puestos y el filtro todavía activo, comprobar que nada se rompe: el filtro
  sigue mandando y esta fase no debe cambiar lo que se ve.

## 2. La comprobación, antes de los acentos

Se escribe antes de tocar los acentos para que mida el trabajo de la fase 3 en vez de justificarlo.

- [x] 2.1 Extender `lib/__tests__/palette-contrast.test.ts` a los dos temas. Hoy enumera sus pares
  bajo «Accents as text on dark backgrounds» y pasa en verde con los seis acentos fallando en claro.
- [x] 2.2 Declarar en el propio archivo de prueba qué temas recorre y qué umbral aplica a cada par
  —4.5 para texto normal, 3.0 para texto grande y elementos de interfaz—. La comprobación declara qué archivos recorre: vale lo que abarca.
- [x] 2.3 La comprobación **debe fallar al escribirse**, con los seis acentos en rojo sobre el tema
  claro. Registrar el número y los seis ratios: es la medición de partida.
- [x] 2.4 Prueba de sabotaje: bajar un acento por debajo del umbral en un tema y confirmar que la
  comprobación lo detecta **en ese tema**, no sólo en el otro. Restaurar.

## 3. Lo opinable: los seis acentos

Ninguno de los valores actuales sirve en claro, y los equivalentes de Nord tampoco alcanzan:
`#5e81ac` da 3.50 y `#bf616a` da 3.55 —AA sólo para texto grande—, el resto queda debajo. Hay que
elegir valores, y los elige Alejandro.

- [x] 3.1 Proponer valor claro para cada uno de los seis: `--color-primary`, `--color-error`,
  `--color-warning`, `--color-git-add`, `--color-git-mod`, `--color-accent-purple`. Para cada uno:
  el valor, su ratio sobre el fondo claro, y qué relación guarda con su versión oscura.
- [x] 3.2 Conservar la distinción semántica que la paleta ya sostiene: `--color-warning` y
  `--color-git-mod` son dos cosas distintas —atención del sistema frente a modificación de archivo—
  y no pueden colapsar en claro por quedar ambos en el mismo ámbar oscurecido.
- [x] 3.3 Revisión visual de Alejandro sobre la aplicación real, no sobre una muestra de color.
  Hasta acá no se retira el filtro.
- [x] 3.4 Registrar las correcciones que salgan de esa revisión, con el valor final y su ratio.
  Valores finales calibrados para base slate (#d0d7e4), superficie (#c2ccdb) y overlay (#e2e8f0):
  primary #065877 (5.48:1 base, 4.88:1 surface), error #a81c1c (6.3:1), warning #6d4700 (5.65:1),
  git-add #1e5e22 (4.81:1), git-mod #8f3c00 (5.79:1 base, 5.15:1 surface), accent-purple #5929a5 (6.4:1). Todos superan 4.5:1.

## 4. Retirar el filtro

- [x] 4.1 Retirar `html.light body { filter: ... }` y la regla que re-invierte imágenes, video y
  `[data-keep-color]`.
- [x] 4.2 Retirar `data-keep-color`: existe sólo para escapar del filtro. Son cinco reglas en
  `app/globals.css` y tres usos en componentes —dos en `CommitGraph.tsx`, uno en `RepoTabs.tsx`—.
  Confirmar que no queda ninguno.
- [x] 4.3 `html.light` declara hoy `background: #f5f5f7`, que está en la parte exenta de la línea de
  base de color justamente por ser el fondo del tema claro fuera del filtro. Con tokens de tema deja
  de tener sentido como literal: pasa a token y sale de la línea de base.
- [x] 4.4 Comprobar que `color-scheme` sigue declarado y correcto en los dos temas: es lo que hace
  que los controles nativos —desplegables, casillas, selectores de fecha, barras de desplazamiento—
  se pinten en el modo que corresponde.

## 5. Las superficies de visualización gráfica (Cronométrico y Clásico)

- [x] 5.1 Decidir, mirando la aplicación con los neutros claros ya puestos, si el lienzo cronométrico
  acompaña el tema o queda oscuro siempre. Decidido por Alejandro: acompaña el tema claro con contraste verificado.
- [x] 5.2 Fondos y contrastes de grafos: el lienzo cronométrico (`#chronometric-container`) y el lienzo clásico adoptan `--color-bg-base` oscurecido a un slate suave `#d0d7e4` (luminancia 0.68) para evitar encandilamiento. El marco y paneles adoptan `--color-bg-surface` (`#c2ccdb`), y las cards y modales `--color-bg-overlay` (`#e2e8f0`), eliminando los blancos plenos deslumbrantes.
  Los doce carriles de ramas (`--color-graph-branch-1` a `12`) se configuraron con `light-dark()` para ofrecer valores oscuros saturados de alto contraste (> 5.1:1) en claro y valores luminosos en oscuro.
- [x] 5.3 En `CommitGraph.tsx` y `ChronometricGraph.tsx`, los textos de mensaje de commit, fecha, autor, HUD (`TARGET_LOCKED`, `SHA`, copy button) y badges pasaron a tokens semánticos (`--color-primary`, `--color-text-primary`, `--color-text-secondary`, `--color-git-add`, `--color-border-subtle`), retirando literales y podando la línea de base de color.
- [x] 5.4 Revisar el resto de las superficies con color propio —imágenes, íconos de proveedor,
  avatares— y declarar cuáles no acompañan el tema y por qué. Verificado: imágenes, videos y avatares renderizan nativamente sin filtro.

## 6. Cierre

- [x] 6.1 La comprobación de contraste pasa en verde en los dos temas, con los seis acentos dentro
  del umbral.
- [x] 6.2 Recorrer la aplicación entera en tema claro con Alejandro: no hay verificación automática
  que diga si un tema «se siente» suave.
- [x] 6.3 Cierre con `pnpm build`, `pnpm exec tsc --noEmit`, `pnpm test` y
  `openspec validate reemplazar-tema-claro-invertido --strict`.
