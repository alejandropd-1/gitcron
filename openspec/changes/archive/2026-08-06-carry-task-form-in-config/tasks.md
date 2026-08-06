## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (101 archivos / 736 tests)
- [x] 1.2 Releer las cuatro reglas de `tasks` que ya existen en `openspec/config.yaml`, para escribir las
      nuevas sin repetir ni contradecir ninguna

## 2. Las reglas en el canal

- [x] 2.1 Escribir en `openspec/config.yaml` la regla de secciones numeradas y casillas jerárquicas
      dentro de su sección
- [x] 2.2 Escribir la regla de redacción accionable: cada tarea nombra archivo, comando o criterio
      comprobable
- [x] 2.3 Escribir la regla de no agregar marcas propias, con el motivo de que la identificación es posicional
- [x] 2.4 Escribir la regla de que la forma rige igual al documentar trabajo ya hecho
- [x] 2.5 Revisar cada regla escrita contra el criterio de autosuficiencia: ninguna remite a otros
      archivos como referencia de forma

## 3. Comprobación del canal

- [x] 3.1 Correr `openspec instructions tasks --change carry-task-form-in-config --json` y confirmar que
      las cuatro reglas nuevas salen efectivamente por el canal: devuelve ocho reglas, las cuatro
      previas más las cuatro nuevas
- [x] 3.2 Pegar esa salida en el reporte como evidencia de que la regla viaja
- [x] 3.3 Verificar contra el `tasks.md` desviado de `C:\www\odontoPau` cuáles reglas lo rechazan: lo
      rechazan la de secciones y casillas numeradas (0 secciones, 0 casillas `N.M`) y la de marcas
      propias (6 comentarios `<!-- id:`). La de redacción accionable NO lo rechaza: sus seis tareas
      nombran archivo o comando concreto

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde: 101 archivos / 736 tests, mismo conteo que la base de 1.1
- [x] 4.3 `openspec validate carry-task-form-in-config --strict` válido
- [x] 4.4 Reporte en `docs/reports/2026-08-06-carry-task-form-in-config.md`, con la salida de 3.1 y el
      resultado de 3.3
- [x] 4.5 Ale confirma que la redacción de las reglas es la que quiere que reciban los ejecutores
