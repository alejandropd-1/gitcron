## Why

El mensaje sugerido para un commit sale hoy de las rutas de los archivos y, desde
`attribute-files-to-change`, de la rama. Con eso llega a `chore(pipeline): mi-cambio`: nombra **de qué
cambio** es el trabajo y no dice **qué se hizo**. El tipo es siempre `chore` porque el diff no distingue
una corrección de una función nueva, y afirmarlo sería inventar.

Ale lo planteó así: «vos que estás viendo todo sabés qué poner en el mensaje, ¿cómo se puede lograr algo
así?». La respuesta es que la intención existe en el momento de la acción y la aplicación la está
reconstruyendo después, a partir de los restos. Hay que capturarla en el origen, y el ejecutor es el
único que la tiene mientras trabaja.

## What Changes

**Este cambio no está decidido.** Hay dos rutas y `design.md` las contrasta con lo medido. Nada se
implementa antes de que Ale confirme cuál. Lo que en cualquier caso entra:

- El mensaje sugerido puede decir qué fue el trabajo, no sólo a qué cambio pertenece.
- Lo sugerido declara de dónde salió, en el panel donde se lo va a confirmar.
- Nada se confirma solo: la sugerencia sigue siendo editable y no pisa lo que una persona escribió.

## Capabilities

**Modified Capabilities**
- `pipeline-guided-workflow`: el mensaje sugerido para el commit puede llevar qué fue el trabajo, con el
  origen de esa afirmación declarado.

## Impact

- `lib/change-commit-scope.ts` conserva su forma: es puro y cualquier dato nuevo entra como parámetro.
- El panel de preparación, para declarar de dónde salió la sugerencia.
- Según la ruta que se elija: la composición de la instrucción que recibe el ejecutor, y la proyección de
  la sesión.

**Fuera de alcance:** confirmar el commit automáticamente, y pisar un mensaje ya escrito. Las dos cosas
están decididas desde antes y este cambio no las toca.

**Fuera de alcance:** usar las rutas de los `tool.completed` de `Edit`/`Write`. Serían la fuente más
fuerte, pero los normalizadores redactan las rutas antes de que lleguen a la proyección
(`electron/pipeline/runtime/runtime-projection.ts:56`) y revertir esa redacción es una decisión de
privacidad aparte.
