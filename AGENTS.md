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
   propia rama; la regla, con su mando y qué hacer si la rama ya existe, viaja por el canal.
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
