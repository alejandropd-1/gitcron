# ADR-001 — Conexión agnóstica de Pipeline

Fecha: `2026-07-23`
Estado: `Propuesto`

## Contexto

Pipeline debe observar tanto esta clase de sesión directa en Codex como corridas de Claude,
`agy`, OpenCode/Z.ai, clientes de LM Studio y sesiones coordinadas por Hermes. Las interfaces
verificadas no comparten un transporte único y algunas sólo exponen salida final.

## Opciones comparadas

| Opción | Ventajas | Riesgos/límites | Decisión |
|---|---|---|---|
| Hermes companion JSON-RPC/WebSocket | Lifecycle rico, gateway headless, sesiones coordinadas | No cubre sesiones directas; falta fixture/schema/auth GitCron | Preferida sólo para actividad Hermes. |
| ACP | Estándar estructurado; Hermes check OK y OpenCode lo ofrece | Paridad/capabilities reales varían; schema por versión pendiente | Adapter preferido cuando negocia lo necesario. |
| Child process CLI estructurado | Claude JSON/stream-JSON, Codex JSONL, OpenCode JSON; ownership claro | Lifecycle/control desigual; stdout/backpressure/cleanup | Preferido para sesiones directas con salida versionable. |
| Filesystem/hooks/repo evidence | Universal, local, contrasta lo declarado | No prueba intención, reasoning o control; telemetría puede faltar | Fallback/degradación, nunca fuente única. |

## Decisión

Adoptar un `PipelineAdapter` transport-neutral. No existe gateway obligatorio.

```text
sesión Hermes ── HermesConnector ─┐
Claude/Codex/OpenCode ─ CLI/ACP ──┼─> Pipeline Contract v1 ─> evidencia por repo
agy ─ lifecycle + repo evidence ──┤
cliente LM Studio ─ adapter ──────┘
```

Hermes conserva su rol cuando orquesta, pero una sesión directa se conecta sin él. Provider/model
son metadata del runtime; Z.ai usa OpenCode en la instalación observada.

## Handshake y negociación

1. Main descubre endpoint/ejecutable por configuración local o PATH; no hardcodea la máquina.
2. Cliente envía rango de protocolo, nonce, repo binding y capabilities solicitadas.
3. Fuente responde versión, instance ID, session binding y capabilities efectivas.
4. Main acepta versión común o degrada: major incompatible desactiva controles.
5. Cada reconnect usa cursor/resume token cuando exista y dedupe por source instance/event ID.

No se infiere un vínculo por cwd o texto: repo/session deben vincularse explícitamente.

## Auth y secretos

- Electron main posee sockets, tokens y procesos.
- Secretos en `safeStorage`; renderer ve `connected/hasCredential/fingerprint`.
- Loopback usa token explícito de alta entropía; bind público requiere auth y transporte protegido.
- Si el backend loopback no ofrece auth nativa comprobada (LM Studio actual), GitCron interpone un
  wrapper/proxy main-owned autenticado o marca la integración degraded.
- Tokens no viajan en query strings, logs, SQLite de eventos ni payloads del renderer.
- Rotación/revocación invalida sesiones y obliga a nuevo handshake.
- No reutilizar `storage:get`, token GitHub en Zustand ni sanitizador parcial actual.

## Scoping y comandos

Todo evento/control incluye `repoId/runId/sessionId/agentId`. Main verifica binding vigente,
capability, precondiciones, idempotency key y ownership. El command bus sólo admite DTOs tipados;
no admite shell, argv o PID libres. ACK y efecto se almacenan como eventos distintos.

## Reconexión y backpressure

- Backoff exponencial con jitter y tope.
- Resume desde cursor; snapshot/reconciliación si no existe.
- Batching/coalescing para deltas de alta frecuencia con límites de bytes y cola.
- Nunca descartar silenciosamente decisions, approvals, errores, terminales o command results.
- Si hay overflow, emitir gap explícito y reconstruir desde snapshot/evidencia local.

## Ownership y cierre

Sólo procesos spawneados y registrados por GitCron pueden interrumpirse/matarse. Registro:
repo/run/session, executable permitido, PID/process group, timestamps, owner y cleanup policy.
Procesos externos pueden observarse si el protocolo lo permite, pero `kill` permanece unavailable.

## Redacción y retención

Adaptador redacta antes del normalizador. El normalizador vuelve a validar antes de SQLite/UI.
Se eliminan headers, bearer/basic, cookies, query secrets y paths/prompts sensibles. Reasoning es
opt-in, emitido por fuente, sanitizado y con retención separada. La bitácora derivada nunca se llama
reasoning literal.

## Degradación por fuente

- Hermes ausente: siguen adapters directos + evidencia del repo.
- Runtime directo ausente: su fila queda unavailable, no rompe otros adapters.
- `agy` sin stream estable: no parsear prosa; sólo lifecycle grueso/evidencia.
- LM Studio: no atribuir tools/control al servidor; atribuirlos al cliente agente.
- Z.ai: provider vía OpenCode hasta que otra interfaz sea comprobada.
- Repo sin scaffold: no gates/delegations/visualdiff, pero siguen Git/OpenSpec/runtimes.

## Consecuencias

El contrato es más explícito y soporta la sesión Codex actual sin Hermes. A cambio, habrá adapters
con distinta riqueza y más estados degraded. Esa asimetría es intencional: evita paridad ficticia y
permite implementar observación antes de control.
