# Pipeline Fase 02 — Hermes Connector de solo observación

> Conecta GitCron con Hermes usando el contrato aprobado en F00. Esta fase es estrictamente
> read-only: recibe sesiones/eventos/capacidades, pero no envía prompts, approvals ni controles.
> Requiere F01 mergeada. Branch `pipeline/fase-02-hermes-connector`.

## Agentes recomendados

- **Builder principal:** Claude Code.
- **Spike alternativo del protocolo:** OpenCode o `agy`, acotado y sin editar la implementación
  principal hasta checkpoint.
- **Auditor:** Codex, foco IPC/auth/reconexión.

## Objetivo

- Descubrir/iniciar o adjuntarse al backend Hermes de forma soportada.
- Handshake autenticado y capability negotiation.
- Vincular explícitamente repo de GitCron ↔ proyecto/sesiones Hermes.
- Recibir eventos y normalizarlos al contrato F00.
- Mostrar estado de conexión y snapshot por IPC, todavía sin construir el workspace final.
- Reconectar sin duplicar eventos y limpiar recursos al cambiar repo/cerrar app.

## Decisión arquitectónica esperada

Renderer → preload tipado → Electron main → `HermesConnector` → backend Hermes local.

El renderer nunca recibe credencial de Hermes ni URL con token. Si el backend actual no ofrece
un handshake companion seguro, parar y proponer el change mínimo en el repo Hermes. No scrapear
HTML ni leer archivos secretos como atajo.

## Tandas

### TANDA 0 — Revalidación del contrato

- Confirmar versión local de Hermes y backend contract.
- Verificar que el ADR F00 sigue siendo aplicable.
- Capturar handshake/event fixtures sanitizados.
- Proponer estados: disconnected, connecting, connected, degraded, incompatible, auth-required.
- Proponer ciclo de vida por repo y política de ownership del proceso Hermes.
- **CHECKPOINT 0.**

### TANDA 1 — Cliente y normalización

- Cliente main-process con timeouts, heartbeat, backoff con jitter y cancelación.
- Handshake y capability set versionados.
- Normalización de session.info, message, reasoning/thinking, tool, status, approval y error.
- Orden por sequence; dedupe por eventId; resync por snapshot después de reconnect.
- Sanitización antes de logs/renderer/DB.

### TANDA 2 — Vínculo per-repo

- Persistir en `userData`/SQLite el vínculo repo ↔ Hermes project/session.
- Asociación explícita por el usuario; autodetección por cwd solo sugiere, no toma control.
- Canonicalizar paths Windows/case/symlinks.
- Una sesión puede estar vinculada a un repo; conflictos visibles y resolubles.
- Cambiar tab no desconecta innecesariamente, pero filtra eventos/estado estrictamente.

### TANDA 3 — IPC read-only y resiliencia

- API mínima: status, capabilities, candidate sessions, link/unlink local, snapshot y subscribe.
- Link/unlink modifica solo configuración local de GitCron; no ejecuta agentes.
- Tests de backend ausente, auth fallida, versión incompatible, reconnect, eventos duplicados,
  cambio rápido de repo y shutdown.

## Prompt copiable — builder Claude

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
fase, rama, tandas y checkpoints. No escribas ni crees la rama hasta recibir autorización.
Implementá SOLO Pipeline Fase 02. Leé fuente de verdad, invariantes, índice Pipeline, F00 ADR y
brief F02. Confirmá F01 mergeada. Branch pipeline/fase-02-hermes-connector desde main.

TANDA 0 read-only: revalidá Hermes instalado, auth, contract version y fixtures. Mostrá la API
propuesta y esperá OK. Luego implementá el Connector SOLO en Electron main, con preload tipado
mínimo. Recibí y normalizá eventos; no envíes prompts, approvals, interrupt, steer, model-set ni
process-kill. Renderer sin secretos. No scrapees tokens/HTML. Si falta un endpoint companion,
pará y redactá el change requerido en Hermes; no uses un bypass.

No UI final, no CSS, no nuevas deps sin aprobación, no README/CHANGELOG. Tests de reconexión,
dedupe, scoping y cleanup. Cierre estándar + reporte + mensaje/comandos de commit y push
sugeridos, sin ejecutarlos + STOP.
```

## Prompt copiable — auditor Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta auditoría es read-only: no crees rama ni edites.
Auditá read-only Pipeline Fase 02. Priorizá: secretos en renderer/logs, WebSocket sin auth,
scraping de token, comandos arbitrarios, path/session cross-repo, reconnect duplicando eventos,
listeners huérfanos, process leaks, downgrade de versión silencioso y persistencia insegura.
Confirmá además que la fase no puede controlar Hermes. Veredicto + archivo:línea + fix.
```

## Qué NO hacer

- No enviar instrucciones a Hermes.
- No exponer botones de control.
- No cambiar modelos.
- No usar `shell:true` ni concatenar comandos.
- No matar/iniciar backends ajenos sin ownership explícito.
- No implementar adaptadores Claude/Codex/agy/OpenCode/LM Studio todavía.

## Criterios de aceptación

- [ ] GitCron vincula una sesión Hermes al repo activo de manera explícita.
- [ ] Eventos entran normalizados y con procedencia.
- [ ] Renderer no conoce secretos de conexión.
- [ ] Reconexión no duplica timeline.
- [ ] Repos/tabs no mezclan sesiones.
- [ ] Hermes ausente/incompatible degrada con mensaje claro.
- [ ] Ninguna capacidad de control está expuesta.
