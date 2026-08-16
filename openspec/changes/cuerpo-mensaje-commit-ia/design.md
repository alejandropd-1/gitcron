## Context

En `electron/ai/commit-message/prompt.ts`, el `SYSTEM_PROMPT` exigía responder exclusivamente una única línea. Al mismo tiempo, `isConventionalSubject` validaba toda la cadena devuelta contra `SUBJECT_SHAPE` (`/^(feat|fix|...): .+/`), asumiendo una salida de una sola línea sin saltos. La interfaz de usuario (`StagingPanel.tsx`, `RepoDetailsPanel.tsx`) ya utiliza un `<textarea>` multilínea y `simple-git` en `electron/ipc/git-ops.ts:159` ya transmite el string íntegro a Git, que por estándar interpreta la primera línea como asunto y el texto tras la línea en blanco como cuerpo.

## Goals / Non-Goals

**Goals:**
- Extender `SYSTEM_PROMPT` para solicitar asunto convencional (<72 caracteres), línea en blanco y cuerpo explicativo conciso en prosa en español basado en el contexto provisto (intención del change, tareas cerradas, diff).
- Modificar `isConventionalSubject` para validar únicamente la primera línea del mensaje recibido.
- Medir el consumo real de tokens de salida de mensajes con cuerpo vs unilínea para calibrar `DEFAULT_MAX_TOKENS` y documentar la evidencia en el código.

**Non-Goals:**
- No alterar la interfaz de usuario ni agregar nuevos campos o archivos.
- No alterar la lógica de transporte IPC ni la persistencia de Git.
- No cambiar la estrategia de recorte de diff ni el orden de bloques en `buildUserPrompt`.
- No agregar dependencias ni recurrir a IAs pagas externas.

## Decisions

- **Decisión 1: Extracción de la primera línea en `isConventionalSubject`**:
  - *Elección*: Extraer `message.split(/\r?\n/)[0]` y evaluarla contra `SUBJECT_SHAPE`.
  - *Alternativa descartada*: Modificar la regex con flag multilínea `/m`, ya que `.` en regex no matchea saltos de línea y requiere manejar bordes complejos de terminación.
  - *Justificación*: Aislar la primera línea es directo, robusto e inmune a cómo el modelo formatee los párrafos subsiguientes.

- **Decisión 2: Instrucción estricta contra alucinaciones en el cuerpo**:
  - *Elección*: El prompt instruye que el cuerpo sólo mencione cambios presentes en el diff o en las intenciones provistas; si no hay información adicional relevante, debe omitir el cuerpo y retornar sólo el asunto.
  - *Justificación*: Evita que la IA invente justificaciones abstractas o repita textualmente las listas de tareas.

- **Decisión 3: Calibración empírica del presupuesto de tokens**:
  - *Elección*: Probar con diffs reales del repositorio para medir el costo en tokens del cuerpo y ajustar `DEFAULT_MAX_TOKENS` con la medición documentada en el comentario del código.

## Risks / Trade-offs

- [Riesgo: El modelo local consume más tokens de razonamiento y salida provocando respuestas truncadas o timeouts] → Mitigación: Medición empírica del presupuesto de tokens y ajuste conservador de `DEFAULT_MAX_TOKENS` preservando `INPUT_CONTEXT_SHARE`.
- [Riesgo: El modelo incluye explicaciones redundantes o relleno] → Mitigación: Instrucciones explícitas en el system prompt de ser conciso, escribir en prosa y no repetir la lista de tareas.
