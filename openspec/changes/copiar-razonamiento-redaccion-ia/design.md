## Context

En `components/pipeline/CommitDraftLog.tsx`, el razonamiento del modelo se renderiza en un elemento `<pre>` con scroll vertical (`.draftLogStream`). Durante redacciones complejas con modelos de razonamiento (como Qwen o Gemma), el texto de razonamiento puede extenderse por cientos de líneas. Seleccionar manualmente ese contenido largo dentro del contenedor scrollable resulta propenso a errores y omisiones.

## Goals / Non-Goals

**Goals:**
- Proporcionar un botón compacto y accesible sobre el bloque de razonamiento para copiar la totalidad de `log.reasoning` al portapapeles.
- Ofrecer confirmación visual transitoria (estado "Copiado") coherente con la estética de GitCron.
- Ocultar el control cuando no exista texto de razonamiento.
- Asegurar soporte de internacionalización en español, inglés y chino (ES, EN, ZH) en `lib/i18n.ts`.

**Non-Goals:**
- No incluir `log.content` en la copia del razonamiento: la respuesta redactada ya se deposita de forma directa en el `<textarea>` del commit y en la sección `.draftLogAnswer`, donde es inmediatamente accesible. Copiar sólo el razonamiento mantiene limpio el portapapeles para análisis y reportes de comportamiento de IA sin mezclar texto generado con cadenas de pensamiento.
- No agregar dependencias de portapapeles externas.
- No modificar el backend, el transporte SSE ni otros componentes.

## Decisions

- **Decisión 1: Copiar exclusivamente `log.reasoning`**:
  - *Elección*: El botón copia el string crudo y completo de `log.reasoning`.
  - *Alternativa descartada*: Concatenar `log.reasoning` y `log.content` con encabezados inventados.
  - *Justificación*: El caso de uso primordial es reportar y diagnosticar el proceso de pensamiento del modelo. La respuesta final ya está disponible en el editor de commit. Mezclar ambos rompería la fidelidad de la traza de razonamiento.

- **Decisión 2: Confirmación temporal con `setTimeout` y estado local**:
  - *Elección*: Usar un estado reactivo `copied` en `CommitDraftLog` con temporizador de restablecimiento a los 2.000 ms.
  - *Justificación*: Coherente con los demás botones de copiado de la aplicación (`CopyButton.tsx`), garantizando feedback claro sin recargar la UI.

- **Decisión 3: Estilo sobrio y denso en `OpenSpecDashboard.module.css`**:
  - *Elección*: Botón en monoespacio pequeño alineado a la derecha en una barra de herramientas sutil sobre el `<pre>`.
  - *Justificación*: Respeta el Invariante 11 (estética densa y técnica de herramienta de desarrollador, sin adornos innecesarios).

## Risks / Trade-offs

- [Riesgo: Fallo de permisos en `navigator.clipboard.writeText`] → Mitigación: Captura con `try/catch` y logging en consola para no romper la ejecución de la UI en entornos con permisos restringidos.
