## 1. Punto de partida

- [ ] 1.1 Declarar la medición de partida, para que el cierre tenga contra qué compararse:
  correr `node scripts/detectar-i18n.mjs` e informar hallazgos, archivos y desglose por clase.
  Al 2026-09-01 la medición daba **69 strings en 24 archivos** —TEXTO 44, RAMA 13, ATRIBUTO 12—
  sobre 73 `.tsx` de `components/` y `app/`.
- [ ] 1.2 Declarar los límites conocidos del detector actual, que el cierre tiene que haber
  resuelto o vuelto a declarar: no ve strings sueltas en código (`setError('...')`,
  `throw new Error('...')`, donde viven casi todos los mensajes de error) ni template literals con
  interpolación. Ambas familias se descubrieron el 2026-08-31, cuando un ejecutor enumeró a mano 33
  strings en tres archivos que el script no veía.

## 2. El detector, en su propio archivo

Se escribe como si fuera sólo para i18n. La abstracción no se arma con dos casos.

- [ ] 2.1 Separar la detección del reporte: `scripts/deteccion/i18n.mjs` exporta una función que
  devuelve la lista de candidatos y no imprime nada. `scripts/detectar-i18n.mjs` queda como el
  reporte de línea de comandos que la consume, y sigue andando igual para quien lo use a mano.
- [ ] 2.2 Emitir cada candidato como `{ archivo, linea, texto, ancla, sugerencia? }`. `ancla` es el
  fragmento único que el ejecutor va a buscar, no el texto pelado: para un `placeholder="X"` el
  ancla es `placeholder="X"` completo, y no `X`.
- [ ] 2.3 Calcular la multiplicidad de cada ancla en su archivo y emitirla junto al candidato. En la
  tanda `i18n-4`, `placeholder="e.g. upstream"` aparecía dos veces y hubo que avisarlo a mano.
- [ ] 2.4 Cubrir las **strings sueltas en un conjunto declarado de llamadas** —`setError`,
  `throw new Error`, `toast`— y no todas las strings del código, que traería falsos positivos por
  camión. Ahí viven casi todos los mensajes de error, que son el texto que el usuario lee en el peor
  momento y hoy están en castellano para todo el mundo: `'Error al preparar rebase'`,
  `'Rebase fallido'`, `'Materialization failed'`.
- [ ] 2.5 Declarar **fuera de alcance los template literals con interpolación** —`` `Materialized
  as ${x}` ``—, con su motivo: necesitan clave con parámetros, que es otro contrato y merece su
  propia decisión. El detector los cuenta aparte y los informa, pero no los emite como candidatos.
- [ ] 2.6 Revisar que las exclusiones declaradas sigan siendo las que Alejandro decidió: jerga de
  Git, nombres propios —GitCron, GitHub, OpenSpec, `Temporal Agent`, `Brier`— y rotulación del HUD
  Centauro. Cada una con su fundamento escrito en el archivo, como está hoy.

## 3. El buscador de claves existentes

- [ ] 3.1 Dado un texto, devolver la clave del diccionario cuyo valor en español coincide
  exactamente, o nada. Es comparación de cadenas: no lleva criterio y no propone equivalencias.
- [ ] 3.2 Informar cuántos de los candidatos actuales resuelven con clave existente y cuántos
  necesitan clave nueva. **Ese número dimensiona el change siguiente** y hoy no se conoce: en las
  cuatro tandas del 2026-08-31 fue alrededor de la mitad, contando sobre las que se migraron.
- [ ] 3.3 Marcar aparte el caso que más apareció: clave que existe, con traducción ya escrita en
  inglés y en chino, y el componente escribiendo el texto a mano. Los tres placeholders de
  `RepoModals.tsx` estaban así, y un usuario en inglés veía `mi-nuevo-proyecto`.

## 4. El agrupador

- [ ] 4.1 Cortar la lista de candidatos en tandas de tres o cuatro archivos y hasta veinte
  ediciones, priorizando **el número de decisiones distintas por sobre el número de ediciones**.
  Las cuatro tandas del 2026-08-31 fueron de 11 a 27 ediciones y ninguna se acercó al techo de
  contexto; la que más lo tensó fue la de dieciséis claves nuevas.
- [ ] 4.2 Agrupar por archivo completo: una tanda no parte un archivo por la mitad, para que el
  auditor pueda decir «este archivo quedó limpio».
- [ ] 4.3 Informar el presupuesto de lectura de cada tanda en tokens estimados, para que el emisor
  lo escriba en el prompt. El espacio real de trabajo del ejecutor local es de unos **96.000
  tokens**: ventana de 110.000 menos unos 14.100 de overhead fijo del cliente.

## 5. El emisor de prompt

- [ ] 5.1 Escribir el prompt desde la lista agrupada, respetando las siete reglas: sin consignas de
  inventario; ubicación por ancla o rango y nunca por búsqueda; presupuesto de lectura en números;
  una sola clase de trabajo por tanda; criterio de terminación contable; ninguna decisión ya tomada
  trasladada al ejecutor; y cero comandos.
- [ ] 5.2 Conservar lo que ya venía funcionando en los prompts escritos a mano: anclaje por texto en
  vez de número de línea, aviso explícito cuando un ancla aparece más de una vez, lista cerrada de
  archivos, lista de intocables con su motivo, condiciones de parada enumeradas, traducciones dadas
  dentro del prompt, y entregable corto y contable.
- [ ] 5.3 Emitir el árbol esperado dentro del prompt —qué archivos sin confirmar va a encontrar—
  para que el ejecutor no los investigue, y la instrucción de parar si aparece alguno más.

## 6. El validador del prompt

Nace genérico: no tiene nada de i18n adentro.

- [ ] 6.1 Rechazar el prompt si contiene una consigna de inventario. Se comprueba por patrón sobre
  el texto emitido.
- [ ] 6.2 Comprobar que cada ancla del prompt existe en su archivo, y que su multiplicidad real
  coincide con la declarada.
- [ ] 6.3 Comprobar que hay presupuesto de lectura en números, que el criterio de terminación es
  contable, y que no se pide ejecutar ningún comando.
- [ ] 6.4 Informar qué regla se incumplió y dónde, y no emitir el prompt.

## 7. El auditor de tres estados

Nace genérico.

- [ ] 7.1 Devolver `OK`, `FALLO` o `HALLAZGO`, con el detalle en pocas líneas.
- [ ] 7.2 `HALLAZGO` no corta la corrida: se encola y queda listado al final.
- [ ] 7.3 Verificar por su cuenta, sin leer el reporte del ejecutor: cuántas ediciones se hicieron
  por archivo, que el diff no toque nada fuera de la clase de trabajo declarada, que no se hayan
  borrado comentarios, que ningún archivo fuera de alcance esté modificado, y que la suite no haya
  perdido pruebas.
- [ ] 7.4 Correr las validaciones en el orden que corresponde: `pnpm build` **antes** de `pnpm test`,
  porque la suite lee el CSS compilado de `out/`. Y ante un fallo de build con `ENOENT ...nft.json`,
  limpiar `.next` y reintentar una vez antes de declararlo (invariante 25).

## 8. La guarda con línea de base

- [ ] 8.1 Escribir `lib/__tests__/i18n-scan.test.ts` con el mismo contrato que
  `visual-scale-scan.test.ts` y `ui-color-scan.test.ts`: falla si aparece una string que la línea de
  base no declara, y falla también si una entrada declarada ya no aparece, para que el número no
  quede inflado.
- [ ] 8.2 Crear `lib/baselines/i18n-baseline.json` con las entradas actuales y las exenciones ya
  decididas, cada una con su motivo escrito, siguiendo el formato de los `_comment_exento_*` que ya
  usan las otras dos líneas de base.
- [ ] 8.3 Declarar en la cabecera del test qué archivos recorre (invariante 22).

## 9. Comprobar que las guardas detectan

- [ ] 9.1 Tres sabotajes, uno por vez, que maten **pruebas distintas**: una string de interfaz nueva
  escrita a mano; una entrada de la línea de base que se saca del código sin podar; y un prompt
  generado con una consigna de inventario, que el validador tiene que rechazar.
- [ ] 9.2 Saboteá el código y nunca la prueba, y restaurá **editando**, jamás con `git checkout`.
  Informar por cada sabotaje: qué se escribió, dónde, qué prueba cayó con qué mensaje, y que el
  árbol quedó como estaba.

## 10. Cierre y validación

- [ ] 10.1 `pnpm build` sin errores, primero y no como formalidad.
- [ ] 10.2 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 10.3 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de
  cada una. El punto de partida al 2026-09-01 es **173 archivos / 1538 pruebas**; si el número baja,
  se borró una prueba y hay que decirlo.
- [ ] 10.4 `openspec validate automatizar-las-tandas-de-migracion --strict` en cero.
- [ ] 10.5 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada
  en Git.
- [ ] 10.6 **Generar una tanda de i18n de punta a punta sin escribir una línea a mano** y comparar
  el prompt resultante con los cuatro de la sesión del 2026-08-31. Si el generado es peor, decir en
  qué y por qué. Esta tarea es la que demuestra que el change sirve.
- [ ] 10.7 Informar cuántas tandas necesita la migración de i18n según el agrupador, y con cuántas
  claves nuevas. **Ese es el insumo del change siguiente.**
