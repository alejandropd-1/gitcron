## Context

`PipelineRuntimeLauncher` vive dentro de `.launcherPanel` (un div con borde + fondo + padding). El launcher arranca con `discovery = null` y tiene `if (!discovery) return null`. Mientras el `discover` IPC no resolvió, el launcher no dibuja nada, pero el panel contenedor ya está pintado con su marco. Resultado: el usuario ve un recuadro vacío durante el round-trip del discover.

El `key` del launcher (`${changeId}:${taskId}`) fuerza un remontaje al cambiar de change o tarea, así que `discovery` vuelve a `null` y el recuadro vacío reaparece cada vez.

Constraints relevantes:
- Invariante 11 (estética GitCron): denso, oscuro, sin cajas explicativas de más.
- Invariante de honestidad de evidencia: dato ausente se representa explícito, no como "vació esperando".
- El renderer no puede cachear discovery por repo: el proceso main es el dueño de esa verdad.

## Goals / Non-Goals

**Goals**
- Eliminar el recuadro vacío: nunca pintar un panel con marco sin contenido.
- Mostrar un estado de carga explícito y accionable mientras `discover` no resolvió.
- Reducir el remontaje innecesario del launcher.

**Non-Goals**
- Cambiar el contrato IPC `pipeline:runtime:discover`.
- Cachear discovery en el renderer o persistirlo.
- Reescribir el formulario del launcher.

## Decisions

### D1: Estado de carga explícito en el launcher, no `return null`

Reemplazar `if (!discovery) return null` por una rama de carga que renderice un mensaje corto ("Comprobando runtimes…") con el mismo control de reintentar que ya existe para el caso sin runtime lanzable. Así nunca hay un panel con marco vacío.

Rationale: el patrón actual de devolver `null` dentro de un panel con marco es lo que produce el recuadro vacío. Mostrar "cargando" es lo que la invariante de honestidad pide para un dato pendiente.

Rechazado: "quitar el marco del panel mientras carga" — insuficiente, porque igualmente hay un salto visual y no comunica qué pasa.

### D2: El panel contenedor respeta el estado del launcher

`OpenSpecDashboard` pasa un flag `loading` (o equivalente) desde el launcher hacia afuera, y `.launcherPanel` sólo aplica el marco cuando hay contenido para mostrar. Mientras carga, se muestra el esqueleto del launcher sin el marco duplicado.

Alternativa rechazada: sacar `.launcherPanel` por completo y que el launcher tenga su propio marco. Lo rechazo porque `.launcherPanel` también envuelve el título de sección y el flujo guiado de propuesta/exploración; tocar eso ensancha el alcance.

### D3: `key` más estable para no forzar remontaje

Cambiar el `key` para que no incluya `taskId` (sólo `changeId`), y en su lugar usar el `initialInstruction` como prop controlada que se actualiza cuando cambia la tarea. Así cambiar de tarea no resetea `discovery` a `null`.

Riesgo: `initialInstruction` hoy es inicial y no controlada. Hay que convertir el launcher para que respete cambios del `initialInstruction` vía `useEffect` sin perder lo que el usuario editó a mano. Si complica, se deja el `key` y se acepta el remontaje (D1+D2 ya resuelven el recuadro vacío).

Decisión: implementar D1+D2 (resuelven el síntoma). D3 queda como mejora opcional sólo si no añade superficie.

### D4: Limpieza del string "scaffold"

`repo-evidence-reader.ts:151` emite "OpenSpec no está disponible o el repositorio no tiene scaffold." Se reescribe sin "scaffold", describiendo la causa real: OpenSpec no responde o el repo no tiene `openspec/changes`.

### D5: Retiro de sección de AGENTS.md

La sección "Honestidad de la evidencia" referencia `docs/pipeline/f03/` (fase retirada) y telemetría fabricada de un encuadre que ya no gobierna. Se retira íntegramente. Las invariantes de seguridad/process de `docs/01_INVARIANTES.md` siguen siendo la fuente de verdad vigente.

## Risks & Mitigations

- **D3 puede introducir un bug de estado si la conversión a controlada se hace mal.** Mitigación: si D3 supera la complejidad esperada, se descarta y se entrega D1+D2.
- **Quitar "scaffold" de un mensaje de error podría cambiar un test que lo aserte literal.** Mitigación: buscar assertions de ese string antes de tocar y actualizarlos.
