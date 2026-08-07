## Decisión: mostrar es el objetivo, ejecutar es la salida

Lo que este cambio agrega es, ante todo, **estado visible**: si el repositorio tiene OpenSpec, qué
herramientas usa y cuáles tienen sus archivos instalados. La acción de inicializar es la salida que se
ofrece a partir de eso, no el punto.

**Alternativa descartada: sólo ofrecer el botón de inicializar.** Era el plan original y es menos
trabajo. Se descarta porque no cubre el caso que más duele, que no es «falta OpenSpec» sino «OpenSpec
está y una de las herramientas quedó afuera». En `odontoPau` ese estado convivió con un repositorio
perfectamente inicializado, y sólo se descubrió cuando un artefacto salió mal. Un botón no lo habría
mostrado; una lista de herramientas con su estado, sí.

Es además lo que el panel existe para hacer: mostrar qué está pasando con el método para que la persona
lo sepa antes, no para que la aplicación decida por ella.

## Decisión: la detección de herramientas la hace el CLI, no el panel

Al inicializar se ejecuta `openspec init` sin `--tools`, y el comando detecta las herramientas presentes.

**Alternativa descartada: que el panel liste las treinta herramientas y la persona elija.** Fue la
decisión anterior de este documento y quedó obsoleta al medir: `init` detecta solo por los directorios
del repositorio, y con `.codex`, `.agent` y `.claude` presentes configuró las tres sin intervención. Que
el panel replique esa lista sería mantener una copia de algo que el CLI ya sabe, y que envejece cuando
OpenSpec agregue o quite una herramienta.

Sólo se pregunta cuando el comando falla con «No tools detected», que es el caso en que exige `--tools`.

## Decisión: el estado de cada herramienta se lee del disco

Para saber qué herramientas usa el repositorio y cuáles están configuradas se comparan dos cosas en
disco: qué directorios de herramienta existen —`.claude`, `.codex`, `.agent`, `.opencode` y los demás—
y cuáles de ellos contienen skills de OpenSpec.

**Alternativa descartada: preguntárselo al CLI.** Sería más directo si existiera un comando que lo
informe; no lo hay. `init` lo detecta pero como efecto de configurarlo, y correrlo para averiguar el
estado escribiría archivos, que es exactamente lo que no puede hacer una lectura.

**Contrapartida asumida:** la lista de directorios conocidos vive en el proyecto y puede envejecer si
OpenSpec agrega herramientas. Es aceptable porque el costo de no reconocer una es no mostrarla —el panel
queda como hoy— y no una afirmación falsa. Una herramienta que no se reconoce no se reporta como
faltante.

## Decisión: tres estados, no dos

El lector distingue: sin `openspec/`, con `openspec/` y alguna herramienta sin configurar, y todo en
orden.

**Alternativa descartada: inferirlo en la vista a partir de los contadores.** Se descarta porque cero
cambios activos y ausencia de OpenSpec ya coinciden en los contadores —un repositorio recién
inicializado muestra los mismos cuatro ceros—, y la vista deduciendo produce el fallo que Ale ya
detectó una vez: la guía diciendo «no hay ningún cambio activo» debajo de una lista con cuatro.

## Decisión: se declara antes de empezar, pero no se bloquea

Cuando falta inicializar, o cuando hay una herramienta presente sin configurar, el panel lo declara
**antes** de dejar empezar un cambio y ofrece resolverlo ahí mismo. No impide seguir.

**Alternativa descartada: bloquear hasta inicializar.** Garantizaría el pie derecho en el caso común y
es tentador. Se descarta por dos límites medidos. En un repositorio sin ningún directorio de
herramienta, `openspec init` **falla** con «No tools detected» y exige elegir a mano: bloquear ahí
trabaría el trabajo sin poder resolverlo solo. Y `init` sólo configura lo que ya está presente, así que
tampoco garantiza que la herramienta que se va a usar quede cubierta —es exactamente lo que pasó en
`odontoPau`, donde se inicializó bien cuando sólo había `.codex/` y Antigravity quedó afuera—. Un
bloqueo que no garantiza lo que promete es fricción sin la contrapartida.

**Alternativa descartada: inicializar solo, sin preguntar.** Es lo más cómodo y se descarta por la
invariante: escribir en un repositorio del usuario se declara antes de ocurrir. Además elegiría por él
en el caso en que hay que elegir herramienta.

Lo que sí se consigue es que nadie empiece **sin haberlo visto**. La decisión queda de la persona, que
es el criterio de este panel: mostrar lo que pasa para que se sepa, no decidir en su lugar.

## Decisión: inicializar no pierde lo que se escribió

Si se inicializa desde el aviso, el formulario vuelve con el objetivo y el slug que ya se habían
escrito.

**Alternativa descartada: volver al formulario vacío.** Es más simple de implementar. Se descarta
porque castiga a quien hizo lo correcto: la persona escribió su idea, el panel le avisó de algo que no
sabía, y perder el texto por atender ese aviso convierte la advertencia en un costo. El aviso tiene que
ser barato de atender o se aprende a ignorarlo.

## Riesgos

**Inicializar escribe en un repositorio del usuario.** Mitigación: se enumera antes qué se va a escribir
y la acción es humana. Está medido que `init` no pisa el `config.yaml` —comprobado por hash sobre
`odontoPau`, donde el archivo quedó idéntico— y que es incremental.

**La inicialización falla a mitad.** Mitigación: informar el error real sin normalizarlo y releer la
evidencia, para que el panel muestre el estado que hay y no el que se esperaba.

## Sin medir

No se midió cuánto cuesta la detección de directorios en el refresco. Es una lectura de disco sobre unas
pocas decenas de rutas, del mismo orden que las que el lector ya hace, pero es una estimación y no una
medición.
