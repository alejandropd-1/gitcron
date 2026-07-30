## 1. Base verificada

- [ ] 1.1 Confirmar rama, `tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 Confirmar que el adaptador proveedor existente (discovery/catálogo/health) pasa sus tests y reutiliza su interfaz
- [ ] 1.3 Confirmar la superficie de tool calling de LM Studio (`/v1/chat/completions`, `finish_reason: tool_calls`) contra un modelo local real con `trained_for_tool_use`

## 2. Tipo y registro

- [ ] 2.1 Añadir `'lmstudio'` a `PipelineRuntime` en `types/pipeline/runtime.ts`
- [ ] 2.2 Registrar el adaptador agente en el hub con `runtime: 'lmstudio'`, `launchable: true`, `modifiesRepo: true`

## 3. Loop agente

- [ ] 3.1 Nuevo `lmstudio-agent-adapter.ts` que compone al proveedor para discovery/catálogo/health
- [ ] 3.2 `start()`: inicia el loop con la tarea + declaración de tools
- [ ] 3.3 Loop: POST `/v1/chat/completions` con tools; manejar texto y `tool_calls`; devolver resultados `tool`; repetir hasta fin
- [ ] 3.4 Tools: `read_file`, `edit_file`, `glob`, `grep` con paths validados contra el repo (reutilizar guards existentes)
- [ ] 3.5 Límites: máximo de iteraciones, timeout total, corte ante paths inválidos
- [ ] 3.6 Telemetría: acumular tokens de los `usage` de cada completion
- [ ] 3.7 `events()` emite lifecycle del loop (iteraciones, tool calls ejecutados, fin)

## 4. UI: selector de modelo

- [ ] 4.1 Extender `RuntimeDiscoveryEntry` con el catálogo de modelos para LM Studio (id, contexto, tool-use)
- [ ] 4.2 Selector de modelo en el launcher cuando el runtime es LM Studio, mostrando su ventana de contexto
- [ ] 4.3 Filtrar: sólo modelos con `trained_for_tool_use: true` se ofrecen para ejecución
- [ ] 4.4 i18n de las cadenas nuevas en ES/EN/ZH

## 5. Tests

- [ ] 5.1 Prueba: loop completa una tarea en una iteración (texto de fin)
- [ ] 5.2 Prueba: loop con tool_calls ejecuta edit_file validado y continúa
- [ ] 5.3 Prueba: path fuera del repo se rechaza
- [ ] 5.4 Prueba: límite de iteraciones cierra como `failed`
- [ ] 5.5 Prueba: modelo sin tool-use no se ofrece
- [ ] 5.6 Prueba: telemetría acumula tokens

## 6. Cierre

- [ ] 6.1 `pnpm exec tsc --noEmit` en cero
- [ ] 6.2 `pnpm test` en verde, con la diferencia de conteo justificada
- [ ] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 6.4 `openspec validate add-lmstudio-agent-runtime --strict` válido
- [ ] 6.5 Reporte en `docs/reports/`
- [ ] 6.6 Frenar antes de staging y entregar a Ale con la QA visual pendiente
