# Tasks — unify-feedback-surfaces

## 1. Un solo lugar para los avisos

- [x] 1.1 El archivado exitoso emite por la superficie de notificaciones de la aplicación
- [x] 1.2 Retirar la banda propia de Pipeline y su CSS
- [x] 1.3 Retirar la string de cierre que el toast ya resuelve
- [x] 1.4 Test: archivar con éxito deja el aviso en la superficie compartida, nombrando el cambio
- [x] 1.5 Test: un archivado fallido no emite aviso de éxito

## 2. Ancho de los toasts

- [x] 2.1 Los toasts de mensaje simple pasan de ancho fijo a tope de ancho
- [x] 2.2 Conservar el ancho de los toasts con acciones, donde sostiene la disposición

## 3. Progreso donde ocurre

- [x] 3.1 Propagar el estado de relectura hasta el ciclo de vida
- [x] 3.2 El ciclo late mientras se relee, y queda en reposo cuando no
- [x] 3.3 Respetar `prefers-reduced-motion`
- [x] 3.4 Test: el ciclo declara la relectura en curso y deja de hacerlo al terminar

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde
- [x] 4.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.4 `openspec validate unify-feedback-surfaces --strict` válido
- [x] 4.5 Reporte en `docs/reports/`
- [x] 4.6 Archivado confirmado por Ale desde la aplicación