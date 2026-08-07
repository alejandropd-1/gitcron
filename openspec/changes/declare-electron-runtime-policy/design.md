## Decisión: la política vive en `AGENTS.md`, y el canal la menciona

La declaración se escribe en `AGENTS.md`, y `openspec/config.yaml` la nombra remitiendo a ella.

Esto invierte lo que se hizo con la regla de la rama, donde la regla vive en el canal y `AGENTS.md`
remite. No es incoherencia: cambia quién la consume. Aquella regla la cumple un ejecutor que pide
instrucciones al CLI, así que el canal es donde tiene que estar. Ésta la consume además una herramienta
—la guía de prácticas modernas— cuyas instrucciones dicen explícitamente que busca la política en
`CLAUDE.md` o `AGENTS.md`. Ponerla sólo en el canal la dejaría donde esa herramienta no mira, que es
justamente el error que este proyecto viene corrigiendo.

**Alternativa descartada: escribirla sólo en el canal**, por coherencia con la regla de la rama. Se
descarta por lo anterior: la coherencia útil no es que todas las reglas vivan en el mismo archivo, es
que cada una viva donde la lee quien tiene que cumplirla.

**Alternativa descartada: duplicarla completa en los dos lugares.** Garantiza que llegue por ambos
caminos. Se descarta porque dos copias del mismo texto divergen en cuanto una se edita, y ya hay
precedente en el proyecto de preferir la remisión sobre la copia.

## Decisión: nombrar la versión, no decir «Electron»

La política dice «Electron 42» y no «Electron» a secas.

**Alternativa descartada: dejarla sin versión**, para no tener que actualizarla al subir de versión. Se
descarta porque una política sin fecha ni versión no se puede evaluar: dentro de dos años nadie va a
saber contra qué se escribió ni si sigue valiendo. Con la versión escrita, quien la lea puede comparar
contra la actual y decidir. Que haya que tocarla al actualizar Electron es el costo de que signifique
algo.

## Decisión: declarar el límite junto con el permiso

La política dice qué se puede asumir y también qué no habilita.

**Alternativa descartada: escribir sólo el permiso**, que es más corto. Se descarta porque un permiso
sin límite se lee como «usá lo que quieras»: habilitaría funciones experimentales detrás de banderas, o
reescribir código que ya funciona sólo porque ahora se puede. Lo que se declara es qué se puede asumir
sobre el motor, no una invitación a modernizar lo que anda.

## Riesgo

**Que la política envejezca si el producto sale de Electron.** No tiene mitigación técnica: es
documentación. Lo que sí la hace revisable es que nombre la versión concreta, de modo que quede
evidente contra qué se escribió.

## Sin medir

No se midió cuántas veces se re-discutió esta pregunta antes. Se conoce un caso —el de
`fade-active-change-reorder`, en esta misma sesión— y se declara como un caso, no como una tendencia.
