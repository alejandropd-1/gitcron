## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (106 archivos / 777 tests antes de tocar nada)
- [x] 1.2 Buscar el patrón que la aplicación ya usa para esto, en vez de inventar uno: `motion.div` con
      clave e inicializadores de opacidad en el visor de diferencias, documentado en el registro de
      cambios
- [x] 1.3 Confirmar que `motion/react` ya es dependencia del proyecto, para no agregar ninguna
- [x] 1.4 Consultar la guía de prácticas modernas sobre animar un grupo de elementos que se reordena, y
      dejar en `design.md` por qué no se usan transiciones de vista del navegador

## 2. Implementación

- [x] 2.1 Envolver cada cambio de la lista en `motion.div`, conservando su clave
- [x] 2.2 Animar la posición con `layout: 'position'`, que es lo que suaviza el salto
- [x] 2.3 Dejar el fundido de opacidad para las entradas y salidas de la lista
- [x] 2.4 Usar una duración corta, sin rebote ni escala: acompaña el movimiento, no lo protagoniza
- [x] 2.5 Apagar la animación con `useReducedMotion`, porque el desplazamiento se calcula en JavaScript
      y la regla de CSS del panel no lo alcanza

## 3. Cierre

- [x] 3.1 `pnpm exec tsc --noEmit` en cero
- [x] 3.2 `pnpm test` en verde, con el conteo comparado contra la base de 1.1
- [x] 3.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 3.4 `openspec validate fade-active-change-reorder --strict` válido
- [x] 3.5 Reporte en `docs/reports/2026-08-07-fade-active-change-reorder.md`
- [x] 3.6 **Ale valida visualmente**: tildar una casilla que reordene la lista y decidir si la duración
      está bien. Ninguna prueba distingue "se movió suave" de "saltó", así que no se declara cubierto
      por la suite
