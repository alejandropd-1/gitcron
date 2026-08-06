## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (101 archivos / 736 tests antes de tocar nada)
- [x] 1.2 Comprobar sobre un archivado real con `git show --name-status -M 8f96418` qué archivos entran
      en el commit: cuatro `R100` a `openspec/changes/archive/…` y una `M` de la spec consolidada
- [x] 1.3 Leer las pruebas de tabla existentes de `suggestCommitMessage` para saber cuál cambia de
      resultado: sólo la del commit de archivado

## 2. Implementación

- [x] 2.1 En `lib/change-commit-scope.ts`, intercalar `archived` cuando alguna ruta del conjunto aporte
      el identificador desde `openspec/changes/archive/…`
- [x] 2.2 Dejar intactos `soleChangeId`, `fileOrigin`, `deriveScope` y el agrupamiento
- [x] 2.3 Mantener `suggestCommitMessage` pura: sin estado de Git ni forma de `GitFile`
- [x] 2.4 Documentar en el código por qué se reconoce por ruta y cuál es el falso positivo asumido

## 3. Tests

- [x] 3.1 Actualizar la prueba del commit de archivado al nuevo resultado esperado
- [x] 3.2 Prueba nueva: el commit del trabajo del mismo cambio no lleva `archived`
- [x] 3.3 Prueba nueva: un archivado mezclado con otro cambio deja la descripción vacía
- [x] 3.4 Comprobar que las demás filas de la tabla no cambian de resultado

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde: 101 archivos / 738 tests, dos corridas. Los dos tests de más son 3.2 y 3.3
- [x] 4.3 `pnpm exec eslint` limpio sobre `lib/change-commit-scope.ts` y su archivo de pruebas
- [x] 4.4 `openspec validate label-archive-commit-message --strict` válido
- [x] 4.5 Reporte en `docs/reports/2026-08-06-label-archive-commit-message.md`
- [x] 4.6 Ale valida en la aplicación: archivar un cambio y ver que el mensaje sugerido dice
      `chore: archived <slug>` sin tener que escribirlo
