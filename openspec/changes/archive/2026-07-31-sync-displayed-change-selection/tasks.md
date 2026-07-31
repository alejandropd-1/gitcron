# Tasks — sync-displayed-change-selection

## 1. Sincronizar lo mostrado con lo leído

- [x] 1.0 Quitar el fallback del adaptador: enmascaraba el "no seleccioné ninguno" del backend y hacía inalcanzable todo lo demás
- [x] 1.1 Informar la selección mostrada cuando el backend no resolvió ninguna
- [x] 1.2 No informar nada cuando la selección automática ya resolvió, para no pisarla
- [x] 1.3 No informar nada cuando el cambio mostrado es uno archivado
- [x] 1.4 Evitar el bucle: informar una sola vez por cambio resuelto

## 2. Tests

- [x] 2.1 Sin match de rama y varios activos, se informa el cambio mostrado
- [x] 2.2 Con selección automática resuelta, no se informa nada
- [x] 2.3 Con selección manual del usuario, el fallback no la pisa

## 3. Cierre

- [x] 3.1 `pnpm exec tsc --noEmit` en cero
- [x] 3.2 `pnpm test` en verde
- [x] 3.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 3.4 `openspec validate sync-displayed-change-selection --strict` válido
- [x] 3.5 Reporte en `docs/reports/`
- [x] 3.6 Archivado confirmado por Ale desde la aplicación