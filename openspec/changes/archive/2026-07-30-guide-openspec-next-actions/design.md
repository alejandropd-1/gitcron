## Context

El workspace OpenSpec ya está en `main` (commit `6c32767`). Hoy `OpenSpecDashboard.tsx` concentra la lectura de evidencia, la derivación implícita de estado y el render: decide qué CTA mostrar con condicionales encadenados en JSX (`nextTask ? ... : ...`, `validation !== 'passed'`) y guarda la instrucción del lanzador en un `useState<string | null>`. Eso funciona para tres casos y se vuelve inauditable para los once de la matriz.

Restricciones vigentes que este diseño no puede violar:

- Invariante 8: toda string de UI vive en `lib/i18n.ts` con ES, EN y ZH.
- Invariante 11: estética densa y productiva; nada de landing ni textos explicativos dentro de la app.
- `AGENTS.md`: sin dependencias nuevas, sin tocar topbar/iconos/sidebars, sin `git add`/commit.
- El contrato IPC existente ya cubre lo necesario: `pipelineRuntime.start({repoPath, runtime, instruction, changeId, taskId})`, y `RuntimeSessionHub.start()` ya rechaza con `session_already_active` una segunda sesión sobre el mismo repo.

## Goals / Non-Goals

**Goals**

- Que la persona entienda el próximo paso sin conocer `/opsx:*`.
- Que la derivación del estado sea una sola función pura, testeable fila por fila.
- Que iniciar un cambio real exija objetivo, nombre válido, runtime y confirmación.
- Que ninguna acción se habilite con datos de vista previa o evidencia insuficiente.

**Non-Goals**

- No se rediseñan los sidebars ni se mueve la navegación o la actividad.
- No se agrega un segundo lanzador ni un contrato IPC nuevo.
- No se implementa onboarding, tour ni ayuda permanente.
- No se dispara inferencia paga: el QA end-to-end real queda para Ale.

## Decisions

### D1 — La derivación vive en un módulo propio, no en el componente

Se crea `components/pipeline/pipeline-next-action.ts` con `derivePipelineNextAction(input): PipelineNextAction`, donde `input` agrupa snapshot, selección, proyección y bandera de fixture, y `PipelineNextAction` es una unión discriminada por `kind` con las acciones ya resueltas (etiqueta, tarea, instrucción, si es ejecutable).

*Alternativa considerada*: alojarla en `pipeline-view-state.ts`, como sugiere el handoff. Se descarta porque ese archivo ya define `PipelineSnapshot`, `PipelineViewState` y el mapeo de estados de carga; sumarle la máquina de estados de la guía mezcla dos responsabilidades en un archivo que hoy importan seis módulos. Un archivo nuevo sigue la convención existente (`pipeline-adapter.ts`, `pipeline-domain.ts`) y aísla la superficie de test.

*Consecuencia*: el componente de guía queda sin lógica de decisión; recibe el resultado y lo renderiza.

### D2 — Prioridad explícita, codificada como orden de retorno

La función evalúa en este orden y devuelve en el primer acierto:

1. fixture activo
2. decisión pendiente
3. sesión activa o iniciándose
4. sesión fallida o interrumpida sin progreso nuevo
5. archivo en curso
6. cambio archivado seleccionado
7. sin cambio activo
8. tarea pendiente
9. tareas completas con validación desconocida
10. validación fallida
11. validación aprobada

El fixture va primero porque es una restricción de seguridad, no un estado de trabajo: cualquier otro acierto podría producir una acción ejecutable. La decisión pendiente va antes que la sesión activa porque bloquea el avance del agente.

*Alternativa considerada*: puntaje por estado y desempate. Se descarta: un orden lineal es legible y cada fila se prueba directamente.

### D3 — El estado de fixture se propaga por props, no se re-deduce

`PipelineWorkspace` ya calcula `fixtureActive`. Hoy lo usa para anular `projection` y `runtimeHistory`, pero no lo pasa a `OpenSpecDashboard`; el dashboard tampoco pasa `blockedByFixture` a `PipelineRuntimeLauncher`, que sí tiene la prop implementada. Se cierra la cadena: `PipelineWorkspace → OpenSpecDashboard → guía/lanzador`.

*Alternativa considerada*: que el dashboard lea el query param por su cuenta. Se descarta: duplicaría la fuente de verdad y dejaría dos lugares donde el bloqueo puede fallar por separado.

### D4 — El lanzador se extiende en modo controlado, no se clona

`PipelineRuntimeLauncher` conserva discovery, `start` y `stop`. Se le agregan props opcionales: etiqueta del CTA (`Iniciar propuesta` / `Iniciar exploración` / `Continuar`), instrucción en modo lectura con edición avanzada bajo divulgación progresiva, y un callback al arrancar para que el compositor cambie de estado. Su comportamiento por defecto no cambia.

*Alternativa considerada*: un `PipelineGuidedLauncher` nuevo. Se descarta explícitamente por el handoff y porque duplicaría el discovery y la matriz de compatibilidad, que es donde vive el riesgo real.

### D5 — El refresco reutiliza el camino existente

Tras cerrar una sesión, la evidencia se reobtiene por el watcher (`pipelineSubscribe` + `onPipelineSnapshotUpdated`). Como fallback explícito se expone el `reloadToken` que `PipelineWorkspace` ya usa en `handleRetry`, pasado al dashboard como callback de refresco. No se agrega superficie IPC.

*Alternativa considerada*: un canal IPC `pipeline:refresh-openspec`. Se descarta porque el contrato actual alcanza; agregar superficie sin necesidad amplía el área de ataque del renderer.

### D6 — La validación del slug se verifica contra el CLI, no se inventa

El formulario valida el nombre del cambio con el mismo contrato que acepta `openspec new change`. La regla concreta se confirma contra el CLI durante la implementación y se fija en una constante única compartida por validación y mensaje de error.

## Risks / Trade-offs

- **La guía se desincroniza de la evidencia** → la derivación es pura y sólo recibe snapshot/proyección; no se permite estado local que altere el resultado. Una prueba por fila de la matriz.
- **Un fixture inicia una sesión real** (defecto presente hoy) → bandera propagada extremo a extremo más una prueba de que la derivación con fixture no devuelve acción ejecutable.
- **Duplicar el lanzador** → se extiende el existente; el CTA cambia de etiqueta, no de camino.
- **Suponer éxito por proceso terminado** → el resultado se relee de `tasks.md` y de la validación; el cierre sin progreso tiene su propio estado y su propia prueba.
- **Crecer el bloque hasta volverlo onboarding** → tope estructural: una frase de ayuda, una acción primaria, una secundaria condicional; lo técnico va bajo divulgación progresiva.
- **Regresión en i18n** → las strings nuevas entran en los tres idiomas en la misma tanda.

## Migration Plan

No hay migración de datos ni de esquema: el cambio es de renderer y no toca SQLite, IPC ni el proceso main. El despliegue es el build normal. La reversión es el revert del commit, sin estado persistido que limpiar.

## Open Questions

- Regla exacta del slug aceptado por `openspec new change` (se resuelve verificando el CLI en la primera tarea de implementación, no por suposición).
- Si `Pausar tras la tarea` debe seguir apareciendo como secundaria en la guía además de en la barra de acciones actual, o sólo en una de las dos superficies. Se decide con QA visual de Ale para no duplicar controles.
