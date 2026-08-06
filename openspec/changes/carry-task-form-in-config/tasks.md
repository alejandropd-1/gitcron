## 1. Base verificada

- [ ] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 Releer las cuatro reglas de `tasks` que ya existen en `openspec/config.yaml`, para escribir las
      nuevas sin repetir ni contradecir ninguna

## 2. Las reglas en el canal

- [ ] 2.1 Escribir en `openspec/config.yaml` la regla de secciones numeradas y casillas jerárquicas
      dentro de su sección
- [ ] 2.2 Escribir la regla de redacción accionable: cada tarea nombra archivo, comando o criterio
      comprobable
- [ ] 2.3 Escribir la regla de no agregar marcas propias, con el motivo de que la identificación es posicional
- [ ] 2.4 Escribir la regla de que la forma rige igual al documentar trabajo ya hecho
- [ ] 2.5 Revisar cada regla escrita contra el criterio de autosuficiencia: ninguna puede remitir a
      otros archivos como referencia de forma

## 3. Comprobación del canal

- [ ] 3.1 Correr `openspec instructions tasks --change carry-task-form-in-config --json` y confirmar que
      las cuatro reglas nuevas salen efectivamente por el canal
- [ ] 3.2 Pegar esa salida en el reporte como evidencia de que la regla viaja
- [ ] 3.3 Verificar contra el `tasks.md` desviado de `C:\www\odontoPau` que las reglas escritas alcanzan
      para rechazarlo, y anotar cuál lo rechaza

## 4. Cierre

- [ ] 4.1 `pnpm exec tsc --noEmit` en cero
- [ ] 4.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base de 1.1
- [ ] 4.3 `openspec validate carry-task-form-in-config --strict` válido
- [ ] 4.4 Reporte en `docs/reports/`, con la salida de 3.1 y el resultado de 3.3
- [ ] 4.5 Ale confirma que la redacción de las reglas es la que quiere que reciban los ejecutores
