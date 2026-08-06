## 1. Base verificada

- [ ] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 Confirmar que las tres filas del resumen de archivado son constantes, leyendo
      `OpenSpecDashboard.tsx:1278-1280`
- [ ] 1.3 Medir el costo actual del refresco del panel, para comparar después de agregar las consultas
      de historia

## 2. Derivación de las marcas

- [ ] 2.1 Derivar la creación con `git log --follow --diff-filter=A` sobre el `proposal.md` del cambio
- [ ] 2.2 Derivar el archivado del commit que mueve el cambio a `archive/`
- [ ] 2.3 Usar la fecha de creación del directorio en disco sólo cuando no haya ningún commit, marcada
      como no confirmada
- [ ] 2.4 Resolver ambas marcas para todos los cambios en una sola pasada de historia si 1.3 y 6.1
      muestran que una consulta por cambio pesa

## 3. Contrato

- [ ] 3.1 Agregar las marcas a los tipos de evidencia en `types/pipeline/index.ts`, con la confirmada y
      la no confirmada distinguibles
- [ ] 3.2 Transportarlas en el snapshot

## 4. Panel

- [ ] 4.1 Mostrar la creación a la derecha del título en el encabezado del cambio activo
- [ ] 4.2 Mostrar creación y archivado, ambas con hora, en el encabezado del cambio archivado
- [ ] 4.3 Retirar el bloque `<dl>` con las tres filas del resumen de archivado
- [ ] 4.4 Dar de baja las claves i18n que quedan sin uso, en los tres idiomas
- [ ] 4.5 Presentar la marca no confirmada de modo distinguible y declarar que la marca es la del commit
- [ ] 4.6 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`

## 5. Tests

- [ ] 5.1 Prueba: cambio confirmado → marca de creación derivada del commit
- [ ] 5.2 Prueba: cambio sin ningún commit → marca de disco, distinguible
- [ ] 5.3 Prueba: cambio archivado → creación alcanzable a través del rename, más archivado
- [ ] 5.4 Prueba del panel: el encabezado activo muestra la creación junto al título
- [ ] 5.5 Prueba del panel: el encabezado archivado muestra ambas marcas con hora
- [ ] 5.6 Prueba del panel: las tres filas constantes ya no se renderizan
- [ ] 5.7 Anclar las búsquedas por texto de las claves nuevas, para no romper los `getByText` por regex

## 6. Cierre

- [ ] 6.1 Volver a medir el costo del refresco y reportar la diferencia real contra 1.3
- [ ] 6.2 `pnpm exec tsc --noEmit` en cero
- [ ] 6.3 `pnpm test` en verde, con el conteo de archivos comparado contra la base de 1.1
- [ ] 6.4 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 6.5 `openspec validate show-change-timestamps --strict` válido
- [ ] 6.6 Reporte en `docs/reports/`, con las mediciones de 1.3 y 6.1
- [ ] 6.7 Ale valida en la aplicación las dos pantallas: cambio activo y cambio archivado
