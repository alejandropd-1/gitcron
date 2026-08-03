## 1. Coalescencia por cuadro

- [x] 1.1 Agregar `pendingViewportRef` y `rafRef` con un `scheduleViewport` que aplique un solo `setViewport` por cuadro en `hooks/use-canvas-viewport.ts`
- [x] 1.2 Adelantar `viewportRef` al calcular, y anotar por qué convive con el `useEffect` que ya lo sincroniza
- [x] 1.3 Usar `scheduleViewport` en `handleMouseMove` y en `handleWheel`

## 2. Precedencia y cierre

- [x] 2.1 Hacer que `resetViewport`, el centrado y el reencuadre por cambio de mundo cancelen el cuadro pendiente
- [x] 2.2 Resolver el cuadro pendiente al soltar el arrastre, sin perder la última posición
- [x] 2.3 Cancelar el cuadro pendiente al desmontar, sin aplicar estado

## 3. Cobertura

- [x] 3.1 Test: varios eventos de arrastre en el mismo cuadro producen un solo encuadre, con la última posición
- [x] 3.2 Test: dos pasos de rueda en el mismo cuadro acumulan el zoom en vez de anularse
- [x] 3.3 Test: un reinicio descarta el cuadro pendiente y no queda pisado por él
- [x] 3.4 Test: soltar el arrastre con un cuadro pendiente conserva la última posición
- [x] 3.5 Test: desmontar con un cuadro pendiente no aplica estado

## 4. Cierre

- [x] 4.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.2 `pnpm exec tsc --noEmit` en cero
- [x] 4.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 4.4 `openspec validate coalesce-graph-viewport-updates --strict` válido
- [x] 4.5 Reporte en `docs/reports/` con qué se tocó, qué no, y el resultado real de las comprobaciones
- [x] 4.6 Manifiesto `commit.md` con el mensaje y los archivos exactos que entran
- [ ] 4.7 Ale confirma con la aplicación que el arrastre dejó de tironear
- [x] 4.8 Archivado confirmado por Ale desde la aplicación
