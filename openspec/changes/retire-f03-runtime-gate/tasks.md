## 1. Base verificada

- [x] 1.1 Confirmar rama, `tsc --noEmit` en cero y `pnpm test` en verde (548), y registrar el conteo de partida
- [x] 1.2 Confirmar qué tests leen los fixtures físicos (5 tests los usan como stream de entrada para normalización)

## 2. Quitar el gate de versión

- [x] 2.1 En `runtime-session-hub.ts`, cambiar `launchable` a `entry.launchable && discovery.installed` (sin `versionVerified`)
- [x] 2.2 Actualizar el comentario que explica la decisión de lanzabilidad
- [x] 2.3 Propagar `evidenceStatus` al `RuntimeDiscoveryEntry` como metadato informativo

## 3. Desacoplar adaptadores del gate de fixture

- [x] 3.1 `claude-adapter.ts`: `FIXTURE_REF = ''`, capabilities → `pending_fixture`
- [x] 3.2 `codex-adapter.ts`: lo mismo
- [x] 3.3 `agy-adapter.ts`: capabilities → `pending_fixture`, `discover` informativo, gate interno quitado
- [x] 3.4 `lmstudio-adapter.ts`: `discover` informativo (preserva `verified` de observación HTTP viva en `health`)
- [x] 3.5 `opencode-acp-adapter.ts`: `discover` informativo; gates internos en `health()` y `start()` cambiados a instalación, no evidencia; `agentVersion` exacta deja de exigirse
- [x] 3.6 `structured-cli-adapter.ts`: reporta versión instalada siempre; `evidenceStatus` informativo, no bloqueante
- [x] 3.7 `conformance.ts`: la regla `available ⟹ verified` pasa a aceptar `pending_fixture`

## 4. Fixtures físicos (decisión revisada)

- [x] 4.1 Los fixtures físicos de `docs/pipeline/f03/` y `f00/` se CONSERVAN como datos de entrada para los tests de normalización (5 tests los leen)
- [x] 4.2 Dejan de usarse como gate de versión o como `evidenceRefs` citados: ya no son política, sólo insumo de prueba

## 5. UI con aviso informativo

- [x] 5.1 `PipelineRuntimeLauncher`: aviso "no verificado" cuando `evidenceStatus !== 'verified'`, sin bloquear el arranque
- [x] 5.2 Nueva clave i18n `pipeline.launcher.unverified` en ES/EN/ZH

## 6. Tests

- [x] 6.1 `runtime-session-hub.test.ts`: instalado (aunque no verificado) es lanzable
- [x] 6.2 `runtime-adapter-conformance.test.ts`: `available` + `pending_fixture` es válido
- [x] 6.3 `runtime-agy.test.ts`: evidencia informativa, diagnóstico actualizado
- [x] 6.4 `runtime-lmstudio.test.ts`: `discover` informativo; `health` verified por observación
- [x] 6.5 `runtime-opencode-acp.test.ts`: gates internos de instalación, no de versión

## 7. Cierre

- [x] 7.1 `pnpm exec tsc --noEmit` en cero
- [x] 7.2 `pnpm test` en verde (548, mismo conteo: assertions actualizados, no agregados)
- [x] 7.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 7.4 `openspec validate retire-f03-runtime-gate --strict` válido
- [x] 7.5 Reporte en `docs/reports/`
- [ ] 7.6 Frenar antes de staging y entregar a Ale con la QA visual pendiente
