## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (105 archivos / 770 tests antes de tocar nada)
- [x] 1.2 Comprobar que hoy los activos no se ordenan en ninguna parte, y que los archivados sí lo hacen
      en el lector

## 2. Orden

- [x] 2.1 Escribir `sortActiveChangesByProgress` en `pipeline-view-state.ts`, pura y sin mutar la lista
- [x] 2.2 Comparar la proporción de tareas completadas, no la cantidad
- [x] 2.3 Desempatar por fecha de creación, primero el más reciente
- [x] 2.4 Caer al identificador cuando no hay marca de creación, para que el orden sea estable
- [x] 2.5 Consumirla desde la lista del panel

## 3. Tests

- [x] 3.1 Prueba: los más completados aparecen primero
- [x] 3.2 Prueba: tres de cuatro va antes que cinco de veinte
- [x] 3.3 Prueba: entre dos en cero, primero el creado más recientemente
- [x] 3.4 Prueba: un cambio sin tareas cuenta como sin empezar
- [x] 3.5 Prueba: sin marca de creación el orden sale del identificador
- [x] 3.6 Prueba: no muta la lista recibida
- [x] 3.7 Prueba: el mismo conjunto produce siempre el mismo orden

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base de 1.1
- [x] 4.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 4.4 `openspec validate order-active-changes-by-progress --strict` válido
- [x] 4.5 Reporte en `docs/reports/2026-08-07-order-active-changes-by-progress.md`
- [x] 4.6 Ale valida en la aplicación, y en particular si molesta que la lista se reordene al tildar una
      casilla
