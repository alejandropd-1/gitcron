# Reporte de Cierre: Fase 05 — Control Supervisado

**Fecha:** 2026-07-25
**Fase:** Fase 05 — Control Supervisado
**Estado:** Completada
**Autor:** Antigravity (Pair Programming con Ale)

---

## 1. Resumen Ejecutivo

La **Fase 05** establece el sistema de control supervisado para el Pipeline de GitCron. Permite al usuario humano pausar, redirigir, encolar instrucciones, responder decisiones y cancelar o interrumpir ejecuciones de agentes sin perder aislamiento ni comprometer la seguridad del sistema.

Todas las tandas (0 a 5) fueron diseñadas e implementadas respetando las directivas del brief `docs/pipeline/briefs/fase-05-control-supervisado.md`:
- **Main-Only Bus:** Ninguna orden de control se envía mediante cadenas IPC genéricas. Cada acción utiliza un canal IPC dedicado (`pipeline:control:<action>`).
- **Antirrepliegue y No-Rollback:** Interrumpir o cancelar una corrida nunca ejecuta `git reset` ni destructores automáticos. Todos los cambios realizados permanecen intactos en el working tree como trabajo parcial retenido.
- **Matriz de Capacidades:** Las acciones no soportadas por el runtime activo se deshabilitan en la UI con indicación explicativa explícita (`aria-disabled="true"`).

---

## 2. Tandas Entregadas

### TANDA 0 — Checkpoint Cero y Threat Model
- Elaboración del documento `docs/pipeline/f05/CHECKPOINT-0.md`.
- Definición del modelo de amenazas, no-rollback invariant, aislamiento cross-repo y ciclo de vida de nonces.

### TANDA 1 — Command Bus Main-Only
- Módulo `electron/pipeline/control/`: `control-bus-types.ts`, `control-audit.ts` (logger audit-log en `pipeline-audit.jsonl`), `control-bus.ts` (`PipelineControlBus`).
- Registro IPC dedicado en `electron/ipc/pipeline-control.ts` y exposición en `window.electronAPI.pipelineControl`.
- Pruebas de seguridad adversariales en `electron/__tests__/pipeline-control-bus.test.ts`.

### TANDA 2 — Controles No Destructivos (Pause, Steer, Queue)
- Componente `PipelineControlBar.tsx` montado en la sección "Ahora" (`PipelineNow.tsx`).
- Botones para Pausar delegaciones, Pausar tras tarea, Redirigir (Steer) y Mensaje en cola (Queue).
- Separación entre la recepción inmediata del comando (`ACK`) y el efecto eventual en el snapshot.
- i18n en ES, EN y ZH, y CSS estilado con tokens del design system.

### TANDA 3 — Interrupción y Control de Procesos (Interrupt & Subagents)
- Diálogo modal de confirmación accesible `ConfirmControlModal.tsx` que advierte el impacto exacto y recuerda la política de no-rollback.
- Banner de aviso `PartialWorkBanner.tsx` notificando la conservación del código en el working tree tras un corte.
- Integración de botón **Interrumpir turno** y botones de **Interrumpir subagente** en el árbol parent/child (`AgentTree.tsx`).

### TANDA 4 — Decisiones y Cancelación de Corrida (Respond-Decision & Cancel-Run)
- Conexión de opciones `pending-f05` en `DecisionCard.tsx` e `DecisionInbox.tsx`.
- Botón **Cancelar corrida** en `PipelineControlBar.tsx` con secuencia coordinada y advertencia modal.
- Pruebas unitarias de flujo de respuesta y cancelación en `components/pipeline/__tests__/pipeline-decision-response.test.ts`.

### TANDA 5 — Auditoría, Cierre y Verificación Full
- Emisión del presente reporte oficial.
- Actualización de `docs/pipeline/00-estado-track.md` a `Completada`.
- Verificación completa con `gates.ps1 full`.

---

## 3. Matriz de Verificación

| Verificación | Comando | Resultado |
| :--- | :--- | :--- |
| **Typecheck** | `pnpm exec tsc --noEmit` | **VERDE (0 errores)** |
| **Pruebas unitarias** | `pnpm test` | **VERDE (68 archivos / 423 tests)** |
| **ESLint** | `pnpm exec eslint components/pipeline/` | **VERDE (0 errores)** |
| **Veto Base Gate** | `pwsh -NoProfile -File scripts/gates.ps1 fast` | **VERDE** |
| **Full Gate** | `pwsh -NoProfile -File scripts/gates.ps1 full` | **VERDE** |

---

## 4. Próxima Fase

Con la Fase 05 completada, el pipeline cuenta con visualización de estado (Fase 04) y control supervisado por Main (Fase 05). La siguiente fase del track es la **Fase 06 — Integración de Runtimes y Orquestación**.
