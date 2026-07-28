# Handoff — flujo OpenSpec guiado y ejecución real

Fecha de captura: 2026-07-28  
Repositorio: `C:\www\gitcron`  
Branch observada: `codex/openspec-changes-ui`  
HEAD observado antes del commit humano: `a7fc345 feat: carcasa exterior continua OpenAI Sol 5.6`

## 1. Objetivo autorizado por Ale

Completar la UX de la nueva pestaña Pipeline para que, según el estado real de OpenSpec y del runtime, la interfaz diga de forma breve y accionable qué corresponde hacer a continuación.

Debe permitir iniciar un trabajo real sin conocer de antemano los comandos `/opsx:*`, continuar tareas existentes, resolver validaciones, archivar un cambio terminado y comenzar el siguiente. La guía debe ser contextual, no un tutorial permanente.

La topbar, sus iconos y el comportamiento actual de los dos sidebars no se modifican. El alcance sigue siendo el interior de Pipeline.

## 2. Estado de Git que el sucesor debe verificar

Al escribir este handoff la tanda anterior todavía estaba sin commit en el working tree. Incluye el reemplazo completo de Pipeline y no debe sobrescribirse, descartarse ni atribuirse al trabajo nuevo.

Antes de editar:

1. Leer `AGENTS.md`, `docs/00_FUENTE_DE_VERDAD.md`, `docs/01_INVARIANTES.md` y `docs/pipeline/00-estado-track.md`.
2. Ejecutar `git branch --show-current`, `git log -1 --oneline` y `git status --short`.
3. Confirmar que Ale ya cerró la tanda anterior con su commit. Si el árbol sigue sucio, preservar todo y pedir confirmación antes de mezclar otra feature.
4. Usar CodeGraph antes de búsquedas amplias porque existe `.codegraph/`.
5. Ejecutar `pwsh -NoProfile -File scripts/gates.ps1 fast` como baseline.

`openspec list --json` devolvió cero cambios activos al capturar este documento. La próxima IA debe crear un change OpenSpec dedicado, sugerido: `guide-openspec-next-actions`, y desarrollar con las skills `openspec-propose` y `openspec-apply-change`. No sincronizar ni archivar el change hasta completar implementación, QA y aprobación de Ale.

No hacer staging, commit, push, merge, publicación ni agregar dependencias sin autorización explícita.

## 3. Lo que ya está implementado

- Pipeline fue reemplazado por un workspace OpenSpec de tres zonas: navegación izquierda, trabajo central y actividad derecha.
- Lee cambios activos, archivados, especificaciones, proposal/design/tasks/specs, progreso y validación estricta.
- El centro representa Explore → Propose → Apply → Validate → Archive.
- `Continuar con X.Y` prepara `/opsx:apply <change>` con la tarea siguiente.
- `Nuevo cambio` y `Proponer nuevo cambio` actualmente sólo preparan `/opsx:propose`.
- `Explorar una idea` prepara `/opsx:explore`.
- El lanzador descubre runtimes reales, permite elegir uno, editar la instrucción e iniciar/detener la sesión mediante IPC.
- Las sesiones se persisten en SQLite v5 con cambio, tarea, rol, tiempos, resultado y proyección sanitizada.
- Actividad conserva historial entre reinicios, permite seleccionar sesiones y agrega sólo evidencia local verificable de Git y `openspec validate`.
- Los fixtures se identifican como `Datos de vista previa` y no pueden iniciar procesos reales.
- El layout usa container queries y mantiene los sidebars actuales.
- Se retiró el LCARS anterior sin borrar las primitivas de runtime/evidencia que siguen vivas.

Documentación de la tanda:

- `docs/reports/2026-07-28-openspec-pipeline-workspace.md`
- `design-qa.md`

Última validación conocida de la tanda anterior:

- TypeScript: correcto.
- Tests: 84 archivos / 521 tests, todos verdes.
- ESLint focalizado: limpio.
- Build Next + Electron: correcto.
- `gates.ps1 fast`: VERDE.
- `gates.ps1 full`: PENDIENTE sólo por C5 lint y C8 fallow, deudas globales ya declaradas por el gate; C1/C2/C3/C4/C6/C7 correctos.

## 4. Evidencia UX capturada

Capturas de esta revisión:

- Estado con tarea activa: `C:\Users\Ale\AppData\Local\Temp\gitcron-openspec-handoff-current.png`
- Cambio archivado con CTA `Nuevo cambio`: `C:\Users\Ale\AppData\Local\Temp\gitcron-openspec-handoff-completed.png`
- Estado después de pulsar `Nuevo cambio`: `C:\Users\Ale\AppData\Local\Temp\gitcron-openspec-handoff-launcher.png`

Hallazgos:

1. **Tarea activa — salud parcial.** La próxima tarea y el CTA existen, pero la persona debe inferir que `Continuar con 2.1` abrirá un runtime y ejecutará Apply.
2. **Cambio archivado — salud parcial.** `Nuevo cambio` está bien jerarquizado, pero no explica la diferencia entre explorar una idea y proponer una tarea definida.
3. **Lanzador — necesita corrección.** Aparece debajo del CTA sin un paso a paso. Con `/opsx:propose` solo, falta capturar objetivo y nombre del cambio. Si no hay runtime, termina en un mensaje informativo sin una salida accionable.

La recomendación de Product Design es no poner la guía en los sidebars:

- La izquierda conserva navegación y selección.
- La derecha conserva hechos históricos, estado de sesión y decisiones que necesitan atención.
- El panel central es dueño de “qué corresponde hacer ahora”.

## 5. Solución UX requerida

### 5.1 Componente central `Siguiente paso`

Agregar un bloque compacto y contextual inmediatamente debajo del encabezado/lifecycle del cambio y antes de las pestañas Trabajo/Actividad. En estados sin cambio o archivados ocupa el área principal existente.

Debe mostrar como máximo:

- una etiqueta de estado, por ejemplo `SIGUIENTE PASO · 2 DE 5`;
- un título corto;
- una sola frase de ayuda;
- una acción primaria;
- una acción secundaria sólo cuando exista una alternativa real;
- detalles técnicos e instrucción final bajo divulgación progresiva (`Ver instrucción`).

No agregar párrafos largos ni onboarding permanente: la invariante visual exige una aplicación densa y productiva.

### 5.2 Matriz de estados

| Estado real | Guía | Acción primaria | Acción secundaria |
|---|---|---|---|
| Fixture de desarrollo | `Vista previa: estas acciones no ejecutan agentes` | Ninguna | `Usar datos reales` sólo si ya existe una navegación segura para salir del fixture |
| Sin cambio activo | `¿Qué querés hacer?` | `Tengo clara la tarea` → Propose | `Quiero definirla mejor` → Explore |
| Cambio archivado seleccionado | `Este trabajo terminó` | `Empezar otro cambio` → Propose | `Explorar una idea` |
| Cambio activo con tareas pendientes y sin sesión | `La próxima tarea es X.Y` | `Continuar con X.Y` → Apply | `Ver instrucción` |
| Runtime iniciándose o activo | `El agente está trabajando en X.Y` | `Ver actividad` | `Pausar tras la tarea` sólo si la capability existe |
| Decisión pendiente | `Necesita tu decisión` | Llevar foco a la decisión real | Ninguna; la derecha puede enlazar al mismo foco |
| Sesión fallida o interrumpida | `La tarea no terminó` | `Reintentar X.Y` con la misma instrucción | `Ver última actividad` |
| Tareas completas, validación desconocida | `Comprobá el cambio` | `Actualizar validación` | `Ver evidencia` |
| Validación fallida | `La validación necesita correcciones` | Lanzar Apply para corregir con diagnostics reales | `Ver resultado` |
| Validación aprobada | `Todo está listo para cerrar` | `Archivar cambio` → `/opsx:archive <change>` | `Ver diff` |
| Archivo en curso | `Archivando y sincronizando especificaciones` | Ninguna duplicada | `Ver actividad` |

La derivación del estado debe ser una función pura y testeable, no una cadena de condicionales distribuida en JSX.

## 6. Flujo guiado para una tarea nueva

Reemplazar el salto directo de `Nuevo cambio` a un textarea con `/opsx:propose` por un flujo breve inline en el centro.

### Paso 1 — elegir intención

- `Tengo clara la tarea`: Propose.
- `Quiero definirla mejor`: Explore.

La interfaz debe explicar la diferencia en una línea, sin exigir conocer OpenSpec.

### Paso 2A — Propose

Campos:

- `¿Qué querés lograr?` — textarea requerido en lenguaje natural.
- `Nombre del cambio` — slug sugerido y editable, validado con el mismo contrato que OpenSpec.
- `Alcance o restricciones` — opcional y breve.

No iniciar si falta objetivo o el slug no es válido. Los errores deben quedar junto al campo y anunciarse accesiblemente.

Instrucción generada, visible sólo bajo `Ver instrucción`:

```text
/opsx:propose <slug>

Objetivo: <objetivo>
Alcance y restricciones: <texto opcional>
```

### Paso 2B — Explore

Pedir una sola descripción: `¿Qué idea o problema querés explorar?`.

Instrucción:

```text
/opsx:explore

Quiero explorar: <descripción>
```

Explore no debe crear artefactos por sí solo ni mostrarse como cambio activo hasta que el usuario decida proponerlo.

### Paso 3 — elegir runtime y revisar

- Reutilizar el discovery y las explicaciones de compatibilidad de `PipelineRuntimeLauncher`.
- Mostrar runtime, versión y disponibilidad antes del CTA final.
- Conservar edición avanzada de la instrucción bajo divulgación progresiva, no como primer campo.
- CTA final: `Iniciar propuesta` o `Iniciar exploración`, no el genérico `Iniciar`.

Si ningún runtime es lanzable, mostrar acciones concretas basadas en diagnostics reales: qué runtime falta/no es compatible y cómo volver a comprobarlo. No fingir instalación ni ejecutar shells arbitrarios desde el renderer.

### Paso 4 — ejecución y resultado

Al iniciar:

- crear la sesión persistente ya soportada;
- asociar `changeId` cuando exista y dejarlo `null` durante Explore;
- cambiar la guía a estado en ejecución;
- abrir o señalar Actividad sin forzar el sidebar si el usuario lo cerró;
- impedir sesiones duplicadas.

Al cerrar:

- refrescar el snapshot OpenSpec de forma explícita si el watcher no detecta los artefactos nuevos;
- seleccionar el cambio recién creado cuando pueda identificarse de manera verificable;
- nunca inferir que Propose funcionó sólo porque el proceso terminó: comprobar que el change existe.

## 7. Continuación de tareas existentes

Para `Apply`, la persona no debería tener que reescribir el prompt:

```text
/opsx:apply <change-id>

Continuar con <task-id>: <task-text>
```

El bloque debe mostrar la tarea, runtime y CTA. La instrucción completa queda en `Ver instrucción`.

Después de la sesión:

- releer `tasks.md`;
- marcar progreso únicamente desde evidencia real del archivo;
- seleccionar la siguiente tarea pendiente;
- si no cambió el progreso, explicar `La sesión terminó, pero la tarea sigue pendiente`;
- si todas terminaron, avanzar a validación, no directamente a Archive.

## 8. Integración con Actividad

- Actividad sigue siendo un registro, no el lugar principal para enseñar el flujo.
- El selector de sesiones y la persistencia actual se conservan.
- Una sesión nueva debe quedar seleccionada automáticamente mientras está activa.
- Al finalizar, conservar resultado `completed`, `failed` o `interrupted` y el contexto change/task.
- `Necesita atención` sólo muestra decisiones reales. Si existe una decisión, su acción lleva al control correspondiente del centro.
- No mostrar reasoning privado no emitido, costos inventados, nombres de archivos inferidos ni éxito supuesto.

## 9. Diseño técnico sugerido

Archivos principales a inspeccionar:

- `components/pipeline/OpenSpecDashboard.tsx`
- `components/pipeline/OpenSpecDashboard.module.css`
- `components/pipeline/PipelineRuntimeLauncher.tsx`
- `components/pipeline/PipelineWorkspace.tsx`
- `components/pipeline/pipeline-view-state.ts`
- `components/pipeline/pipeline-adapter.ts`
- `lib/i18n.ts`
- `electron/pipeline/repo-evidence-reader.ts`
- `electron/pipeline/runtime/runtime-session-hub.ts`
- `electron/ipc/pipeline-runtime.ts`
- `types/electron.d.ts`
- `types/pipeline/*`

Separación recomendada:

1. `derivePipelineNextAction(snapshot, selection, projection)` en una función pura dentro de `pipeline-view-state.ts` o un módulo de dominio equivalente.
2. `PipelineNextStepGuide.tsx` para renderizar estados, textos y CTAs.
3. `PipelineNewChangeFlow.tsx` para Explore/Propose y validación del formulario.
4. Evolucionar `PipelineRuntimeLauncher` para soportar un modo guiado/controlado sin duplicar discovery, start y stop. No crear un segundo lanzador incompatible.
5. Mantener `OpenSpecDashboard.tsx` como compositor, no como dueño de toda la máquina de estados.

Antes de agregar IPC, comprobar si el contrato existente alcanza. `pipelineRuntime.start` ya recibe repo, runtime, instruction, changeId y taskId. Sólo agregar una superficie nueva si hace falta refrescar evidencia o resolver de manera verificable el change creado.

No agregar dependencias. Reutilizar iconos, tokens, focus styles, container queries e i18n existentes. Toda string nueva debe existir en ES, EN y ZH.

## 10. Tests mínimos

### Dominio

- una prueba por fila de la matriz de estados;
- prioridad correcta cuando se superponen estados: decisión > sesión activa > fallo/reintento > tarea pendiente > validación > archive;
- fixture nunca genera una acción ejecutable;
- no active distingue Explore y Propose;
- validation failed nunca habilita Archive.

### Formulario

- objetivo requerido;
- slug válido/inválido;
- instrucción Propose exacta;
- instrucción Explore exacta;
- restricciones opcionales sin líneas falsas;
- ningún start con runtime no lanzable;
- etiquetas, errores y foco accesibles.

### Integración UI/runtime

- `Nuevo cambio` abre el flujo y no inicia automáticamente;
- `Continuar X.Y` conserva changeId/taskId;
- sesión activa impide duplicados;
- cierre refresca evidencia y actualiza el siguiente paso;
- reinicio conserva sesión en Actividad;
- no runtime ofrece diagnostics accionables;
- sidebars y topbar mantienen el comportamiento actual.

## 11. QA humano requerido

Probar en Electron real, no sólo con fixture:

1. Repo sin change activo → Explore.
2. Repo sin change activo → Propose con objetivo y slug.
3. Aparición verificable del nuevo change en la izquierda.
4. `Continuar X.Y` → sesión real → actividad y progreso desde `tasks.md`.
5. Interrumpir y reintentar una sesión.
6. Tareas completas → validación fallida y luego aprobada.
7. Archive → cambio en Completados recientes.
8. Desde el archivado → empezar un segundo cambio.
9. Reiniciar GitCron y verificar historial de sesiones.
10. Repetir en dos anchos desktop y con ambos sidebars abiertos/cerrados.

No disparar una inferencia paga, instalar runtimes ni cambiar dependencias sin permiso de Ale. Si el E2E real exige gasto o credenciales, dejarlo como QA humano pendiente y validar el resto con adapters falsos/fixtures.

## 12. Gates y definición de terminado

Ejecutar al inicio y al cierre:

```powershell
pwsh -NoProfile -File scripts/gates.ps1 fast
```

Al cierre:

```powershell
pnpm exec tsc --noEmit
pnpm test
pnpm exec eslint <archivos-tocados>
pnpm run package:build
pwsh -NoProfile -File scripts/gates.ps1 full
git diff --check
git status --short
```

Terminado significa:

- la persona siempre puede entender el próximo paso sin conocer `/opsx:*`;
- ninguna acción se habilita con datos inventados o evidencia insuficiente;
- iniciar un cambio real requiere objetivo, nombre válido, runtime y confirmación final;
- Apply, Validate y Archive aparecen sólo en su momento correcto;
- los resultados cambian la UI después de releer OpenSpec;
- topbar, iconos y sidebars permanecen intactos;
- responsive, teclado, foco, errores y estados vacíos fueron verificados visualmente;
- existe reporte en `docs/reports/` con lo tocado, lo no tocado y evidencia de gates;
- Ale realiza el commit/push final.

## 13. Prompt breve para la IA sucesora

```text
Continuá GitCron desde docs/reports/2026-07-28-handoff-openspec-guided-workflow.md.
Leé el handoff completo y verificá Git/disco: no asumas que el working tree sigue igual.
Usá CodeGraph antes de búsquedas amplias. Confirmá primero que Ale cerró el commit anterior.
Creá el change OpenSpec guide-openspec-next-actions y después implementalo con la skill
openspec-apply-change. El alcance es sólo el interior de Pipeline: no cambies topbar, iconos
ni comportamiento de sidebars. Implementá la guía contextual, el flujo Explore/Propose,
la continuación Apply, los estados Validate/Archive/Retry, refresco verificable y los tests
del handoff. No agregues dependencias, no inventes evidencia y no ejecutes inferencias pagas.
Pasá gates fast antes y después, build/full al cierre, QA visual en Electron y frená antes
de staging/commit/push para entregar el handoff a Ale.
```
