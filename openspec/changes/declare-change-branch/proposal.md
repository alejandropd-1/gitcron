## Why

La regla de la rama por cambio tiene cero cumplimiento medido: `git branch --list "change/*"` devuelve
vacío cuatro días después de escribirla, con unos diez cambios creados en ese lapso, todos trabajados en
`main`. La regla viaja por el canal y aun así no se cumple, así que completar su texto no alcanza: lo que
falta es que el panel muestre el estado real. Una regla con cero cumplimiento corroe el canal entero,
porque enseña que las reglas del canal son opcionales.

Hay además un segundo estado invisible y más caro: la rama desde la cual se crea otra. Este repositorio
tiene 35 ramas locales, y varias están deliberadamente sin fusionar. Medido hoy:
`claude/jolly-khayyam-2be14c` está 501 commits detrás de `main`, `fix/pipeline-launcher-empty-box` 107, e
`imagined/streaming-predicciones-via-ipc` 296 detrás con un commit propio sin fusionar. Crear
`change/<slug>` parado en cualquiera de ellas produce un cambio con una base vieja de meses, y nada lo
declara: `git checkout -b` no dice de dónde salió la rama.

## What Changes

- El panel declara cuándo el cambio abierto no se está trabajando en su rama `change/<slug>`, nombrando
  la rama actual y la que corresponde. No bloquea nada.
- Antes de crear la rama de un cambio nuevo, el panel declara la base: cuántos commits de `main` faltan
  bajo los pies y cuántos commits propios sin fusionar tiene la rama actual. Ofrece crear a partir de
  `main` como alternativa, sin decidir por la persona.
- Con el árbol de trabajo sucio no se crea la rama: los cambios sin confirmar viajarían con ella, y si
  son de otro cambio quedarían fuera de su lugar. Se declara y se ofrece la salida en vez de hacerlo
  igual.
- La comparación es contra el `main` **local**, declarado como tal. Saber si `main` mismo está atrasado
  respecto del remoto exige `git fetch`, que es red y no ocurre sin pedirlo.

## Capabilities

**New Capabilities**
- `change-branch-evidence`: qué declara el panel sobre la rama de un cambio y sobre la base desde la que
  se crea.

**Modified Capabilities**
- Ninguna. `pipeline-guided-workflow` cubre qué ofrece el panel al empezar un cambio; lo de acá es
  evidencia de Git sobre la rama, que es materia distinta y hoy no tiene requisito.

## Impact

- `electron/pipeline/` — lectura de la divergencia entre la rama actual y `main`, y de la
  correspondencia entre la rama y el cambio abierto. Entra al snapshot como evidencia.
- `components/pipeline/` — el aviso en el panel y la declaración de la base en el formulario de cambio
  nuevo, que ya crea la rama con `gitCreateBranch`.
- No se agregan escrituras de Git nuevas. Fusionar y borrar la rama siguen siendo acciones humanas y
  fuera de la aplicación.
