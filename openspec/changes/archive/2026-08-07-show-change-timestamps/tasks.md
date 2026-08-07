## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (101 archivos / 741 tests antes de tocar nada)
- [x] 1.2 Confirmar que las tres filas del resumen de archivado son constantes: dos rendían
      `pipeline.openspec.completed.preserved` sin consultar el cambio y la tercera repetía la fecha ya
      impresa en la ruta
- [x] 1.3 Medir el costo de la consulta de historia sobre el repositorio real antes de adoptarla:
      97 ms para 602 caminos, en una sola invocación de Git

## 2. Derivación de las marcas

- [x] 2.1 Derivar la creación con la primera aparición del cambio bajo `openspec/changes/<slug>/`
- [x] 2.2 Derivar el archivado con la primera aparición bajo `openspec/changes/archive/<fecha>-<slug>/`
- [x] 2.3 Usar la fecha de creación del directorio en disco sólo cuando no haya ningún commit, marcada
      como `source: 'disk'`
- [x] 2.4 Resolver ambas marcas para todos los cambios en una sola pasada de historia. Se hizo desde el
      principio: la alternativa era una consulta por cambio sobre cuarenta y nueve archivados

## 3. Contrato

- [x] 3.1 Agregar `ChangeTimestamp` a `types/pipeline/index.ts`, con la fuente dentro del dato
- [x] 3.2 Transportar `createdAt` en los activos y `createdAt` + `archivedOn` en los archivados

## 4. Panel

- [x] 4.1 Mostrar la creación a la derecha del título en el encabezado del cambio activo
- [x] 4.2 Mostrar creación y archivado, ambas con hora, en el encabezado del cambio archivado
- [x] 4.3 Retirar el bloque `<dl>` con las tres filas del resumen de archivado, y sus estilos
- [x] 4.4 Dar de baja las cuatro claves i18n que quedaron sin uso, en los tres idiomas
- [x] 4.5 Presentar la marca no confirmada de modo distinguible y declarar en el `title` que la marca
      confirmada es la del commit
- [x] 4.6 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`

## 5. Tests

- [x] 5.1 Prueba: cambio confirmado → marca de creación derivada del commit
- [x] 5.2 Prueba: cambio sin ningún commit → marca de disco, distinguible
- [x] 5.3 Prueba: cambio archivado → creación alcanzable después del movimiento, más archivado
- [x] 5.4 Prueba del panel: el encabezado activo muestra la creación junto al título
- [x] 5.5 Prueba del panel: el encabezado archivado muestra ambas marcas
- [x] 5.6 Prueba del panel: las tres filas constantes ya no se renderizan
- [x] 5.7 Anclar por clave las búsquedas de texto, no por igualdad exacta del nodo
- [x] 5.8 Prueba del parser sobre la salida cruda de Git, incluidos los casos que no aportan
      identificador y el fallo de lectura que no rompe el snapshot

## 6. Cierre

- [x] 6.1 Volver a medir: el costo agregado es una invocación de Git de ~100 ms por refresco. No se midió
      el refresco extremo a extremo; el detalle y su motivo van en el reporte
- [x] 6.2 `pnpm exec tsc --noEmit` en cero
- [x] 6.3 `pnpm test` en verde: 103 archivos / 756 tests, dos corridas
- [x] 6.4 `pnpm exec eslint` limpio sobre los nueve archivos tocados
- [x] 6.5 `openspec validate show-change-timestamps --strict` válido
- [x] 6.6 Reporte en `docs/reports/2026-08-06-show-change-timestamps.md`
- [x] 6.7 Ale valida en la aplicación las dos pantallas: cambio activo y cambio archivado
