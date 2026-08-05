## 1. Filtro

- [x] 1.1 Filtrar `runtimeSessions` en `OpenSpecDashboard.tsx` por el cambio abierto, dejando pasar todas cuando no hay ninguno
- [x] 1.2 Excluir del cambio abierto las sesiones con `changeId` nulo, que no se pueden atribuir
- [x] 1.3 Verificar que `effectiveSessionId`, el selector, la disponibilidad de razonamiento y el estado siguen derivando del conjunto ya filtrado, sin tocarlos

## 2. Cambio sin sesiones

- [x] 2.1 Declarar en la columna que el cambio abierto no tiene actividad registrada, en vez de dejar el espacio vacío o caer a otra sesión
- [x] 2.2 Escribir esa clave en ES, EN y ZH, y sumarla a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 3. Cobertura

- [x] 3.1 Test del caso que produce el defecto: dos cambios con sesiones, la más reciente del que no está abierto, y la columna mostrando la del abierto
- [x] 3.2 Test de que una corrida activa en otro cambio no aparece en la columna del abierto
- [x] 3.3 Test de que un cambio sin sesiones lo declara en vez de mostrar la de otro
- [x] 3.4 Test de que sin cambio abierto se muestran todas las sesiones

## 4. Cierre

- [x] 4.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 4.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 4.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 4.4 Dejar `openspec validate filter-activity-by-change --strict` válido
- [ ] 4.5 Ale valida visualmente y marca esta casilla: que la columna corresponda al cambio abierto y que un cambio sin actividad se lea bien
