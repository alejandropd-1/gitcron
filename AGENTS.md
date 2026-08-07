# GitCron — instrucciones operativas para agentes

Estas reglas aplican a Codex, Claude, OpenCode, Antigravity y cualquier otro ejecutor.

## Dónde vive el método

El método es **OpenSpec**, y no hay otro. Las reglas de trabajo —contexto del proyecto y reglas por
artefacto— viven en `openspec/config.yaml`, y **el CLI te las entrega** cuando pedís instrucciones:

```bash
openspec instructions <artefacto> --change "<slug>" --json
```

Ese es el canal. Una regla que sólo exista en este archivo no la ve quien no lo abra, y eso ya pasó
acá: un runtime sin los comandos instalados nunca vio el flujo y trabajó con reglas locales sin
saberlo. Si una convención vale, va al canal; si está sólo acá, no es vinculante.

## Cómo se trabaja

Todo trabajo de producto pasa por un change:

1. `openspec list --json` para ver qué hay activo.
2. `openspec new change "<slug>"` para abrir uno. El slug empieza con letra y sólo admite
   minúsculas, dígitos y guiones, sin guiones consecutivos ni finales. El cambio se trabaja en su
   propia rama, hasta el archivado inclusive; fusionarla y borrarla son acciones humanas. La regla
   entera —el mando, qué hacer si la rama ya existe y dónde termina— viaja por el canal.
3. `openspec status --change "<slug>" --json` para ver el estado de cada artefacto: `blocked`,
   `ready` o `done`. Las dependencias son habilitadoras, no barreras: se puede trabajar sobre
   cualquier artefacto que esté `ready`.
4. `openspec instructions <artefacto> --change "<slug>" --json` antes de escribir cada uno.
5. Implementar contra `tasks.md`, marcando cada casilla al terminarla.
6. `openspec validate <slug> --strict` antes de entregar.

Los artefactos son la fuente de verdad del alcance. Si algo no está en el change, no es parte del
trabajo; si hace falta, se amplía el change explícitamente, no de palabra.

**Archivar** es `openspec archive`: mueve el change a su histórico y consolida las specs. No toca
Git. Confirmar el trabajo en Git es una acción aparte y requiere autorización explícita.

## Antes de tocar código

1. Leer `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`.
2. Verificar Git y disco. Un reporte o un handoff describen lo que era cierto cuando se
   escribieron, no lo que hay ahora.
3. Si existe `.codegraph/`, usar CodeGraph antes de grep o lectura amplia.

## De dónde sale el método

La base es **OpenSpec**. Sus instrucciones —las que el CLI entrega con `openspec instructions`— son el
método, y este proyecto no las duplica ni las reescribe.

**Ninguna regla se escribe sin aprobación explícita.** Ni acá, ni en `openspec/config.yaml`, ni en un
repositorio ajeno. Se puede proponer una —con qué cubre y por qué OpenSpec no la cubre— pero escribirla
es una decisión humana. Una regla es método: obliga a todo el que venga después, y agregarla por cuenta
propia es exactamente cómo se acumularon las ocho que hubo que retirar.

Una regla propia existe **sólo si cubre algo que OpenSpec no cubre**, y tiene que poder justificarlo.
Antes de proponer una, se contrasta con la salida de `openspec instructions` del artefacto que
corresponda. Si ya está dicha ahí, no se propone: una regla repetida gasta atención en algo que el
ejecutor recibió dos párrafos antes, y entierra las que sí aportan.

Esto se midió, no se supuso. De dieciséis reglas que tenía este repositorio, ocho decían lo mismo que el
CLI ya entregaba, y se retiraron. Una de ellas se había agregado para arreglar un problema que resultó
ser otro: un ejecutor sin sus archivos instalados, que nunca llegó a pedir las instrucciones.

**El límite del principio.** OpenSpec es una implementación concreta del desarrollo guiado por
especificación, no un estándar ratificado. Ceder ante ella es la regla por defecto —evita reinventar lo
que ya está resuelto— pero no es un acto de fe: si en algún punto el criterio propio es mejor, se
sostiene y se escribe por qué. Lo que no se hace es escribir una regla sin haber mirado si ya existía.

## Sobre qué corre esto

GitCron es una aplicación de escritorio sobre **Electron 42**: empaqueta su propio Chromium. El motor no
lo elige quien abre la aplicación, lo fija este proyecto al fijar la versión de Electron.

Por eso, una función del navegador que ya esté disponible de forma amplia se puede usar **sin escribir
código de respaldo**. No hay que sostener navegadores viejos ni ajenos, y un respaldo escrito por las
dudas es código que nunca se va a ejecutar y que hay que mantener igual.

Esto no habilita todo. Quedan afuera las funciones experimentales o detrás de banderas, y no es una
invitación a reescribir código que ya funciona sólo porque ahora se podría de otra forma. Declara qué se
puede asumir del motor, nada más.

La versión está nombrada a propósito: si Electron sube, o si algún día esto tuviera que correr fuera de
Electron, esta declaración hay que revisarla.

## Seguridad y Git

- No leer, imprimir ni persistir secrets, `.env`, tokens, cookies ni reasoning privado no emitido.
- El renderer no recibe credenciales, sockets privilegiados, shell/argv/PID libres ni paths sin validar.
- No agregar dependencias sin aprobación explícita de Ale.
- No ejecutar `git add`, commit, push, merge, tag ni release salvo autorización explícita de Ale.
- Cuando se sugiera staging, enumerar los archivos exactos. Nunca agregar un directorio completo.
- Una sesión de agente que escriba en el working tree exige confirmación humana explícita antes
  de arrancar.

## Ante la duda

Preguntar, no asumir. Frenar y reportar cuesta una vuelta; adivinar cuesta una tanda.
