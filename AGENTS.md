# GitCron — instrucciones operativas para agentes

Estas reglas aplican a Codex, Claude, OpenCode, Antigravity y cualquier otro ejecutor.

## Cómo se trabaja acá

El método es **OpenSpec**, y no hay otro. Todo trabajo de producto pasa por un change:

1. `openspec list --json` para ver qué hay activo.
2. `openspec new change "<slug>"` para abrir uno. El slug empieza con letra y sólo admite
   minúsculas, dígitos y guiones, sin guiones consecutivos ni finales.
3. `openspec status --change "<slug>" --json` para saber qué artefacto toca.
4. `openspec instructions <artefacto> --change "<slug>" --json` antes de escribir cada uno.
5. Implementar contra `tasks.md`, marcando cada casilla al terminarla.
6. `openspec validate <slug> --strict` antes de entregar.

Los artefactos son la fuente de verdad del alcance. Si algo no está en el change, no es parte
del trabajo; si hace falta, se amplía el change explícitamente, no de palabra.

## Antes de tocar código

1. Leer `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`.
2. Verificar Git y disco. Un reporte o un handoff describen lo que era cierto cuando se
   escribieron, no lo que hay ahora.
3. Si existe `.codegraph/`, usar CodeGraph antes de grep o lectura amplia.

## Cierre de un change: firma y manifiesto

Cada change termina con una tarea de firma cuyo texto es **literal** y no se parafrasea:

```
- [ ] X.Y Archivado confirmado por Ale desde la aplicación
```

La marca esa tarea el botón de archivar, y **sólo** esa. Dice lo que el click prueba —que una
persona confirmó el archivado con el alcance a la vista— y nada más: no afirma que se haya revisado
el resultado, porque el gesto no lo demuestra. Las demás tareas sin marcar quedan sin marcar; si
hay pendiente real, el archivo tiene que decirlo.

Cada change lleva además `commit.md` con el alcance de su commit de trabajo. Hace falta declararlo
porque el árbol puede tener varios changes en curso y nada dice qué archivo es de cuál:

```markdown
## Mensaje

feat(alcance): una línea

## Archivos

- ruta/uno.ts
- ruta/dos.tsx
```

Los artefactos del propio change y su reporte no se enumeran: son rutas deterministas y entran
solas. Antes de ejecutar, la aplicación muestra ambos mensajes, los archivos que entran y **los
modificados que quedan fuera**, para que una omisión del manifiesto se vea antes y no después.

## Cierre de tanda

Sólo dos comprobaciones son obligatorias, y no por ceremonia sino para no romper el build:

- `pnpm exec tsc --noEmit` en cero.
- `pnpm test` en verde.

Más `openspec validate <slug> --strict` válido.

Además, un **reporte escrito en `docs/reports/`** con qué se tocó, qué no se tocó y el
resultado real de esas comprobaciones. Declarar "verificado" sin haber corrido el comando es
la única falta que invalida una tanda entera.

## Rutinas que pide Ale

Estas **no** se ejecutan por iniciativa del agente. Se corren cuando Ale las pide:

- `pnpm exec fallow` — análisis de complejidad y deuda.
- CodeGraph — mapa de arquitectura e impacto.
- `pnpm exec eslint` sobre el repo completo, `pnpm run package:build`, u otros análisis lentos.

Sobre los archivos que se tocan, el lint sí se corre y se deja limpio.

## Seguridad y Git

- No leer, imprimir ni persistir secrets, `.env`, tokens, cookies ni reasoning privado no emitido.
- El renderer no recibe credenciales, sockets privilegiados, shell/argv/PID libres ni paths sin validar.
- No agregar dependencias sin aprobación explícita de Ale.
- No ejecutar `git add`, commit, push, merge, tag ni release salvo autorización explícita de Ale.
- La aplicación sí puede confirmar en Git al archivar un change, y esa es la única excepción: el
  click de archivado ES la autorización, por acción, con el mensaje y la lista exacta de archivos a
  la vista antes de ejecutar. Nunca publica: `push`, `merge` y `tag` siguen siendo manuales.
- Cuando se sugiera staging, enumerar los archivos exactos. Nunca agregar un directorio completo.
- Una sesión de agente que escriba en el working tree exige confirmación humana explícita antes
  de arrancar.

## Ante la duda

Preguntar, no asumir. Frenar y reportar cuesta una vuelta; adivinar cuesta una tanda.
