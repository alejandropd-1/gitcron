## 1. Decisión y base

- [x] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 **Ale eligió el camino** de `design.md`: la rama como fuente primaria, con la observación por
      sesión como complemento rotulado. Decidido el 2026-08-06, sabiendo que no rinde nada hasta que
      `carry-branch-rule-in-config` esté aplicado y aparezcan ramas reales
- [x] 1.3 Si se elige la rama como fuente primaria, comprobar que `carry-branch-rule-in-config` ya está
      aplicado y que existe al menos una rama `change/*` sobre la cual medir algo

## 2. Contrato

- [x] 2.1 Modelar la atribución en `types/pipeline/index.ts` con su fuente y su confianza
- [x] 2.2 Modelar explícitamente el archivo sin atribuir, distinto de "atribuido al seleccionado"
- [x] 2.3 Pasar la atribución a `lib/change-commit-scope.ts` como parámetro, sin que consulte Git

## 3. Fuente elegida

- [x] 3.1 Producir la atribución desde la fuente que Ale eligió en 1.2
- [x] 3.2 **Retirado del alcance el 2026-08-07, aprobado por Ale.** La observación por sesión sale: el
      hueco que la justificaba se cerró cuando la convención de rama empezó a cumplirse. El motivo
      completo, con lo medido, está en `design.md`. Con él salen la medición de peso, el rótulo «tocado
      por una sesión de X» y sus dos pruebas

## 4. Panel

- [x] 4.1 Mostrar la atribución en el panel de preparación con su fuente visible
- [x] 4.3 Declarar los puntos ciegos donde se muestra la atribución, no sólo en el reporte
- [x] 4.4 Comprobar que nada queda preseleccionado por efecto de la atribución

## 5. Tests

- [x] 5.1 Prueba: archivo atribuido por rama declara la rama como fuente
- [x] 5.2 Prueba: la rama no pisa un artefacto que la ruta ya explica —el hecho manda sobre la
      declaración—. Reemplaza a la prueba de la observación, retirada con su fuente
- [x] 5.3 Prueba: archivo sin fuente queda sin atribuir y no hereda el cambio seleccionado
- [x] 5.5 Prueba de tabla sobre `change-commit-scope` con la atribución como entrada, manteniéndola pura
- [x] 5.6 Comprobar que sigue pasando `pipeline-prepare-commit.test.tsx` sin tocarlo

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [x] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 6.4 `openspec validate attribute-files-to-change --strict` válido
- [x] 6.5 Reporte en `docs/reports/`, con cuántos archivos quedaron efectivamente atribuidos en un caso
      real y el motivo del alcance retirado
- [ ] 6.6 Ale valida en la aplicación que ninguna atribución se lee como más segura de lo que es
