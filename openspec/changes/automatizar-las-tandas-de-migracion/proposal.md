## Why

Las dos migraciones grandes de este proyecto —la paleta de color y la escala tipográfica— llegaron a
cero con el mismo método: una línea de base que sólo puede bajar, un detector que declara qué
recorre, y tandas chicas con el plan cerrado antes de ejecutarlas. El método funciona. Lo que no
escala es **quién lo opera**.

Hoy cada tanda cuesta tres trabajos: relevar los casos, escribir el prompt, y auditar el reporte.
El primero necesita criterio. **Los otros dos no**, y son los que consumen el grueso del contexto de
la sesión que orquesta. En las cuatro tandas de i18n del 2026-08-31 el modelo local no falló ni una
vez, pero cada una necesitó que alguien leyera su reporte y contara sus números a mano.

Y hay un costo medido del lado del ejecutor. La tanda `i18n-4` incluyó la consigna «enumerá
cualquier texto suelto que haya quedado en esos tres `.tsx`». Esa sola línea obligó al modelo a
leer archivos enteros —uno de 3.836 líneas— y disparó la compactación del cliente a mitad de tanda.
La consigna la escribió la sesión que orquesta, no el ejecutor: **es un defecto del prompt, y un
prompt generado por un script no lo habría cometido**, porque la detección de texto suelto es un
grep y le corresponde al auditor.

Este change construye esa línea de montaje. **No migra nada**: deja las piezas para que la
migración de i18n —69 strings en 24 archivos, ya medidas— se dimensione sola y corra sin que nadie
lea un reporte.

Va aparte de la migración por tres motivos. El generador y el auditor no son de i18n, son de
«migrar X contra una línea de base», y la próxima migración los reusa. Adentro del change de i18n
quedarían atados a él y mal etiquetados. Y sobre todo: **las tandas no se pueden dimensionar hasta
que el generador exista**. En la migración de i18n la mitad de las claves ya estaban en el
diccionario, y ese número cambia la cantidad de tareas; escribirlas antes de saberlo es adivinar.

## What Changes

- **El detector vive en su propio archivo y entrega una forma fija.** Cada candidato es
  `{ archivo, linea, texto, ancla, sugerencia? }`. `ancla` es el texto único que el ejecutor va a
  buscar; `sugerencia` es lo específico de la tarea —para i18n, la clave que ya existe con ese
  texto—. Las otras piezas no saben qué están procesando.
- **Se busca la clave existente antes de inventar una.** Es mecánico: comparar el texto contra los
  valores del diccionario. En la migración de i18n fue la mitad de los casos, y en tres de ellos la
  traducción ya estaba escrita en inglés y en chino sin que nadie la usara.
- **El detector se diseña permisivo.** Un falso positivo cuesta una línea en la línea de base, que
  se marca una vez como «esto no va». Un caso que se escapa cuesta una migración incompleta que se
  descubre meses después. El detector de i18n se corrigió ocho veces en las dos direcciones y las
  correcciones caras fueron siempre las de omisión.
- **El prompt lo escribe un emisor con reglas, no una persona.** Siete, y la primera es que
  **nunca pide inventario**: ni «enumerá los que queden», ni «revisá si hay otros», ni «verificá que
  no quedó nada». Esa clase de consigna se va al auditor, donde es un grep exhaustivo y gratis.
- **Un validador revisa el prompt antes de que salga.** Es la pieza que saca a la sesión que
  orquesta del bucle: sin ella, cada tanda necesita que alguien lea el prompt a mano.
- **El auditor devuelve tres estados, no dos.** `OK` sigue, `FALLO` para, y **`HALLAZGO` sigue y
  encola**. Con dos estados cualquier sorpresa parece una falla y corta la cadena. Es la misma forma
  que los prompts ya le dan al ejecutor con «si aparece alguno MÁS, PARÁ y reportá»: una manera de
  señalar lo imprevisto sin romper nada. Al auditor le faltaba.
- **La guarda de i18n es una prueba, no un script.** `lib/__tests__/i18n-scan.test.ts` con línea de
  base, igual que `visual-scale-scan` y `ui-color-scan`. Un script hay que acordarse de correrlo;
  una prueba corre sola y falla el build. Esos dos llegaron a cero justamente por eso.

## Non-Goals

- **No se migra ninguna string.** Las 69 pendientes son el change siguiente, con las tandas ya
  dimensionadas por el generador.
- **No se extrae todavía el núcleo genérico.** El detector se escribe como si fuera sólo para i18n.
  Con dos casos —color e i18n— se confunde una coincidencia con un patrón; con tres ya no. En la
  tercera migración se mira qué quedó igual y ahí se extrae. Las dos excepciones, que sí nacen
  genéricas porque no tienen nada de i18n adentro, son el validador del prompt y el auditor.
- **No se tocan los ajustes del cliente local.** Bajar el overhead de OpenCode —un agente con sólo
  `read`, `edit`, `grep` y `glob`, y `compaction.prune` en `true`— es trabajo aparte.
