## Context

Tres capas dicen hoy cómo se trabaja acá, y no coinciden entre sí:

1. **El CLI de OpenSpec** — `openspec status --json` da el grafo de artefactos con estados
   `blocked`/`ready`/`done`; `openspec instructions <artefacto> --json` da template, contexto y
   reglas. Es lo que consultan los comandos `opsx` que ya están instalados en `.agent/workflows/` y
   `.opencode/commands/`.
2. **`AGENTS.md`** — repite el flujo del CLI y **agrega** la firma, el `commit.md` y el reporte
   obligatorio. Sólo lo lee quien lo abre.
3. **El código de GitCron** — implementa la firma y el manifiesto en
   `electron/pipeline/change-commit-manifest.ts`, y los ejecuta al archivar.

`.claude/commands/` no existe, así que Claude nunca vio los comandos `opsx`: trabajó con la capa 2.
Ése es el modo de falla que este change corrige de raíz.

**Verificación previa.** Antes de proponer nada se comprobó en este repositorio que
`openspec/config.yaml` es un canal real: escribiendo `context` y `rules` allí, aparecen en la salida
de `openspec instructions <artefacto> --change <id> --json`, tanto globales como por artefacto. Sin
esa comprobación, mover la metodología ahí habría sido una apuesta.

## Goals / Non-Goals

**Goals:**

- Que las reglas de trabajo lleguen a cualquier ejecutor por el canal de la herramienta.
- Que no quede ninguna convención propia que un agente no pueda descubrir consultando el CLI.
- Que archivar signifique lo que OpenSpec dice que significa.
- Que los documentos dejen de contradecirse entre sí y con la realidad medible.

**Non-Goals:**

- Reconstruir la confirmación en Git. Este change retira el acoplamiento; el reemplazo va aparte.
- Tocar `derivePipelineNextAction` ni el modelo de fases del panel. Es el otro trabajo grande,
  necesita validación visual y mezclarlo haría imposible saber qué rompió qué.
- Forkear el schema de OpenSpec. Los comandos de schema están declarados experimentales por el
  propio CLI, y `config.yaml` alcanza para lo que este change necesita.
- Reescribir `docs/00_FUENTE_DE_VERDAD.md` entero. Se corrige lo que está mal o contradice; su
  inventario de features sigue siendo útil.

## Decisions

**`config.yaml` en vez de un schema forkeado.** Ambos servirían para que la metodología viaje con la
herramienta. Se elige `config.yaml` porque es estable y `openspec schema` se anuncia como
experimental —"experimental and may change", dice el propio CLI—, y porque forkear el schema
aplicaría a los cuatro cambios activos, tres de los cuales no tienen artefactos que hoy son
obligatorios sólo acá.

**`AGENTS.md` no se elimina: se reduce a lo que el canal no cubre.** `config.yaml` alcanza a quien
corre el CLI; un ejecutor que nunca lo corra sigue necesitando saber que el método es OpenSpec. El
archivo queda como puerta de entrada y deja de ser fuente de reglas duplicadas.

**Las invariantes de producto se quedan donde están.** Seguridad, estética y features vivas no son
metodología de artefactos: son restricciones del producto. Se referencian desde `context` para que
un agente sepa que existen, pero `docs/01_INVARIANTES.md` sigue siendo su lugar. Copiarlas a
`config.yaml` crearía dos fuentes que se desincronizarían.

**El reporte deja de ser obligatorio, no se prohíbe.** En esta misma sesión un reporte fue lo que
permitió registrar que un cambio **no** mejoró el rendimiento, y eso valía más que el cambio. Se
retira la obligación —que estaba escrita en tres lugares— y queda la práctica.

**Lo que se retira del código se retira entero.** `change-commit-manifest.ts` exporta cinco cosas:
`SIGNATURE_TASK_TEXT`, `markSignatureTask`, `parseCommitManifest`, `deterministicChangePaths` y
`archiveCommitPaths`. Las dos últimas son derivación pura —dado un id de cambio y una lista de
archivos modificados, cuáles pertenecen a ese cambio— y **no dependen de ninguna convención**: se
conservan, porque son exactamente lo que la futura acción de confirmar en Git va a necesitar. Las
tres primeras se van.

Esto es deliberado y contradice una lectura apresurada del alcance: no se borra el módulo entero.
Borrar las dos funciones puras para reescribirlas después sería trabajo tirado y una ventana en la
que la capacidad no existe.

## Risks / Trade-offs

- **Queda un hueco: hoy el botón commitea y mañana no.** → Es el punto de la migración y está
  declarado como **BREAKING** en la propuesta. Confirmar en Git sigue disponible con las
  herramientas de Git que la aplicación ya tiene; lo que desaparece es que ocurra solo al archivar.
- **`config.yaml` sólo llega a quien corre `openspec instructions`.** → Un agente que escriba
  artefactos a mano no lo ve. Es una mejora respecto de hoy, no una garantía: hoy no lo ve nadie que
  no abra `AGENTS.md`.
- **Corregir cifras en `00_FUENTE_DE_VERDAD.md` las vuelve a desactualizar mañana.** → Por eso se
  corrigen las que contradicen a otro documento o a un comando real, y no se agregan cifras nuevas
  que haya que mantener. Un número que sólo se puede verificar corriendo la suite no debería estar
  escrito en tres lugares.
