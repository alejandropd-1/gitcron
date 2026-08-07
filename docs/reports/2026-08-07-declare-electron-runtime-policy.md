# El proyecto declara sobre qué runtime corre

**Change:** `declare-electron-runtime-policy` · **Fecha:** 2026-08-07 · **Tareas:** 12/13 (falta que Ale
confirme la redacción)

## Qué se hizo

`AGENTS.md` declara que la aplicación corre sobre Electron 42 y qué implica para el uso de funciones del
navegador. `openspec/config.yaml` lo menciona y remite, sin copiar el texto. Ningún cambio de código.

## Por qué hacía falta

GitCron empaqueta su propio Chromium: el motor no lo elige quien abre la aplicación, lo fija el proyecto
al fijar la versión de Electron. Eso cambia por completo la respuesta a «¿esto necesita un plan B?», y
no estaba escrito en ninguna parte.

El caso concreto ocurrió en esta misma sesión, al implementar `fade-active-change-reorder`. La guía de
prácticas modernas devolvió que las transiciones de vista son «Baseline newly available» desde
2025-10-14 y describió su estrategia de respaldo. Parte del trabajo fue decidir si ese respaldo hacía
falta acá; la respuesta en este proyecto es siempre la misma, y sin declararla se vuelve a razonar cada
vez. El riesgo peor no es la demora: es que alguien escriba el respaldo por las dudas y quede código que
nunca se ejecuta y hay que mantener igual.

## Dónde vive, y por qué acá es al revés

La política va en `AGENTS.md` y el canal la menciona. Eso invierte lo que se hizo con la regla de la
rama, donde la regla vive en el canal y `AGENTS.md` remite.

No es incoherencia: cambia quién la consume. La regla de la rama la cumple un ejecutor que pide
instrucciones al CLI, así que el canal es su lugar. Esta política la lee además la herramienta que
responde consultas sobre prácticas web, cuyas instrucciones dicen explícitamente que busca la política
de soporte en `CLAUDE.md` o `AGENTS.md` —y que sugiere documentarla cuando el proyecto corre sobre un
runtime acotado como Electron—. Ponerla sólo en el canal la dejaría donde esa herramienta no mira, que
es exactamente el error que este proyecto viene corrigiendo.

Se comprobó que no existe `CLAUDE.md` en el repositorio, así que `AGENTS.md` es el archivo que las
herramientas van a encontrar.

La coherencia útil no es que todas las reglas vivan en el mismo archivo: es que cada una viva donde la
lee quien tiene que cumplirla.

## Dos decisiones de redacción

**Nombra la versión.** Dice «Electron 42», no «Electron» a secas. Una política sin versión no se puede
evaluar más adelante: nadie sabría contra qué se escribió. Que haya que tocarla al actualizar Electron
es el costo de que signifique algo.

**Declara el límite junto con el permiso.** Un permiso sin límite se lee como «usá lo que quieras»:
habilitaría funciones detrás de banderas, o reescribir código que ya funciona sólo porque ahora se
podría de otra forma. La declaración dice qué se puede asumir del motor, nada más.

## Comprobación

`openspec instructions design --change declare-electron-runtime-policy --json` devuelve el contexto con
la mención de la política, a continuación de la regla de la rama.

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **106 archivos / 777 tests**, sin variación: no se tocó
código. `openspec validate declare-electron-runtime-policy --strict` válido.

## El riesgo, nombrado

Si algún día el producto tuviera que correr fuera de Electron, la política queda vieja y habilitaría
decisiones equivocadas. No tiene mitigación técnica porque es documentación; lo que la hace revisable es
que nombre la versión concreta.

## Sin medir

No se midió cuántas veces se re-discutió esta pregunta antes. Se conoce un caso, el de esta sesión, y se
declara como un caso y no como una tendencia.
