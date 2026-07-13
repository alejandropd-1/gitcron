# Pipeline Fase 00 — Contrato, seguridad y spikes de runtimes

> Fase exclusivamente de reconocimiento y diseño. **No implementar la feature, no modificar
> código de producto, no agregar dependencias.** El resultado es un contrato verificable que
> evita construir adaptadores sobre supuestos. Branch `pipeline/fase-00-contrato`.

## Agentes recomendados

- **Scout principal:** Antigravity (`agy`) o Claude Code, modo lectura.
- **Revisor de arquitectura/seguridad:** Codex, sandbox read-only y familia distinta.
- **LM Studio:** opcional para clasificar fixtures ya capturados; nunca decide el contrato.
- **Hermes:** orquesta y conserva los dos checkpoints humanos.

## Objetivo

Cerrar el protocolo `Pipeline Contract v1` y responder con evidencia:

- Cómo se vincula un repo de GitCron con proyecto/sesión de Hermes.
- Cómo se autentica el companion local sin filtrar secretos.
- Qué eventos, métricas y controles existen realmente por runtime.
- Qué campos son medidos, estimados, derivados o desconocidos.
- Cómo se correlacionan repo/change/task/run/session/agente.
- Qué compatibilidad/versionado necesita el Connector.

## Scope permitido

- Lectura de `C:\www\gitCronos`, `C:\www\scaffold` y la instalación local de Hermes.
- Ejecutar `--help`, `--version`, estados y probes sin inferencia paga.
- Capturar/sanitizar fixtures mínimos de eventos **solo si Ale autoriza ejecutar una inferencia**.
- Crear únicamente documentos dentro de `docs/pipeline/` y reporte de esta fase.
- Proponer, no instalar, dependencias.

## Qué NO hacer / fuera de scope

- No crear handlers IPC ni componentes.
- No arrancar una ejecución paga para “ver qué devuelve” sin autorización.
- No leer, copiar ni imprimir API keys, cookies, tokens de sesión o archivos de credenciales.
- No conectar el renderer directamente a ningún backend.
- No comprometerse con ACP, JSON-RPC interno o parsing de stdout sin comparar alternativas.
- No modificar Hermes/scaffold en esta fase.

## Tandas

### TANDA 0 — Estado real y superficies existentes

1. Leer `docs/00_FUENTE_DE_VERDAD.md`, `docs/01_INVARIANTES.md` y `docs/pipeline/00-indice.md`.
2. Trazar en GitCron: main/preload/renderer, watcher, SQLite, provider adapters y patrones de
   cleanup/reconexión.
3. Relevar Hermes `serve`, WebSocket/JSON-RPC, auth, contract version, sesiones, usage,
   reasoning, delegaciones, procesos y modelos.
4. Relevar Claude, Codex, `agy`, OpenCode y LM Studio con versiones actuales.
5. Entregar tabla `capacidad × runtime`: observe, reasoning, tools, usage, cost, context,
   model-select, pause, interrupt, kill, resume, auth, schema stability.
6. **CHECKPOINT 0:** evidencia y preguntas abiertas. Esperar OK.

### TANDA 1 — Fixtures y normalización

Definir fixtures sanitizados para:

- sesión/turno normal;
- tool start/progress/complete;
- reasoning visible y reasoning ausente;
- usage/context medido y desconocido;
- subagente;
- aprobación;
- interrupción;
- error/reconexión;
- proceso background.

Si no puede capturarse un fixture sin costo o credenciales, definir el procedimiento de captura
y marcarlo `PENDIENTE DE ALE`; no inventar payloads como si fueran reales.

### TANDA 2 — ADR de conexión

Comparar al menos:

1. Hermes `serve` + companion JSON-RPC/WebSocket formal.
2. ACP.
3. CLI child process + stdout estructurado.
4. Filesystem/hooks como fallback.

Recomendación esperada: un `HermesConnector` en Electron main sobre un contrato companion
autenticado y versionado; ACP/CLI/filesystem quedan como adaptadores o degradaciones. Confirmar
o corregir con evidencia.

Definir:

- handshake, auth local y capability negotiation;
- reconexión y backpressure;
- scoping por repo/session;
- errores y degradación;
- ownership de procesos;
- auditoría de comandos;
- política de redacción;
- protocolo de versiones.

**CHECKPOINT 1:** ADR + contratos TypeScript propuestos, todavía sin implementarlos. Esperar OK.

## Prompt copiable — scout (`agy` o Claude Code)

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
fase, tandas, checkpoints y rama objetivo antes de actuar. Pedí autorización cuando corresponda.
Sos el scout de Pipeline Fase 00 en C:\www\gitCronos. Esta fase es AUDIT-ONLY.
Leé docs/00_FUENTE_DE_VERDAD.md, docs/01_INVARIANTES.md,
docs/pipeline/00-indice.md y docs/pipeline/briefs/fase-00-contrato-y-spikes.md.

Objetivo: producir evidencia para Pipeline Contract v1. Relevá GitCron, scaffold y las
interfaces instaladas de Hermes, Claude, Codex, agy, OpenCode y LM Studio. Armá la matriz
capacidad × runtime y compará Hermes companion WS/JSON-RPC, ACP, CLI estructurada y hooks.

Reglas:
- no edites código ni configuración;
- no instales dependencias;
- no ejecutes inferencias pagas sin permiso;
- no leas ni imprimas secretos;
- no asumas schemas a partir de --help: separá VERIFICADO / INFERIDO / PENDIENTE;
- no avances más allá de TANDA 0.

Entregá evidencia con archivo:línea o comando+salida sanitizada, riesgos, preguntas abiertas
y la propuesta de fixtures. STOP para checkpoint humano.
```

## Prompt copiable — auditor Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
el alcance de la auditoría antes de actuar. No crees rama ni escribas archivos en modo read-only.
Sos el auditor independiente de Pipeline Fase 00. Trabajá read-only en C:\www\gitCronos.
Auditá el relevamiento y ADR propuesto contra docs/01_INVARIANTES.md y el brief de F00.

Buscá especialmente:
- capacidades afirmadas sin fixture;
- auth/token del backend llegando al renderer;
- controles sin scoping por repo/session;
- costos estimados presentados como reales;
- reasoning inferido presentado como literal;
- parsing frágil de terminal;
- dependencia de paths/versiones de una máquina;
- ausencia de capability/version negotiation;
- huecos para agy/OpenCode/LM Studio.

No edites. Entregá Veredicto: APROBADO o RECHAZADO y hallazgos numerados con evidencia y fix
documental concreto. STOP.
```

## Criterios de aceptación

- [ ] Matriz de capacidades con procedencia por runtime.
- [ ] Fixtures reales o procedimiento explícito para capturarlos.
- [ ] Contratos propuestos de identidad, eventos, métricas, capacidades y comandos.
- [ ] ADR de conexión, autenticación, versionado y degradación.
- [ ] Ningún secreto inspeccionado o expuesto.
- [ ] Cero código de producto y cero dependencias nuevas.
- [ ] Reporte `docs/reports/pipeline-fase-00-contrato.md`.

## Cierre

Entregar mensaje de commit documental y comandos sugeridos, sin ejecutar stage/commit/push.
**STOP.** F01 no empieza hasta que Ale haga QA, commit/push y apruebe el contrato.
