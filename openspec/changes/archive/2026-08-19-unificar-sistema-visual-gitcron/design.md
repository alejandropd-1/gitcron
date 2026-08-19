## Context

GitCron tiene cuarenta variables CSS y todas son de color, radio o disposición: ninguna de tipografía
ni de espaciado. Los tamaños se escriben literales en cada módulo, y el resultado medido son veinte
valores distintos de `font-size`, de los cuales ciento dieciocho declaraciones quedan por debajo de
doce píxeles. No hay regla que se esté incumpliendo: no hay regla.

El armazón, en cambio, sí tiene la intención declarada. `app/globals.css` define
`--color-bg-base` como fondo de página y `--color-bg-surface` con el comentario «Toolbars, Sidebars,
list panels», que es exactamente la separación entre armazón y contenido. Lo que falta es aplicarla
de forma consistente y darle geometría al encuentro entre ambas superficies.

Los controles de disposición también existen: `components/TopBar.tsx` expone `onToggleSidebar` y
`onToggleDetails`, cableados desde `app/page.tsx`, con claves de traducción propias. El trabajo sobre
ellos es de presentación y de área objetivo, no de funcionalidad.

El invariante 11 fue revisado el 2026-08-19 por decisión de Ale: se retiraron «denso» y la
prohibición de textos explicativos, y se incorporó la referencia a aplicaciones de trabajo que
muestran mucha información sin comprimirla. Este change implementa esa revisión.

## Goals / Non-Goals

**Goals:**

Que la aplicación tenga un sistema visual verificable en lugar de una acumulación de decisiones
puntuales: una escala de tipografía y espaciado que se respete, una separación clara entre el
armazón y aquello sobre lo que se trabaja, y un piso de accesibilidad que no dependa de que alguien
se acuerde de mirarlo.

**Non-Goals:**

Cambiar lo que la aplicación hace. Tocar la geometría de los grafos, protegida por el invariante 12.
Agregar dependencias de interfaz. Rediseñar la paleta de color, que se conserva entera.

## Decisions

**La escala se define en tokens y se verifica por test, no por revisión.** Se agregan variables de
tipografía y espaciado junto a las de color existentes, y una prueba recorre las hojas de estilo
rechazando valores fuera de escala. La alternativa —acordar la escala y confiar en la revisión de
cada cambio— fue descartada por lo ya medido: veinte tamaños distintos son el resultado de años de
revisión visual sin regla que la sostenga. Una regla que no falla sola no es una regla, es una
intención.

**La verificación se implementa como función pura sobre el texto de la hoja de estilos.** Recibe el
contenido y devuelve las declaraciones que no usan token, de modo que se prueba con tablas de entrada
y salida sin depender del sistema de archivos ni de un navegador. Se evaluó usar un analizador de CSS
completo y se descartó: implicaría una dependencia nueva, sujeta a aprobación explícita por
AGENTS.md, para un problema que se resuelve reconociendo declaraciones en texto.

**El armazón se resuelve con los tokens de color que ya existen.** No se agregan colores: se aplica
`--color-bg-surface` a barra superior y lateral, `--color-bg-base` al área de contenido, y un radio
en el encuentro. La alternativa de introducir tonos nuevos se descartó porque la paleta ya declara
esta separación y sumar colores para expresarla dejaría dos formas de decir lo mismo.

**Los controles de disposición se conservan y se revisan.** No se reimplementan: ya funcionan y
tienen traducción. Lo que cambia es que quedan sujetos al área objetivo mínima y a mantener posición
entre vistas.

**El área objetivo se fija en 44 píxeles y no en los 24 exigibles.** El estándar pide veinticuatro
como mínimo de nivel AA; se adopta el valor reforzado porque los controles de esta aplicación
conviven muy juntos y varias acciones vecinas no son reversibles. El costo es que algunas barras y
filas compactas necesitan más alto, y se acepta.

**La migración avanza por módulo, con la verificación fallando desde el principio.** El test se
escribe antes de migrar y falla; el número de declaraciones que detecta se registra al empezar para
poder comparar. Se descartó migrar en silencio y activar la verificación al final: sin el número de
partida no hay forma de afirmar que se completó, sólo de suponerlo.

## Risks / Trade-offs

**La migración toca hojas de estilo de pantallas que hoy funcionan** → No hay pruebas automáticas de
corrección visual más allá de las reglas que este change introduce, de modo que una regresión de
disposición puede pasar. La mitigación es avanzar por módulo y dejar la verificación visual humana
declarada como tarea de cierre, no como supuesto.

**Un piso de 44 píxeles puede desbordar barras hoy compactas** → No está medido cuántos controles
quedan por debajo ni cuánto crece cada barra. El test de la tarea correspondiente lo informa antes de
migrar, y si algún caso resultara inviable se declara y se decide, en lugar de bajar el umbral en
silencio.

**Subir los tamaños reduce lo que entra en pantalla** → Es el efecto buscado y también el riesgo: una
lista que antes mostraba doce filas puede mostrar nueve. La mitigación es jerarquía y agrupamiento,
no volver a achicar; si alguna vista pierde utilidad, se rediseña esa vista.

**El invariante revisado puede leerse como permiso para aflojar** → El requisito de escala no admite
tamaños fuera de rango en ninguna dirección, y el de prosa prohíbe repetir y anteponer texto a la
acción. La sobriedad se conserva por regla verificable, no por adjetivo.

## Migration Plan

Primero la escala y su verificación, con el número de partida registrado. Después el armazón, que es
donde el cambio se percibe y donde el riesgo es menor porque son fondos y un radio sobre estructura
existente. Después la migración por módulo, empezando por Pipeline, que es la superficie más densa y
la que motivó el trabajo. Por último la revisión de prosa repetida y la verificación humana.

No hay migración de datos ni cambios de contrato. Revertir es descartar cambios no confirmados en
Git. Cada módulo migrado es independiente: si uno resulta problemático se puede dejar para después
sin bloquear el resto, con la salvedad de que la verificación automática lo seguirá señalando hasta
que se complete, que es el comportamiento buscado.

## Open Questions

Cuántos controles quedan hoy por debajo del área objetivo y cuánto crecen las barras al corregirlos.
No está medido; lo informa la verificación antes de migrar.

Si la escala necesita un paso intermedio adicional para las tablas y listas más densas, o si alcanza
con jerarquía de peso y color. Se resuelve al migrar Pipeline, que es el caso más exigente.
