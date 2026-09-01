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

- [ ] 4.1 `pnpm build` en cero. Va **primero** y no es formalidad: la suite lee el CSS
  compilado de `out/`, así que sin build previo `pnpm test` falla por falta de artefacto y no
  por un defecto real. Si falla con `ENOENT ...nft.json` en «Collecting build traces» después
  de decir «Compiled successfully», es caché stale: limpiar `.next` y reintentar.
- [ ] 4.2 `pnpm exec tsc --noEmit` en cero
- [ ] 4.3 `pnpm test` en verde, con la diferencia de conteo justificada. El punto de partida
  al 2026-09-01 es 173 archivos / 1538 pruebas.
- [ ] 4.4 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 4.5 `openspec validate add-opencode-runtime --strict` válido
- [ ] 4.6 Frenar antes de staging y entregar a Ale con la QA visual pendiente
