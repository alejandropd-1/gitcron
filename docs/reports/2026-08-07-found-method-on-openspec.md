# El método del proyecto se funda en OpenSpec

**Change:** `found-method-on-openspec` · **Fecha:** 2026-08-07 · **Tareas:** 10/11 (falta que Ale
confirme la redacción)

## Qué se hizo

`AGENTS.md` declara que la base del método es OpenSpec, cómo se comprueba antes de escribir una regla
propia, y cuál es el límite de ese principio. `openspec/config.yaml` lo menciona y remite. Ningún cambio
de código.

## Por qué hacía falta escribirlo

Este proyecto armó su método por reacción: cada vez que algo salía mal se escribía una regla para que no
volviera a pasar. Funcionó, pero nadie comprobaba si el problema ya estaba resuelto.

Se midió al auditar `openspec/config.yaml` contra `openspec instructions`: de dieciséis reglas, **ocho**
decían lo mismo que el CLI ya entrega. Se retiraron en `prune-duplicated-rules`.

El caso más caro fue `carry-task-form-in-config`. Agregó reglas de forma partiendo de que la convención
de numerar «se sostiene por imitación y no porque el canal la transporte». Era falso: el canal la
transporta, con ejemplo incluido. Ese change resolvió un problema que no existía, mientras el real —un
ejecutor sin sus archivos instalados, que por eso nunca pedía instrucciones— seguía sin tocarse.

Sin el criterio escrito, la próxima regla se escribe igual. Ya pasó una vez.

## Ninguna regla se escribe sin aprobación

La declaración incluye que una regla nueva requiere aprobación humana explícita, en `AGENTS.md`, en el
`config.yaml` o en un repositorio ajeno. Proponerla se puede; escribirla no.

El motivo es que una regla no es como un cambio de código. Un cambio se revierte mirando el diff; una
regla obliga a todo el que venga después y sobrevive a quien la escribió. Las ocho que hubo que retirar
se acumularon exactamente así: una por una, cada una razonable en su momento, ninguna contrastada contra
lo que el CLI ya entregaba.

Que se pueda proponer es parte del requisito y no una concesión. Quien detecta el hueco suele ser quien
está trabajando en ese momento; prohibir la propuesta perdería esa información. Lo que se reserva es la
decisión, no la observación.

## El límite, que importa tanto como el principio

La declaración dice explícitamente que **OpenSpec es una implementación concreta del desarrollo guiado
por especificación, no un estándar ratificado**. Ceder ante ella es el comportamiento por defecto
—evita reinventar lo que ya está resuelto— pero no es un acto de fe.

Sin ese límite, «la base es OpenSpec» se lee como «OpenSpec siempre tiene razón», y eso llevaría a tirar
criterio propio que funcionaba. Cuando el criterio del proyecto sea mejor en un punto, se sostiene y se
escribe por qué. Lo que no se hace es escribir una regla sin haber mirado si ya existía.

## Qué queda por revisar contra esta base

Se nombran acá porque salen del principio, y no se resuelven en este change:

- **El vocabulario del panel.** OpenSpec tiene cinco verbos —propose, apply, archive, explore, sync— y
  el panel nombra tres a su manera y no expone `sync`.
- **El circuito de commit y archivado.** Es una práctica de Ale, no una regla del método. Conviene saber
  cuál es y no confundirla con lo segundo.

## Resultado real de las comprobaciones

`openspec instructions` devuelve el contexto con la mención del principio, entre la regla de la rama y
la del runtime. `pnpm exec tsc --noEmit` en cero. `pnpm test` en **108 archivos / 780 tests**, sin
variación: no se tocó código. `openspec validate found-method-on-openspec --strict` válido.
