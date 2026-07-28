# Reporte — Pipeline · composición visual LCARS

Fecha: 2026-07-27

Rama: `pipeline/f04-runtime-streams`

Alcance: iteración visual autorizada sobre el workspace Pipeline existente.

## Resultado

El workspace dejó de leer como una cuadrícula uniforme de tarjetas y pasó a organizarse como instrumentación conectada:

- HUD dominante para fase, agente, costo y decisiones;
- vía del change como eje horizontal completo;
- una sola carcasa exterior abraza Ahora, Decisiones, Agentes, Economía y Actividad;
- composición interna 2/3 + 1/3: Ahora domina el campo izquierdo y Decisiones ocupa el encastre derecho;
- segunda fila con Agentes/Economía divididos horizontalmente a la izquierda y Actividad debajo de Decisiones;
- el flanco exterior cambia de espesor: ancho junto a Ahora, más fino donde encastran los bloques inferiores y ancho otra vez al cerrar;
- sin filetes finos añadidos ni terminaciones redondeadas en el extremo derecho de cada bloque;
- codos inferiores y barras de cierre sobre la geometría SVG existente;
- ventanas oscuras, códigos de zona y carriles planos;
- tipografía monoespaciada con escala diferenciada para display, operación y microtexto;
- controles, filtros y tabs integrados al lenguaje de rieles, con microtexto reducido donde el contenido lo exige;
- seis controles supervisados visibles en una columna, uno debajo del otro;
- entrada escalonada y pulso de fase actual con fallback `prefers-reduced-motion`.

## Archivos

- `app/globals.css`
- `components/pipeline/PipelineCard.tsx`
- `components/pipeline/PipelineWorkspace.tsx`
- `design-qa.md`
- `docs/reports/2026-07-27-pipeline-lcars-composition.md`

## Qué no cambió

- No se cambió el modelo, stores, IPC, runtime, controles ni datos del Pipeline.
- No se agregaron dependencias, fuentes, imágenes ni colores literales.
- No se tocaron `ChronometricGraph.tsx`, `CommitGraph.tsx`, gates, constitución, perfil, README ni CHANGELOG.
- El selector de desarrollo quedó en `Auditoría en curso` para que Ale pueda revisar exactamente el estado capturado.

## Evidencia visual

- Referencia final: `C:\Users\Ale\AppData\Local\Temp\codex-clipboard-47fec492-387b-42ae-9855-a3b77bb02583.png` (2048 × 1024).
- Implementación final: `C:\Users\Ale\.codex\visualizations\2026\07\27\019fa5e3-7e59-7361-b45a-9034f9bae3d5\gitcron-pipeline-outer-shell.jpg` (1920 × 1080).
- Comparación geométrica conjunta: `C:\Users\Ale\.codex\visualizations\2026\07\27\019fa5e3-7e59-7361-b45a-9034f9bae3d5\pipeline-shell-geometry-comparison.jpg`.
- Estado verificado en Electron: fixture `Auditoría en curso`, fase 5/7, auditor independiente activo, actividad y economía pobladas.
- QA comparativa: `design-qa.md`, `final result: passed`.
- La recaptura detectó y corrigió un recorte de la banda de controles de Ahora, redujo el peso visual excesivo del rail de Agentes y confirmó el nuevo reparto 2/3 + 1/3.

## Validación

- Baseline `pwsh -NoProfile -File scripts/gates.ps1 fast`: VERDE.
- Cierre `pwsh -NoProfile -File scripts/gates.ps1 fast`: VERDE; C1, C2, C3, C4 y C6 OK.
- `pnpm exec tsc --noEmit`: exit 0.
- ESLint focalizado sobre los dos TSX modificados: exit 0.
- Tests focalizados Pipeline: 9 archivos / 74 tests, exit 0.
- Corrida completa explícita: 81 archivos y 514 tests pasaron; 3 tests Git temporizaron y dejaron `EBUSY` al limpiar directorios temporales.
- Reejecución serial exacta de esos 3 archivos: 3 archivos / 10 tests, exit 0.
- Gate full: C1, C2, C3, C4, C6 y C7 OK; estado `PENDIENTE` por C5 (76 errores / 19 warnings heredados) y C8 (baseline Fallow pendiente de Ale).
- `git diff --check`: exit 0; sólo avisos informativos LF→CRLF.
- Búsqueda de colores literales nuevos en el diff CSS: 0 coincidencias.
- Recaptura final: `tsc` 0, ESLint focalizado 0, 9 archivos / 74 tests Pipeline y `gates.ps1 fast` VERDE.
- Consola Electron de desarrollo: sin excepción nueva de layout/componentes; persisten diagnósticos heredados de CSP/security y `MaxListenersExceededWarning`.

## Estado de entrega

Lista para QA visual humana de Ale. No se ejecutó stage, commit, push, merge, tag ni release.
