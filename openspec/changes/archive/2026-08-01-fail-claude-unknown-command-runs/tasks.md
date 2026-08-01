## 1. Normalizador de Claude

- [x] 1.1 Derivar el éxito del `result` mirando `num_turns` y el motivo, no sólo `is_error`, en `electron/pipeline/runtime-adapters/claude-normalizer.ts`
- [x] 1.2 Emitir `runtime.error` con el motivo textual del rechazo junto al `run.completed` fallido
- [x] 1.3 Documentar en el código que el prefijo `Unknown command:` es un contrato de facto con el CLI

## 2. Cierre de sesión

- [x] 2.1 Hacer que `drain()` marque `failed` ante un `run.completed` con `success: false` en `electron/pipeline/runtime/runtime-session-hub.ts`
- [x] 2.2 Verificar que la interrupción pedida por el usuario conserva precedencia sobre el fracaso del run

## 3. Cobertura

- [x] 3.1 Test del normalizador: cero turnos con `Unknown command:` produce `success: false` y conserva el motivo
- [x] 3.2 Test del normalizador: run con turnos y sin error sigue produciendo `success: true`
- [x] 3.3 Test del normalizador: cero turnos con otro motivo no inventa un fallo
- [x] 3.4 Test del hub: `run.completed` fallido con proceso exitoso cierra la sesión como `failed`
- [x] 3.5 Test del hub: sesión detenida por el usuario cierra como `interrupted` aunque el run haya fallado

## 4. Cierre

- [x] 4.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.2 `pnpm exec tsc --noEmit` en cero
- [x] 4.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 4.4 `openspec validate fail-claude-unknown-command-runs --strict` válido
- [x] 4.5 Reporte en `docs/reports/` con qué se tocó, qué no, y el resultado real de las comprobaciones
- [x] 4.6 Manifiesto `commit.md` con el mensaje y los archivos exactos que entran
- [x] 4.7 Archivado confirmado por Ale desde la aplicación
