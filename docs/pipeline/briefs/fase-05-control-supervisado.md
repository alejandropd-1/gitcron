# Pipeline Fase 05 — Control supervisado y reversible donde sea posible

> Primer cambio del producto desde “observador” a “control plane”. Habilita solo comandos
> tipados que Hermes/runtime declare soportados. Requiere F04 validada visualmente y mergeada.
> Branch `pipeline/fase-05-control-supervisado`.

## Agentes recomendados

- **Builder:** Claude Code, foco Electron/main/state machine.
- **Pruebas adversariales:** Antigravity u OpenCode.
- **Auditor de seguridad:** Codex de otra familia.
- **Hermes:** ejecuta controles reales solo durante QA autorizada por Ale.

## Objetivo

Habilitar con semántica explícita:

- pausar/reanudar nuevas delegaciones;
- “pausar después de esta task” mediante intención coordinada;
- steer: redirigir sin interrumpir;
- queue: instrucción para el siguiente turno;
- interrumpir el turno actual;
- interrumpir un subagente;
- listar/matar un proceso background de la sesión;
- responder approval/clarify cuando el contrato lo permita;
- cancelar una corrida del repo con alcance conocido.

## Modelo de seguridad

Todo comando lleva:

- `commandId`, `requestedAt`, `requestedBy`;
- repo/run/session/agent target;
- capability y precondiciones;
- nonce/idempotency key;
- motivo humano opcional;
- confirmación requerida;
- ack del backend y evento de resultado;
- snapshot/diff posterior.

El renderer no manda argv, shell, PID arbitrario ni session id libre. Selecciona un target que
main ya entregó y una acción de una enum allowlisted.

## Semántica que la UI debe explicar

| Acción | Efecto | Riesgo |
|---|---|---|
| Pausar delegaciones | no nacen nuevos hijos; los activos siguen | bajo |
| Pausar tras task | Hermes termina unidad segura y no inicia otra | bajo/medio |
| Steer | agrega dirección al próximo ciclo de herramientas | medio |
| Queue | deja mensaje para el siguiente turno | bajo |
| Interrumpir turno | corte cooperativo + foreground subprocess | alto; working tree parcial |
| Interrumpir subagente | corta un hijo puntual | alto; resultado parcial |
| Matar proceso | mata solo proceso background session-scoped | alto |
| Cancelar corrida | secuencia scoped de pausa/interrupciones | muy alto |

“Emergency stop” global no usa un `kill_all` cross-repo. Si Hermes solo ofrece kill global, no
exponerlo: solicitar capacidad scoped en el Connector.

## Tandas

### TANDA 0 — Threat model y state machines

- Confirmar métodos/control capabilities reales del Connector y adaptadores.
- Modelar estados command requested/confirming/sent/acknowledged/completed/failed/unknown.
- Modelar carreras: agente termina mientras se confirma, reconnect, doble click, tab cambia,
  proceso ya murió, session id rotó.
- Definir confirmaciones positivas vs destructivas.
- **CHECKPOINT 0:** threat model + tabla comando/runtime + mockups semánticos. Sin editar.

### TANDA 1 — Command bus main-only

- Dispatcher allowlisted y session/repo-scoped.
- Idempotencia, timeout y reconciliación por snapshot.
- Auditoría append-only sanitizada.
- API preload específica por acción; prohibido `pipelineCommand(name, args:any)` genérico.
- Tests de spoofing target, replay, stale command, cross-repo y capability false.

### TANDA 2 — Pause, steer y queue

- Empezar por acciones no destructivas.
- Mostrar ack y eventual effect por separado.
- Steer no se representa como nueva task completada.
- Pausa se conserva/reconcilia tras reconnect.
- “Pausar tras task” requiere soporte Hermes; no simular observando filesystem.

### TANDA 3 — Interrupt y procesos

- Interrupt turn/subagent y process kill session-scoped.
- Confirmación describe exactamente qué continúa y qué se corta.
- Tras interrupción: refresh Git status, Pipeline state y diff; banner de trabajo parcial.
- No rollback automático, `git reset`, clean ni checkout.

### TANDA 4 — Approvals y cancelación de corrida

- Approval requests autenticados, con resumen sanitizado y riesgo.
- Conectar opciones del inbox definido en `docs/pipeline/UX-DECISIONES.md` solo cuando la capability,
  target y precondiciones sigan vigentes; opciones no soportadas conservan explicación read-only.
- Riesgo y consecuencias vienen del contrato/regla/evidencia; no se generan para persuadir.
- Spec approval/merge son checkpoints de dominio separados de permiso de shell.
- `merge-ready` sigue siendo informativo: Ale revisa y ejecuta commit/push/merge fuera del command
  bus de esta fase.
- Cancel run coordina: pause future delegates → interrupt children/turn → reconcile processes.
- Resultado puede ser partial; nunca “cancelado” hasta verificar.

## Prompt copiable — builder Claude

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
fase, rama, tandas y checkpoints. No escribas ni crees la rama hasta recibir autorización.
Implementá SOLO Pipeline Fase 05. Confirmá F04 mergeada y QA visual aprobada. Leé invariantes,
índice y brief. Branch pipeline/fase-05-control-supervisado.

TANDA 0 audit-only: threat model, state machines y capability matrix real. Esperá OK.
Después main-only command bus tipado y allowlisted. Renderer jamás envía argv/PID/session libres.
Primero pause/steer/queue; después interrupt/process; approvals/cancel al final.

Todo comando: target per-repo, idempotency, confirmación según riesgo, ack separado de efecto,
auditoría y reconciliación. Stop no hace rollback: refrescá diff/working tree y avisá trabajo
parcial. No expongas kill_all global. No controles para capability false. No CSS.

Tests adversariales + checkpoints + cierre estándar con mensaje/comandos de commit y push
sugeridos sin ejecutarlos + STOP.
```

## Prompt copiable — adversarial Antigravity/OpenCode

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta prueba comienza read-only: no crees rama ni edites.
Atacá el diseño de F05 sin editar: doble click, cambio de tab durante confirmación, session
reconnect, agent ya terminado, PID reciclado, stale session id, command replay, backend lento,
capability que cambia y dos repos activos. Intentá demostrar que una acción sobre repo A puede
afectar B o que la UI dice “detenido” sin evidencia. Entregá casos reproducibles y expected
safe behavior. STOP.
```

## Prompt copiable — auditor Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta auditoría es read-only: no crees rama ni edites.
Auditá F05 read-only con prioridad P0/P1. Revisá IPC genérico, injection, auth, scoping,
idempotencia, kill global, PID/session spoofing, confirmaciones, audit log, reconciliación,
cleanup y ausencia de rollback destructivo. Confirmá que spec approval/merge no se confunden
con permisos técnicos. Veredicto explícito; cualquier escape cross-repo es RECHAZADO.
```

## Qué NO hacer

- No shell/argv arbitrario desde renderer.
- No botón global ambiguo “Stop”.
- No hot-swap de modelo.
- No rollback automático.
- No aprobación automática.
- No control de procesos no registrados/owned.
- No operar sesiones sugeridas por cwd hasta vínculo humano explícito.

## Criterios de aceptación

- [ ] Pause/steer/queue/interrupt/subagent/process respetan capabilities.
- [ ] Ninguna acción cruza repos/sesiones.
- [ ] Ack y efecto se muestran separados.
- [ ] Stop muestra working tree parcial y no revierte.
- [ ] Doble comando/reconnect no duplica efectos.
- [ ] Todas las acciones quedan auditadas.
- [ ] Emergencia no usa kill global cross-repo.
- [ ] Inbox responde solo decisiones con capability vigente; F04/F05 comparten `decisionId` y estado.
- [ ] Ninguna opción ejecuta merge ni inventa riesgo/consecuencia.
