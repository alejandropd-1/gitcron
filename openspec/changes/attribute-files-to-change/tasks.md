## 1. Decisión y base

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 **Ale elige el camino** de `design.md`: la rama como fuente primaria con la observación por
      sesión como complemento, o invertir el orden para tener resultado antes
- [ ] 1.3 Si se elige la rama como fuente primaria, comprobar que `carry-branch-rule-in-config` ya está
      aplicado y que existe al menos una rama `change/*` sobre la cual medir algo

## 2. Contrato

- [ ] 2.1 Modelar la atribución en `types/pipeline/index.ts` con su fuente y su confianza
- [ ] 2.2 Modelar explícitamente el archivo sin atribuir, distinto de "atribuido al seleccionado"
- [ ] 2.3 Pasar la atribución a `lib/change-commit-scope.ts` como parámetro, sin que consulte Git

## 3. Fuente elegida

- [ ] 3.1 Producir la atribución desde la fuente que Ale eligió en 1.2
- [ ] 3.2 Si entra la observación por sesión: dejar de descartar las rutas en `captureWorkingTree`
      (`runtime-session-evidence.ts:35`) y correlacionarlas con el `changeId` de la sesión
- [ ] 3.3 Medir el peso que las rutas agregan al snapshot con un árbol sucio grande, y reportar el número

## 4. Panel

- [ ] 4.1 Mostrar la atribución en el panel de preparación con su fuente visible
- [ ] 4.2 Mostrar "tocado por una sesión de X" para la observación, nunca "pertenece a X"
- [ ] 4.3 Declarar los puntos ciegos donde se muestra la atribución, no sólo en el reporte
- [ ] 4.4 Comprobar que nada queda preseleccionado por efecto de la atribución

## 5. Tests

- [ ] 5.1 Prueba: archivo atribuido por rama declara la rama como fuente
- [ ] 5.2 Prueba: archivo observado por una sesión se registra como observado, no como perteneciente
- [ ] 5.3 Prueba: archivo sin fuente queda sin atribuir y no hereda el cambio seleccionado
- [ ] 5.4 Prueba: dos sesiones solapadas producen la advertencia de límite
- [ ] 5.5 Prueba de tabla sobre `change-commit-scope` con la atribución como entrada, manteniéndola pura
- [ ] 5.6 Comprobar que sigue pasando `pipeline-prepare-commit.test.tsx` sin tocarlo

## 6. Cierre

- [ ] 6.1 `pnpm exec tsc --noEmit` en cero
- [ ] 6.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [ ] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 6.4 `openspec validate attribute-files-to-change --strict` válido
- [ ] 6.5 Reporte en `docs/reports/`, con la medición de 3.3 y cuántos archivos quedaron efectivamente
      atribuidos en un caso real
- [ ] 6.6 Ale valida en la aplicación que ninguna atribución se lee como más segura de lo que es
