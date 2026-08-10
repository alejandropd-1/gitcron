## Contexto

`git:push` (`electron/ipc/git-sync.ts:394`) corre `g.push()` a secas y, si falla, mira el mensaje: cuando
dice «no upstream branch» reintenta con `--set-upstream`. Cualquier otro fallo se propaga tal cual y la
vista lo muestra crudo.

Ese reconocimiento por texto **ya existe**, entonces. Lo que falta no es la idea sino la cobertura: hoy
cubre un caso y los demás caen al cartel rojo con la salida de Git.

El caso que Ale pisó no es raro. Se produce con dos pasos que cualquiera hace: renombrar una rama que ya
tenía upstream, y volver a empujar.

## Decisión: reconocer por texto, y sólo lo que se reconoce con certeza

Un módulo puro toma el texto de error de Git y devuelve un fallo identificado o «no lo reconozco».

**Alternativa descartada: parsear los códigos de salida.** Git usa `1` para casi todo, así que no
distinguen nada.

**Alternativa descartada: traducir toda la salida.** Es tentador y es una trampa: produciría textos en
castellano que *parecen* explicar y que en realidad son una traducción literal de algo que ya era
incomprensible. Peor, tapa el original. Lo que no se reconoce se muestra como viene.

El módulo es puro y se prueba con los textos reales de Git, no con paráfrasis. El de este caso está
guardado íntegro en el proposal.

## Decisión: la explicación trae la acción, y la acción la ejecuta la persona

Cada fallo reconocido lleva qué pasó, y cuando existe, un botón con la salida.

Para el desajuste de nombre, la salida es reapuntar el vínculo: `git push -u origin <rama>`. Hoy eso
obliga a abrir la terminal, y es la parte que más molesta del episodio — GitCron **puede** hacerlo y no lo
ofrece.

**Nada se ejecuta solo.** Empujar y reapuntar tocan el remoto, y este proyecto ya tiene decidido que eso
lo pide una persona. La aplicación explica y ofrece; el clic es de ella.

**Alternativa descartada: reapuntar automáticamente al detectar el desajuste.** Ahorraría el clic y es
justo lo que Git se negó a hacer, por buenos motivos: hay dos nombres y sólo la persona sabe cuál es el
que quiere conservar. Automatizarlo puede dejar una rama publicada con un nombre que ya no describe nada,
que es como llegó este repositorio a tener `origin/change/name-task-in-commit-message`.

## Decisión: el texto original nunca se pierde

La explicación se muestra arriba; el texto de Git queda accesible, plegado.

**Alternativa descartada: reemplazarlo.** Cuando la explicación acierta, el original sobra. Cuando se
equivoca —y va a pasar—, es lo único que permite entender qué pasó de verdad, y quien busca ayuda afuera
lo necesita textual para poder pegarlo.

## Riesgos

**Reconocer mal un fallo y sugerir la acción equivocada.** → Mitigación: los patrones se prueban contra
textos reales; ante la duda el fallo queda sin reconocer, que degrada a lo de hoy y no a algo peor.

**Los mensajes de Git cambian entre versiones y con `LANG`.** El reconocimiento por texto es frágil por
construcción. → Mitigación: no reconocer no rompe nada. Y queda anotado: si alguna vez falla en una
versión distinta, el síntoma es que vuelve el cartel crudo, no un consejo equivocado.

## Sin medir

Con qué frecuencia aparece cada fallo en el uso real. Se conocen los que están en el código y el que Ale
pisó hoy; el resto sale de la documentación de Git y no de haberlos visto acá.
