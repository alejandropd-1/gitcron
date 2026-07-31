# Tasks — make-temp-repo-cleanup-reliable

## 1. Capacidad `testing-harness`

- [x] 1.1 Declarar la capacidad con sus requirements en el delta de specs
- [x] 1.2 Dejar escrito en `design.md` qué entra y qué no, para que no se vuelva un cajón de sastre

## 2. Limpieza con reintento

- [x] 2.1 Crear `test-utils/temp-dir.ts` con `removeTempDir`, fuera de `lib/` por ser utilería de pruebas
- [x] 2.2 Usarlo en `lib/__tests__/git-hunks-ipc.test.ts` (el que falla)
- [x] 2.3 Usarlo en `electron/__tests__/branch-delete-ipc.test.ts`
- [x] 2.4 Usarlo en `electron/__tests__/git-ops-worktree-submodule.test.ts`
- [x] 2.5 Usarlo en `electron/__tests__/git-repo-ipc.test.ts`
- [x] 2.6 Usarlo en `electron/__tests__/git-sync-ipc.test.ts`
- [x] 2.7 Usarlo en `electron/__tests__/temporal-agent-ipc.test.ts`

## 3. Verificación

- [x] 3.1 Confirmar que ninguna aserción cambió: sólo el borrado del temporal
- [x] 3.2 Correr la suite completa varias veces seguidas sin fallos

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde
- [x] 4.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.4 `openspec validate make-temp-repo-cleanup-reliable --strict` válido
- [x] 4.5 Reporte en `docs/reports/`
- [ ] 4.6 Frenar antes de staging y entregar a Ale
