## 1. Atribución

- [x] 1.1 Cambiar `artifactChangeId` para que distinga `change`, `archived` y `code` en vez de `string | null`
- [x] 1.2 Reescribir el loop de `deriveChangeCommitScope` para que `archived` (y los restos bajo `openspec/specs/`) caigan siempre en `foreign`, sin depender de la ambigüedad

## 2. Cobertura

- [x] 2.1 Corregir el test "un cambio archivado no cuenta como cambio en curso" para verificar que el archivo archivado queda fuera y el código del propio change sigue entrando en `own`
- [x] 2.2 Agregar un caso que cubra los restos de un archivado (incluido `openspec/specs/…`) presentes junto a un change activo sin ambigüedad, y verifique que no entran en `own`
- [x] 2.3 Confirmar que los casos de código ambiguo con varios cambios siguen listando el código como `foreign`
- [x] 2.4 Test de integración: al preparar el commit desde la guía se llama a `stageFiles` y a `setCommitMessage`, pero no a `commitChanges` ni a ninguna API que confirme (cubre el requisito "Preparar el commit sin confirmarlo", tarea 3.5 heredada de confirm-work-in-git)

## 3. Cierre

- [x] 3.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 3.2 `pnpm exec tsc --noEmit` en cero
- [x] 3.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 3.4 `openspec validate fix-archived-attribution --strict` válido
