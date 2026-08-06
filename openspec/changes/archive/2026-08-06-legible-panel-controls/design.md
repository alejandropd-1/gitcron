## Context

Los controles del panel se agregaron de a uno, cada uno resolviendo su caso: `.primaryAction` y
`.secondaryAction` vienen del panel de trabajo, `.groupToggle` llegó con la agrupación por procedencia,
`.startPendingToggle` con la pantalla de entrada y `.repoHealthCta` con el commit a nivel de
repositorio. Ninguno se decidió mirando a los otros, y el resultado es que todos usan el mismo cian
sobre marco tenue.

La invariante 11 pide denso, oscuro, productivo. Nada de esto la contradice: la densidad es de
información, no de tamaño de letra, y un panel donde hay que leer cada botón para saber cuál pesa más
no es productivo.

La concordancia de número no tiene mecanismo hoy: `translate` interpola `{{count}}` y nada más.

## Goals / Non-Goals

**Goals:**

Que se distinga sin leer cuál es la acción principal, cuál es de apoyo y cuál despliega. Que los
textos dejen de estar al límite. Que los títulos de grupo, su descripción y su lista se lean como tres
cosas. Que los conteos concuerden.

**Non-Goals:**

La paleta general de la aplicación. El ancho de los paneles de artefactos. La atribución de código.

## Decisions

**Tres niveles, tres tratamientos, un color por nivel.** La acción principal se mantiene en cian
sólido, que es el único relleno del panel y por eso ya se distingue. Las de apoyo pasan a marco claro
sin relleno y texto neutro, reservando el cian para el estado activo. Los controles de lista
—desplegar, sumar un grupo— pasan a un tercer tratamiento más liviano y con un tono propio, el verde
que el panel ya usa para lo hecho, porque son controles de contenido y no de acción sobre el
repositorio. Se descartó darles un color nuevo: la paleta ya tiene cuatro tonos con significado y
sumar uno quinto para jerarquía visual haría competir el significado con la jerarquía.

**El tamaño sube un escalón, no dos.** Los controles pasan de `0.6`–`0.68rem` a `0.72`–`0.78rem`, y las
áreas crecen con el padding, no con altura fija. Se descartó llevarlos al tamaño del cuerpo: el panel
mostraría menos y la densidad es el punto.

**La concordancia se resuelve en una función, no en cada llamada.** Una única función elige entre la
clave singular y la plural según el conteo, y todos los textos con número pasan por ella. Se descartó
repetir el ternario en cada punto de uso: son cinco lugares hoy y el sexto se olvidaría. Se descartó
también implementar reglas de pluralización en `translate`: el español y el inglés sólo necesitan
uno-frente-a-varios, y el chino no concuerda, así que un motor completo resolvería un problema que
este proyecto no tiene.

**El chino recibe la misma clave con el mismo texto.** No concuerda en número, así que la variante
singular repite la plural. Se descartó omitir la clave en chino: el test que exige las tres lenguas
fallaría, y la ausencia se leería como un olvido en vez de como una decisión.

**El aire va debajo del título y encima de la lista, no dentro de las filas.** Las filas ya se airearon
antes por un motivo propio —el checkbox y la ruta se leían como un bloque— y volver a tocarlas
alargaría la lista sin resolver lo que se busca. Se descartó separar sólo con margen del título:
la línea divisoria que ya tiene el rótulo quedaría flotando lejos de lo que divide.

## Risks / Trade-offs

**Cambiar tamaños puede desbordar contenedores que estaban justos.** → Los controles crecen con
padding y `font-size`, no con anchos fijos, y todos viven en contenedores con `flex-wrap`. La
comprobación real es la validación visual de Ale.

**Usar el verde para los controles de lista puede confundirse con «hecho».** → El verde de estado
aparece en insignias y puntos, no en controles; el de los controles va en el texto y el marco de algo
claramente apretable. Si en la revisión se confunden, cambiar el tono es una línea.

**Agregar variantes de singular duplica claves.** → Cinco pares, no un sistema. Si el número creciera
mucho, convendría un motor de pluralización; con cinco, un motor es más código del que ahorra.

## Open Questions

Ninguna que bloquee. Queda para la validación visual si el escalón de tamaño alcanzó o quedó corto.
