# Tasks — bound-active-changes-list

## 1. Lista acotada y navegable

- [x] 1.1 Envolver los cambios activos en un contenedor propio, dejando el encabezado de la sección fijo
- [x] 1.2 Tope de alto relativo al viewport y scroll propio en ese contenedor
- [x] 1.3 Verificar que Completados y Especificaciones quedan accesibles sin recorrer toda la lista

## 2. Desplegado explícito

- [x] 2.1 El desplegado deja de seguir a la selección: por defecto, plegado
- [x] 2.2 El control de desplegado sigue funcionando con independencia de la selección
- [x] 2.3 Test: seleccionar un cambio no lo despliega
- [x] 2.4 Test: el control de desplegado sí lo despliega

## 3. Cierre

- [x] 3.1 `pnpm exec tsc --noEmit` en cero
- [x] 3.2 `pnpm test` en verde
- [x] 3.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 3.4 `openspec validate bound-active-changes-list --strict` válido
- [x] 3.5 Reporte en `docs/reports/`
- [x] 3.6 Archivado confirmado por Ale desde la aplicación