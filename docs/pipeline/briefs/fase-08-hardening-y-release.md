# Pipeline Fase 08 — Hardening, compatibilidad, documentación y release

> Cierra el track completo. No agrega features: corrige hallazgos, prueba app empaquetada,
> sincroniza documentación y prepara release. Tag/publicación los hace Ale. Requiere F00–F07
> mergeadas. Branch `pipeline/fase-08-hardening-release`.

## Agentes recomendados

- **Inventario/hardening:** Claude Code.
- **Auditoría independiente:** Codex.
- **Compatibilidad runtime:** Antigravity/OpenCode.
- **Probes locales:** LM Studio sin inferencia o con permiso explícito.
- **QA visual y CSS final:** Ale.

## Objetivo

- Auditoría integral de seguridad, privacidad, procesos, costos y scoping.
- Compatibilidad con runtimes ausentes/nuevos/viejos.
- Verificación dev + packaged Windows; plan macOS/Linux.
- Performance bajo streams de alta frecuencia e historiales grandes.
- Retención/export/delete de datos de observabilidad.
- Documentación de usuario, operador, seguridad y desarrollador.
- Migraciones y rollback de feature flag.
- Release candidate sin tag/release automático.

## Tandas

### TANDA 0 — Inventario y freeze

- Congelar schema/protocol version candidato.
- Inventariar archivos, IPC, DB, listeners, child processes, endpoints, CSP y dependencias.
- Correr fallow/CodeGraph para lista de dead/duplicate; no borrar sin checkpoint.
- Consolidar deuda/herencias fuera de scope.
- **CHECKPOINT 0:** lista de hardening y borrados propuestos. Esperar OK.

### TANDA 1 — Seguridad y privacidad

- Threat model final: renderer compromise, local malicious process, repo malicioso, symlink,
  event spoof/replay, secret in output, prompt injection en logs/Markdown, cross-repo control.
- Sanitización y límites en todas las fuentes.
- Auth/handshake/rotation/revoke.
- Retención configurable; borrar/exportar por repo/change.
- Raw reasoning opt-in, minimizado y con aviso de sensibilidad.
- Audit log de controles tamper-evident razonable; sin secretos.

### TANDA 2 — Resiliencia y performance

- Backend/runtime ausente, crash, upgrade, incompatible schema y reconnect storm.
- Backpressure/batching de token deltas; virtualización/paginación timeline.
- Historial grande y DB migration/repair.
- Sleep/wake Windows, cambio rápido tabs, app quit durante run.
- No bloquear main/renderer con parsing, diffs o replay.

### TANDA 3 — Matriz de runtimes y empaquetado

- Probar degradación de Hermes, Claude, Codex, agy, OpenCode, LM Studio ausentes.
- Resolver executables sin paths hardcodeados; Windows `.cmd/.ps1/.exe` y `shell:false`.
- App empaquetada: recursos, node:sqlite, CSP, localhost endpoints y permisos.
- Verificar que GitCron no mata un backend que no creó.
- Documentar soporte/versiones mínimas y capability negotiation.

### TANDA 4 — E2E y QA visual

Historias completas con fixtures/fakes y una corrida real autorizada:

1. repo sin kit;
2. bootstrap/scout;
3. proposal → espera de spec;
4. builder con subagente, usage/context y files/diffs;
5. gates rojo/verde;
6. audit rejected → fixer → re-audit;
7. pause/steer/interrupt y working tree parcial;
8. model pending/effective + budget;
9. merge/archive;
10. replay.

QA teclado, reduced motion, ES/EN/ZH, resoluciones y CSS final de Ale.

### TANDA 5 — Documentación y release candidate

Actualizar en la misma pasada:

- `docs/00_FUENTE_DE_VERDAD.md`;
- `docs/01_INVARIANTES.md` si nacieron invariantes nuevas;
- `docs/02_ROADMAP.md`;
- `README.md`;
- `CHANGELOG.md`;
- `SECURITY.md`;
- manual de conexión/operación/troubleshooting;
- protocolo de adapters y cómo sumar runtime;
- matriz de soporte y privacidad/retención.

Version bump solo si Ale define la versión. No tag, no GitHub Release.

## Prompt copiable — hardening Claude

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
fase, rama, tandas y checkpoints. No escribas ni crees la rama hasta recibir autorización.
Ejecutá SOLO Pipeline Fase 08. TANDA 0 primero: inventario, threat surface, protocol/schema,
fallow/CodeGraph y lista de borrados. No borres ni refactorices antes del checkpoint de Ale.

Después corregí solo hallazgos aprobados. Priorizá scoping per-repo, secrets, auth, process
ownership, event replay/spoof, retention y packaged Windows. Validá runtimes ausentes y versiones
incompatibles. No agregues features. Ale controla CSS y release. Cada tanda con tests, resumen y
checkpoint; sin stage/commit/push. Al final entregá mensaje y comandos sugeridos y hacé STOP.
```

## Prompt copiable — compatibilidad Antigravity/OpenCode

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta prueba comienza read-only: no crees rama ni edites.
Probá como matriz de compatibilidad, no como builder de features: ejecutables ausentes,
versiones soportadas/no soportadas, paths Windows, serve/ACP/structured CLI caídos, reconnect,
capability false y app empaquetada. No uses credenciales ni llamadas pagas sin permiso. Entregá
tabla PASS/DEGRADED/FAIL con evidencia y reproducción. STOP.
```

## Prompt copiable — auditor final Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta auditoría es read-only: no crees rama ni edites.
Auditá read-only todo el track Pipeline F00–F08 contra docs/pipeline/00-indice.md y
docs/01_INVARIANTES.md. Priorizá P0/P1: control cross-repo, secrets, arbitrary command/PID,
untrusted Markdown/log output, stop con rollback, builder/auditor misma familia, costo falso,
reasoning privado, double-count, retention, process ownership y packaged-app failures.

También verificá docs drift, i18n, tests y que F08 no haya agregado features. Veredicto final con
hallazgos bloqueantes/no bloqueantes y checklist de release. No edites.
```

## Qué NO hacer

- No agregar features ni “mejoras” fuera del inventario aprobado.
- No borrar por Fallow sin prueba de no-consumo.
- No autoactualizar runtimes.
- No tag/release/merge.
- No debilitar CSP/sandbox/auth para empaquetar.
- No ocultar tests rojos como “deuda” sin demostrar que son preexistentes.

## Criterios de aceptación

- [ ] Auditoría final sin P0/P1 abiertos.
- [ ] App dev y packaged Windows verificadas.
- [ ] Matriz de runtimes y degradación documentada.
- [ ] Performance estable bajo stream/historial grande.
- [ ] Retención/export/delete y privacidad verificadas.
- [ ] E2E completo + QA visual + i18n.
- [ ] README/CHANGELOG/SECURITY/fuente de verdad sincronizados.
- [ ] tsc/test/fallow/report + mensaje/comandos sugeridos; sin commit/push/merge/tag/release.
