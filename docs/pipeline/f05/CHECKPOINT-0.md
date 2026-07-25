# Pipeline F05 — Checkpoint 0: Threat Model, State Machines y Capability Matrix

**Fecha:** 2026-07-25  
**Agente / Modelo:** Antigravity / Gemini 3.6 Flash (High)  
**Alcance:** TANDA 0 (Audit-only / Análisis de seguridad, estados de comandos y matriz de capacidades).  
**Regla:** Cero modificaciones a código de producción en TANDA 0.

---

## 1. Threat Model (Modelo de Amenazas y Superficie de Ataque)

Fase 05 introduce por primera vez capacidad de **intervención/control** sobre los procesos de los runtimes. Para mantener la invariante de seguridad y aislamiento per-repo, se aplican los siguientes vectores y defensas:

### Vectores de Ataque y Defensas

| Vector de Amenaza | Riesgo | Mitigación Estructural en Main Process |
|---|---|---|
| **Inyección de Argv / Shell desde Renderer** | Crítico (RCE) | **Prohibido.** El Renderer jamás envía `argv`, `shell`, `commandString` ni `PID` crudos. Solo transmite un `commandId` enum + `repoPath` + `targetId` pre-validado. |
| **Spoofing Cross-Repo / Cross-Session** | Crítico | **Isolation.** Todo comando se valida contra el `repoPath` activo y el `sessionId` perteneciente a ese repo. Si el `repoPath` o `sessionId` no coinciden con el store per-repo de Main, se descarta con `UNAUTHORIZED_TARGET`. |
| **Command Replay / Doble Click** | Alto | **Nonce & Idempotency Key.** Cada comando genera un `nonce` único de un solo uso. Si Main detecta un `nonce` repetido en la ventana activa, lo descarta silenciosamente. |
| **Ejecución Stale (Runtimes desfasados)** | Alto | **Ack + Reconciliación.** Si la sesión o el proceso ya finalizaron antes de recibir el comando, Main reconcilia con un evento `STALE_SESSION` y no envía señales de control a PIDs reciclados del SO. |
| **Destrucción de código parcial por Interrupción** | Alto | **Sin Rollback Automático.** Una interrupción (`interrupt-turn`, `interrupt-subagent`) detiene la tarea en curso pero **nunca** ejecuta `git reset`, `git clean` ni elimina archivos. La UI muestra el working tree parcial y solicita revisión humana. |
| **Emergencia Global no Aislada** | Alto | **Cero `kill_all` global.** No se expone ningún botón ni comando de terminación global cross-repo. Toda cancelación es estrictamente `repo-scoped` y `session-scoped`. |

---

## 2. State Machines (Máquina de Estados de Comandos)

Cada interacción humana enviada por la UI atraviesa el ciclo de vida del bus de comandos en Main:

```
 [ UI Action ]
       │
       ▼
  ( confirming )  ◄── Usuario revisa riesgo / confirmación en UI
       │
       ▼  IPC Channel Específico (ej. `pipeline:control:pause`)
  ( requested )   ◄── Main valida nonce, repoPath, sessionId y capability
       │
       ├────────────────────────┐
       ▼ (inválido / stale)    ▼ (validado)
  ( failed / stale )       ( sent )
                                │
                                ▼
                       ( acknowledged )  ◄── Runtime / Process confirma recepción
                                │
                                ▼
                       ( completed )     ◄── Eventual Effect reconciliado por snapshot
```

### Estados de Comandos
1. `confirming`: La UI solicita confirmación humana (para acciones de riesgo medio/alto).
2. `requested`: Comando enviado a Main con nonce e idempotencia.
3. `sent`: Main validó seguridad y despachó la instrucción al adaptador o proceso.
4. `acknowledged`: El runtime o adaptador acusó recibo del comando de control.
5. `completed`: El efecto se verificó mediante el snapshot o evento del stream.
6. `failed`: Error en la transmisión, precondiciones no cumplidas o timeout.
7. `stale`: El target ya no existe (sesión terminada o proceso cerrado previa recepción).

---

## 3. Capability Matrix por Runtime (Matriz de Control)

Las acciones solo se habilitan cuando la capability específica está declarada y verificada en el adaptador.

| Comando / Acción | Riesgo UI | Claude Code | Codex CLI | OpenCode | Antigravity (`agy`) | LM Studio (Local) |
|---|---|---|---|---|---|---|
| `pause-delegations` | Bajo | 🟢 Soportado | 🔴 No soporta | 🔴 No soporta | 🔴 No soporta | 🔴 No soporta |
| `pause-after-task` | Medio | 🟢 Soportado | 🔴 No soporta | 🟢 Soportado (ACP) | 🔴 No soporta | 🔴 No soporta |
| `steer` | Medio | 🟢 Soportado | 🔴 No soporta | 🟢 Soportado | 🔴 No soporta | 🔴 No soporta |
| `queue-instruction` | Bajo | 🟢 Soportado | 🟢 Soportado | 🟢 Soportado | 🟢 Soportado | 🟢 Soportado |
| `interrupt-turn` | Alto | 🟢 SIGINT | 🟢 SIGINT | 🟢 ACP Cancel | 🟢 SIGINT | 🟢 Abort HTTP |
| `interrupt-subagent`| Alto | 🟢 Scoped | 🔴 No soporta | 🟢 Scoped | 🔴 No soporta | 🔴 No soporta |
| `kill-process` | Alto | 🟢 Scoped | 🟢 Scoped | 🟢 Scoped | 🟢 Scoped | 🔴 N/A |
| `cancel-run` | Muy Alto| 🟢 Scoped | 🟢 Scoped | 🟢 Scoped | 🟢 Scoped | 🟢 Abort HTTP |

*Nota:* Si un runtime no soporta una acción (marcado 🔴), el control en la UI **permanece deshabilitado** mostrando el mensaje explicativo de la razón en `aria-disabled` (por ejemplo: *"Este runtime no soporta pausar delegaciones"*).

---

## 4. Diseño del Command Bus en Main Process (`main-only`)

### Canales IPC Específicos (Allowlisted)
Se prohíbe `pipelineCommand(name: string, payload: any)` genérico. Cada tipo de control utiliza un canal con tipos estrictos:

- `pipeline:control:pause` -> `{ repoPath: string; sessionId: string; mode: 'delegations' | 'after-task'; nonce: string }`
- `pipeline:control:steer` -> `{ repoPath: string; sessionId: string; instruction: string; nonce: string }`
- `pipeline:control:queue` -> `{ repoPath: string; sessionId: string; instruction: string; nonce: string }`
- `pipeline:control:interrupt` -> `{ repoPath: string; sessionId: string; target: 'turn' | 'subagent'; subagentId?: string; nonce: string }`
- `pipeline:control:cancel` -> `{ repoPath: string; sessionId: string; nonce: string }`
- `pipeline:control:respond-decision` -> `{ repoPath: string; decisionId: string; optionId: string; nonce: string }`

### Auditoría Append-Only
Main registra cada intento de comando en un log de auditoría local (`pipeline-audit.jsonl` per-repo) con:
- `timestamp`, `commandId`, `action`, `repoPath`, `sessionId`, `userConfirmed: true`, `result: 'ack' | 'rejected' | 'failed'`.

---

## 5. Plan de Tandas para Fase 05

- **TANDA 0 (Completada):** Threat model, state machines, matriz de capacidades y diseño de IPC. (Checkpoint 0).
- **TANDA 1:** Command bus main-only, canales allowlisted, idempotencia, audit log y tests adversariales.
- **TANDA 2:** Implementación de acciones no destructivas (`pause`, `steer`, `queue`).
- **TANDA 3:** Implementación de interrupción y control de procesos (`interrupt-turn`, `interrupt-subagent`, `kill-process`).
- **TANDA 4:** Conexión de respuestas a decisiones (`respond-decision` contra `UX-DECISIONES.md`), verificación de zonas protegidas con digest exacto y cancelación de corrida.
- **TANDA 5:** QA visual de controles, estados de confirmación, i18n y reporte final.
