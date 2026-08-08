## 1. Decisión y base

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Medido: cada commit cubre entre 7 y 15 tareas —`declare-change-branch` 3 commits / 30 tareas,
      `keep-new-change-draft` 2 / 25, `attribute-files-to-change` 4 / 22—. Nombrar una sola tarea sería
      precisión falsa, así que la ruta A queda descartada como fuente principal
- [ ] 1.3 **Ale decide**: se construye la ruta B —que el ejecutor declare tipo y descripción— o el change
      se cierra sin implementar, dejando escrito por qué
- [ ] 1.4 Medir si los runtimes cumplen el pedido: agregar la línea a la instrucción de una tanda real y
      contar en cuántas sesiones aparece la declaración. Sin este número no se construye nada

## 2. Pedido y captura

- [ ] 2.1 Agregar a la instrucción compuesta el pedido de una línea final con tipo y descripción breve
- [ ] 2.2 Capturar esa línea de la sesión sin parsear prosa libre: una marca reconocible, o nada
- [ ] 2.3 Que la ausencia de la línea no degrade nada: sin declaración, la sugerencia es la de hoy
- [ ] 2.4 Transportarla en la proyección de la sesión, junto a `changeId` y `taskId`

## 3. Panel

- [ ] 3.1 Declarar junto al campo de dónde salió la sugerencia: rutas, rama, o lo declarado por la sesión
- [ ] 3.2 Distinguir en ese rótulo lo que afirma la aplicación de lo que declaró un ejecutor
- [ ] 3.3 Comprobar que un mensaje ya escrito no se pisa
- [ ] 3.4 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`

## 4. Tests

- [ ] 4.1 Prueba: sin declaración, la sugerencia es exactamente la de hoy
- [ ] 4.2 Prueba: con declaración, la sugerencia la incluye y el panel declara que vino de la sesión
- [ ] 4.3 Prueba: lo escrito por una persona no se pisa
- [ ] 4.4 Comprobar que sigue pasando `pipeline-prepare-commit.test.tsx` sin tocarlo

## 5. Cierre

- [ ] 5.1 `pnpm exec tsc --noEmit` en cero
- [ ] 5.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [ ] 5.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 5.4 `openspec validate name-task-in-commit-message --strict` válido
- [ ] 5.5 Reporte en `docs/reports/`, con la medición de 1.4
- [ ] 5.6 Ale valida que ninguna sugerencia se lea como verificada por la aplicación
