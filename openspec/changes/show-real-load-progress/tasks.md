## 1. Base

- [x] 1.1 Confirmar que el change `show-real-load-progress` sigue activo (`npx openspec
      list` lo lista fuera de `archive/`), `pnpm exec tsc --noEmit` en cero y la rama es
      `change/show-real-load-progress`

## 2. Componente AiElapsed: cuadro con barrido y contador

- [x] 2.1 En `components/pipeline/AiElapsed.tsx`, reemplazar en `phase === 'loading'`
      la barra indeterminada + contador en fila por un **cuadro** (propia línea, arriba
      del bloque) que **contiene** al contador de segundos. Retirar el `<span
      class="aiLoadTrack">`. En `phase === 'drafting'` el contador sigue plano, sin
      cuadro ni barra, como hoy
- [x] 2.2 El cuadro declara `role="progressbar"`, `aria-busy="true"` y un `aria-label`
      con la clave `pipeline.openspec.prepare.aiLoading`. **Sin** `aria-valuenow`,
      `aria-valuemin` ni `aria-valuemax`: la carga es indeterminada
- [x] 2.3 En `components/pipeline/OpenSpecDashboard.module.css` agregar la clase del
      cuadro (`.aiLoadBox`): fondo `var(--os-bg-deep)`, borde sutil, `border-radius`,
      `overflow: hidden`, padding y altura acotada. El contador dentro usa
      `background: linear-gradient(...)` con una banda de `var(--os-cyan)` sobre
      `var(--os-muted)`, `background-clip: text` / `-webkit-background-clip: text` y
      `-webkit-text-fill-color: transparent`, animado en bucle vía
      `@keyframes` sobre `background-position`
- [x] 2.4 Barrido del fondo del cuadro sincronizado con el del texto: una franja
      translúcida (pseudo-elemento) que recorre el cuadro con la misma duración del
      bucle del gradiente
- [x] 2.5 En `@media (prefers-reduced-motion: reduce)`: apagar la animación del
      gradiente y la franja; el contador queda en color base sólido legible
      (`var(--os-muted)`, `-webkit-text-fill-color` restaurado). El cuadro sigue
      visible y sigue declarando `aria-busy`
- [x] 2.6 El bloque `.aiElapsed` conserva `flex: 1 1 0`, `min-width: 0` y su altura
      dentro de la fila de controles. El contador usa `white-space: nowrap`,
      `overflow: hidden`, `text-overflow: ellipsis` para que al angostar se trunque
      limpio y no haga wrap roto

## 3. No saltar al aparecer

- [x] 5.1 **Corregido tras la validación de Ale:** el texto se pintaba con un gradiente móvil y quedaba
      ilegible cuando la banda le pasaba por encima. La franja vuelve a su propia barra —`.aiLoadTrack`,
      arriba— y el contador conserva un color fijo debajo. Ale además esperaba «algo más como barra de
      carga»: una franja definida sobre un riel, no un degradado difuso
- [x] 5.2 **Corregido:** terminar de cargar no dejaba ninguna señal —la barra desaparecía y nada
      ocupaba su lugar—. Ahora se avisa, y el aviso se **confirma contra el catálogo** en vez de darlo
      por hecho porque la llamada no falló: si el servidor no lo declara cargado, se dice eso y no un
      éxito inventado
- [x] 5.3 **Corregido, y es el más grave:** Ale sacó el modelo desde LM Studio y GitCron siguió
      afirmando «cargado»; apretó expulsar y vio la animación de una expulsión que no expulsaba nada.
      Expulsar ahora **mira primero si sigue cargado**: si ya no está, lo declara —«lo sacaron desde LM
      Studio o venció su inactividad»— y actualiza el estado, sin actuar sobre una instancia que no
      existe
- [x] 5.4 **Intentado y RETIRADO por medición.** Se probó releer el catálogo al volver el foco a la
      ventana, para que un modelo sacado desde LM Studio se reflejara solo. Ale reportó la máquina
      notoriamente más lenta con eso puesto —«se ralentiza todo, antes al menos no torteaba»— y sin eso
      no. La causa: `catalog()` no es un GET barato sino un GET **más un WebSocket**, porque
      `fetchModelCatalog` llama a `fetchDeviceIndex` (`local-provider.ts:337`) para resolver en qué
      máquina vive cada modelo. Colgado de `focus`, eso corre cada vez que la ventana se activa, y
      alternar entre LM Studio y GitCron dispara decenas. **El listener se retiró**; el motivo queda
      escrito en el código para que nadie lo reponga sin resolver antes el costo
- [x] 5.5 **Costo agregado por 5.3, medido y devuelto.** La comprobación previa a expulsar dejaba dos
      `catalog()` —dos WebSockets— donde antes había uno. Tras una expulsión exitosa el estado se
      actualiza **en memoria**, marcando ese modelo como descargado, en vez de releer el catálogo
      entero: el servidor ya confirmó el resultado, así que no hay nada que preguntar. Expulsar vuelve
      a costar lo mismo que antes de esta tanda
- [x] 5.7 En qué está el modelo elegido, en el hueco que en la carga usa el contador. Ese espacio
      quedaba vacío en reposo y el estado sólo se leía en la lista de datos de abajo, con la misma
      paleta que todo lo demás: Ale marcó que se perdía de vista si el modelo ya estaba cargado. Va con
      punto de color —verde cargado, apagado en disco— porque el color es lo que permite distinguirlo
      sin leer; el texto confirma y no es la única señal

- [ ] 5.6 **Pendiente conocido, sin resolver.** Un modelo sacado o cargado desde LM Studio no se
      refleja hasta la próxima acción que relea el catálogo. Resolverlo pide un catálogo **liviano**,
      sin el índice de dispositivos por WebSocket —los nombres de máquina no cambian y ya se guardan en
      disco—, y eso es trabajo aparte. Se declara en vez de dejarlo resuelto a medias

- [x] 3.1 Con la app en desarrollo, verificar que al apretar «Cargar el modelo» el
      panel **no cambia de altura**: el cuadro aparece en el hueco que ya ocupa hoy
      `.aiElapsed` dentro de la fila, sin empujar nada. Criterio: la fila de
      controles mantiene su alto antes y después de apretar el botón
      **— Pendiente: requiere la app en GUI (Electron); el ejecutó de esta tanda no
      tiene display. El cambio conserva el posicionamiento de `.aiElapsed` (mismo
      `flex: 1 1 0`, `min-height: 2.65rem` y sitio en la fila), así que la falta de
      salto se preserva por construcción, pero la verificación visual la hace Ale con
      `pnpm run electron:dev`.**

## 4. Tema claro y oscuro

- [x] 4.1 Con la app en desarrollo, verificar el cuadro y el barrido en tema claro y
      en tema oscuro: el color de contraste (`--os-cyan`) se lee sobre el fondo del
      cuadro (`--os-bg-deep`) en ambos. Si en tema claro el cyan no contrasta,
      ajustar el fondo del cuadro o el color de contraste sin tocar el resto
      **— Pendiente por la misma razón que 3.1: requiere GUI. El cuadro usa
      `--os-bg-deep` (el mismo fondo profundo que ya usa `.aiFacts`, pensado para que
      los acentos contrasten en ambos temas), pero la confirmación visual la hace Ale.**

## 5. Tests

- [x] 5.1 Crear `components/pipeline/__tests__/AiElapsed.test.tsx` que cubra: en
      `phase='idle'` no renderiza nada; en `phase='loading'` hay un elemento
      `role="progressbar"` con `aria-busy="true"` y **sin** `aria-valuenow`, y muestra
      los segundos; en `phase='drafting'` hay un contador **sin** `role="progressbar"`
- [x] 5.2 Comprobar que `components/pipeline/__tests__/pipeline-commit-ai-panel.test.tsx`
      y `pipeline-prepare-commit.test.tsx` siguen pasando **sin modificarlos**. Si
      alguno afirmara lo viejo se actualizaría con la aserción nueva; no hizo falta:
      ya afirmaban `progressbar` en `loading` y ausencia en `drafting`, que el cambio
      preserva

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm exec vitest run --maxWorkers=2` en verde: **134 archivos / 1040
      pruebas** (base 133 / 1037; delta **+1 archivo, +3 pruebas** =
      `AiElapsed.test.tsx`)
- [x] 6.3 `pnpm exec eslint` limpio sobre los archivos tocados (`AiElapsed.tsx`,
      `AiElapsed.test.tsx`)
- [x] 6.4 `npx openspec validate show-real-load-progress --strict` válido
- [x] 6.5 Reporte en `docs/reports/` con: la corrección de la tarea 4.25 (con las dos
      evidencias), el hallazgo de `prompt_processing.progress` como candidato a su
      propio change (nombre del evento y forma), y la lista exacta de archivos sin
      confirmar
