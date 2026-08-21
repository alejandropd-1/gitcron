## Relevamiento

El nombre visible vive en nueve valores de `lib/i18n.ts`. Las claves siguen diciendo `pipeline`; lo
que cambia es lo que devuelven.

| Clave | ES | EN | ZH |
|---|---|---|---|
| `tab.pipeline` | línea 57 | línea 1874 | línea 3673 |
| `pipeline.title` | línea 230 | línea 2047 | línea 3846 |
| `pipeline.hud.title` | línea 645 | línea 2458 | línea 4257 |

`shortcuts.pipelineTab` —líneas 1253, 3066 y 4784— nombra el atajo y también dice Pipeline.

Fuera de esos valores, la palabra aparece 107 veces más en el árbol, siempre como identificador
interno: claves, nombres de capacidad, nombres de archivo y de componente. Ninguno se lee en pantalla.

## Decisiones

### La sigla no se traduce

SDD queda igual en castellano, inglés y chino. La aplicación ya deja sin traducir «Commit» y
«Stash» cuando el término es el que se usa al hablar del oficio, y una sigla de tres letras no gana
nada al transliterarse. En chino esto además corrige un problema real: `流水线` traduce «línea de
producción» y arrastra exactamente el malentendido que motiva el change.

Si en algún lugar hace falta desplegar qué significa la sigla, esa expansión sí se traduce, y va en
una clave aparte. Hoy no hay ninguna superficie que la muestre.

### Las claves no se tocan

`tab.pipeline` sigue llamándose `tab.pipeline` aunque devuelva «SDD». Separar el identificador del
rótulo es lo normal en una capa de traducción, y renombrar las claves obligaría a tocar los 107
archivos que las consumen sin que nadie note la diferencia.

Esto deja una divergencia declarada: **el nombre que la persona lee ya no coincide con el que usa el
código**. Queda escrita en el spec para que quien lea `pipeline.*` dentro de un año sepa que mira la
vista SDD y no un resto de otra cosa.

### El identificador de vista tampoco

`activeTab === 'Pipeline'` sigue diciendo `'Pipeline'`. Es el mismo caso: un valor interno que
gobierna qué se renderiza, no un texto.

## Preguntas abiertas

- **¿Aparece «Pipeline» escrito dentro de algún componente, fuera de `lib/i18n.ts`?** El relevamiento
  contó las menciones pero no distinguió cuáles llegan a pantalla. La primera tarea lo verifica: si
  alguna quedó escrita en el JSX, es un incumplimiento del invariante 8 y se corrige llevándola a la
  capa de traducción, no reemplazando el literal.
