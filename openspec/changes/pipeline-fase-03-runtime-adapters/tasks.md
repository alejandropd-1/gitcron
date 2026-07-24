## 1. TANDA 0 — Contrato y fixtures

- [x] 1.1 Revalidar versiones instaladas y documentar estado de evidencia por runtime sin ejecutar inferencias pagas
- [x] 1.2 Definir DTOs de identidad, eventos, métricas, contexto, costo, health y capabilities
- [x] 1.3 Definir `RuntimeAdapter`, contexto de sesión y contratos inyectables de transporte/stream
- [x] 1.4 Versionar matriz machine-readable y fixtures sanitizados disponibles, marcando faltantes como `pending_fixture`
- [x] 1.5 Crear conformance base para coherencia de capabilities, identidad obligatoria y degradación honesta
- [x] 1.6 Validar TANDA 0 y detenerse en CHECKPOINT 0 antes de integrar procesos

## 2. TANDA 1 — Claude Code y Codex

- [x] 2.1 Implementar runner de child processes con args array, `shell: false`, cwd validado, env mínimo y ownership
- [x] 2.2 Implementar decoder JSONL incremental con límites, UTF-8, stderr, timeout, cancelación y cleanup
- [x] 2.3 Capturar o confirmar fixture stream-json de Claude y fixture `codex exec --json` con autorización
- [x] 2.4 Implementar normalizador/adaptador Claude con usage, costo, contexto, modelo y reasoning según fixture
- [x] 2.5 Implementar normalizador/adaptador Codex con sesión, modelo, eventos y métricas según fixture
- [x] 2.6 Ejecutar conformance focalizada de Claude y Codex

## 3. TANDA 2 — OpenCode y Z.ai

- [x] 3.1 Comparar JSON CLI, ACP y server con evidencia de versión actual y documentar transporte elegido
- [x] 3.2 Capturar o confirmar fixture OpenCode directo y fixture Z.ai vía OpenCode con autorización
- [ ] 3.3 Implementar normalizador/adaptador OpenCode con thinking opt-in y provider/model separados
- [ ] 3.4 Normalizar stats de tokens/costo con procedencia, filtro por proyecto y dedupe
- [ ] 3.5 Ejecutar conformance focalizada de OpenCode/Z.ai, loopback y cleanup

## 4. TANDA 3 — Antigravity

- [ ] 4.1 Relevar salida estructurada oficial, plugins/hooks y log schema de `agy` 1.1.5 sin inferencia paga
- [ ] 4.2 Capturar fixture seguro si existe o documentar wrapper lifecycle-only y capabilities desconocidas
- [ ] 4.3 Implementar adapter `agy` sin regex sobre prosa y ejecutar conformance degradada

## 5. TANDA 4 — LM Studio

- [ ] 5.1 Revalidar health y `lms ps --json` sin auto-start, load o unload
- [ ] 5.2 Implementar provider LM Studio mediante cliente main-only/OpenAI-compatible sin exponer socket al renderer
- [ ] 5.3 Normalizar modelo, contexto y usage; clasificar costo `local_unpriced`
- [ ] 5.4 Probar server caído, modelo ausente, usage ausente y respuesta local sanitizada

## 6. TANDA 5 — Integración y cierre

- [ ] 6.1 Integrar envelopes y métricas sanitizados con persistencia per-repo sin control público
- [ ] 6.2 Ejecutar conformance completa de orden, dedupe, parciales, crash, timeout, cleanup, unknown y redacción
- [ ] 6.3 Ejecutar typecheck, tests, gate full y Fallow; registrar exit codes y deuda heredada separada
- [ ] 6.4 Solicitar auditoría independiente de otra familia y corregir hallazgos P0/P1
- [ ] 6.5 Escribir reporte por runtime, tabla PASS/DEGRADED/NO SOPORTADO y actualizar tablero a Lista para QA
- [ ] 6.6 Entregar diff y comandos exactos sugeridos sin stage, commit ni push; STOP
