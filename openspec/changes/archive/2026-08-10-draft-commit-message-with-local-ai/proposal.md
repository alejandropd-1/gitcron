## Why

El mensaje sugerido para un commit sale de las rutas de los archivos y, desde `attribute-files-to-change`,
de la rama. Llega a `chore(pipeline): mi-cambio`: nombra **de qué cambio** es el trabajo y no dice **qué se
hizo**. El tipo es siempre `chore` porque el diff no distingue una corrección de una función nueva, y
afirmarlo sería inventar.

Ale lo planteó así: «vos que estás viendo todo sabés qué poner en el mensaje, ¿cómo se puede lograr algo
así?». Se probaron dos rutas deterministas y las dos se descartaron **midiendo**, no opinando: nombrar la
tarea de la sesión y nombrar las secciones de `tasks.md` que se cerraron. Las dos producen precisión falsa
—los detalles están en `design.md`—.

Lo que faltaba era el criterio, no la fuente: todo se descartaba por no ser derivable de forma
determinista, y un modelo de lenguaje no necesita que lo sea. Está comprobado sobre un commit real de este
repositorio: un modelo local de 12B leyó el diff y devolvió
`feat(pipeline): implementar la atribución de archivos a cambios`, acertando el tipo, que es exactamente
el dato que ninguna fuente del repositorio contiene.

## What Changes

- El panel ofrece redactar el mensaje del commit con un modelo local, como acción explícita.
- Un selector muestra los modelos que la máquina tiene **en ese momento**, con su estado, el contexto con
  el que están cargados y de qué dispositivo son. Ningún modelo queda fijo en el código.
- El endpoint del servidor local es configurable: hoy `http://localhost:1234` está escrito en el código
  del proveedor de Cartografía.
- Cuando el modelo elegido no está cargado o su contexto no alcanza, el panel declara el costo antes de
  cargarlo y lo carga acotado en el tiempo.
- Lo redactado se muestra rotulado como escrito por un modelo, nunca como afirmación de la aplicación, y
  no pisa lo que una persona haya escrito.

## Capabilities

**Modified Capabilities**
- `pipeline-guided-workflow`: el mensaje sugerido puede llevar qué fue el trabajo, redactado por un modelo
  local, con el origen y el costo de esa afirmación declarados.

## Impact

- `electron/ai/` — un proveedor local con endpoint configurable, hermano del que ya existe para
  Cartografía. La invocación del CLI `lms` para cargar un modelo con el contexto necesario.
- El panel de preparación: el selector, la acción y el rótulo de procedencia.
- `lib/change-commit-scope.ts` conserva su forma: es puro y cualquier dato nuevo entra como parámetro.

**Sin dependencias nuevas.** El CLI `lms` ya está instalado y se invoca con `execFile` sin shell —es
`lms.exe`, no un `.cmd`—, y el servidor habla HTTP con `fetch`.

**Fuera de alcance:** confirmar el commit automáticamente, y pisar un mensaje ya escrito. Están decididas
desde antes y este cambio no las toca.

**Fuera de alcance:** mandar el diff a un proveedor en la nube. El diff es el código del usuario, y para
eso existe el camino local.

**Fuera de alcance:** el loop agente de `add-lmstudio-agent-runtime`. Redactar una línea es una llamada a
`/v1/chat/completions` sin tools; ese change construye otra cosa y este no depende de él.
