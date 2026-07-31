## Why

`fatal: Unable to create '.git/index.lock': File exists` aparece seguido y no es casualidad: la
aplicación no serializa sus operaciones de Git.

Git protege su índice con ese lock. Dos procesos que lo toquen a la vez hacen fallar al segundo, y
si uno se corta a la mitad el archivo queda huérfano y bloquea todo lo que venga después. Con
Pipeline abierto, el watcher dispara relecturas de evidencia —`status`, `branchLocal`, `log`— que
caen encima de un commit o de un archivado. `git status` también toca el índice, así que compite.

El propio código ya conocía el problema: `git:stage-batch` existe justamente para evitar N `git add`
en paralelo, con un comentario que lo dice. Lo que faltaba era generalizar ese cuidado en vez de
resolverlo caso por caso. Y el archivado con commits, agregado en `sign-and-commit-from-archive`,
sumó contención nueva.

Hoy el único recurso es el botón "Eliminar lock", que borra el archivo sin comprobar si hay un Git
corriendo. Eso es un remedio para el síntoma y, si de verdad hay una operación en curso, puede
dejar dos procesos escribiendo el índice.

## What Changes

- Una cola por repositorio en el proceso principal: dos operaciones de Git sobre el mismo índice no
  pueden solaparse. Repositorios distintos siguen corriendo en paralelo.
- Se aplica a las operaciones que hoy chocan: las lecturas de evidencia de Pipeline, el archivado
  con sus commits, y los canales de comando y staging.
- **No** se aplica todavía a todos los canales de `git-ops.ts`. La cobertura es parcial y se declara
  como tal: reduce las colisiones, no las elimina.
- No se toca el botón de eliminar lock: sigue haciendo falta para locks huérfanos de procesos
  externos a la aplicación.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-repo-evidence`: la lectura de evidencia no compite con otras operaciones de Git sobre el
  mismo repositorio.

## Impact

- `electron/git/repo-queue.ts` — nuevo.
- `electron/pipeline/repo-evidence-reader.ts`, `electron/pipeline/pipeline-service.ts`,
  `electron/ipc/pipeline-archive.ts`, `electron/ipc/git-ops.ts`.
- Sin dependencias nuevas.
