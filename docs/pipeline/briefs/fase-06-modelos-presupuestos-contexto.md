# Pipeline Fase 06 — Modelos, presupuestos, contexto y routing por rol

> Permite elegir modelos/proveedores por repo, rol y task; agrega límites de tokens, costo y
> tiempo, y muestra salud de contexto. Requiere F05 mergeada. Branch
> `pipeline/fase-06-modelos-presupuestos`.

## Agentes recomendados

- **Builder:** OpenCode o Claude Code.
- **Catálogo/fixtures mecánicos:** LM Studio y Antigravity.
- **Auditor de política y costo:** Codex.

## Objetivo

- Catálogo vivo de proveedores/modelos autenticados y locales.
- Política por repo para los cinco roles R4: `scout`, `planner`, `builder`, `auditor`, `fixer`, más
  tareas auxiliares y `orchestrator` como actor separado de Hermes.
- Override por change/task sin cambiar globales por accidente.
- Fallbacks explícitos.
- Decorrelación builder/auditor bloqueante.
- Presupuestos soft/hard de tokens, costo y tiempo.
- Contexto usado/máximo, compresiones y headroom con procedencia.
- Cambio en próxima unidad segura, nunca hot-swap oculto.

## Jerarquía de configuración

De menor a mayor prioridad:

```text
default del runtime/orquestador
  < perfil GitCron por repo
  < política del rol
  < override del change
  < override de la task
  < override explícito de una corrida
```

La UI siempre muestra el valor efectivo y de dónde vino.

## Modelo de costo

Cada métrica incluye:

- valor/moneda;
- input/output/cache/reasoning tokens;
- fuente y timestamp de pricing;
- real vs estimado vs suscripción vs local vs unknown;
- cached/uncached cuando aplique;
- acumulado por call/turn/task/run/change/repo.

No descargar precios automáticamente desde páginas no versionadas dentro de esta fase. Usar
datos que el proveedor/runtime entrega o una tabla versionada y actualizable con procedencia.

## Presupuestos

- **Soft:** notifica al 70/90/100%, no corta.
- **Hard:** impide iniciar una nueva unidad que excedería el remanente.
- Corte durante una call solo si runtime lo soporta y usuario lo elige; default es terminar la
  call actual y pausar antes de la siguiente.
- Límites: por task, change, repo/día y rol.
- `unknown cost` no permite enforcement monetario; puede limitar tokens/tiempo.

## Tandas

### TANDA 0 — Catálogo y política

- Revalidar Claude/Codex/agy flags, OpenCode models/stats y LM Studio `lms ps --json`; incluir
  opciones/assignments Hermes sólo si F02 fue implementada.
- Definir `ModelDescriptor`, capabilities, provider family y auth/availability.
- Definir jerarquía, storage y efecto “next safe unit”.
- Definir cómo se demuestra familia distinta builder/auditor.
- **CHECKPOINT 0.**

### TANDA 1 — Catálogo y selección per-repo

- Resolver catálogo en main; renderer recibe metadata no secreta.
- Selección por rol/repo con validación de capability/tool/context.
- Current/effective/pending model separados.
- Expensive model confirmation cuando runtime/proveedor lo marca o política local lo requiere.
- Sin persistir cambios globales de Hermes salvo toggle humano explícito y separado.

### TANDA 2 — Routing y decorrelación

- Inyectar selección explícita al crear próxima corrida/agente.
- Auditor bloqueado si familia coincide con builder; fallback debe preservar la regla.
- Registrar modelo solicitado, resuelto y real reportado por runtime.
- Detectar drift/fallback no anunciado.

### TANDA 3 — Usage, costo y tiempo

- Aggregations jerárquicas sin double-count de subagentes.
- Actual vs estimated claramente separados.
- Suscripciones/local/unknown.
- Timers monotónicos para duración activa; espera/pausa separadas.
- Budget engine puro con tests de moneda/rounding/unknown/reconnect/retry.

### TANDA 4 — Salud de contexto

- Context used/max/percent solo si medido; estimación etiquetada.
- Headroom y compresiones.
- Alertas: saludable, presión, compresión reciente, desconocido.
- Recomendación de nueva sesión/compresión; no ejecutarla automáticamente.
- Coste de contexto reenviado visible cuando el runtime lo informe.

### TANDA 5 — UI y enforcement

- Selector por rol/task, resumen de política efectiva y pending changes.
- Budget gauges/alerts accesibles sin depender del color.
- Hard budget bloquea nueva unidad y genera decisión humana.
- QA con fixtures, sin gastar crédito real.

## Prompt copiable — builder OpenCode/Claude

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
fase, rama, tandas y checkpoints. No escribas ni crees la rama hasta recibir autorización.
Implementá SOLO Pipeline Fase 06. Confirmá F05 mergeada. TANDA 0 audit-only: catálogo real,
tipos, jerarquía, budget semantics y decorrelación. Esperá OK.

Implementá selección per-repo/rol/task que se aplica en la próxima unidad segura. Separá
requested/resolved/reported model. Builder y auditor de la misma familia debe ser un error
bloqueante, incluso vía fallback. Costo siempre con basis; unknown nunca 0. No double-count de
subagentes. Hard budget por default pausa antes de la próxima unidad, no corta una call.
Context gauge solo medido o explícitamente estimado.

No cambies globales de Hermes sin consentimiento, no toques secretos/credenciales, no cargues
modelos LM Studio automáticamente, no CSS. Tests puros + fixtures + cierre estándar con mensaje
y comandos de commit/push sugeridos, sin ejecutarlos.
```

## Prompt copiable — inventario Antigravity/LM Studio

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Este inventario es read-only: no crees rama ni edites.
Relevá modelos disponibles sin modificar configuración ni descargar/cargar nada. Para agy,
Claude, Codex, OpenCode, Hermes y LM Studio entregá: model id, provider/family, auth disponible
como boolean, context/capabilities solo si la fuente lo informa, y evidencia. No infieras precio
o familia por el nombre cuando sea ambiguo. Salida sanitizada para fixtures. STOP.
```

## Prompt copiable — auditor Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta auditoría es read-only: no crees rama ni edites.
Auditá F06 read-only. Buscá: decorrelación evadible por fallback/alias, hot-swap durante run,
global config modificada por un selector per-repo, costo estimado como real, suscripción tratada
como API spend, tokens double-count, contexto acumulado confundido con ventana actual, hard
budget que corta en una escritura y secretos/model lists sensibles en renderer/logs. Veredicto.
```

## Qué NO hacer

- No gestionar/crear API keys.
- No auto-login ni cambiar proveedor global por defecto.
- No cargar/descargar/unload LM Studio sin acción futura específica.
- No recomendar “mejor modelo” solo por precio.
- No hot-swap ni restart automático.
- No enforcement monetario sobre costo unknown.
- No usar reasoning tokens como medida de calidad.

## Criterios de aceptación

- [ ] Modelo efectivo visible por repo/rol/task con procedencia.
- [ ] Cambio se aplica en próxima unidad segura.
- [ ] Decorrelación builder/auditor no puede evadirse.
- [ ] Usage/costo/tiempo no double-count y muestran basis.
- [ ] Presupuesto soft/hard funciona con unknowns honestos.
- [ ] Contexto medido/estimado/desconocido no se mezcla.
- [ ] Sin inferencias pagas durante tests.
