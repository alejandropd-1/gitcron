# La regla de la rama, en el canal

**Change:** `carry-branch-rule-in-config` · **Fecha:** 2026-08-06 · **Tareas:** 10/11 (falta que Ale
confirme la redacción)

## Qué se hizo

La convención de trabajar cada cambio en `change/<slug>` pasó a `openspec/config.yaml`, de donde el CLI
la entrega a cualquier ejecutor que pida instrucciones. `AGENTS.md` la menciona y remite al canal, sin
repetirla.

No se tocó código. `branch-on-change-creation` sigue creando la rama desde el formulario de la
aplicación exactamente como estaba.

## Por qué en `context` y no en `rules`

`openspec instructions <artefacto> --change <id> --json` devuelve `context` y `rules` como campos
distintos, y se comportan distinto: `rules` viaja sólo con el artefacto al que pertenece, mientras que
`context` sale con cualquiera que se pida. Se comprobó pidiendo `tasks` —no `proposal`— y la regla
apareció igual.

Eso decide el lugar. La rama se crea al abrir el cambio, antes de escribir el primer artefacto, así que
atarla a `rules.proposal` la haría llegar sólo a quien empiece por la propuesta. En `context` llega
pida lo que pida, que es lo que hacía falta: el problema original era justamente que la regla vivía
donde no pasaba quien tenía que cumplirla.

Va además pegada al bloque de Git que ya estaba en `context`, que es donde alguien la busca.

## El estado de partida, medido

Antes de tocar nada: `git branch --list "change/*"` devolvió **cero** sobre **35 ramas locales**, con
quince cambios archivados desde que `branch-on-change-creation` existe. La convención estaba
implementada y no se había aplicado ni una vez, porque los cambios de este proyecto los crea un
ejecutor con `openspec new change` desde la terminal y ese camino no pasa por el formulario.

## Qué dice la regla

Nombra el mando concreto —`git checkout -b change/<slug>`— y qué hacer si la rama ya existe: informarlo
y no reutilizarla, porque cambiarse a una rama con trabajo de otro cambio arrastra sus commits y eso lo
decide una persona. Es el mismo criterio que ya se había fundamentado al implementar la creación desde
la aplicación, y se conserva textualmente para que las dos vías no diverjan.

Dice explícitamente que vale igual si el cambio se creó desde la terminal, porque ése es el caso
habitual y el que quedaba sin cubrir.

La primera redacción cerraba con que crear la rama era "lo único que esta regla habilita", y Ale la
objetó por el motivo correcto: una regla existe para que él se entere de lo que pasa, no para dejar al
ejecutor con las manos atadas. Confundir ambas cosas convierte el método en fricción. La versión final
dice que crear la rama es parte de abrir el cambio y no algo que haya que pedir —es local, reversible y
no publica nada— y que lo que se informa es que se creó y con qué nombre.

El límite quedó fijado por Ale el mismo día, y es de visibilidad, no de desconfianza: la rama sí, el
commit y el push no. Un commit es el registro que él quiere leer, así que lo hace él.

## La comprobación

```
openspec instructions tasks --change carry-branch-rule-in-config --json
```

El `context` devuelto incluye el párrafo completo, a continuación del bloque de Git. Se eligió `tasks`
a propósito: si la regla hubiera quedado atada al primer artefacto, este pedido no la habría traído.

## Lo que esto no resuelve

No garantiza que la regla se cumpla. Una regla en el canal llega a quien pide instrucciones, y no hay
forma de obligar a nadie a pedirlas. Cierra que la convención fuera invisible, que es un problema real
por sí mismo, pero la comprobación honesta es contar ramas `change/*` más adelante, no suponer que con
esto ya está.

Tampoco entra qué hace el archivado con la rama, ni fusionarla, ni borrarla, ni pararse en ella al
abrir un cambio existente. Ale acotó ese alcance cuando se hizo `branch-on-change-creation` y el
recorte sigue en pie.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **101 archivos / 736 tests**, verde en las dos corridas
de esta tanda, mismo conteo que la base. No se tocó código, así que la suite no podía moverse: se corrió
igual porque declarar verde sin haber corrido el comando invalida la tanda.
`openspec validate carry-branch-rule-in-config --strict` válido.

## Lo que habilita

`attribute-files-to-change`, cuya fuente de atribución Ale eligió que fuera la rama. Hasta que empiecen
a aparecer ramas `change/*` reales, ese cambio no puede rendir nada.
