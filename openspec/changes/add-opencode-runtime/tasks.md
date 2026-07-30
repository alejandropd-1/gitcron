## 1. Base verificada

- [ ] 1.1 Confirmar rama, `tsc --noEmit` en cero y `pnpm test` en verde (548)
- [ ] 1.2 Confirmar que el factory `createOpenCodeAcpRuntimeAdapter` y su handshake ACP pasan sus tests

## 2. Cableado del ejecutable en el hub

- [ ] 2.1 Cambiar el tipo `AdapterEntry.create` para que opcionalmente reciba `executable`
- [ ] 2.2 Registrar OpenCode en `ADAPTERS` con `runtime: 'opencode'`, `executable: 'opencode'`, `launchable: true`, `modifiesRepo: true`
- [ ] 2.3 Asegurar que claude/codex/agy siguen funcionando (ignoran el ejecutable nuevo)

## 3. Tests

- [ ] 3.1 Prueba: OpenCode aparece como lanzable en `discover()` cuando el binario responde
- [ ] 3.2 Prueba: OpenCode ausente se lista con diagnóstico sin romper los demás

## 4. Cierre

- [ ] 4.1 `pnpm exec tsc --noEmit` en cero
- [ ] 4.2 `pnpm test` en verde, con la diferencia de conteo justificada
- [ ] 4.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 4.4 `openspec validate add-opencode-runtime --strict` válido
- [ ] 4.5 Reporte en `docs/reports/`
- [ ] 4.6 Frenar antes de staging y entregar a Ale con la QA visual pendiente
