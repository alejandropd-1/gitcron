# Tareas

## 1. Relevamiento

- [x] 1.1 Relevar qué encabeza cada vista de la aplicación —grafo clásico, grafo cronométrico,
  historial, autoría, Commit y Pipeline— y declarar en el reporte, por cada una: si tiene encabezado,
  qué clases usa, qué rótulos muestra y si esos rótulos pasan por `lib/i18n.ts`. Las cuatro primeras
  están relevadas en `design.md`; las dos últimas son la pregunta abierta que esta tarea cierra.
- [x] 1.2 Declarar cuáles de esas superficies quedan dentro del alcance y cuáles no, con el motivo.
  Si Pipeline tiene encabezado propio, entra sólo su encabezado: su disposición es otro trabajo.

## 2. La pieza única

- [x] 2.1 Crear el encabezado de contenido como una pieza con una sola firma visual, tomando como
  base la de la vista de autoría, que es la que hoy resuelve el caso correctamente. Acepta contenido
  libre a la izquierda y contenido libre a la derecha.
- [x] 2.2 Migrar el encabezado del historial a la pieza, sin cambiar lo que muestra.
- [x] 2.3 Migrar el encabezado de la vista de autoría a la pieza, sin cambiar lo que muestra.
- [x] 2.4 Migrar el encabezado del grafo clásico a la pieza, conservando el ancho arrastrable de sus
  columnas y los tiradores que lo gobiernan. El arrastre es lo que más fácil se rompe en esta
  mudanza: verificarlo explícitamente.
- [x] 2.5 En tests, cubrir que las superficies migradas siguen mostrando lo que mostraban y que el
  arrastre de columnas del grafo clásico sigue invocando lo que invocaba. Afirmar sobre el llamado,
  no sobre el render.
- [x] 2.6 Fijar la altura de la pieza de modo determinista, sin depender del alto de línea heredado
  del texto. Debe valer exactamente los 36 px de `ROW_H` (`components/CommitGraph.tsx:23`), que es el
  módulo con el que calzan las filas del grafo. El encabezado tenía `h-9` justamente por eso, y al
  migrarlo a la pieza esa altura pasó a derivarse del contenido.
- [x] 2.7 Dar a las filas del grafo clásico el mismo relleno lateral que la pieza, de modo que el
  encabezado y sus datos compartan margen y las columnas queden alineadas. Hoy la pieza aporta
  `px-4` y las filas arrancan en el borde, así que los rótulos no caen sobre sus columnas. Las filas
  de historial ya llevan ese relleno y por eso ahí el encabezado calza.
- [x] 2.8 **Toca `components/CommitGraph.tsx`, protegido por el invariante 12. Cuenta con
  autorización explícita de Alejandro del 2026-08-21**, acotada a lo que declara 2.7: el relleno
  lateral del contenedor de fila, para que el encabezado y sus datos compartan margen. No alcanza a
  la geometría de las lanes, ni a `PADDING_LEFT`, `LANE_W`, `graphColumnWidth` ni al SVG que dibuja
  el grafo, ni a ninguna otra parte del archivo. Ante cualquier otra necesidad, frenar y reportar.
- [x] 2.9 Verificar que el indicador de rama seleccionada, que se posiciona en absoluto contra el
  contenedor de fila, sigue pegado al borde izquierdo y no se corre con el relleno nuevo.
- [x] 2.10 Comprobar en la aplicación que cada rótulo del encabezado cae sobre su columna de datos y
  que la altura del encabezado calza con la de las filas. **La comprueba Alejandro.**

## 3. Rótulos

- [x] 3.1 Llevar a `lib/i18n.ts`, en ES, EN y ZH, los cinco rótulos de columna del grafo clásico, hoy
  escritos en inglés dentro del JSX.
- [x] 3.2 Dar consumidor a `history.header`, que existe en los tres idiomas y hoy no lo tiene, o
  retirarla si el relevamiento muestra que el rótulo debe decir otra cosa. La vista arma hoy su
  rótulo por interpolación al lado de la clave huérfana: no pueden convivir las dos formas.
- [x] 3.3 Llevar a `lib/i18n.ts` el segundo rótulo del historial, el que informa cuántos commits
  quedan filtrados de cuántos, con la interpolación de valores que el módulo ya soporta. No armar el
  nombre de ninguna clave por concatenación.
- [x] 3.4 Actualizar el test de paridad de claves con las agregadas y las retiradas.
- [x] 3.5 En tests, cubrir que ningún rótulo de encabezado queda escrito dentro de un componente.

## 4. El grafo cronométrico recibe encabezado

- [x] 4.1 Ubicar el encabezado en el contenedor común de los dos modos del grafo, por encima de lo
  que alterna entre ellos, de modo que aparezca en ambos.
- [x] 4.2 **`components/ChronometricGraph.tsx` NO se edita.** Si la implementación parece exigirlo,
  frenar y reportar en lugar de tocarlo: está protegido por el invariante 12 y la autorización
  vigente no alcanza a este alcance.
- [x] 4.3 Declarar en el reporte cuánto alto pierde el lienzo cronométrico, en píxeles.
- [x] 4.4 Comprobar que el lienzo cronométrico sigue siendo legible y utilizable con ese alto menor:
  la proyección depende del alto disponible. **La comprueba Alejandro.**

## 5. El selector de modo se muda

- [x] 5.1 Mover el selector de modo clásico/cronométrico del panel lateral al encabezado del grafo,
  conservando sus íconos, sus rótulos, su `aria-pressed`, su `title` y su `aria-label`.
- [x] 5.2 Retirar del panel lateral la fila del selector y su reserva de altura, y renumerar los
  comentarios de la cabecera que quedan corridos.
- [x] 5.3 Verificar que el selector sigue sin aparecer cuando el grafo cronométrico está apagado en
  los ajustes, y que apagarlo ya no deja hueco en ninguna vista.
- [x] 5.4 En tests, cubrir que el selector ya no está en el panel lateral, que está en el encabezado
  del grafo, y que no aparece en las demás vistas. Los tests que hoy cubren la fila del panel lateral
  se reescriben, no se borran.
- [x] 5.5 Los tests del selector afirman hoy contra un doble de traducción que devuelve las cadenas
  castellanas que el propio test define, de modo que seguirían pasando si las claves desaparecieran
  de `lib/i18n.ts`. Al reescribirlos, afirmar sobre la clave que el doble emite y dejar la cobertura
  del texto real al test de paridad, que sí lee el módulo.

## 6. El anuncio de ramas especulativas

- [x] 6.1 Hacer que el anuncio consulte la preferencia de ramas especulativas por repositorio que ya
  existe, además de las condiciones que ya evalúa. Hoy sólo la enciende al recibir el clic, y nunca
  la lee para decidir si mostrarse.
- [x] 6.2 Llevar a `lib/i18n.ts`, en ES, EN y ZH, el rótulo del anuncio y su tooltip, hoy escritos en
  castellano dentro del componente. Con la aplicación en inglés o en chino, hoy se leen en castellano.
- [x] 6.3 Llevar del mismo modo el indicador de filtro activo que vive junto al anuncio, escrito en
  castellano dentro del mismo componente.
- [x] 6.4 **No tocar los colores literales** del anuncio ni de ninguna superficie migrada: los
  resuelve `unificar-paleta-carbon-soul` con la verificación de color que ese change declara.
  Declarar en el reporte cuántos quedaron a la vista, sin corregirlos.
- [x] 6.5 En tests, cubrir que el anuncio no aparece cuando la preferencia está en ocultar, y que
  sigue apareciendo y llevando al modo cronométrico cuando está en mostrar. Afirmar sobre el llamado.

## 7. Cierre y validación

- [x] 7.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [x] 7.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada
  una.
- [x] 7.3 `openspec validate unificar-encabezado-de-contenido --strict` en cero.
- [x] 7.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en
  Git.
- [x] 7.5 Informar cuántas superficies quedaron usando la pieza única y cuántas quedaron fuera, con
  el motivo de cada exclusión. Si quedó más de una implementación de encabezado, el problema se
  duplicó en lugar de resolverse.
- [x] 7.6 Revisión visual y funcional en la aplicación: el encabezado se ve igual en todas las vistas,
  el selector de modo está en el grafo y opera, ninguna vista deja hueco al cambiar de una a otra, el
  lienzo cronométrico sigue legible con menos alto, y los rótulos aparecen traducidos al cambiar de
  idioma. **La marca Alejandro.**
