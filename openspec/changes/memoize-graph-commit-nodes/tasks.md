## 1. Estabilizar la superficie de props

- [x] 1.1 Guardar en un ref las funciones vigentes de selección, menú contextual y hover, actualizado en un effect y no durante el render
- [x] 1.2 Exponer callbacks estables sin dependencias que lean ese ref
- [x] 1.3 Reemplazar el paso de la función de escala tipográfica por el número `textScale`

## 2. Extraer la capa de nodos

- [x] 2.1 Mover el bloque de nodos de commit a un componente propio memoizado, sin reordenar ni reescribir el marcado
- [x] 2.2 Pasar sólo datos proyectados, primitivos y callbacks estables; **no** el encuadre
- [x] 2.3 Verificar que la geometría queda idéntica: posiciones, radios, colores y orden de capas

## 3. Cobertura

- [x] 3.1 Test: cambiar sólo el encuadre no reconstruye la capa de nodos
- [x] 3.2 Test: cambiar la selección, el hover o los commits sí la reconstruye
- [x] 3.3 Test: los callbacks que recibe la capa conservan su identidad entre renders del contenedor
- [x] 3.4 Test: un callback estable invoca la versión vigente y no la del primer render

## 4. Cierre

- [x] 4.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.2 `pnpm exec tsc --noEmit` en cero
- [x] 4.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 4.4 `openspec validate memoize-graph-commit-nodes --strict` válido
- [x] 4.5 Volver a medir con la instrumentación temporal y registrar el costo por render antes y después — **medido: sin mejora**
- [x] 4.6 Reporte en `docs/reports/` con qué se tocó, qué no, y el resultado real de esas comprobaciones
- [x] 4.7 Manifiesto `commit.md` con el mensaje y los archivos exactos que entran
- [ ] 4.8 Ale valida visualmente el grafo — invariante 12
- [x] 4.9 Archivado confirmado por Ale desde la aplicación
- [x] 4.10 Quitar la instrumentación temporal de `ChronometricGraph.tsx` antes de archivar
