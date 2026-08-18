## Context

En `electron/ai/commit-message/prompt.ts`, el `SYSTEM_PROMPT` exigía responder exclusivamente una única línea y terminaba con `"Máximo 72 caracteres."`. Al mismo tiempo, `isConventionalSubject` validaba toda la cadena devuelta contra `SUBJECT_SHAPE` (`/^(feat|fix|...): .+/`), asumiendo una salida de una sola línea sin saltos.

Se identificó un hallazgo estructural: los modelos de lenguaje no cuentan caracteres directamente sino que operan sobre tokens. Al imponerles un límite estricto de caracteres (`"Máximo 72 caracteres."`), los modelos que razonan gastan cientos o miles de tokens en su cadena de pensamiento deletreando y sumando letras (`d1 o2 c3 s4...`) repetidamente para cada redacción candidata. Esto explicaba por qué modelos como `gemma-4-12b` consumían 1.585 tokens de razonamiento para redactar una línea de 60 caracteres.

Además, existía una incoherencia de diseño: `isConventionalSubject` deliberadamente no valida la longitud en caracteres en código porque "72 caracteres es una guía del pedido, no una condición". Exigirle al modelo una restricción que el código ni siquiera verifica era contraproducente.

## Goals / Non-Goals

**Goals:**
- Extender `SYSTEM_PROMPT` para solicitar un asunto convencional conciso (guiado cualitativamente, sin conteo de caracteres), una línea en blanco y un cuerpo explicativo conciso en prosa en español basado en el contexto provisto (intención del change, tareas cerradas, diff).
- Modificar `isConventionalSubject` para validar únicamente la primera línea del mensaje recibido.
- Medir el impacto real en tokens de razonamiento (al remover la cuenta de caracteres) y en tokens de salida (al agregar cuerpo) sobre un diff real del repositorio para calibrar `DEFAULT_MAX_TOKENS`.

**Non-Goals:**
- No alterar la interfaz de usuario ni agregar nuevos campos o archivos.
- No agregar una validación de longitud en caracteres en código.
- No alterar la lógica de transporte IPC ni la persistencia de Git.
- No cambiar la estrategia de recorte de diff ni el orden de bloques en `buildUserPrompt`.
- No agregar dependencias ni recurrir a IAs pagas externas.

## Decisions

- **Decisión 1: Reemplazo del límite de caracteres por guía cualitativa de concisión**:
  - *Elección*: Eliminar `"Máximo 72 caracteres."` del `SYSTEM_PROMPT` y reemplazarlo por instrucciones cualitativas de brevedad ("asunto convencional y conciso", "directo al grano, sin rodeos").
  - *Alternativa descartada*: Conservar el límite numérico de caracteres o agregar un contador de caracteres en código.
  - *Justificación*: Libera al modelo del esfuerzo artificial de contar letras en su cadena de pensamiento, reduciendo drásticamente los tokens de razonamiento consumidos y la latencia de respuesta.

- **Decisión 2: Extracción de la primera línea en `isConventionalSubject`**:
  - *Elección*: Extraer la primera línea (`message.trimStart().split(/\r?\n/, 1)[0]`) y evaluarla contra `SUBJECT_SHAPE`.
  - *Alternativa descartada*: Modificar la regex con flag multilínea `/m`, ya que `.` en regex no matchea saltos de línea y requiere manejar bordes complejos de terminación.
  - *Justificación*: Aislar la primera línea es directo, robusto e inmune a cómo el modelo formatee los párrafos subsiguientes.

- **Decisión 3: Instrucción estricta contra alucinaciones en el cuerpo**:
  - *Elección*: El prompt instruye que el cuerpo sólo mencione cambios presentes en el diff o en las intenciones provistas; si no hay información adicional relevante, debe omitir el cuerpo y retornar sólo el asunto.
  - *Justificación*: Evita que la IA invente justificaciones abstractas o repita textualmente las listas de tareas.

- **Decisión 4: Calibración empírica del presupuesto de tokens**:
  - *Elección*: Medir en LM Studio local sobre un diff real del repositorio los tokens de razonamiento (con vs sin límite de caracteres) y los tokens de salida (unilínea vs multilínea), documentando ambas mediciones en el comentario de `DEFAULT_MAX_TOKENS`.

## Risks / Trade-offs

- [Riesgo: El modelo genera un asunto excesivamente largo al no tener el número 72] → Mitigación: Las directivas "asunto convencional y conciso" y "directo al grano" mantienen los asuntos habitualmente en el rango de 50–70 caracteres sin provocar conteo de letras.
- [Riesgo: El modelo incluye explicaciones redundantes o relleno] → Mitigación: Instrucciones explícitas en el system prompt de ser conciso, escribir en prosa y no repetir la lista de tareas.
