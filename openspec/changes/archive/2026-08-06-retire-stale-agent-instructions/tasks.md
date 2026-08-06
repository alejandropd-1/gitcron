## 1. Retiro

- [x] 1.1 Crear `docs/historico/` y mover ahí `CLAUDE_CODE_PROMPT.md`, `NEXT_AGENT_OPTIMIZATION_PROMPT.md` y `docs/02_ROADMAP.md`
- [x] 1.2 Mover `docs/briefs/` entero, con su `_done` adentro, para que la ruta que el roadmap nombra deje de existir — `mv` del directorio falló con permiso denegado (bloqueo de Windows), se hizo copiando el contenido y borrando el original
- [x] 1.3 Usar `mv` y no `git mv`: mover no es preparar, y preparar es del flujo de commit

## 2. Cada uno declara que no rige

- [x] 2.1 Poner en cada archivo una nota de encabezado que declare que está retirado, desde cuándo y qué lo reemplazó
- [x] 2.2 Poner la nota arriba del texto que podría tomarse como orden, no en un índice aparte que dependa de que alguien lo abra primero

## 3. Verificación

- [x] 3.1 Confirmar que ninguno de los cuatro queda referenciado desde `AGENTS.md`, `openspec/config.yaml` ni `docs/01_INVARIANTES.md`
- [x] 3.2 Confirmar que no queda en la raíz ni en `docs/` ningún otro artefacto que imparta instrucciones de trabajo sin mencionar la metodología vigente

## 4. Cierre

- [x] 4.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 4.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de una regresión
- [x] 4.3 Dejar `openspec validate retire-stale-agent-instructions --strict` válido
- [x] 4.4 Ale confirma que el roadmap archivado le sirve donde quedó, o pide moverlo a otro lado
