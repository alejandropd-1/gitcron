# El commit del archivado deja de repetir al del trabajo

**Change:** `label-archive-commit-message` · **Fecha:** 2026-08-06 · **Tareas:** 15/16 (falta la
validación de Ale en la aplicación)

## Qué se hizo

Cuando el conjunto que se va a preparar es un archivado, el mensaje sugerido intercala `archived` antes
del identificador: `chore: archived <slug>`. El resto de los casos queda igual.

Una sola función tocada: `suggestCommitMessage` en `lib/change-commit-scope.ts`.

## El defecto, medido sobre un commit real

El circuito de un cambio produce dos commits, y la aplicación sugería el mismo texto para los dos.
`e5081b8 chore: carry-branch-rule-in-config` es el trabajo y
`8f96418 chore: archived carry-branch-rule-in-config` es el archivado, pero la palabra la escribió Ale
a mano. El patrón se repite hacia atrás en todo el historial —`chore: archived render-openspec-markdown`,
`chore: archived retire-stale-agent-instructions`—, siempre agregado a mano.

Se comprobó qué entra en un commit de archivado con `git show --name-status -M 8f96418`: cuatro `R100`
de `openspec/changes/<slug>/` a `openspec/changes/archive/2026-08-06-<slug>/`, más una `M` de la spec
consolidada. Todas las rutas que aportan identificador aportan el mismo, así que `soleChangeId`
devolvía el slug y el mensaje salía idéntico al del trabajo.

Se usó `--name-status -M` a propósito: `git show --stat` trunca las rutas largas y oculta las flechas
de renombre, y con esa salida no se ve que el archivado sea un movimiento.

## Lo que no se tocó, y por qué

Que `soleChangeId` cuente los archivados es deliberado y se conserva. Antes no lo hacía, y el commit de
archivado —el que mejor se puede describir— quedaba con `chore: ` pelado, que es lo que empujaba a
partirlo en dos. El problema nunca fue que nombrara el cambio: era que no decía de qué commit se
trataba.

Tampoco se tocó el agrupamiento. Las dos mitades de un archivado siguen yendo juntas: separarlas rompe
la detección de renombres de Git y `git log --follow` deja de alcanzar el commit donde se escribió el
artefacto.

## Reconocer el archivado por la ruta

El conjunto se considera un archivado cuando alguna de sus rutas aporta el identificador desde
`openspec/changes/archive/…`. Se descartó reconocerlo por los renombres, que sería más preciso, porque
obligaría a meter estado de Git en un módulo que hoy es puro sobre una lista de rutas —y esa pureza es
lo que permite probarlo con tablas—.

El costo se asume y se declara: editar el artefacto de un cambio archivado hace tiempo, sin archivar
nada, también diría `archived`. No es falso, el caso es infrecuente, y la sugerencia no pisa lo escrito
ni se confirma sola. No se midió con qué frecuencia ocurre.

## El caso mezclado gana

Un conjunto que abarca un archivado y otro cambio sigue devolviendo la descripción vacía. Esa ausencia
es la señal de que el commit está mezclando trabajos y llega antes de confirmar; rellenarla con el
identificador del archivado escondería justo el caso donde hace falta que una persona escriba el
mensaje. Hay una prueba nueva que lo fija.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **101 archivos / 738 tests**, verde en dos corridas
seguidas. Son dos tests más que la base de 736, y son exactamente los dos que se agregaron: el commit
del trabajo que no lleva la etiqueta, y el archivado mezclado que deja la descripción vacía. Lint limpio
sobre los dos archivos tocados. `openspec validate label-archive-commit-message --strict` válido.

## Lo que falta

Ale valida en la aplicación: archivar un cambio y ver que el mensaje sugerido ya trae `archived` sin
escribirlo.
