# Tasks — fix-archive-panel-and-git-refresh

## 1. El historial vuelve a la vista

- [x] 1.1 El proceso principal emite `repo:commits-changed` tras commitear, sólo si hubo commits
- [x] 1.2 Exponerlo en preload y tipos
- [x] 1.3 Las vistas releen historial, estado y ramas al recibirlo, y limpian la suscripción

## 2. Panel de confirmación usable

- [x] 2.1 El panel se acota y desplaza dentro de sí mismo
- [x] 2.2 Los botones quedan pegados abajo, alcanzables sin llegar al final del scroll

## 3. Ficha del completado

- [x] 3.1 Dejar de recortar el comienzo al desbordar
- [x] 3.2 Más ancho para el visor de artefactos

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde
- [x] 4.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.4 `openspec validate fix-archive-panel-and-git-refresh --strict` válido
- [x] 4.5 Reporte en `docs/reports/`
- [x] 4.6 Archivado confirmado por Ale desde la aplicación
